"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-muted text-success">
          <MailCheck className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Check your email
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We&apos;ve sent a password reset link to <span className="font-medium text-foreground">{sentTo}</span>.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/login">
            <ArrowLeft className="size-4" /> Back to Sign In
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Forgot your password?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={handleSubmit((values) => setSentTo(values.email))} noValidate>
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
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
              <FieldError errors={[errors.email]} />
            </FieldContent>
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            Send Reset Link
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Sign In
          </Link>
        </FieldGroup>
      </form>
    </div>
  );
}
