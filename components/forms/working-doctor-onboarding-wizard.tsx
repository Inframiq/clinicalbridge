"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, FileText, ShieldX, Upload, Loader2 } from "lucide-react";
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
import { useHasMounted } from "@/hooks/use-has-mounted";
import { uploadDocumentToStorage, type UploadedFileMetadata } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import { describeSupabaseError, reportSupabase } from "@/lib/supabase/log";
import { isoDateYearsAgo, isoDateYearsFromNow, todayIsoDate } from "@/lib/utils";
import { MEDICAL_SPECIALTIES } from "@/lib/config/specialties";
import { nameField, emailField, phoneField, npiField, licenseNumberField, shortTextField } from "@/lib/validation";

const MIN_DOB = isoDateYearsAgo(120);
const MAX_DOB = todayIsoDate();
const MIN_LICENSE_EXPIRY = todayIsoDate();
const MAX_LICENSE_EXPIRY = isoDateYearsFromNow(50);

function isYearInRange(value: string, min: string, max: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= Number(min.slice(0, 4)) && year <= Number(max.slice(0, 4));
}

const schema = z.object({
  firstName: nameField(60),
  lastName: nameField(60),
  email: emailField,
  phone: phoneField,
  dob: z
    .string()
    .min(1, "Required")
    .refine((v) => isYearInRange(v, MIN_DOB, MAX_DOB), "Enter a valid date of birth"),
  specialty: z.string().min(1, "Required"),
  subSpecialty: z.string().max(80, "Must be 80 characters or fewer").optional(),
  npiNumber: npiField,
  hospitalAffiliation: shortTextField(150),
  licenseNumber: licenseNumberField(40),
  licenseExpiry: z
    .string()
    .min(1, "Required")
    .refine((v) => isYearInRange(v, MIN_LICENSE_EXPIRY, MAX_LICENSE_EXPIRY), "Enter a valid expiry date"),
  documentsComplete: z.boolean().refine((v) => v, "Please upload all required documents before continuing"),
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
  ["documentsComplete"],
  ["agreeToTerms"],
];

const documentChecklist = [
  { key: "medicalLicense", label: "Medical License" },
  { key: "hospitalEmploymentProof", label: "Hospital Employment Verification Letter" },
  { key: "photoId", label: "Photo ID" },
  { key: "cvResume", label: "CV / Resume" },
];

// A document that was rejected in a previous review round still has a file
// object (so the checklist "uploaded" check alone can't catch it) — it must
// be replaced before the application counts as ready to resubmit.
function allDocumentsResolved(files: Record<string, UploadedFileMetadata>) {
  return (
    Object.keys(files).length === documentChecklist.length &&
    Object.values(files).every((f) => f.status !== "rejected")
  );
}

const initialDefaults: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dob: "",
  specialty: "",
  subSpecialty: "",
  npiNumber: "",
  hospitalAffiliation: "",
  licenseNumber: "",
  licenseExpiry: "",
  documentsComplete: false,
  agreeToTerms: false,
};

export function WorkingDoctorOnboardingWizard() {
  const router = useRouter();
  const { refreshProfile, profile } = useAuthRole();
  const { doctors, registerSelfDoctor } = useDoctors();
  // Date-input bounds below come from module-level `todayIsoDate()` /
  // `isoDateYears*()` consts, which are evaluated once at module load and so can
  // differ by a calendar day between a long-lived server process and the
  // freshly-loaded client bundle. Gate them behind `useHasMounted` so the
  // server and first client render both omit min/max, then apply the
  // day-accurate bounds after hydration (interaction is always post-mount).
  const mounted = useHasMounted();
  const [stepIndex, setStepIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileMetadata>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deliberately NOT persisted anywhere client-side (no localStorage, no
  // autosave draft): a fixed or reused browser-storage key was previously
  // leaking one applicant's in-progress answers into the next person's
  // onboarding form on the same browser. Form state now lives only in
  // react-hook-form's in-memory state and is gone the moment this component
  // unmounts (refresh, navigation away, or logout).
  const {
    register,
    control,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialDefaults,
  });

  const values = watch();

  // Resuming after "Needs Changes" re-fetches already-uploaded documents from
  // Supabase (server-side, scoped to this account by `profile.id`) so the
  // applicant doesn't have to re-upload every document (including ones a
  // super admin already approved) just to fix the one that was rejected.
  // This is account data pulled from the database, not a client-side cache.
  useEffect(() => {
    if (!profile?.id) return;
    if (Object.keys(uploadedFiles).length > 0) return;
    const existing = doctors.find((d) => d.profileId === profile.id);
    if (existing?.uploadedDocuments && Object.keys(existing.uploadedDocuments).length > 0) {
      setUploadedFiles(existing.uploadedDocuments);
      setValue("documentsComplete", allDocumentsResolved(existing.uploadedDocuments), {
        shouldValidate: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const uploadedCount = Object.keys(uploadedFiles).length;
  const progressPct = Math.round(((stepIndex + (uploadedCount > 0 ? 0.5 : 0)) / steps.length) * 100);

  async function handleFileUpload(key: string, file: File) {
    setUploadingKey(key);
    const { data: metadata, error } = await uploadDocumentToStorage(file, "working_doctor_docs");
    setUploadingKey(null);

    if (error || !metadata) {
      reportSupabase(`onboarding.documentUpload(${file.name})`, error, { level: "error" });
      toast.error(error?.message || `Failed to upload ${file.name}`);
      return;
    }

    setUploadedFiles((prev) => {
      const next = { ...prev, [key]: metadata };
      setValue("documentsComplete", allDocumentsResolved(next), { shouldValidate: false });
      return next;
    });
    toast.success(`${file.name} uploaded successfully!`);
  }

  async function handleNext() {
    const fields = stepFields[stepIndex];
    const valid = fields.length === 0 ? true : await trigger(fields);
    if (!valid) return;

    if (stepIndex === steps.length - 1) {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const supabase = createClient();
        const res = await supabase.auth.getUser();
        let user = res.data?.user;

        if (!user) {
          // The access token may simply be stale (e.g. this multi-step wizard with
          // document uploads can easily run long enough to need a refresh) - retry
          // once via the refresh token before discarding the filled-out form.
          const { data: refreshed } = await supabase.auth.refreshSession();
          user = refreshed?.user ?? null;
        }

        if (!user) {
          toast.error("Session expired or user not found. Please log in again.");
          setIsSubmitting(false);
          router.push("/login");
          return;
        }

        const userId = user.id;
        // A "Needs Changes" resubmission must land on the SAME doctors row,
        // not insert a second one — doctors.profile_id has no unique
        // constraint, so blindly inserting here would silently fork the
        // applicant into two records instead of updating the reviewed one.
        const existingDoctor = doctors.find((d) => d.profileId === userId);
        const doctorId = existingDoctor?.id ?? crypto.randomUUID();

        if (userId) {
          // Format license_expiry for Postgres DATE type if present
          const formattedExpiry = values.licenseExpiry ? values.licenseExpiry : null;

          const doctorFields = {
            doctor_kind: "working" as const,
            first_name: values.firstName,
            last_name: values.lastName,
            specialty: values.specialty,
            sub_specialty: values.subSpecialty || null,
            license_number: values.licenseNumber,
            license_expiry: formattedExpiry,
            npi_number: values.npiNumber,
            years_of_experience: "5+ Years",
            employment_type: "Full-Time",
            verified: false,
            uploaded_documents: uploadedFiles,
          };

          const { error: doctorInsertErr } = existingDoctor
            ? await supabase.from("doctors").update(doctorFields).eq("id", doctorId)
            : await supabase.from("doctors").insert({ id: doctorId, profile_id: userId, ...doctorFields });

          if (doctorInsertErr) {
            reportSupabase("onboarding.doctorInsert", doctorInsertErr, { level: "error" });
            toast.error(`Database Insert Failed: ${describeSupabaseError(doctorInsertErr)}`);
            setIsSubmitting(false);
            return;
          }

          const { error: profileUpdateErr } = await supabase.from("profiles").update({
            completed_onboarding: true,
            verification_status: "Submitted",
            full_name: `${values.firstName} ${values.lastName}`,
            phone: values.phone,
          }).eq("id", userId);

          if (profileUpdateErr) {
            reportSupabase("onboarding.profileUpdate", profileUpdateErr, { level: "error" });
            toast.error(`Profile Update Failed: ${describeSupabaseError(profileUpdateErr)}`);
            setIsSubmitting(false);
            return;
          }

          await refreshProfile();
        }

        try {
          await registerSelfDoctor(
            {
              id: doctorId,
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              phone: values.phone,
              specialty: values.specialty,
              subSpecialty: values.subSpecialty || undefined,
              licenseNumber: values.licenseNumber,
              licenseExpiry: values.licenseExpiry,
              npiNumber: values.npiNumber,
              yearsOfExperience: "5+ Years",
              employmentType: "Full-Time",
              preferredLocations: [],
            },
            "working"
          );
        } catch {
          // AppDataProvider already rolled back and showed an error toast
          return;
        }

        toast.success("Application submitted! Your working doctor application is waiting for approval.");
        router.push("/verification/status?status=Submitted");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : describeSupabaseError(err);
        reportSupabase("onboarding.submit", err, { level: "error" });
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
                        <Input id="firstName" maxLength={60} {...register("firstName")} />
                        <FieldError errors={[errors.firstName]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.lastName}>
                      <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                      <FieldContent>
                        <Input id="lastName" maxLength={60} {...register("lastName")} />
                        <FieldError errors={[errors.lastName]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.email}>
                      <FieldLabel htmlFor="email">Email Address *</FieldLabel>
                      <FieldContent>
                        <Input id="email" type="email" maxLength={254} {...register("email")} />
                        <FieldError errors={[errors.email]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.phone}>
                      <FieldLabel htmlFor="phone">Phone Number *</FieldLabel>
                      <FieldContent>
                        <Input id="phone" type="tel" maxLength={20} {...register("phone")} />
                        <FieldError errors={[errors.phone]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field data-invalid={!!errors.dob}>
                      <FieldLabel htmlFor="dob">Date of Birth *</FieldLabel>
                      <FieldContent>
                        <Input
                          id="dob"
                          type="date"
                          min={mounted ? MIN_DOB : undefined}
                          max={mounted ? MAX_DOB : undefined}
                          {...register("dob")}
                        />
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
                                {MEDICAL_SPECIALTIES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
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
                        <Input id="npiNumber" maxLength={10} {...register("npiNumber")} />
                        <FieldError errors={[errors.npiNumber]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="subSpecialty">Sub-specialty (Optional)</FieldLabel>
                      <FieldContent>
                        <Input id="subSpecialty" placeholder="e.g. Trauma Care" maxLength={80} {...register("subSpecialty")} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.hospitalAffiliation}>
                      <FieldLabel htmlFor="hospitalAffiliation">Primary Hospital Affiliation *</FieldLabel>
                      <FieldContent>
                        <Input id="hospitalAffiliation" placeholder="St. Jude General Hospital" maxLength={150} {...register("hospitalAffiliation")} />
                        <FieldError errors={[errors.hospitalAffiliation]} />
                      </FieldContent>
                    </Field>
                  </div>
                </>
              )}

              {stepIndex === 1 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.licenseNumber}>
                      <FieldLabel htmlFor="licenseNumber">Medical License Number *</FieldLabel>
                      <FieldContent>
                        <Input id="licenseNumber" maxLength={40} {...register("licenseNumber")} />
                        <FieldError errors={[errors.licenseNumber]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.licenseExpiry}>
                      <FieldLabel htmlFor="licenseExpiry">License Expiry Date *</FieldLabel>
                      <FieldContent>
                        <Input
                          id="licenseExpiry"
                          type="date"
                          min={mounted ? MIN_LICENSE_EXPIRY : undefined}
                          max={mounted ? MAX_LICENSE_EXPIRY : undefined}
                          {...register("licenseExpiry")}
                        />
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
                    const uploaded = uploadedFiles[doc.key];
                    const isRejected = uploaded?.status === "rejected";
                    const isUploading = uploadingKey === doc.key;
                    const pickerInput = (
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(doc.key, file);
                        }}
                      />
                    );
                    return (
                      <div key={doc.key} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <FileText className="size-4 text-muted-foreground" /> {doc.label}
                          </span>
                          {isRejected ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                                <ShieldX className="size-3.5" /> Rejected — re-upload
                              </span>
                              <label className="cursor-pointer">
                                <Button type="button" size="sm" variant="outline" disabled={isUploading} asChild>
                                  <span>
                                    {isUploading ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="size-3.5" />
                                    )}
                                    Replace
                                  </span>
                                </Button>
                                {pickerInput}
                              </label>
                            </div>
                          ) : uploaded ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-success">
                              <CheckCircle2 className="size-3.5" /> {uploaded.name}
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
                              {pickerInput}
                            </label>
                          )}
                        </div>
                        {isRejected && uploaded?.rejectionReason && (
                          <p className="mt-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                            <span className="font-medium">Reason: </span>
                            {uploaded.rejectionReason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <FieldError errors={[errors.documentsComplete]} />
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
                {documentChecklist.map((doc) => {
                  const uploaded = uploadedFiles[doc.key];
                  const isRejected = uploaded?.status === "rejected";
                  return (
                    <li key={doc.key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{doc.label}</span>
                      {isRejected ? (
                        <span className="text-xs font-medium text-destructive">Rejected</span>
                      ) : uploaded ? (
                        <span className="text-xs font-medium text-success">Uploaded</span>
                      ) : (
                        <span className="text-xs font-medium text-destructive">Not Uploaded</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
