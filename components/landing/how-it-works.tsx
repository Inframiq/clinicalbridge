import { Radio, Sparkles, CalendarCheck, Search, FileCheck2, Wallet } from "lucide-react";

const hospitalSteps = [
  { icon: Radio, title: "Broadcast a shift", description: "Post open shifts with pay, location, and requirements in seconds." },
  { icon: Sparkles, title: "Get smart matches", description: "The platform ranks the best-fit, available doctors nearby instantly." },
  { icon: CalendarCheck, title: "Confirm & track", description: "Approve a match and monitor the shift live from check-in to sign-off." },
];

const doctorSteps = [
  { icon: Search, title: "Browse open shifts", description: "Filter by specialty, location, pay, and schedule that fits your life." },
  { icon: FileCheck2, title: "Apply in one tap", description: "Your verified credentials travel with you — no repeat paperwork." },
  { icon: Wallet, title: "Get paid fast", description: "Secure escrow releases payment as soon as a shift is approved." },
];

function StepList({ steps }: { steps: typeof hospitalSteps }) {
  return (
    <ol className="space-y-6">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
            <step.icon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Step {i + 1}</p>
            <p className="mt-0.5 font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">How it works</h2>
        <p className="mt-3 text-muted-foreground">
          Whether you&apos;re staffing a shift or picking one up, it takes minutes — not days.
        </p>
      </div>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div id="for-hospitals">
          <h3 className="mb-6 text-lg font-semibold text-foreground">For Hospitals &amp; Clinics</h3>
          <StepList steps={hospitalSteps} />
        </div>
        <div id="for-doctors">
          <h3 className="mb-6 text-lg font-semibold text-foreground">For Doctors</h3>
          <StepList steps={doctorSteps} />
        </div>
      </div>
    </section>
  );
}
