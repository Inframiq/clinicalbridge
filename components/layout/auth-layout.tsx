import Image from "next/image";
import { ShieldCheck, Zap, Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { IMAGES } from "@/lib/config/images";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Verified & Trusted",
    description: "Strict verification for hospitals and doctors.",
  },
  {
    icon: Zap,
    title: "Instant Matching",
    description: "Find the right doctor instantly.",
  },
  {
    icon: Lock,
    title: "Secure & Compliant",
    description: "Your data and payments are always safe.",
  },
];

export function AuthLayout({
  headline,
  children,
}: {
  headline?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0">
          <Image
            src={IMAGES.loginSide.src}
            alt={IMAGES.loginSide.alt}
            fill
            priority
            sizes="50vw"
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/90 to-primary/70" />
        </div>

        <div className="relative z-10">
          <Logo className="[&_span]:text-primary-foreground" />
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {headline ?? "Connecting Medical Talent with Care When It Matters Most"}
          </h1>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {trustPoints.map((point) => (
            <div key={point.title} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <point.icon className="size-5" />
              <p className="mt-2 text-sm font-medium">{point.title}</p>
              <p className="mt-0.5 text-xs text-primary-foreground/70">{point.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
