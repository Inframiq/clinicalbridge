"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Person } from "@/components/dashboard/person";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useShifts } from "@/hooks/use-shifts";
import { getTopMatchesForSpecialty } from "@/lib/selectors";
import { formatDate } from "@/lib/format";
import { Inbox } from "lucide-react";

export default function SmartMatchesPage() {
  const { shifts } = useShifts();
  const openShifts = shifts.filter((s) => s.status === "open" || s.status === "pending");
  const [selectedId, setSelectedId] = useState(openShifts[0]?.id ?? null);
  const selectedShift = openShifts.find((s) => s.id === selectedId) ?? null;
  const matches = selectedShift ? getTopMatchesForSpecialty(selectedShift.title) : [];

  return (
    <div>
      <PageHeader
        title="Smart Matches"
        description="Ranked doctor recommendations for your open shifts."
      />

      {openShifts.length === 0 ? (
        <EmptyState icon={Inbox} title="No open shifts" description="Broadcast a shift to see smart matches." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Open Shifts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openShifts.map((shift) => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedId(shift.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedId === shift.id ? "border-brand bg-brand-muted/40" : "border-border hover:bg-accent"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{shift.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.department} · {formatDate(shift.date)}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Sparkles className="size-4 text-brand" /> Top Matches for {selectedShift?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <EmptyState icon={Inbox} title="No matches found" description="Try a different shift." />
              ) : (
                <ul className="space-y-5">
                  {matches.map((doctor) => (
                    <li key={doctor.id} className="flex items-center gap-4">
                      <Person
                        name={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                        subtitle={`${doctor.specialty} · ${doctor.distanceMiles} mi · ★ ${doctor.rating}`}
                        className="flex-1"
                      />
                      <div className="w-32 shrink-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Match</span>
                          <span className="font-medium text-foreground">{doctor.matchScore}%</span>
                        </div>
                        <Progress value={doctor.matchScore} className="mt-1" />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.success(`Invitation sent to Dr. ${doctor.lastName}`)}
                      >
                        <Send className="size-3.5" /> Invite
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
