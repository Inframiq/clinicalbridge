import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout/auth-layout";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Forgot Password — ${PLATFORM.name}`,
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
