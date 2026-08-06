"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, FileText, Upload, Loader2 } from "lucide-react";
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
import { useAutosave } from "@/hooks/use-autosave";
import { uploadDocumentToStorage, type UploadedFileMetadata } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Required"),
  dob: z.string().min(1, "Required"),
  specialty: z.string().min(1, "Required"),
  npiNumber: z.string().min(5, "Required"),
  hospitalAffiliation: z.string().min(1, "Required"),
  licenseNumber: z.string().min(1, "Required"),
  licenseExpiry: z.string().min(1, "Required"),
  agreeToTerms: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormValues = z.infer<typeof schema>;

const steps = [
  { label: "Personal & Clinical" },
  { label: "Medical License" },
  { label: "Documents" },
  { label: "Review & Submit" },
];

const stepFields: Path<FormValues>[][] = [
  ["firstName", "lastName", "email", "phone", "dob", "specialty", "npiNumber", "hospitalAffiliation"],
  ["licenseNumber", "licenseExpiry"],
  [],
  ["agreeToTerms"],
];

const documentChecklist = [
  { key: "medicalLicense", label: "Medical License" },
  { key: "hospitalEmploymentProof", label: "Hospital Employment Verification Letter" },
  { key: "photoId", label: "Photo ID" },
  { key: "cvResume", label: "CV / Resume" },
];

const initialDefaults: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dob: "",
  specialty: "",
  npiNumber: "",
  hospitalAffiliation: "",
  licenseNumber: "",
  licenseExpiry: "",
  agreeToTerms: false,
};

export function WorkingDoctorOnboardingWizard() {
  const router = useRouter();
  const { login, signUpWithSupabase, refreshProfile } = useAuthRole();
  const { registerSelfDoctor } = useDoctors();
  const [stepIndex, setStepIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileMetadata>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: autosavedData, save: saveDraft, clear: clearDraft, isHydrated } = useAutosave<FormValues>(
    "working_doctor_onboarding",
    initialDefaults
  );

  const {
    register,
    control,
    trigger,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialDefaults,
  });

  const values = watch();

  useEffect(() => {
    const subscription = watch((value) => {
      saveDraft(value as Partial<FormValues>);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveDraft]);

  useEffect(() => {
    if (isHydrated) {
      reset(autosavedData);
    }
  }, [isHydrated, autosavedData, reset]);

  const uploadedCount = Object.keys(uploadedFiles).length;
  const progressPct = Math.round(((stepIndex + (uploadedCount > 0 ? 0.5 : 0)) / steps.length) * 100);

  async function handleFileUpload(key: string, file: File) {
    setUploadingKey(key);
    console.log(`[Working Doctor Registration] Starting document upload for key '${key}': ${file.name}`);
    const { data: metadata, error } = await uploadDocumentToStorage(file, "working_doctor_docs");
    setUploadingKey(null);

    if (error || !metadata) {
      console.error(`[Working Doctor Registration] Document upload failed for ${file.name}:`, error);
      toast.error(error?.message || `Failed to upload ${file.name}`);
      return;
    }

    setUploadedFiles((prev) => ({ ...prev, [key]: metadata }));
    console.log(`[Working Doctor Registration] Storage upload succeeded. Path: ${metadata.path}`);
    toast.success(`${file.name} uploaded successfully!`);
  }

  async function handleNext() {
    const fields = stepFields[stepIndex];
    const valid = fields.length === 0 ? true : await trigger(fields);
    if (!valid) return;

    if (stepIndex === steps.length - 1) {
      if (isSubmitting) return;
      setIsSubmitting(true);
      console.log("[Working Doctor Registration] Submitting registration workflow...");
      try {
        const supabase = createClient();
        const res = await supabase.auth.getUser();
        const user = res.data?.user;

        if (!user) {
          toast.error("Session expired or user not found. Please log in again.");
          setIsSubmitting(false);
          router.push("/login");
          return;
        }

        const userId = user.id;

        if (userId) {
          // Format license_expiry for Postgres DATE type if present
          const formattedExpiry = values.licenseExpiry ? values.licenseExpiry : null;

          // 1. Insert working doctor record into PostgreSQL
          console.log(`[Working Doctor Registration] Inserting doctor record into PostgreSQL for user ${userId}...`);
          const { error: doctorInsertErr } = await supabase.from("doctors").insert({
            profile_id: userId,
            doctor_kind: "working",
            first_name: values.firstName,
            last_name: values.lastName,
            specialty: values.specialty,
            license_number: values.licenseNumber,
            license_expiry: formattedExpiry,
            npi_number: values.npiNumber,
            years_of_experience: "5+ Years",
            employment_type: "Full-Time",
            verified: false,
            verification_details: uploadedFiles,
          });

          if (doctorInsertErr) {
            console.error("[Working Doctor Registration] Doctors insert DB Error:", doctorInsertErr);
            toast.error(`Database Insert Failed: ${doctorInsertErr.message}`);
            setIsSubmitting(false);
            return;
          }

          // 2. Update profile onboarding status
          console.log(`[Working Doctor Registration] Updating profile onboarding status for ${userId}...`);
          const { error: profileUpdateErr } = await supabase.from("profiles").update({
            completed_onboarding: true,
            verification_status: "Submitted",
            full_name: `${values.firstName} ${values.lastName}`,
            phone: values.phone,
          }).eq("id", userId);

          if (profileUpdateErr) {
            console.error("[Working Doctor Registration] Profile update DB Error:", profileUpdateErr);
            toast.error(`Profile Update Failed: ${profileUpdateErr.message}`);
            setIsSubmitting(false);
            return;
          }

          await refreshProfile();
        }

        registerSelfDoctor(
          {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            specialty: values.specialty,
            licenseNumber: values.licenseNumber,
            licenseExpiry: values.licenseExpiry,
            npiNumber: values.npiNumber,
            yearsOfExperience: "5+ Years",
            employmentType: "Full-Time",
            preferredLocations: [],
          },
          "working"
        );

        clearDraft();
        login("working_doctor");
        console.log("[Working Doctor Registration] Registration submission completed successfully. Redirecting...");
        toast.success("Application submitted! Your working doctor application is waiting for approval.");
        router.push("/verification/status?status=Submitted");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[Working Doctor Registration] Submission Exception:", err);
        toast.error(`Submission error: ${errorMsg}`);
      } finally {
        setIsSubmitting(false);
      }
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field data-invalid={!!errors.dob}>
                      <FieldLabel htmlFor="dob">Date of Birth *</FieldLabel>
                      <FieldContent>
                        <Input id="dob" type="date" {...register("dob")} />
                        <FieldError errors={[errors.dob]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.specialty}>
                      <FieldLabel>Specialty *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="specialty"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select specialty" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Emergency Medicine", "Internal Medicine", "Pediatrics", "Orthopedics", "Critical Care"].map(
                                  (s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.specialty]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.npiNumber}>
                      <FieldLabel htmlFor="npiNumber">NPI Number *</FieldLabel>
                      <FieldContent>
                        <Input id="npiNumber" {...register("npiNumber")} />
                        <FieldError errors={[errors.npiNumber]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <Field data-invalid={!!errors.hospitalAffiliation}>
                    <FieldLabel htmlFor="hospitalAffiliation">Primary Hospital Affiliation *</FieldLabel>
                    <FieldContent>
                      <Input id="hospitalAffiliation" placeholder="St. Jude General Hospital" {...register("hospitalAffiliation")} />
                      <FieldError errors={[errors.hospitalAffiliation]} />
                    </FieldContent>
                  </Field>
                </>
              )}

              {stepIndex === 1 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.licenseNumber}>
                      <FieldLabel htmlFor="licenseNumber">Medical License Number *</FieldLabel>
                      <FieldContent>
                        <Input id="licenseNumber" {...register("licenseNumber")} />
                        <FieldError errors={[errors.licenseNumber]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.licenseExpiry}>
                      <FieldLabel htmlFor="licenseExpiry">License Expiry Date *</FieldLabel>
                      <FieldContent>
                        <Input id="licenseExpiry" type="date" {...register("licenseExpiry")} />
                        <FieldError errors={[errors.licenseExpiry]} />
                      </FieldContent>
                    </Field>
                  </div>
                </>
              )}

              {stepIndex === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload the required verification documents to Supabase Storage (PDF, JPG, PNG — max 10MB).
                  </p>
                  {documentChecklist.map((doc) => {
                    const isUploaded = !!uploadedFiles[doc.key];
                    const isUploading = uploadingKey === doc.key;
                    return (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <FileText className="size-4 text-muted-foreground" /> {doc.label}
                        </span>
                        {isUploaded ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="size-3.5" /> {uploadedFiles[doc.key].name}
                          </span>
                        ) : (
                          <label className="cursor-pointer">
                            <Button type="button" size="sm" variant="outline" disabled={isUploading} asChild>
                              <span>
                                {isUploading ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Upload className="size-3.5" />
                                )}
                                Upload
                              </span>
                            </Button>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.key, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
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
                        Dr. {values.firstName} {values.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hospital Affiliation</p>
                      <p className="font-medium text-foreground">{values.hospitalAffiliation || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Specialty</p>
                      <p className="font-medium text-foreground">{values.specialty || "—"}</p>
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
              <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : stepIndex === steps.length - 1 ? (
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
              <Person name={`Dr. ${values.firstName || "New"} ${values.lastName || "Doctor"}`} />
              <p className="mt-2 text-xs text-muted-foreground">{values.specialty || "Specialty pending"}</p>
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
                    {uploadedFiles[doc.key] ? (
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
