import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout/auth-layout";
import { LoginForm } from "@/components/forms/login-form";
import { PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Sign In — ${PLATFORM.name}`,
};

export default function LoginPage() {
  return (
    <AuthLayout variant="signin">
      <LoginForm />
    </AuthLayout>
  );
}
