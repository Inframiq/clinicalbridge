"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Calendar,
  FileText,
  MessageSquare,
  Pause,
  Settings,
  ShieldAlert,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { Timeline } from "@/components/dashboard/timeline";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useShifts } from "@/hooks/use-shifts";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { patients, shiftTimeline } from "@/lib/mock-data/notifications";
import { formatHoursMinutes } from "@/lib/format";
import { Search } from "lucide-react";

const patientStatusMeta = {
  in_progress: { label: "In Progress", tone: "brand" as const },
  pending: { label: "Pending", tone: "warning" as const },
  completed: { label: "Completed", tone: "success" as const },
};

const quickActions = [
  { icon: User, label: "My Profile" },
  { icon: FileText, label: "Certifications" },
  { icon: Calendar, label: "Availability" },
  { icon: Bell, label: "Notification Preferences" },
  { icon: MessageSquare, label: "Support" },
];

export default function ShiftHubPage() {
  const { shifts } = useShifts();
  const [search, setSearch] = useState("");
  const currentShift = shifts.find(
    (s) => s.assignedDoctorId === currentDoctor.id && s.status === "active"
  );

  const elapsed = currentShift?.elapsedMinutes ?? 0;
  const total = currentShift?.totalMinutes ?? 480;
  const remaining = Math.max(0, total - elapsed);
  const progressPct = currentShift?.progressPct ?? Math.round((elapsed / total) * 100);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Shift Hub"
        description="Your real-time hub to manage shifts, updates, and patient care."
      />

      {!currentShift ? (
        <EmptyState
          icon={ShieldAlert}
          title="No active shift right now"
          description="Your current shift details and live updates will appear here once you check in."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Current Shift</CardTitle>
                  <StatusBadge label="In Progress" tone="brand" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{currentShift.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentShift.facilityName} · {currentShift.startTime} - {currentShift.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {formatHoursMinutes(remaining)}
                    </p>
                    <p className="text-xs text-muted-foreground">Time Remaining</p>
                  </div>
                </div>
                <Progress value={progressPct} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.info("Status updated")}>
                    Update Status
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Break requested")}>
                    <Pause className="size-3.5" /> Request Break
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => toast.warning("Issue reported to admin")}
                  >
                    <ShieldAlert className="size-3.5" /> Report Issue
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patients &amp; Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="patients">
                  <TabsList>
                    <TabsTrigger value="patients">Patients ({filteredPatients.length})</TabsTrigger>
                    <TabsTrigger value="updates">Live Updates</TabsTrigger>
                  </TabsList>
                  <TabsContent value="patients" className="mt-4 space-y-4">
                    <div className="relative max-w-xs">
                      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search patients..."
                        className="pl-9"
                      />
                    </div>
                    <ul className="divide-y divide-border">
                      {filteredPatients.map((p) => {
                        const meta = patientStatusMeta[p.status];
                        return (
                          <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                            <Person name={p.name} subtitle={`${p.mrn} · ${p.bedRoom}`} size="sm" />
                            <div className="text-right">
                              <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
                              <p className="mt-1 text-xs text-muted-foreground">{p.lastUpdate}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </TabsContent>
                  <TabsContent value="updates" className="mt-4">
                    <Timeline events={shiftTimeline} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center text-center">
                <Person name={`Dr. ${currentDoctor.firstName} ${currentDoctor.lastName}`} subtitle={currentDoctor.specialty} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-foreground hover:bg-accent"
                  >
                    <action.icon className="size-4 text-muted-foreground" />
                    {action.label}
                  </button>
                ))}
                <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent">
                  <Settings className="size-4" /> Account Settings
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
