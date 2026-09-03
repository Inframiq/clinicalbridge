import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    quote:
      "We fill overnight ER shifts in under ten minutes now. The smart matching is genuinely better than our old staffing agency.",
    name: "Dr. Alicia Moreno",
    title: "Chief Medical Officer, Regional Health Network",
    initials: "AM",
  },
  {
    quote:
      "I pick up shifts around my schedule and get paid within days of completing them. It's the flexibility I wanted from locum tenens work.",
    name: "Dr. Marcus Webb",
    title: "Emergency Medicine Physician",
    initials: "MW",
  },
  {
    quote:
      "Credential verification used to be our biggest bottleneck. Now every doctor on the platform arrives pre-verified.",
    name: "Jordan Pierce",
    title: "VP of Clinical Operations",
    initials: "JP",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Trusted by hospitals and doctors alike
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex gap-0.5 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm text-foreground text-pretty">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-brand-muted font-semibold text-brand">
                    {t.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
