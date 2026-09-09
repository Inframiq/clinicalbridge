import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { OnboardingWizard } from "@/components/forms/onboarding-wizard";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Locum Doctor Onboarding — ${PLATFORM.name}`,
};

export default function LocumOnboardingPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Locum Doctor Onboarding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your profile and get verified to start browsing and applying for shifts.
          </p>
        </div>
        <OnboardingWizard />
      </main>
    </div>
  );
}
