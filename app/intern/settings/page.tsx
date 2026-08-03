"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, ShieldCheck, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useDoctors } from "@/hooks/use-doctors";
import { currentIntern } from "@/lib/mock-data/doctors";
import { DEPARTMENTS } from "@/lib/mock-data/departments";

export default function InternSettingsPage() {
  const { doctors, updateDoctorProfile } = useDoctors();
  const me = doctors.find((d) => d.id === currentIntern.id) ?? currentIntern;

  const [phone, setPhone] = useState(me.phone);
  const [email, setEmail] = useState(me.email);
  const [preferredDepartments, setPreferredDepartments] = useState<string[]>(
    me.replacementPreferences?.preferredDepartments ?? []
  );

  function toggleDepartment(dept: string) {
    setPreferredDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and preferred departments." />

      <div className="grid max-w-2xl grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown to hospitals when you apply for supervised shifts.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDoctorProfile(me.id, { phone, email });
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
                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
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
            <CardTitle>Preferred Departments</CardTitle>
            <CardDescription>Opportunities are narrowed to these departments once selected.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEPARTMENTS.map((dept) => (
                <label key={dept} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={preferredDepartments.includes(dept)}
                    onCheckedChange={() => toggleDepartment(dept)}
                  />
                  {dept}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  updateDoctorProfile(me.id, {
                    replacementPreferences: { ...me.replacementPreferences, preferredDepartments },
                  });
                  toast.success("Preferences saved");
                }}
              >
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>Supervised-hours tracking and sign-off history.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState icon={ShieldCheck} title="On track" description="No outstanding sign-offs." className="border-none py-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
