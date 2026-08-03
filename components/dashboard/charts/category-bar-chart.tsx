"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export function CategoryBarChart<T extends object>({
  data,
  xKey,
  valueKey,
  color = "var(--chart-1)",
  height = 220,
  layout = "vertical",
}: {
  data: T[];
  xKey: Extract<keyof T, string>;
  valueKey: Extract<keyof T, string>;
  color?: string;
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  const config: ChartConfig = { [valueKey]: { label: valueKey, color } };

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout={layout} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        {layout === "vertical" ? (
          <>
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} className="text-xs" />
          </>
        ) : (
          <>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              width={140}
              className="text-xs"
            />
          </>
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={valueKey} fill={color} radius={4} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
