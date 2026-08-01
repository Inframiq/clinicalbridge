"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { currentDoctor } from "@/lib/mock-data/doctors";

const notificationPrefs = [
  { id: "shift-invites", label: "New shift invitations", description: "Get notified about shifts matching your specialty." },
  { id: "application-updates", label: "Application updates", description: "Status changes on shifts you've applied to." },
  { id: "payments", label: "Payment updates", description: "Payout approvals and processed payments." },
  { id: "messages", label: "Messages", description: "New messages from facility staff." },
];

export default function DoctorSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    "shift-invites": true,
    "application-updates": true,
    payments: true,
    messages: false,
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and notification preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>This information is shown to hospitals when you apply for shifts.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Profile updated");
                }}
              >
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="firstName" defaultValue={currentDoctor.firstName} className="pl-9" />
                        </div>
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                      <FieldContent>
                        <Input id="lastName" defaultValue={currentDoctor.lastName} />
                      </FieldContent>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" defaultValue={currentDoctor.email} className="pl-9" />
                      </div>
                    </FieldContent>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="phone">Phone</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="phone" defaultValue={currentDoctor.phone} className="pl-9" />
                        </div>
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="locations">Preferred Locations</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="locations"
                            defaultValue={currentDoctor.preferredLocations.join("; ")}
                            className="pl-9"
                          />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
