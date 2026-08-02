"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ShiftListItem } from "@/components/dashboard/shift-list-item";
import { ShiftDetailPanel } from "@/components/dashboard/shift-detail-panel";
import { LiveMap } from "@/components/dashboard/live-map";
import { Timeline } from "@/components/dashboard/timeline";
import { BroadcastShiftDialog } from "@/components/forms/broadcast-shift-dialog";
import { Button } from "@/components/ui/button";
import { Radio, Inbox } from "lucide-react";
import { useShifts } from "@/hooks/use-shifts";
import { shiftTimeline } from "@/lib/mock-data/notifications";
import type { ShiftStatus } from "@/types";

const tabs: { value: string; label: string; statuses: ShiftStatus[] }[] = [
  { value: "active", label: "Active Shifts", statuses: ["active"] },
  { value: "pending", label: "Pending", statuses: ["pending", "open"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export default function ActiveShiftsPage() {
  const { shifts } = useShifts();
  const [tab, setTab] = useState("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredShifts = useMemo(() => {
    const statuses = tabs.find((t) => t.value === tab)?.statuses ?? [];
    return shifts.filter((s) => statuses.includes(s.status));
  }, [shifts, tab]);

  const selectedShift =
    filteredShifts.find((s) => s.id === selectedId) ?? filteredShifts[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Active Shifts & Tracking"
        description="Monitor ongoing shifts, track doctor location, and manage live activities."
        actions={
          <BroadcastShiftDialog
            trigger={
              <Button>
                <Radio className="size-4" /> Broadcast Shift
              </Button>
            }
          />
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setSelectedId(null);
        }}
      >
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-6">
            {filteredShifts.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={`No ${t.label.toLowerCase()}`}
                description="Shifts matching this status will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t.label} ({filteredShifts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filteredShifts.map((shift) => (
                      <ShiftListItem
                        key={shift.id}
                        shift={shift}
                        selected={selectedShift?.id === shift.id}
                        onClick={() => setSelectedId(shift.id)}
                      />
                    ))}
                  </CardContent>
                </Card>

                {selectedShift && (
                  <>
                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle className="text-base">Shift Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ShiftDetailPanel shift={selectedShift} />
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Live Tracking</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LiveMap
                            address={`${selectedShift.location.address}, ${selectedShift.location.city}, ${selectedShift.location.state}`}
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Activity Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Timeline events={shiftTimeline} />
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
