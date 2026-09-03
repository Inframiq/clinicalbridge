import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Stethoscope, Briefcase, ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Sign Up — ${PLATFORM.name}`,
};

const choices = [
  {
    href: "/signup?role=hospital",
    icon: Building2,
    title: "Hospital / Clinic",
    description: "Register your facility to post shifts and manage staff.",
    role: "hospital",
  },
  {
    href: "/signup?role=working_doctor",
    icon: Stethoscope,
    title: "Working Doctor",
    description: "Manage facility shifts and submit replacement requests.",
    role: "working_doctor",
  },
  {
    href: "/signup?role=locum_tenens",
    icon: Briefcase,
    title: "Locum Tenens",
    description: "Browse and apply for open shifts across hospitals.",
    role: "locum_tenens",
  },
];

export default function OnboardingChooserPage() {
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
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Who are you registering as?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select your account type to proceed with registration and onboarding.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {choices.map((choice) => {
            const Icon = choice.icon;
            return (
              <Link
                key={choice.href}
                href={choice.href}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-brand/40"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-muted text-brand">
                  <Icon className="size-5" />
                </span>
                <span className="text-base font-semibold text-foreground">{choice.title}</span>
                <span className="text-sm text-muted-foreground">{choice.description}</span>
                <span className="mt-auto flex items-center gap-1 text-sm font-medium text-brand">
                  Get started
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
