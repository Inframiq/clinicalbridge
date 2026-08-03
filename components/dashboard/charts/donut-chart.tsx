"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface Slice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  totalLabel = "Total",
  height = 220,
}: {
  data: Slice[];
  totalLabel?: string;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const config: ChartConfig = data.reduce((acc, d) => {
    acc[d.label] = { label: d.label, color: d.color };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <ChartContainer config={config} className="relative aspect-square shrink-0" style={{ height }}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="label" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-2">
        <div className="mb-1 flex flex-col">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">{totalLabel}</span>
        </div>
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className={cn("size-2.5 shrink-0 rounded-full")}
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 font-medium text-foreground">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
