"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, ShieldAlert, FileSearch, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { useAuthRole } from "@/context/auth-provider";
import { ROLE_HOME } from "@/lib/roles";

export default function VerificationStatusPage() {
  return (
    <Suspense fallback={<VerificationStatusFallback />}>
      <VerificationStatusContent />
    </Suspense>
  );
}

function VerificationStatusFallback() {
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

function VerificationStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, role, logout } = useAuthRole();

  const status = searchParams.get("status") || profile?.verification_status || "Submitted";

  const renderContent = () => {
    switch (status) {
      case "Submitted":
      case "Pending":
        return {
          icon: Clock,
          iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
          title: "Waiting for Approval",
          description:
            "Your registration details and documents have been submitted successfully. A Super Admin is reviewing your verification details.",
          actionText: "Check Status Again",
          onAction: () => window.location.reload(),
        };

      case "UnderReview":
      case "Under Review":
        return {
          icon: FileSearch,
          iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
          title: "Review in Progress",
          description:
            "Your account verification is currently actively under review by our medical compliance team.",
          actionText: "Refresh Verification Status",
          onAction: () => window.location.reload(),
        };

      case "NeedsChanges":
      case "Needs Changes":
        return {
          icon: RefreshCw,
          iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
          title: "Changes Required",
          description:
            "Our compliance team noted missing or updated information required for your registration.",
          actionText: "Resume Onboarding",
          onAction: () => {
            if (role) {
              const path = role === "hospital" ? "/onboarding/hospital" : `/onboarding/${role.replace("_", "-")}`;
              router.push(path);
            } else {
              router.push("/onboarding");
            }
          },
        };

      case "Rejected":
        return {
          icon: ShieldAlert,
          iconBg: "bg-destructive/10 text-destructive",
          title: "Application Rejected",
          description:
            "Unfortunately, your registration application could not be verified at this time. Please contact support if you believe this is an error.",
          actionText: "Sign Out",
          onAction: async () => {
            await logout();
            router.push("/login");
          },
        };

      case "Approved":
        return {
          icon: CheckCircle2,
          iconBg: "bg-success-muted text-success",
          title: "Account Approved!",
          description: "Your registration has been verified and approved. You may now access your dashboard.",
          actionText: "Go to Dashboard",
          onAction: () => {
            if (role && ROLE_HOME[role]) {
              router.push(ROLE_HOME[role]);
            } else {
              router.push("/");
            }
          },
        };

      default:
        return {
          icon: Clock,
          iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
          title: "Verification Status",
          description: "Your application status is currently being processed.",
          actionText: "Refresh",
          onAction: () => window.location.reload(),
        };
    }
  };

  const currentStatusInfo = renderContent();
  const Icon = currentStatusInfo.icon;

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg items-center justify-center px-6 py-20">
        <Card className="w-full text-center shadow-sm">
          <CardContent className="p-8">
            <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${currentStatusInfo.iconBg}`}>
              <Icon className="size-8" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
              {currentStatusInfo.title}
            </h1>

            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              {currentStatusInfo.description}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={currentStatusInfo.onAction}>
                {currentStatusInfo.actionText} <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
