"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { describeSupabaseError } from "@/lib/supabase/services/utils";
import { isoDateYearsAgo, isoDateYearsFromNow, todayIsoDate } from "@/lib/utils";
import type { Doctor } from "@/types";

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
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Required"),
  dob: z
    .string()
    .min(1, "Required")
    .refine((v) => isYearInRange(v, MIN_DOB, MAX_DOB), "Enter a valid date of birth"),
  gender: z.string().min(1, "Required"),
  npiNumber: z.string().min(5, "Required"),
  primarySpecialty: z.string().min(1, "Required"),
  subSpecialty: z.string().optional(),
  yearsOfExperience: z.string().min(1, "Required"),
  employmentType: z.string().min(1, "Required"),
  preferredLocations: z.string().min(1, "Add at least one location"),

  licenseNumber: z.string().min(1, "Required"),
  licenseState: z.string().min(1, "Required"),
  licenseExpiry: z
    .string()
    .min(1, "Required")
    .refine((v) => isYearInRange(v, MIN_LICENSE_EXPIRY, MAX_LICENSE_EXPIRY), "Enter a valid expiry date"),

  documentsComplete: z.boolean().refine((v) => v, "Please upload all required documents before continuing"),

  backgroundCheckConsent: z.boolean().refine((v) => v, "Consent is required to continue"),

  bankAccountHolder: z.string().min(1, "Required"),
  bankName: z.string().min(1, "Required"),
  accountNumber: z.string().min(4, "Required"),
  routingNumber: z.string().min(4, "Required"),

  agreeToTerms: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormValues = z.infer<typeof schema>;

const steps = [
  { label: "Personal Info" },
  { label: "Medical License" },
  { label: "Certifications" },
  { label: "Documents" },
  { label: "Background Check" },
  { label: "Bank Details" },
  { label: "Review & Submit" },
];

const stepFields: Path<FormValues>[][] = [
  ["firstName", "lastName", "email", "phone", "dob", "gender", "npiNumber", "primarySpecialty", "yearsOfExperience", "employmentType", "preferredLocations"],
  ["licenseNumber", "licenseState", "licenseExpiry"],
  [],
  ["documentsComplete"],
  ["backgroundCheckConsent"],
  ["bankAccountHolder", "bankName", "accountNumber", "routingNumber"],
  ["agreeToTerms"],
];

const documentChecklist = [
  { key: "medicalLicense", label: "Medical License" },
  { key: "deaCertificate", label: "DEA Certificate" },
  { key: "boardCertification", label: "Board Certification" },
  { key: "aclsCertification", label: "ACLS Certification" },
  { key: "blsCertification", label: "BLS Certification" },
  { key: "photoId", label: "Photo ID" },
  { key: "cvResume", label: "CV / Resume" },
];

const certificationOptions = [
  { key: "acls", label: "ACLS — Advanced Cardiac Life Support" },
  { key: "bls", label: "BLS — Basic Life Support" },
  { key: "atls", label: "ATLS — Advanced Trauma Life Support" },
  { key: "boardCertified", label: "Board Certified in Primary Specialty" },
];

const initialDefaults: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  npiNumber: "",
  primarySpecialty: "",
  subSpecialty: "",
  yearsOfExperience: "",
  employmentType: "",
  preferredLocations: "",
  licenseNumber: "",
  licenseState: "",
  licenseExpiry: "",
  documentsComplete: false,
  backgroundCheckConsent: false,
  bankAccountHolder: "",
  bankName: "",
  accountNumber: "",
  routingNumber: "",
  agreeToTerms: false,
};

export function OnboardingWizard() {
  const router = useRouter();
  const { login, refreshProfile } = useAuthRole();
  const { registerSelfDoctor } = useDoctors();
  const [stepIndex, setStepIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileMetadata>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certifications, setCertifications] = useState<Record<string, boolean>>({
    acls: true,
    bls: true,
  });

  const { data: autosavedData, save: saveDraft, clear: clearDraft, isHydrated } = useAutosave<FormValues>(
    "locum_tenens_onboarding",
    initialDefaults
  );

  const {
    register,
    control,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialDefaults,
  });

  const values = watch();

  // Save changes to local storage draft
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
    const { data: metadata, error } = await uploadDocumentToStorage(file, "locum_tenens_docs");
    setUploadingKey(null);

    if (error || !metadata) {
      console.error(`Document upload failed for ${file.name}:`, error);
      toast.error(error?.message || `Failed to upload ${file.name}`);
      return;
    }

    setUploadedFiles((prev) => {
      const next = { ...prev, [key]: metadata };
      setValue("documentsComplete", Object.keys(next).length === documentChecklist.length, {
        shouldValidate: false,
      });
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
        const doctorId = crypto.randomUUID();

        if (userId) {
          const formattedExpiry = values.licenseExpiry ? values.licenseExpiry : null;

          const { error: doctorInsertErr } = await supabase.from("doctors").insert({
            id: doctorId,
            profile_id: userId,
            doctor_kind: "locum_tenens",
            first_name: values.firstName,
            last_name: values.lastName,
            specialty: values.primarySpecialty,
            sub_specialty: values.subSpecialty || null,
            license_number: values.licenseNumber,
            license_expiry: formattedExpiry,
            npi_number: values.npiNumber,
            years_of_experience: values.yearsOfExperience,
            employment_type: values.employmentType,
            preferred_locations: values.preferredLocations
              .split(";")
              .map((l) => l.trim())
              .filter(Boolean),
            verified: false,
            uploaded_documents: uploadedFiles,
            certifications,
          });

          if (doctorInsertErr) {
            console.error("Doctors insert DB Error:", describeSupabaseError(doctorInsertErr));
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
            console.error("Profile update DB Error:", describeSupabaseError(profileUpdateErr));
            toast.error(`Profile Update Failed: ${describeSupabaseError(profileUpdateErr)}`);
            setIsSubmitting(false);
            return;
          }

          await refreshProfile();
        }

        registerSelfDoctor(
          {
            id: doctorId,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            specialty: values.primarySpecialty,
            subSpecialty: values.subSpecialty || undefined,
            licenseNumber: values.licenseNumber,
            licenseExpiry: values.licenseExpiry,
            npiNumber: values.npiNumber,
            yearsOfExperience: values.yearsOfExperience,
            employmentType: values.employmentType as Doctor["employmentType"],
            preferredLocations: values.preferredLocations
              .split(";")
              .map((l) => l.trim())
              .filter(Boolean),
          },
          "locum_tenens"
        );

        clearDraft();
        login("locum_tenens");
        toast.success("Application submitted! Your profile is now waiting for approval.");
        router.push("/verification/status?status=Submitted");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : describeSupabaseError(err);
        console.error("Submission Exception:", errorMsg);
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
                        <Input id="dob" type="date" min={MIN_DOB} max={MAX_DOB} {...register("dob")} />
                        <FieldError errors={[errors.dob]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.gender}>
                      <FieldLabel>Gender *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="gender"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.gender]} />
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.primarySpecialty}>
                      <FieldLabel>Primary Specialty *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="primarySpecialty"
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
                        <FieldError errors={[errors.primarySpecialty]} />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="subSpecialty">Sub-specialty (Optional)</FieldLabel>
                      <FieldContent>
                        <Input id="subSpecialty" placeholder="e.g. Trauma Care" {...register("subSpecialty")} />
                      </FieldContent>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.yearsOfExperience}>
                      <FieldLabel>Years of Experience *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="yearsOfExperience"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {["0-2 Years", "3-5 Years", "6-8 Years", "8-10 Years", "10+ Years"].map((y) => (
                                  <SelectItem key={y} value={y}>
                                    {y}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.yearsOfExperience]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.employmentType}>
                      <FieldLabel>Current Employment Type *</FieldLabel>
                      <FieldContent>
                        <Controller
                          control={control}
                          name="employmentType"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Independent / Locum">Independent / Locum</SelectItem>
                                <SelectItem value="W2 Contract">W2 Contract</SelectItem>
                                <SelectItem value="Full-Time">Full-Time</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.employmentType]} />
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
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.licenseNumber}>
                      <FieldLabel htmlFor="licenseNumber">Medical License Number *</FieldLabel>
                      <FieldContent>
                        <Input id="licenseNumber" {...register("licenseNumber")} />
                        <FieldError errors={[errors.licenseNumber]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.licenseState}>
                      <FieldLabel htmlFor="licenseState">Issuing State *</FieldLabel>
                      <FieldContent>
                        <Input id="licenseState" placeholder="e.g. NY" {...register("licenseState")} />
                        <FieldError errors={[errors.licenseState]} />
                      </FieldContent>
                    </Field>
                  </div>
                  <Field data-invalid={!!errors.licenseExpiry}>
                    <FieldLabel htmlFor="licenseExpiry">License Expiry Date *</FieldLabel>
                    <FieldContent>
                      <Input
                        id="licenseExpiry"
                        type="date"
                        min={MIN_LICENSE_EXPIRY}
                        max={MAX_LICENSE_EXPIRY}
                        {...register("licenseExpiry")}
                      />
                      <FieldError errors={[errors.licenseExpiry]} />
                    </FieldContent>
                  </Field>
                </>
              )}

              {stepIndex === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select the certifications you currently hold.
                  </p>
                  {certificationOptions.map((cert) => (
                    <label
                      key={cert.key}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                    >
                      <Checkbox
                        checked={certifications[cert.key] ?? false}
                        onCheckedChange={(checked) =>
                          setCertifications((c) => ({ ...c, [cert.key]: !!checked }))
                        }
                      />
                      {cert.label}
                    </label>
                  ))}
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload the required documents to Supabase Storage (PDF, JPG, PNG — max 10MB).
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
                  <FieldError errors={[errors.documentsComplete]} />
                </div>
              )}

              {stepIndex === 4 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Background Check Consent</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        We partner with a third-party provider to run a standard background check.
                        This is required before you can accept your first shift.
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

              {stepIndex === 5 && (
                <>
                  <Field data-invalid={!!errors.bankAccountHolder}>
                    <FieldLabel htmlFor="bankAccountHolder">Account Holder Name *</FieldLabel>
                    <FieldContent>
                      <Input id="bankAccountHolder" {...register("bankAccountHolder")} />
                      <FieldError errors={[errors.bankAccountHolder]} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.bankName}>
                    <FieldLabel htmlFor="bankName">Bank Name *</FieldLabel>
                    <FieldContent>
                      <Input id="bankName" {...register("bankName")} />
                      <FieldError errors={[errors.bankName]} />
                    </FieldContent>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.accountNumber}>
                      <FieldLabel htmlFor="accountNumber">Account Number *</FieldLabel>
                      <FieldContent>
                        <Input id="accountNumber" {...register("accountNumber")} />
                        <FieldError errors={[errors.accountNumber]} />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!errors.routingNumber}>
                      <FieldLabel htmlFor="routingNumber">Routing Number *</FieldLabel>
                      <FieldContent>
                        <Input id="routingNumber" {...register("routingNumber")} />
                        <FieldError errors={[errors.routingNumber]} />
                      </FieldContent>
                    </Field>
                  </div>
                </>
              )}

              {stepIndex === 6 && (
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
                      <p className="text-xs text-muted-foreground">Specialty</p>
                      <p className="font-medium text-foreground">{values.primarySpecialty || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">License Number</p>
                      <p className="font-medium text-foreground">{values.licenseNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Documents Uploaded</p>
                      <p className="font-medium text-foreground">
                        {uploadedCount} / {documentChecklist.length}
                      </p>
                    </div>
                  </div>
                  <Textarea placeholder="Anything else you'd like us to know? (optional)" rows={3} />
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
              <Person name={`${values.firstName || "New"} ${values.lastName || "Doctor"}`} />
              <p className="mt-2 text-xs text-muted-foreground">{values.primarySpecialty || "Specialty pending"}</p>
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
