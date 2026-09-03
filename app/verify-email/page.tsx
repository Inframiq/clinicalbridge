"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { useAuthRole } from "@/context/auth-provider";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Logo />
        </div>
      </header>
      <main className="mx-auto flex max-w-lg items-center justify-center px-6 py-20">
        <Card className="w-full text-center shadow-sm">
          <CardContent className="p-8">
            <div className="mx-auto size-16 animate-pulse rounded-2xl bg-muted" />
            <div className="mx-auto mt-6 h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resendConfirmationEmail } = useAuthRole();
  const [resending, setResending] = useState(false);

  const email = searchParams.get("email") || "";

  async function handleResend() {
    if (!email) return;
    setResending(true);
    const { error } = await resendConfirmationEmail(email);
    setResending(false);

    if (error) {
      toast.error(error.message || "Failed to resend confirmation email");
      return;
    }
    toast.success("Confirmation email resent!");
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg items-center justify-center px-6 py-20">
        <Card className="w-full text-center shadow-sm">
          <CardContent className="p-8">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <MailCheck className="size-8" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
              Confirm Your Email
            </h1>

            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              We&apos;ve sent a confirmation link to{" "}
              {email ? <span className="font-medium text-foreground">{email}</span> : "your email address"}.
              Click the link to activate your account, then sign in to complete your registration.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={() => router.push("/login")}>
                Go to Sign In
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={!email || resending}
                onClick={handleResend}
              >
                {resending ? "Resending..." : "Resend Confirmation Email"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
