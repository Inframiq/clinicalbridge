"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactNumber } from "@/lib/format";

interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export function TrendAreaChart<T extends object>({
  data,
  xKey,
  series,
  height = 260,
  compactYAxis = false,
}: {
  data: T[];
  xKey: Extract<keyof T, string>;
  series: SeriesDef[];
  height?: number;
  /** Abbreviate large Y-axis values (e.g. 10000 -> "10K") — use for currency/earnings series. */
  compactYAxis?: boolean;
}) {
  const config: ChartConfig = series.reduce((acc, s) => {
    acc[s.key] = { label: s.label, color: s.color };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={compactYAxis ? 36 : 48}
          tickFormatter={compactYAxis ? (v: number) => formatCompactNumber(v) : undefined}
          className="text-xs"
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#fill-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
