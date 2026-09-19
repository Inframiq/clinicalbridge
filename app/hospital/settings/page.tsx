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
import { useAuthRole } from "@/context/auth-provider";
import { useFacilities } from "@/hooks/use-facilities";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { emailField, optionalPhoneField, shortTextField } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({
  name: shortTextField(150),
  address: z.string().trim().max(200, "Must be 200 characters or fewer").optional().or(z.literal("")),
  city: shortTextField(80),
  phone: optionalPhoneField,
  email: emailField,
});

const notificationPrefs = [
  { id: "new-applications", label: "New shift applications", description: "Get notified when a doctor applies to a shift." },
  { id: "shift-status", label: "Shift status changes", description: "Check-ins, completions, and cancellations." },
  { id: "payments", label: "Payment updates", description: "Approvals and processed payouts." },
  { id: "code-red", label: "Code Red alerts", description: "Urgent, high-priority staffing needs." },
];

export default function AdminSettingsPage() {
  const { profile } = useAuthRole();
  const { facilities, updateFacilityProfile } = useFacilities();
  const myFacility = facilities.find((f) => f.profileId === profile?.id);

  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "", email: "" });
  const [loadedFacilityId, setLoadedFacilityId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    prefs,
    setPref,
    save: savePrefs,
    saving: savingPrefs,
  } = useNotificationPreferences({
    "new-applications": true,
    "shift-status": true,
    payments: true,
    "code-red": true,
  });

  // Adjust state during render (not in an effect) the first time each
  // facility's data becomes available, so the form starts populated with
  // real values without an extra render pass or a flash of empty inputs.
  if (myFacility && myFacility.id !== loadedFacilityId) {
    setLoadedFacilityId(myFacility.id);
    setForm({
      name: myFacility.name,
      address: myFacility.address ?? "",
      city: myFacility.city,
      phone: myFacility.phone,
      email: myFacility.email,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!myFacility) return;
    const result = schema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Check the highlighted fields");
      return;
    }
    setSaving(true);
    await updateFacilityProfile(myFacility.id, result.data);
    setSaving(false);
    toast.success("Settings saved");
  }

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
              {!myFacility ? (
                <p className="text-sm text-muted-foreground">
                  No facility record found for your account yet.
                </p>
              ) : (
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="org-name">Organization Name</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <Building2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="org-name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            maxLength={150}
                            className="pl-9"
                          />
                        </div>
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="org-address">Address</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="org-address"
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            maxLength={200}
                            className="pl-9"
                          />
                        </div>
                      </FieldContent>
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="org-phone">Phone</FieldLabel>
                        <FieldContent>
                          <div className="relative">
                            <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="org-phone"
                              type="tel"
                              value={form.phone}
                              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                              maxLength={20}
                              className="pl-9"
                            />
                          </div>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="org-email">Email</FieldLabel>
                        <FieldContent>
                          <div className="relative">
                            <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="org-email"
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                              maxLength={254}
                              className="pl-9"
                            />
                          </div>
                        </FieldContent>
                      </Field>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
