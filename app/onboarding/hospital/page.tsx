import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { HospitalOnboardingWizard } from "@/components/forms/hospital-onboarding-wizard";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Hospital Registration — ${PLATFORM.name}`,
};

export default function HospitalOnboardingPage() {
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Already have an account? Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hospital Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register your hospital to start broadcasting shifts. A Super Admin will verify your
            documents before you go live.
          </p>
        </div>
        <HospitalOnboardingWizard />
      </main>
    </div>
  );
}
