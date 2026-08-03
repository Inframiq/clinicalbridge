"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, Banknote, Clock3, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { joinPostShiftRecords } from "@/lib/selectors";
import { formatCurrency, formatDate } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";

export default function WalletPayoutsPage() {
  const { payments } = usePayments();
  const { shifts } = useShifts();

  const joined = useMemo(
    () => joinPostShiftRecords(payments.filter((p) => p.doctorId === currentDoctor.id), shifts),
    [payments, shifts]
  );

  const availableBalance = joined
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.netPayout, 0);
  const totalPaidOut = joined
    .filter((p) => p.status === "payment_processed")
    .reduce((sum, p) => sum + p.netPayout, 0);
  const pending = joined.filter((p) => p.status === "pending_approval").length;

  return (
    <div>
      <PageHeader title="Wallet & Payouts" description="Manage your available balance and payout history." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available Balance" value={formatCurrency(availableBalance, { decimals: false })} icon={Wallet} iconTone="success" />
        <StatCard label="Total Paid Out" value={formatCurrency(totalPaidOut, { decimals: false })} icon={Banknote} iconTone="info" />
        <StatCard label="Pending Approval" value={String(pending)} icon={Clock3} iconTone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {joined.map((p) => {
                const meta = payoutStatusMeta[p.status];
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.shift?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paidAt ? formatDate(p.paidAt) : "Not yet paid"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(p.netPayout)}</p>
                      <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
                    </div>
                  </li>
                );
              })}
              {joined.length === 0 && (
                <EmptyState
                  icon={Wallet}
                  title="No payout history yet"
                  description="Completed shifts and payouts will show up here."
                  className="border-none py-6"
                />
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Available for withdrawal</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(availableBalance, { decimals: false })}</p>
            </div>
            <Button
              className="w-full"
              disabled={availableBalance === 0}
              onClick={() => toast.success("Withdrawal requested — funds will arrive in 1-2 business days")}
            >
              <ArrowDownToLine className="size-4" /> Withdraw to Bank
            </Button>
            <p className="text-xs text-muted-foreground">
              Payouts are sent to your bank account on file within 1-2 business days.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
