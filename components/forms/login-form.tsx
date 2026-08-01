"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Eye, EyeOff, Lock, Mail, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { UserRole } from "@/types";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuthRole();
  const [role, setRole] = useState<UserRole>("admin");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function completeLogin(chosenRole: UserRole) {
    login(chosenRole);
    toast.success("Signed in successfully");
    router.push(chosenRole === "admin" ? "/admin/dashboard" : "/doctor/dashboard");
  }

  function onSubmit() {
    completeLogin(role);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Welcome Back!</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>

      <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="admin" className="gap-1.5">
            <Building2 className="size-4" /> Hospital / Clinic
          </TabsTrigger>
          <TabsTrigger value="doctor" className="gap-1.5">
            <Stethoscope className="size-4" /> Doctor
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="youremail@hospital.com"
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
                  autoComplete="current-password"
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

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox />
              Remember Me
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            Sign In
          </Button>

          <FieldSeparator>or continue with</FieldSeparator>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => completeLogin(role)}>
              <GoogleIcon /> Google
            </Button>
            <Button type="button" variant="outline" onClick={() => completeLogin(role)}>
              <MicrosoftIcon /> Microsoft
            </Button>
          </div>

          {role === "doctor" && (
            <FieldDescription className="text-center">
              Don&apos;t have an account?{" "}
              <Link href="/onboarding" className="font-medium text-brand hover:underline">
                Sign up
              </Link>
            </FieldDescription>
          )}
        </FieldGroup>
      </form>
    </div>
  );
}
