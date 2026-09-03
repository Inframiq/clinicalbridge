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
import { useAuthRole } from "@/context/auth-provider";
import { useFacilities } from "@/hooks/use-facilities";
import { useAutosave } from "@/hooks/use-autosave";
import { uploadDocumentToStorage, type UploadedFileMetadata } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import { describeSupabaseError } from "@/lib/supabase/log";

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
  documentsComplete: z.boolean().refine((v) => v, "Please upload all required documents before continuing"),
  agreeToTerms: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormValues = z.infer<typeof schema>;

const steps = [{ label: "Basic Info" }, { label: "Documents" }, { label: "Review & Submit" }];

const stepFields: Path<FormValues>[][] = [
  ["name", "registrationNumber", "governmentLicense", "hospitalType", "city", "contactPerson", "email", "phone"],
  ["documentsComplete"],
  ["agreeToTerms"],
];

const documentChecklist = [
  { key: "governmentRegistration", label: "Government Registration Certificate" },
  { key: "medicalLicense", label: "Medical License" },
  { key: "taxRegistration", label: "Tax Registration" },
  { key: "accreditation", label: "Hospital Accreditation" },
  { key: "authorizedSignatory", label: "Authorized Signatory Proof" },
];

const initialDefaults: FormValues = {
  name: "",
  registrationNumber: "",
  governmentLicense: "",
  hospitalType: hospitalTypes[0],
  city: "",
  contactPerson: "",
  email: "",
  phone: "",
  documentsComplete: false,
  agreeToTerms: false,
};

export function HospitalOnboardingWizard() {
  const router = useRouter();
  const { login, refreshProfile } = useAuthRole();
  const { registerHospital } = useFacilities();
  const [stepIndex, setStepIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileMetadata>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: autosavedData, save: saveDraft, clear: clearDraft, isHydrated } = useAutosave<FormValues>(
    "hospital_onboarding",
    initialDefaults
  );

  const {
    register,
    control,
    trigger,
    watch,
    reset,
    setValue,
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
    const { data: metadata, error } = await uploadDocumentToStorage(file, "hospital_docs");
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
        const facilityId = crypto.randomUUID();

        if (userId) {
          const { error: facilityInsertErr } = await supabase.from("facilities").insert({
            id: facilityId,
            profile_id: userId,
            name: values.name,
            registration_number: values.registrationNumber,
            government_license: values.governmentLicense,
            hospital_type: values.hospitalType,
            city: values.city,
            contact_person: values.contactPerson,
            email: values.email,
            phone: values.phone,
            uploaded_documents: uploadedFiles,
          });

          if (facilityInsertErr) {
            console.error("Facilities insert DB Error:", describeSupabaseError(facilityInsertErr));
            toast.error(`Database Insert Failed: ${describeSupabaseError(facilityInsertErr)}`);
            setIsSubmitting(false);
            return;
          }

          const { error: profileUpdateErr } = await supabase.from("profiles").update({
            completed_onboarding: true,
            verification_status: "Submitted",
            full_name: values.name,
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

        registerHospital({
          id: facilityId,
          name: values.name,
          city: values.city,
          registrationNumber: values.registrationNumber,
          governmentLicense: values.governmentLicense,
          hospitalType: values.hospitalType,
          contactPerson: values.contactPerson,
          email: values.email,
          phone: values.phone,
        });

        clearDraft();
        login("hospital");
        toast.success("Registration submitted! Your hospital is now waiting for approval.");
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
              <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : stepIndex === steps.length - 1 ? (
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
