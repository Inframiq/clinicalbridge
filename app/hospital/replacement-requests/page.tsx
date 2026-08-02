"use client";

import { toast } from "sonner";
import { CheckCircle2, XCircle, PencilLine, ClipboardList, Clock3, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModifyReplacementRequestDialog } from "@/components/forms/modify-replacement-request-dialog";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { useDoctors } from "@/hooks/use-doctors";
import { getDoctorById } from "@/lib/selectors";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReplacementRequestStatus } from "@/types";

const statusMeta: Record<ReplacementRequestStatus, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Pending Review", tone: "warning" },
  approved: { label: "Approved — Published", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  filled: { label: "Filled", tone: "info" },
};

export default function ReplacementRequestsPage() {
  const {
    replacementRequests,
    approveReplacementRequest,
    updateReplacementRequestStatus,
    escalateReplacementRequestToInterns,
  } = useReplacementRequests();
  const { shifts } = useShifts();
  const { applications, updateApplicationStatus } = useApplications();
  const { assignDoctorToShift } = useDoctors();

  const pending = replacementRequests.filter((r) => r.status === "pending");
  const approved = replacementRequests.filter((r) => r.status === "approved");
  const rejected = replacementRequests.filter((r) => r.status === "rejected");

  return (
    <div>
      <PageHeader
        title="Replacement Requests"
        description="Review requests from working doctors before they're published to the marketplace."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Requests" value={String(replacementRequests.length)} icon={ClipboardList} iconTone="brand" />
        <StatCard label="Pending Review" value={String(pending.length)} icon={Clock3} iconTone="warning" />
        <StatCard label="Approved" value={String(approved.length)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="Rejected" value={String(rejected.length)} icon={XCircle} iconTone="neutral" />
      </div>

      <div className="mt-6">
        {replacementRequests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No replacement requests"
            description="Requests submitted by working doctors will appear here for approval."
          />
        ) : (
          <div className="space-y-4">
            {replacementRequests.map((request) => {
              const doctor = getDoctorById(request.requestingDoctorId);
              const shift = shifts.find((s) => s.id === request.shiftId);
              const meta = statusMeta[request.status];
              const applicants =
                request.status === "approved" && shift
                  ? applications.filter((a) => a.shiftId === shift.id && a.status === "in_review")
                  : [];

              return (
                <Card key={request.id}>
                  <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        {doctor && (
                          <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.specialty} size="sm" />
                        )}
                        <StatusBadge label={meta.label} tone={meta.tone} />
                        {request.status === "approved" && shift?.replacementStage && (
                          <StatusBadge
                            label={shift.replacementStage === "open_to_intern" ? "Escalated to Interns" : "Published to Locum"}
                            tone={shift.replacementStage === "open_to_intern" ? "info" : "brand"}
                            dot={false}
                          />
                        )}
                      </div>
                      <p className="text-sm text-foreground">
                        {shift?.title ?? "Shift"} · {shift ? formatDate(shift.date) : ""}
                        {shift ? ` · ${shift.startTime}–${shift.endTime}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                      {request.notes && (
                        <p className="text-xs text-muted-foreground italic">&quot;{request.notes}&quot;</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>Prefers: {request.preferredReplacementType}</span>
                        <span className="flex items-center gap-1">
                          <Wallet className="size-3.5" /> {formatCurrency(request.hourlyCompensation)}/hr
                        </span>
                        <span>Requested {formatDate(request.requestedAt)}</span>
                      </div>

                      {request.status === "approved" && shift && (
                        <div className="space-y-2 rounded-xl border border-border p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Applicants ({applicants.length})
                          </p>
                          {applicants.length === 0 ? (
                            <EmptyState
                              icon={ClipboardList}
                              title="No applicants yet"
                              description="Locum doctors and interns who apply will show up here."
                              className="border-none py-4"
                            />
                          ) : (
                            <ul className="space-y-2">
                              {applicants.map((app) => {
                                const applicant = getDoctorById(app.doctorId);
                                if (!applicant) return null;
                                return (
                                  <li key={app.id} className="flex items-center justify-between gap-2">
                                    <Person
                                      name={`Dr. ${applicant.firstName} ${applicant.lastName}`}
                                      subtitle={applicant.doctorKind === "intern" ? "Intern" : "Locum Doctor"}
                                      size="sm"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        assignDoctorToShift(shift.id, applicant.id);
                                        applicants
                                          .filter((a) => a.id !== app.id)
                                          .forEach((a) => updateApplicationStatus(a.id, "rejected"));
                                        updateReplacementRequestStatus(request.id, "filled");
                                        toast.success(`Dr. ${applicant.lastName} confirmed for ${shift.title}`);
                                      }}
                                    >
                                      Confirm
                                    </Button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    {request.status === "pending" && (
                      <div className="flex shrink-0 items-center gap-2">
                        <ModifyReplacementRequestDialog
                          request={request}
                          trigger={
                            <Button size="sm" variant="outline">
                              <PencilLine className="size-4" /> Modify
                            </Button>
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateReplacementRequestStatus(request.id, "rejected");
                            toast.success("Request rejected");
                          }}
                        >
                          <XCircle className="size-4" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            approveReplacementRequest(request.id);
                            toast.success("Approved — vacancy published to Locum Doctors");
                          }}
                        >
                          <CheckCircle2 className="size-4" /> Approve
                        </Button>
                      </div>
                    )}

                    {request.status === "approved" && shift?.replacementStage === "locum_only" && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            escalateReplacementRequestToInterns(request.id);
                            toast.success("Escalated to Interns");
                          }}
                        >
                          <TrendingUp className="size-4" /> Escalate to Interns
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
