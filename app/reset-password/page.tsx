import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout/auth-layout";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Reset Password — ${PLATFORM.name}`,
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
