"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, FileText, Upload } from "lucide-react";
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
import { useAuthRole } from "@/context/auth-provider";
import { useFacilities } from "@/hooks/use-facilities";

const hospitalTypes = [
  "Multi-Specialty Hospital",
  "Community Hospital",
  "Teaching Hospital",
  "Trauma Center",
  "Specialty Clinic",
];

const schema = z.object({
  name: z.string().min(1, "Required"),
  registrationNumber: z.string().min(1, "Required"),
  governmentLicense: z.string().min(1, "Required"),
  hospitalType: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  contactPerson: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Required"),
  agreeToTerms: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormValues = z.infer<typeof schema>;

const steps = [{ label: "Basic Info" }, { label: "Documents" }, { label: "Review & Submit" }];

const stepFields: Path<FormValues>[][] = [
  ["name", "registrationNumber", "governmentLicense", "hospitalType", "city", "contactPerson", "email", "phone"],
  [],
  ["agreeToTerms"],
];

const documentChecklist = [
  { key: "governmentRegistration", label: "Government Registration Certificate" },
  { key: "medicalLicense", label: "Medical License" },
  { key: "taxRegistration", label: "Tax Registration" },
  { key: "accreditation", label: "Hospital Accreditation" },
  { key: "authorizedSignatory", label: "Authorized Signatory Proof" },
];

export function HospitalOnboardingWizard() {
  const router = useRouter();
  const { login } = useAuthRole();
  const { registerHospital } = useFacilities();
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
      name: "",
      registrationNumber: "",
      governmentLicense: "",
      hospitalType: hospitalTypes[0],
      city: "",
      contactPerson: "",
      email: "",
      phone: "",
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
      registerHospital({
        name: values.name,
        city: values.city,
        registrationNumber: values.registrationNumber,
        governmentLicense: values.governmentLicense,
        hospitalType: values.hospitalType,
        contactPerson: values.contactPerson,
        email: values.email,
        phone: values.phone,
      });
      login("hospital");
      toast.success("Registration submitted! Your hospital is now pending verification.");
      router.push("/hospital/dashboard");
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
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="name">Hospital Name *</FieldLabel>
                    <FieldContent>
                      <Input id="name" {...register("name")} />
                      <FieldError errors={[errors.name]} />
                    </FieldContent>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.registrationNumber}>
                      <FieldLabel htmlFor="registrationNumber">Registration Number *</FieldLabel>
                      <FieldContent>
                        <Input id="registrationNumber" {...register("registrationNumber")} />
                        <FieldError errors={[errors.registrationNumber]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.governmentLicense}>
                      <FieldLabel htmlFor="governmentLicense">Government License No. *</FieldLabel>
                      <FieldContent>
                        <Input id="governmentLicense" {...register("governmentLicense")} />
                        <FieldError errors={[errors.governmentLicense]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.hospitalType}>
                      <FieldLabel>Hospital Type *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="hospitalType"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {hospitalTypes.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.hospitalType]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.city}>
                      <FieldLabel htmlFor="city">Address (City, State) *</FieldLabel>
                      <FieldContent>
                        <Input id="city" placeholder="New York, NY" {...register("city")} />
                        <FieldError errors={[errors.city]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <Field data-invalid={!!errors.contactPerson}>
                    <FieldLabel htmlFor="contactPerson">Contact Person *</FieldLabel>
                    <FieldContent>
                      <Input id="contactPerson" {...register("contactPerson")} />
                      <FieldError errors={[errors.contactPerson]} />
                    </FieldContent>
                  </Field>
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
                  <p className="text-sm text-muted-foreground">
                    Review your information before submitting for verification.
                  </p>
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Hospital Name</p>
                      <p className="font-medium text-foreground">{values.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{values.hospitalType || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Registration Number</p>
                      <p className="font-medium text-foreground">{values.registrationNumber || "—"}</p>
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
                    <BadgeCheck className="size-4" /> Submit Registration
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
            <CardContent className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-foreground">{values.name || "New Hospital"}</p>
              <p className="text-xs text-muted-foreground">{values.city || "Location pending"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-foreground">Registration Progress</p>
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
