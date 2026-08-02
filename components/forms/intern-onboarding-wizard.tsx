"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, FileText, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Stepper } from "@/components/forms/stepper";
import { CircularProgress } from "@/components/dashboard/circular-progress";
import { Person } from "@/components/dashboard/person";
import { useAuthRole } from "@/context/auth-provider";
import { useDoctors } from "@/hooks/use-doctors";
import { DEPARTMENTS } from "@/lib/mock-data/departments";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Required"),
  dob: z.string().min(1, "Required"),
  department: z.string().min(1, "Required"),
  preferredLocations: z.string().min(1, "Add at least one location"),
  backgroundCheckConsent: z.boolean().refine((v) => v, "Consent is required to continue"),
  agreeToTerms: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormValues = z.infer<typeof schema>;

const steps = [
  { label: "Personal Info" },
  { label: "Documents" },
  { label: "Background Check" },
  { label: "Review & Submit" },
];

const stepFields: Path<FormValues>[][] = [
  ["firstName", "lastName", "email", "phone", "dob", "department", "preferredLocations"],
  [],
  ["backgroundCheckConsent"],
  ["agreeToTerms"],
];

const documentChecklist = [
  { key: "photoId", label: "Photo ID" },
  { key: "enrollmentLetter", label: "Medical School Enrollment Letter" },
  { key: "supervisorLetter", label: "Supervising Program Letter" },
  { key: "immunizationRecords", label: "Immunization Records" },
  { key: "cvResume", label: "CV / Resume" },
];

export function InternOnboardingWizard() {
  const router = useRouter();
  const { login } = useAuthRole();
  const { registerSelfDoctor } = useDoctors();
  const [stepIndex, setStepIndex] = useState(0);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});

  const {
    register,
    control,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dob: "",
      department: DEPARTMENTS[0],
      preferredLocations: "",
      backgroundCheckConsent: false,
      agreeToTerms: false,
    },
  });

  const values = watch();
  const uploadedCount = Object.values(uploaded).filter(Boolean).length;
  const progressPct = Math.round(((stepIndex + (uploadedCount > 0 ? 0.5 : 0)) / steps.length) * 100);

  async function handleNext() {
    const fields = stepFields[stepIndex];
    const valid = fields.length === 0 ? true : await trigger(fields);
    if (!valid) return;
    if (stepIndex === steps.length - 1) {
      registerSelfDoctor(
        {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          specialty: values.department,
          licenseNumber: "",
          licenseExpiry: "",
          npiNumber: "",
          yearsOfExperience: "0-2 Years",
          employmentType: "Full-Time",
          preferredLocations: values.preferredLocations
            .split(";")
            .map((l) => l.trim())
            .filter(Boolean),
        },
        "intern"
      );
      login("intern");
      toast.success("Application submitted! Your profile is now under review.");
      router.push("/intern/dashboard");
      return;
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div>
      <Stepper steps={steps} currentIndex={stepIndex} className="mb-8" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent>
            <FieldGroup>
              {stepIndex === 0 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.firstName}>
                      <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                      <FieldContent>
                        <Input id="firstName" {...register("firstName")} />
                        <FieldError errors={[errors.firstName]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.lastName}>
                      <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                      <FieldContent>
                        <Input id="lastName" {...register("lastName")} />
                        <FieldError errors={[errors.lastName]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.email}>
                      <FieldLabel htmlFor="email">Email Address *</FieldLabel>
                      <FieldContent>
                        <Input id="email" type="email" {...register("email")} />
                        <FieldError errors={[errors.email]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.phone}>
                      <FieldLabel htmlFor="phone">Phone Number *</FieldLabel>
                      <FieldContent>
                        <Input id="phone" {...register("phone")} />
                        <FieldError errors={[errors.phone]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.dob}>
                      <FieldLabel htmlFor="dob">Date of Birth *</FieldLabel>
                      <FieldContent>
                        <Input id="dob" type="date" {...register("dob")} />
                        <FieldError errors={[errors.dob]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.department}>
                      <FieldLabel>Department of Interest *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="department"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEPARTMENTS.map((d) => (
                                  <SelectItem key={d} value={d}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.department]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <Field data-invalid={!!errors.preferredLocations}>
                    <FieldLabel htmlFor="preferredLocations">Preferred Locations *</FieldLabel>
                    <FieldContent>
                      <Input
                        id="preferredLocations"
                        placeholder="New York, NY; Boston, MA"
                        {...register("preferredLocations")}
                      />
                      <FieldError errors={[errors.preferredLocations]} />
                    </FieldContent>
                  </Field>
                </>
              )}

              {stepIndex === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload the required documents (PDF, JPG, PNG — max 10MB).
                  </p>
                  {documentChecklist.map((doc) => (
                    <div
                      key={doc.key}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-muted-foreground" /> {doc.label}
                      </span>
                      {uploaded[doc.key] ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="size-3.5" /> Uploaded
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setUploaded((u) => ({ ...u, [doc.key]: true }))}
                        >
                          <Upload className="size-3.5" /> Upload
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Background Check Consent</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        We partner with a third-party provider to run a standard background check.
                        This is required before you can accept your first supervised shift.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 text-sm">
                    <Controller
                      control={control}
                      name="backgroundCheckConsent"
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                      )}
                    />
                    I consent to a background check being performed as part of my onboarding.
                  </label>
                  <FieldError errors={[errors.backgroundCheckConsent]} />
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Review your information before submitting for verification.
                  </p>
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium text-foreground">
                        {values.firstName} {values.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{values.department || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Documents Uploaded</p>
                      <p className="font-medium text-foreground">
                        {uploadedCount} / {documentChecklist.length}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 text-sm">
                    <Controller
                      control={control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                      )}
                    />
                    I confirm the information provided is accurate and I agree to the Terms of Service.
                  </label>
                  <FieldError errors={[errors.agreeToTerms]} />
                </div>
              )}
            </FieldGroup>

            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0}>
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button type="button" onClick={handleNext}>
                {stepIndex === steps.length - 1 ? (
                  <>
                    <BadgeCheck className="size-4" /> Submit Application
                  </>
                ) : (
                  <>
                    Save & Continue <ChevronRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center text-center">
              <Person name={`${values.firstName || "New"} ${values.lastName || "Intern"}`} />
              <p className="mt-2 text-xs text-muted-foreground">{values.department || "Department pending"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-foreground">Onboarding Progress</p>
              <CircularProgress value={progressPct} label="Complete" />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="mb-3 text-sm font-medium text-foreground">Document Checklist</p>
              <ul className="space-y-2">
                {documentChecklist.map((doc) => (
                  <li key={doc.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{doc.label}</span>
                    {uploaded[doc.key] ? (
                      <span className="text-xs font-medium text-success">Uploaded</span>
                    ) : (
                      <span className="text-xs font-medium text-destructive">Not Uploaded</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
