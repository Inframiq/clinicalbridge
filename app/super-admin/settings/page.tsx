"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PLATFORM } from "@/lib/config/brand";

const notificationPrefs = [
  { id: "hospital-verifications", label: "New hospital registrations", description: "A hospital submits documents for review." },
  { id: "doctor-verifications", label: "New doctor registrations", description: "A doctor's credentials are ready for review." },
  { id: "disputes", label: "Disputes & flags", description: "Payment disputes or flagged accounts needing attention." },
  { id: "platform-updates", label: "Platform updates", description: "Release notes and scheduled maintenance." },
];

export default function SuperAdminSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    "hospital-verifications": true,
    "doctor-verifications": true,
    disputes: true,
    "platform-updates": false,
  });

  return (
    <div>
      <PageHeader title="Settings" description="Platform information and notification preferences." />

      <div className="grid max-w-2xl grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-brand" /> Platform
            </CardTitle>
            <CardDescription>Core platform identity — configured at the operator level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Platform Name</span>
              <span className="min-w-0 truncate font-medium text-foreground">{PLATFORM.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5 shrink-0" /> Support Email
              </span>
              <span className="min-w-0 truncate font-medium text-foreground">{PLATFORM.supportEmail}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                <Phone className="size-3.5 shrink-0" /> Support Phone
              </span>
              <span className="min-w-0 truncate font-medium text-foreground">{PLATFORM.supportPhone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose what you want to be notified about.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {notificationPrefs.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={prefs[pref.id]}
                    onCheckedChange={(checked) => setPrefs((p) => ({ ...p, [pref.id]: checked }))}
                  />
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-end">
              <Button onClick={() => toast.success("Preferences saved")}>Save Preferences</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
