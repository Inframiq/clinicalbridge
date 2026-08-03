import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { CategoryBarChart } from "@/components/dashboard/charts/category-bar-chart";
import { Card, CardContent } from "@/components/ui/card";
import type { EarningsPoint, PerformanceTrend, DayOfWeekBreakdown } from "@/types";
import { relativeDelta } from "@/lib/format";

export interface AnalyticsStat {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
}

export interface AnalyticsInsight {
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

export interface AnalyticsListItem {
  id: string;
  label: string;
  value: string;
}

export function AnalyticsOverview({
  stats,
  earningsSeries,
  earningsLabel = "Earnings Overview",
  specialtyBreakdown,
  dayOfWeekBreakdown,
  timeOfDayBreakdown,
  performanceTrends,
  topListTitle,
  topList,
  insights,
}: {
  stats: AnalyticsStat[];
  earningsSeries: EarningsPoint[];
  earningsLabel?: string;
  specialtyBreakdown: { label: string; value: number; color: string }[];
  dayOfWeekBreakdown: DayOfWeekBreakdown[];
  timeOfDayBreakdown: { label: string; value: number; color: string }[];
  performanceTrends: PerformanceTrend[];
  topListTitle: string;
  topList: AnalyticsListItem[];
  insights: AnalyticsInsight[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} iconTone="brand" className="col-span-1" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title={earningsLabel} description="This Month" className="lg:col-span-2">
          <TrendAreaChart
            data={earningsSeries}
            xKey="date"
            compactYAxis
            series={[
              { key: "earnings", label: "Earnings (USD)", color: "var(--chart-1)" },
              { key: "hours", label: "Hours Worked", color: "var(--chart-3)" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Shifts by Specialty">
          <DonutChart data={specialtyBreakdown} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Performance Trends" viewAllHref="#" className="lg:col-span-1">
          <ul className="divide-y divide-border">
            {performanceTrends.map((p) => {
              const delta = relativeDelta(p.changePct);
              return (
                <li key={p.metric} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.metric}</p>
                    <p className="text-xs text-muted-foreground">was {p.lastMonth}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{p.thisMonth}</p>
                    <p className={delta.positive ? "text-xs text-success" : "text-xs text-destructive"}>
                      {delta.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ChartCard>

        <ChartCard title="Shifts by Day of Week">
          <CategoryBarChart data={dayOfWeekBreakdown} xKey="day" valueKey="shifts" color="var(--chart-1)" />
        </ChartCard>

        <ChartCard title="Shifts by Time of Day">
          <DonutChart data={timeOfDayBreakdown} height={180} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title={topListTitle} viewAllHref="#" className="lg:col-span-1">
          <ul className="space-y-3">
            {topList.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.label}</span>
                <span className="font-medium text-muted-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {insights.map((insight) => (
            <Card key={insight.title}>
              <CardContent className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <insight.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{insight.description}</p>
                  <Link href={insight.href} className="mt-1.5 inline-block text-sm font-medium text-brand hover:underline">
                    {insight.linkLabel} →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
