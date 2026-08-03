"use client";

import { Controller, useForm } from "react-hook-form";
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
import { DEPARTMENTS } from "@/lib/mock-data/departments";

const experienceOptions = ["0-2 Years", "2-4 Years", "4-6 Years", "6-8 Years", "8-10 Years", "10+ Years"];

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  licenseNumber: z.string().min(1, "Medical registration number is required"),
  department: z.string().min(1, "Select a department"),
  qualification: z.string().min(1, "Qualification is required"),
  yearsOfExperience: z.string().min(1, "Select experience level"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterDoctorForm({ onSuccess }: { onSuccess?: () => void }) {
  const { registerDoctor } = useDoctors();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      licenseNumber: "",
      department: DEPARTMENTS[0],
      qualification: "",
      yearsOfExperience: experienceOptions[0],
      email: "",
      phone: "",
    },
  });

  function onSubmit(values: FormValues) {
    const doctor = registerDoctor(values);
    toast.success(`${doctor.firstName} ${doctor.lastName} registered — pending verification`);
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName">First Name</FieldLabel>
            <FieldContent>
              <Input id="firstName" {...register("firstName")} aria-invalid={!!errors.firstName} />
              <FieldError errors={[errors.firstName]} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
            <FieldContent>
              <Input id="lastName" {...register("lastName")} aria-invalid={!!errors.lastName} />
              <FieldError errors={[errors.lastName]} />
            </FieldContent>
          </Field>
        </div>

        <Field data-invalid={!!errors.licenseNumber}>
          <FieldLabel htmlFor="licenseNumber">Medical Registration Number</FieldLabel>
          <FieldContent>
            <Input id="licenseNumber" {...register("licenseNumber")} aria-invalid={!!errors.licenseNumber} />
            <FieldError errors={[errors.licenseNumber]} />
          </FieldContent>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Department</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.qualification}>
            <FieldLabel htmlFor="qualification">Qualification</FieldLabel>
            <FieldContent>
              <Input
                id="qualification"
                placeholder="e.g. MD, Emergency Medicine"
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
              <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} />
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
