"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone, ShieldCheck, ShieldAlert, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useDoctors } from "@/hooks/use-doctors";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { DEPARTMENTS } from "@/lib/mock-data/departments";

const notificationPrefs = [
  { id: "shift-invites", label: "New shift invitations", description: "Get notified about shifts matching your specialty." },
  { id: "application-updates", label: "Application updates", description: "Status changes on shifts you've applied to." },
  { id: "payments", label: "Payment updates", description: "Payout approvals and processed payments." },
  { id: "messages", label: "Messages", description: "New messages from facility staff." },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const VERIFICATION_LABELS: Record<string, string> = {
  medicalCouncil: "Medical Council Registration",
  degree: "Degree Verification",
  identity: "Identity Verification",
  hospitalApproval: "Hospital Approval",
};

export default function DoctorSettingsPage() {
  const { doctors, updateDoctorProfile } = useDoctors();
  const me = doctors.find((d) => d.id === currentDoctor.id) ?? currentDoctor;

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    "shift-invites": true,
    "application-updates": true,
    payments: true,
    messages: false,
  });

  const [phone, setPhone] = useState(me.phone);
  const [email, setEmail] = useState(me.email);
  const [locations, setLocations] = useState(me.preferredLocations.join("; "));

  const [specialty, setSpecialty] = useState(me.specialty);
  const [subSpecialty, setSubSpecialty] = useState(me.subSpecialty ?? "");
  const [licenseNumber, setLicenseNumber] = useState(me.licenseNumber);
  const [licenseExpiry, setLicenseExpiry] = useState(me.licenseExpiry);
  const [yearsOfExperience, setYearsOfExperience] = useState(me.yearsOfExperience);
  const [languages, setLanguages] = useState((me.languages ?? []).join(", "));
  const [travelDistance, setTravelDistance] = useState(
    me.replacementPreferences?.preferredTravelDistanceMiles ?? 25
  );
  const [preferredDepartments, setPreferredDepartments] = useState<string[]>(
    me.replacementPreferences?.preferredDepartments ?? []
  );
  const [availableDays, setAvailableDays] = useState<string[]>(
    me.replacementPreferences?.availableDays ?? DAYS
  );

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const verification =
    me.verification ?? { medicalCouncil: false, degree: false, identity: false, hospitalApproval: false };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, qualifications, and preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
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
                  updateDoctorProfile(me.id, {
                    phone,
                    email,
                    preferredLocations: locations.split(";").map((l) => l.trim()).filter(Boolean),
                  });
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
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                      </div>
                    </FieldContent>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="phone">Phone</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
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
                            value={locations}
                            onChange={(e) => setLocations(e.target.value)}
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

        <TabsContent value="qualifications" className="mt-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Qualifications & Preferences</CardTitle>
              <CardDescription>
                Specialty, license, and the shifts you&apos;re open to being matched with.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="specialty">Specialty</FieldLabel>
                    <FieldContent>
                      <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="subSpecialty">Sub-specialty</FieldLabel>
                    <FieldContent>
                      <Input id="subSpecialty" value={subSpecialty} onChange={(e) => setSubSpecialty(e.target.value)} />
                    </FieldContent>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="licenseNumber">Medical License Number</FieldLabel>
                    <FieldContent>
                      <Input id="licenseNumber" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="licenseExpiry">License Expiry</FieldLabel>
                    <FieldContent>
                      <Input
                        id="licenseExpiry"
                        type="date"
                        value={licenseExpiry}
                        onChange={(e) => setLicenseExpiry(e.target.value)}
                      />
                    </FieldContent>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="experience">Years of Experience</FieldLabel>
                    <FieldContent>
                      <Input
                        id="experience"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="languages">Languages</FieldLabel>
                    <FieldContent>
                      <Input
                        id="languages"
                        placeholder="English, Spanish"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                      />
                    </FieldContent>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="travelDistance">Maximum Travel Distance (miles)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="travelDistance"
                      type="number"
                      min={0}
                      value={travelDistance}
                      onChange={(e) => setTravelDistance(Number(e.target.value))}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Preferred Departments</FieldLabel>
                  <FieldContent>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {DEPARTMENTS.map((dept) => (
                        <label key={dept} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={preferredDepartments.includes(dept)}
                            onCheckedChange={() => toggle(preferredDepartments, setPreferredDepartments, dept)}
                          />
                          {dept}
                        </label>
                      ))}
                    </div>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Availability Calendar (Days)</FieldLabel>
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
                      updateDoctorProfile(me.id, {
                        specialty,
                        subSpecialty: subSpecialty || undefined,
                        licenseNumber,
                        licenseExpiry,
                        yearsOfExperience,
                        languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
                        replacementPreferences: {
                          preferredTravelDistanceMiles: travelDistance,
                          preferredDepartments,
                          availableDays,
                        },
                      });
                      toast.success("Qualifications & preferences saved");
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>
                Your hospital reviews these steps before your profile is fully active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(verification).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <span className="text-sm text-foreground">{VERIFICATION_LABELS[key] ?? key}</span>
                    {value ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                        <ShieldCheck className="size-4" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground">
                        <ShieldAlert className="size-4" /> Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
