"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useDoctors } from "@/hooks/use-doctors";
import { useDepartments } from "@/hooks/use-departments";
import { useFacilities } from "@/hooks/use-facilities";
import { useAuthRole } from "@/context/auth-provider";
import { nameField, emailField, phoneField, licenseNumberField, shortTextField } from "@/lib/validation";

const experienceOptions = ["0-2 Years", "2-4 Years", "4-6 Years", "6-8 Years", "8-10 Years", "10+ Years"];

const schema = z.object({
  firstName: nameField(60),
  lastName: nameField(60),
  licenseNumber: licenseNumberField(40),
  department: z.string().min(1, "Select a department"),
  qualification: shortTextField(100, "Qualification is required"),
  yearsOfExperience: z.string().min(1, "Select experience level"),
  email: emailField,
  phone: phoneField,
});

type FormValues = z.infer<typeof schema>;

export function RegisterDoctorForm({ onSuccess }: { onSuccess?: () => void }) {
  const { registerDoctor } = useDoctors();
  const { departments } = useDepartments();
  const { facilities } = useFacilities();
  const { profile } = useAuthRole();

  const myFacility = facilities.find((f) => f.profileId === profile?.id);
  const myDepartments = departments.filter((d) => d.facilityId === myFacility?.id);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      licenseNumber: "",
      department: "",
      qualification: "",
      yearsOfExperience: experienceOptions[0],
      email: "",
      phone: "",
    },
  });

  const department = useWatch({ control, name: "department" });
  useEffect(() => {
    if (!department && myDepartments.length > 0) {
      setValue("department", myDepartments[0].name);
    }
  }, [department, myDepartments, setValue]);

  async function onSubmit(values: FormValues) {
    try {
      const doctor = await registerDoctor(values);
      toast.success(`${doctor.firstName} ${doctor.lastName} registered — pending verification`);
      onSuccess?.();
    } catch {
      // AppDataProvider already rolled back and showed an error toast
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName">First Name</FieldLabel>
            <FieldContent>
              <Input id="firstName" maxLength={60} {...register("firstName")} aria-invalid={!!errors.firstName} />
              <FieldError errors={[errors.firstName]} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
            <FieldContent>
              <Input id="lastName" maxLength={60} {...register("lastName")} aria-invalid={!!errors.lastName} />
              <FieldError errors={[errors.lastName]} />
            </FieldContent>
          </Field>
        </div>

        <Field data-invalid={!!errors.licenseNumber}>
          <FieldLabel htmlFor="licenseNumber">Medical Registration Number</FieldLabel>
          <FieldContent>
            <Input id="licenseNumber" maxLength={40} {...register("licenseNumber")} aria-invalid={!!errors.licenseNumber} />
            <FieldError errors={[errors.licenseNumber]} />
          </FieldContent>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Department</FieldLabel>
            <FieldContent>
              {myDepartments.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  No departments yet — add one on the Departments page first.
                </p>
              ) : (
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {myDepartments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.qualification}>
            <FieldLabel htmlFor="qualification">Qualification</FieldLabel>
            <FieldContent>
              <Input
                id="qualification"
                placeholder="e.g. MD, Emergency Medicine"
                maxLength={100}
                {...register("qualification")}
                aria-invalid={!!errors.qualification}
              />
              <FieldError errors={[errors.qualification]} />
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel>Experience</FieldLabel>
          <FieldContent>
            <Controller
              control={control}
              name="yearsOfExperience"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceOptions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldContent>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <FieldContent>
              <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
              <FieldError errors={[errors.email]} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <FieldContent>
              <Input id="phone" type="tel" maxLength={20} {...register("phone")} aria-invalid={!!errors.phone} />
              <FieldError errors={[errors.phone]} />
            </FieldContent>
          </Field>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          Register Doctor
        </Button>
      </FieldGroup>
    </form>
  );
}
