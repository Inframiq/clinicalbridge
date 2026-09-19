"use client";

import { Mail, Phone, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PLATFORM } from "@/lib/config/brand";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";

const notificationPrefs = [
  { id: "hospital-verifications", label: "New hospital registrations", description: "A hospital submits documents for review." },
  { id: "doctor-verifications", label: "New doctor registrations", description: "A doctor's credentials are ready for review." },
  { id: "disputes", label: "Disputes & flags", description: "Payment disputes or flagged accounts needing attention." },
  { id: "platform-updates", label: "Platform updates", description: "Release notes and scheduled maintenance." },
];

export default function SuperAdminSettingsPage() {
  const { prefs, setPref, save: savePrefs, saving: savingPrefs } = useNotificationPreferences({
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Platform Name</span>
              <span className="font-medium text-foreground">{PLATFORM.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" /> Support Email
              </span>
              <span className="font-medium text-foreground">{PLATFORM.supportEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="size-3.5" /> Support Phone
              </span>
              <span className="font-medium text-foreground">{PLATFORM.supportPhone}</span>
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
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch
                    checked={prefs[pref.id]}
                    onCheckedChange={(checked) => setPref(pref.id, checked)}
                  />
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-end">
              <Button onClick={savePrefs} disabled={savingPrefs}>
                {savingPrefs ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
