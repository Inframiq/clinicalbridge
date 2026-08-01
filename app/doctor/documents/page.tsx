"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { currentDoctor } from "@/lib/mock-data/doctors";
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
  const [uploaded, setUploaded] = useState<Record<string, boolean>>(
    Object.fromEntries(credentialingDocs.map((d) => [d.key, true]))
  );
  const { payments } = usePayments();
  const { shifts } = useShifts();
  const joined = joinPostShiftRecords(payments.filter((p) => p.doctorId === currentDoctor.id), shifts);

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
              <p className="text-sm text-muted-foreground">No shift paperwork yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
