"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { joinPostShiftRecords } from "@/lib/selectors";
import { formatDate } from "@/lib/format";

const credentialingDocs = [
  { key: "medicalLicense", label: "Medical License" },
  { key: "deaCertificate", label: "DEA Certificate" },
  { key: "boardCertification", label: "Board Certification" },
  { key: "aclsCertification", label: "ACLS Certification" },
  { key: "blsCertification", label: "BLS Certification" },
  { key: "photoId", label: "Photo ID" },
  { key: "cvResume", label: "CV / Resume" },
];

export default function DoctorDocumentsPage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctorId = doctors.find((d) => d.profileId === profile?.id)?.id;
  // No backend tracks these specific credentialing document types yet (this
  // is separate from the medicalCouncil/degree/identity/hospitalApproval
  // verification checklist collected during onboarding) - upload state is
  // session-local until that's built, so it starts as "not uploaded" rather
  // than fabricating that every document is already on file.
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const { payments } = usePayments();
  const { shifts } = useShifts();
  const joined = joinPostShiftRecords(payments.filter((p) => p.doctorId === myDoctorId), shifts);

  return (
    <div>
      <PageHeader title="Documents" description="Manage your credentialing documents and shift paperwork." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credentialing Documents</CardTitle>
            <CardDescription>Keep these up to date to stay eligible for shifts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {credentialingDocs.map((doc) => (
              <div key={doc.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" /> {doc.label}
                </span>
                {uploaded[doc.key] ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3.5" /> Uploaded
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUploaded((u) => ({ ...u, [doc.key]: true }));
                      toast.success(`${doc.label} uploaded`);
                    }}
                  >
                    <Upload className="size-3.5" /> Upload
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Paperwork</CardTitle>
            <CardDescription>Timesheets and clinical notes from completed shifts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {joined.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.shift?.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.submittedAt)}</p>
                </div>
                <Button size="icon" variant="ghost" className="size-8">
                  <Download className="size-4" />
                </Button>
              </div>
            ))}
            {joined.length === 0 && (
              <EmptyState
                icon={FileText}
                title="No shift paperwork yet"
                description="Timesheets and clinical notes from completed shifts will appear here."
                className="border-none py-6"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
