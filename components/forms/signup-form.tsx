"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { useAuthRole } from "@/context/auth-provider";
import { ROLE_CONFIG, SELECTABLE_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.62-.2-2.4H12v4.55h6.47a5.6 5.6 0 0 1-2.4 3.65v3.02h3.9c2.27-2.1 3.55-5.19 3.55-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.9-3.03c-1.08.73-2.46 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.93H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4.03-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.6l4.03 3.1c.94-2.83 3.58-4.93 6.69-4.93Z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="size-4">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H1z" />
    </svg>
  );
}

const roleOnboardingPaths: Record<UserRole, string> = {
  hospital: "/onboarding/hospital",
  working_doctor: "/onboarding/working-doctor",
  locum_tenens: "/onboarding/locum-tenens",
  super_admin: "/super-admin/dashboard",
};

/** Resolve a `?role=` param to a role a visitor is actually allowed to pick. */
function resolveRole(param: string | null): UserRole {
  return SELECTABLE_ROLES.includes(param as UserRole)
    ? (param as UserRole)
    : "hospital";
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { signUpWithSupabase, signInWithOAuth, refreshProfile } = useAuthRole();
  const [role, setRole] = useState<UserRole>(resolveRole(searchParams.get("role")));
  const [showPassword, setShowPassword] = useState(false);

  // Keep `role` in sync with a `?role=` query change (e.g. a link to this same route with a
  // different role) without an Effect - adjusting state during render, per React's guidance,
  // avoids the extra committed render pass a `useEffect` here would cause.
  const roleParam = searchParams.get("role");
  const [syncedRoleParam, setSyncedRoleParam] = useState(roleParam);
  if (roleParam !== syncedRoleParam) {
    setSyncedRoleParam(roleParam);
    setRole(resolveRole(roleParam));
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormValues) {
    if (data.email && data.password && data.fullName) {
      const { error, user, hasSession, isDuplicateEmail } = await signUpWithSupabase(
        data.email,
        data.password,
        role,
        data.fullName
      );

      if (error) {
        if (isDuplicateEmail) {
          toast.error("An account with this email already exists.", {
            action: {
              label: "Log in",
              onClick: () => router.push("/login"),
            },
          });
        } else {
          toast.error(error.message || "Failed to sign up");
        }
        return;
      }

      if (user && !hasSession) {
        toast.info("Check your inbox to confirm your email before continuing.");
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}&role=${role}`);
        return;
      }

      if (user) {
        await refreshProfile();
        toast.success("Account created successfully!");
        router.push(roleOnboardingPaths[role] || "/onboarding");
        return;
      }
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    // Note: For OAuth, the role needs to be saved to localStorage before redirecting,
    // or passed via state/cookie, so when the user returns we know which role they wanted.
    // In this basic implementation, we just trigger OAuth.
    const { error } = await signInWithOAuth(provider);
    if (error) {
      toast.error(`OAuth signup error: ${error.message}`);
    }
  }

  return (
    <div>
      <div className="mb-8 space-y-2">
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Join the network and get started in minutes.
        </p>
      </div>

      <div className="mb-6">
        <p className="mb-2.5 font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Register as
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SELECTABLE_ROLES.map((value) => {
            const config = ROLE_CONFIG[value];
            const Icon = config.icon;
            const isActive = role === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={isActive}
                className={cn(
                  "group flex min-w-0 flex-col gap-2.5 rounded-xl border px-3 py-3 text-left transition-all outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand/40",
                  isActive
                    ? "border-brand/70 bg-brand-muted"
                    : "border-border hover:border-brand/40 hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-brand text-white"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight font-medium",
                    isActive ? "text-brand" : "text-foreground"
                  )}
                >
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.fullName}>
            <FieldLabel htmlFor="fullName">Full name</FieldLabel>
            <FieldContent>
              <div className="relative">
                <UserIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className="h-11 pl-10"
                  aria-invalid={!!errors.fullName}
                  {...register("fullName")}
                />
              </div>
              <FieldError errors={[errors.fullName]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11 pl-10"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
              <FieldError errors={[errors.email]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-11 px-10"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FieldError errors={[errors.password]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-11 px-10"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
              </div>
              <FieldError errors={[errors.confirmPassword]} />
            </FieldContent>
          </Field>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full text-[15px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>

          <FieldSeparator>or continue with</FieldSeparator>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => handleOAuth("google")}
            >
              <GoogleIcon /> Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => handleOAuth("azure")}
            >
              <MicrosoftIcon /> Microsoft
            </Button>
          </div>

          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Sign in
            </Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  );
}
