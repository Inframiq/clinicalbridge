import { Check } from "lucide-react";
import { Logo } from "@/components/layout/logo";

type AuthVariant = "signin" | "signup";

const PANEL_COPY: Record<AuthVariant, { headline: string; sub: string; ledgerCaption: string }> = {
  signin: {
    headline: "Every shift starts with a verified clinician.",
    sub: "Sign in to manage shifts, replacements, and your credentials.",
    ledgerCaption: "What we check before anyone works",
  },
  signup: {
    headline: "Get credentialed once. Work anywhere in the network.",
    sub: "Join the network hospitals trust for verified, on-demand cover.",
    ledgerCaption: "You'll be asked for",
  },
};

const LEDGER = [
  { label: "State medical license", tag: "Verified" },
  { label: "DEA registration", tag: "Verified" },
  { label: "NPI on file", tag: "Matched" },
  { label: "Board certification", tag: "Verified" },
  { label: "Background check", tag: "Cleared" },
];

const TRUST = ["SOC 2", "HIPAA-aligned", "NPI-verified"];

export function AuthLayout({
  variant = "signin",
  headline,
  children,
}: {
  variant?: AuthVariant;
  /** Overrides the panel headline for this screen. */
  headline?: string;
  children: React.ReactNode;
}) {
  const copy = PANEL_COPY[variant];

  return (
    <div className="grid grid-cols-1 overflow-x-clip lg:min-h-dvh lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative flex flex-col gap-8 overflow-hidden bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 lg:justify-between lg:gap-0 lg:px-12 lg:py-14">
        <div className="relative">
          <Logo className="[&_span]:text-sidebar-foreground" />
        </div>

        <div className="relative max-w-md">
          <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-white/45 uppercase">
            Credentialed access
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem] sm:leading-[1.2] lg:text-[2rem]">
            {headline ?? copy.headline}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">{copy.sub}</p>

          {/* Signature: the credential ledger */}
          <div className="mt-8 hidden overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] sm:block">
            <p className="border-b border-white/10 px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
              {copy.ledgerCaption}
            </p>
            <ul className="auth-ledger relative divide-y divide-white/[0.07] overflow-hidden">
              {LEDGER.map((row) => (
                <li key={row.label} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-[13px] text-white/80">{row.label}</span>
                  <span className="font-mono text-[10px] tracking-wide text-success/80 uppercase">
                    {row.tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase">
          {TRUST.map((item, i) => (
            <span key={item} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="text-white/20">·</span>}
              {item}
            </span>
          ))}
        </div>
      </aside>

      {/* Form column */}
      <main className="flex flex-col justify-center bg-background px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-[26rem]">{children}</div>
      </main>
    </div>
  );
}
