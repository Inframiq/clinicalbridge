import Link from "next/link";
import { AlertTriangle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM } from "@/lib/config/brand";

export function EmergencyBanner() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-6 py-4">
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-destructive/20 bg-danger-muted px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Need urgent, last-minute coverage?</p>
            <p className="text-sm text-muted-foreground">
              Code Red broadcasting gets your shift priority visibility and instant alerts
              to nearby verified doctors.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <a
            href={`tel:${PLATFORM.supportPhone.replace(/[^+\d]/g, "")}`}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <PhoneCall className="size-4" /> {PLATFORM.supportPhone}
          </a>
          <Button variant="destructive" asChild>
            <Link href="/login">Broadcast Code Red Shift</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
