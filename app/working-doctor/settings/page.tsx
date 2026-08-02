"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useDoctors } from "@/hooks/use-doctors";
import { currentWorkingDoctor } from "@/lib/mock-data/doctors";
import { DEPARTMENTS } from "@/lib/mock-data/departments";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkingDoctorSettingsPage() {
  const { doctors, updateDoctorProfile } = useDoctors();
  const me = doctors.find((d) => d.id === currentWorkingDoctor.id) ?? currentWorkingDoctor;

  const [phone, setPhone] = useState(me.phone);
  const [email, setEmail] = useState(me.email);
  const [travelDistance, setTravelDistance] = useState(
    me.replacementPreferences?.preferredTravelDistanceMiles ?? 10
  );
  const [maxHours, setMaxHours] = useState(me.replacementPreferences?.maxHoursPerWeek ?? 40);
  const [departments, setDepartments] = useState<string[]>(
    me.replacementPreferences?.preferredDepartments ?? [me.department ?? ""]
  );
  const [availableDays, setAvailableDays] = useState<string[]>(
    me.replacementPreferences?.availableDays ?? DAYS
  );

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
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
                updateDoctorProfile(currentWorkingDoctor.id, { phone, email });
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
                        <Input id="firstName" defaultValue={currentWorkingDoctor.firstName} className="pl-9" disabled />
                      </div>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                    <FieldContent>
                      <Input id="lastName" defaultValue={currentWorkingDoctor.lastName} disabled />
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
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
                    {DEPARTMENTS.map((dept) => (
                      <label key={dept} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={departments.includes(dept)}
                          onCheckedChange={() => toggle(departments, setDepartments, dept)}
                        />
                        {dept}
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
                    updateDoctorProfile(currentWorkingDoctor.id, {
                      replacementPreferences: {
                        preferredTravelDistanceMiles: travelDistance,
                        maxHoursPerWeek: maxHours,
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
      </div>
    </div>
  );
}
