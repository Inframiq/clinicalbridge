"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ROLE_CONFIG, ROLE_ONBOARDING, SELF_SERVE_ROLES, SUPER_ADMIN_EMAIL } from "@/lib/roles";
import { queuePendingToast } from "@/lib/pending-toast";
import { cn } from "@/lib/utils";
import { nameField, emailField, passwordField } from "@/lib/validation";
import type { UserRole } from "@/types";

const schema = z.object({
  fullName: nameField(80),
  email: emailField,
  password: passwordField,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((v) => v, "You must accept the Terms of Service and Privacy Policy"),
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

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `?role=` is user input - never trust it past `SELF_SERVE_ROLES`. In particular
  // it must never be able to preset `role` to "super_admin", which only an existing
  // admin may grant, not something a visitor can pick for themselves at signup.
  function selfServeRole(value: string | null): UserRole | null {
    return value && (SELF_SERVE_ROLES as string[]).includes(value) ? (value as UserRole) : null;
  }
  const defaultRole = selfServeRole(searchParams.get("role")) || "hospital";

  const { signUpWithSupabase, signInWithOAuth, refreshProfile } = useAuthRole();
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);

  // Keep `role` in sync with a `?role=` query change (e.g. a link to this same route with a
  // different role) without an Effect - adjusting state during render, per React's guidance,
  // avoids the extra committed render pass a `useEffect` here would cause.
  const roleParam = searchParams.get("role");
  const [syncedRoleParam, setSyncedRoleParam] = useState(roleParam);
  if (roleParam !== syncedRoleParam) {
    setSyncedRoleParam(roleParam);
    const nextRole = selfServeRole(roleParam);
    if (nextRole) {
      setRole(nextRole);
    }
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", acceptTerms: false },
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
        // The designated super-admin email is force-assigned "super_admin"
        // server-side (see migration 018) regardless of which tile was
        // picked above. That's already decided by the time signUp resolves,
        // so redirect off this client-known constant instead of waiting on
        // an extra profile fetch - `refreshProfile` still runs, just in the
        // background, since the AuthProvider's own auth-state listener will
        // sync the session anyway and nothing here needs to block on it.
        const isSuperAdmin = data.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
        const targetRole: UserRole = isSuperAdmin ? "super_admin" : role;
        void refreshProfile();

        // The super-admin target is an AppShell dashboard, which only shows
        // the toast once it's actually rendered (see app-shell.tsx) - for
        // every other role this lands on an onboarding wizard instead, so
        // the toast can just show right away.
        if (isSuperAdmin) {
          queuePendingToast("Account created successfully!");
        } else {
          toast.success("Account created successfully!");
        }
        router.push(ROLE_ONBOARDING[targetRole] || "/onboarding");
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Create an Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign up to get started</p>
      </div>

      <div className="mb-6">
        <p className="mb-2.5 text-xs font-medium text-muted-foreground">I want to register as</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SELF_SERVE_ROLES.map((value) => {
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
                  "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border-brand bg-brand-muted text-brand"
                    : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span
                  className={cn(
                    "text-xs leading-tight font-medium",
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
            <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
            <FieldContent>
              <div className="relative">
                <UserIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  maxLength={80}
                  className="pl-9"
                  aria-invalid={!!errors.fullName}
                  {...register("fullName")}
                />
              </div>
              <FieldError errors={[errors.fullName]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="youremail@example.com"
                  autoComplete="email"
                  className="pl-9"
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
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  maxLength={72}
                  className="px-9"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FieldError errors={[errors.password]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  maxLength={72}
                  className="px-9"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
              </div>
              <FieldError errors={[errors.confirmPassword]} />
            </FieldContent>
          </Field>

          <Field>
            <div className="flex items-start gap-2">
              <Controller
                control={control}
                name="acceptTerms"
                render={({ field }) => (
                  <Checkbox
                    id="acceptTerms"
                    className="mt-0.5"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-invalid={!!errors.acceptTerms}
                  />
                )}
              />
              <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="font-medium text-brand hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            <FieldError errors={[errors.acceptTerms]} />
          </Field>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            Sign Up
          </Button>

          <FieldSeparator>or continue with</FieldSeparator>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => handleOAuth("google")}>
              <GoogleIcon /> Google
            </Button>
            <Button type="button" variant="outline" onClick={() => handleOAuth("azure")}>
              <MicrosoftIcon /> Microsoft
            </Button>
          </div>

          <FieldDescription className="text-center text-xs">
            By continuing with Google or Microsoft you agree to the{" "}
            <Link href="/terms" className="hover:underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>.
          </FieldDescription>

          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand hover:underline"
            >
              Sign in
            </Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  );
}
