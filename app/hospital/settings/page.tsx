"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ACTIVE_ORGANIZATION } from "@/lib/config/brand";

const notificationPrefs = [
  { id: "new-applications", label: "New shift applications", description: "Get notified when a doctor applies to a shift." },
  { id: "shift-status", label: "Shift status changes", description: "Check-ins, completions, and cancellations." },
  { id: "payments", label: "Payment updates", description: "Approvals and processed payouts." },
  { id: "code-red", label: "Code Red alerts", description: "Urgent, high-priority staffing needs." },
];

export default function AdminSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    "new-applications": true,
    "shift-status": true,
    payments: true,
    "code-red": true,
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization profile and preferences." />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>
                This information appears on shift postings and generated documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Settings saved");
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="org-name">Organization Name</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Building2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="org-name" defaultValue={ACTIVE_ORGANIZATION.name} className="pl-9" />
                      </div>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="org-address">Address</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="org-address" defaultValue={ACTIVE_ORGANIZATION.address} className="pl-9" />
                      </div>
                    </FieldContent>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="org-phone">Phone</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="org-phone" defaultValue={ACTIVE_ORGANIZATION.phone} className="pl-9" />
                        </div>
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="org-email">Email</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="org-email" defaultValue={ACTIVE_ORGANIZATION.email} className="pl-9" />
                        </div>
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit">Save Changes</Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 max-w-2xl">
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
                      onCheckedChange={(checked) =>
                        setPrefs((p) => ({ ...p, [pref.id]: checked }))
                      }
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
