"use client";

import { MapPin, Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LiveMap({
  address,
  lastUpdated = "2 min ago",
}: {
  address: string;
  lastUpdated?: string;
}) {
  return (
    <div className="space-y-3">
      <div
        className="relative h-56 overflow-hidden rounded-xl border border-border bg-[linear-gradient(0deg,transparent_24%,var(--border)_25%,var(--border)_26%,transparent_27%,transparent_74%,var(--border)_75%,var(--border)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,var(--border)_25%,var(--border)_26%,transparent_27%,transparent_74%,var(--border)_75%,var(--border)_76%,transparent_77%,transparent)] bg-[length:24px_24px] bg-muted/40"
        role="img"
        aria-label={`Map showing live location near ${address}`}
      >
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <Button size="icon" variant="secondary" className="size-7 shadow">
            <Plus className="size-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="size-7 shadow">
            <Minus className="size-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="size-7 shadow">
            <Maximize2 className="size-3.5" />
          </Button>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-brand/30" />
          <span className="relative flex size-8 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg">
            <MapPin className="size-4" fill="currentColor" />
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{address}</span>
        <span className="flex items-center gap-1.5 font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" /> Live
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Last updated {lastUpdated}</p>
    </div>
  );
}
