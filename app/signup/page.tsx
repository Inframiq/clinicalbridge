import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout/auth-layout";
import { SignupForm } from "@/components/forms/signup-form";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Sign Up — ${PLATFORM.name}`,
};

export default function SignupPage() {
  return (
    <AuthLayout variant="signup">
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
