"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, User } from "lucide-react";
import { AccountDataCard } from "@/components/settings/account-data-card";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useDoctors } from "@/hooks/use-doctors";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthRole } from "@/context/auth-provider";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { emailField, optionalPhoneField, integerField } from "@/lib/validation";
import { z } from "zod";

const notificationPrefs = [
  { id: "schedule-changes", label: "Schedule changes", description: "Shift reassignments or time changes." },
  { id: "replacement-updates", label: "Replacement request updates", description: "Status changes on your coverage requests." },
  { id: "payments", label: "Payment updates", description: "Payroll and reimbursement updates." },
  { id: "messages", label: "Messages", description: "New messages from hospital staff." },
];

const profileSchema = z.object({
  email: emailField,
  phone: optionalPhoneField,
});

const preferencesSchema = z.object({
  travelDistance: integerField(0, 500),
  maxHours: integerField(0, 168),
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkingDoctorSettingsPage() {
  const { doctors, updateDoctorProfile } = useDoctors();
  const { departments: allDepartments } = useDepartments();
  const { profile } = useAuthRole();
  const me = doctors.find((d) => d.profileId === profile?.id);

  const [phone, setPhone] = useState(me?.phone ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [travelDistance, setTravelDistance] = useState(
    me?.replacementPreferences?.preferredTravelDistanceMiles ?? 10
  );
  const [maxHours, setMaxHours] = useState(me?.replacementPreferences?.maxHoursPerWeek ?? 40);
  const [departments, setDepartments] = useState<string[]>(
    me?.replacementPreferences?.preferredDepartments ?? (me?.department ? [me.department] : [])
  );
  const [availableDays, setAvailableDays] = useState<string[]>(
    me?.replacementPreferences?.availableDays ?? DAYS
  );
  const {
    prefs,
    setPref,
    save: savePrefs,
    saving: savingPrefs,
  } = useNotificationPreferences({
    "schedule-changes": true,
    "replacement-updates": true,
    payments: true,
    messages: true,
  });

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  if (!me) {
    return (
      <div>
        <PageHeader title="Settings" description="Manage your profile and replacement preferences." />
        <EmptyState icon={User} title="Profile not found" description="Your doctor profile hasn't loaded yet." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and replacement preferences." />

      <div className="grid max-w-2xl grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown to your hospital and to replacement coordinators.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const result = profileSchema.safeParse({ phone, email });
                if (!result.success) {
                  toast.error(result.error.issues[0]?.message ?? "Check the highlighted fields");
                  return;
                }
                updateDoctorProfile(me.id, result.data);
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
                        <Input id="firstName" defaultValue={me.firstName} className="pl-9" disabled />
                      </div>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                    <FieldContent>
                      <Input id="lastName" defaultValue={me.lastName} disabled />
                    </FieldContent>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={254}
                        className="pl-9"
                      />
                    </div>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={20}
                        className="pl-9"
                      />
                    </div>
                  </FieldContent>
                </Field>
                <div className="flex justify-end">
                  <Button type="submit">Save Changes</Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replacement Preferences</CardTitle>
            <CardDescription>
              Used to match you with suitable coverage requests and to configure your own requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="travelDistance">Preferred Travel Distance (miles)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="travelDistance"
                      type="number"
                      min={0}
                      max={500}
                      value={travelDistance}
                      onChange={(e) => setTravelDistance(Number(e.target.value))}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="maxHours">Maximum Hours Per Week</FieldLabel>
                  <FieldContent>
                    <Input
                      id="maxHours"
                      type="number"
                      min={0}
                      max={168}
                      value={maxHours}
                      onChange={(e) => setMaxHours(Number(e.target.value))}
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Preferred Departments</FieldLabel>
                <FieldContent>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {allDepartments.map((dept) => (
                      <label key={dept.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={departments.includes(dept.name)}
                          onCheckedChange={() => toggle(departments, setDepartments, dept.name)}
                        />
                        {dept.name}
                      </label>
                    ))}
                  </div>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Available Days</FieldLabel>
                <FieldContent>
                  <div className="flex flex-wrap gap-3">
                    {DAYS.map((day) => (
                      <label key={day} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={availableDays.includes(day)}
                          onCheckedChange={() => toggle(availableDays, setAvailableDays, day)}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </FieldContent>
              </Field>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const result = preferencesSchema.safeParse({ travelDistance, maxHours });
                    if (!result.success) {
                      toast.error(result.error.issues[0]?.message ?? "Check the highlighted fields");
                      return;
                    }
                    updateDoctorProfile(me.id, {
                      replacementPreferences: {
                        preferredTravelDistanceMiles: result.data.travelDistance,
                        maxHoursPerWeek: result.data.maxHours,
                        preferredDepartments: departments,
                        availableDays,
                      },
                    });
                    toast.success("Replacement preferences saved");
                  }}
                >
                  Save Preferences
                </Button>
              </div>
            </FieldGroup>
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

        <AccountDataCard />
      </div>
    </div>
  );
}
