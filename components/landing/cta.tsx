import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground sm:px-16">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Ready to staff smarter, or work on your terms?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
          Join thousands of hospitals and doctors already connected on the platform.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/login">
              Post Your First Shift <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            asChild
          >
            <Link href="/onboarding">Apply as a Doctor</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
