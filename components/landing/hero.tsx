import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/lib/config/images";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-muted/40 to-background">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-brand" />
            AI-powered shift matching for modern healthcare teams
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Connecting Care. <span className="text-brand">When It Matters.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
            The enterprise marketplace that lets hospitals broadcast open shifts to
            verified physicians in minutes — and lets doctors find flexible, well-paid
            work on their own schedule.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/login">
                Post a Shift <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/onboarding">Join as a Doctor</Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> Verified & Credentialed
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="size-4 text-brand" /> Avg. 5–10 min match time
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> HIPAA-conscious by design
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src={IMAGES.heroConsultation.src}
              alt={IMAGES.heroConsultation.alt}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden w-56 rounded-xl border border-border bg-card p-4 shadow-lg sm:block">
            <p className="text-xs text-muted-foreground">Shift filled in</p>
            <p className="text-2xl font-semibold text-foreground">6 min 42s</p>
            <p className="mt-1 text-xs text-success">95% match score</p>
          </div>
        </div>
      </div>
    </section>
  );
}
