"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Building2, MapPin, Minus, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useShifts } from "@/hooks/use-shifts";
import { useDepartments } from "@/hooks/use-departments";
import { useFacilities } from "@/hooks/use-facilities";
import { useAuthRole } from "@/context/auth-provider";
import { formatCurrency, to12Hour } from "@/lib/format";
import type { ExperienceLevel, ShiftType } from "@/types";

const shiftTypes: ShiftType[] = [
  "Emergency (Level 1)",
  "Critical Care",
  "General",
  "Elective",
  "Night Coverage",
];

const experienceLevels: ExperienceLevel[] = ["Entry Level", "Mid Level+", "Senior", "Expert"];

const schema = z
  .object({
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    department: z.string().min(1, "Select a department"),
    shiftType: z.string().min(1, "Select a shift type"),
    subSpecialty: z.string().optional(),
    hourlyRate: z.number().min(1, "Enter a valid rate"),
    doctorsNeeded: z.number().min(1).max(10),
    experienceLevel: z.string().min(1, "Select an experience level"),
    description: z.string().min(10, "Add a short description of requirements"),
    codeRed: z.boolean(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

function estimateHours(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, minutes / 60);
}

export function BroadcastShiftForm({ onSuccess }: { onSuccess?: () => void }) {
  const { broadcastShift } = useShifts();
  const { departments } = useDepartments();
  const { facilities } = useFacilities();
  const { profile } = useAuthRole();

  const myFacility = facilities.find((f) => f.profileId === profile?.id);
  const myDepartments = departments.filter((d) => d.facilityId === myFacility?.id);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      startTime: "08:00",
      endTime: "16:00",
      department: "",
      shiftType: shiftTypes[0],
      subSpecialty: "",
      hourlyRate: 120,
      doctorsNeeded: 1,
      experienceLevel: "Mid Level+",
      description: "",
      codeRed: false,
    },
  });

  const [startTime, endTime, hourlyRate, doctorsNeeded, codeRed, department] = watch([
    "startTime",
    "endTime",
    "hourlyRate",
    "doctorsNeeded",
    "codeRed",
    "department",
  ]);

  // Departments load asynchronously from Supabase; default the field to the
  // first one once available instead of at form-init time when the list was
  // still empty.
  useEffect(() => {
    if (!department && myDepartments.length > 0) {
      setValue("department", myDepartments[0].name);
    }
  }, [department, myDepartments, setValue]);

  const hours = estimateHours(startTime, endTime);
  const estimatedTotal = hours * (hourlyRate || 0) * (doctorsNeeded || 0);

  async function onSubmit(values: FormValues) {
    if (!myFacility) {
      toast.error("Couldn't find your hospital's facility record. Please contact support.");
      return;
    }
    try {
      await broadcastShift({
        title: values.department.replace(" Department", "").replace(" Unit", ""),
        department: values.department,
        facilityId: myFacility.id,
        facilityName: myFacility.name,
        location: { address: myFacility.name, city: myFacility.city, state: "", lat: 0, lng: 0 },
        date: values.date,
        startTime: to12Hour(values.startTime),
        endTime: to12Hour(values.endTime),
        shiftType: values.shiftType as ShiftType,
        subSpecialty: values.subSpecialty || undefined,
        hourlyRate: values.hourlyRate,
        doctorsNeeded: values.doctorsNeeded,
        experienceLevel: values.experienceLevel as ExperienceLevel,
        description: values.description,
        codeRed: values.codeRed,
      });
    } catch {
      // AppDataProvider already rolled back and showed an error toast
      return;
    }
    toast.success("Shift broadcasted successfully!");
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.date}>
            <FieldLabel htmlFor="date">Date</FieldLabel>
            <FieldContent>
              <Input id="date" type="date" {...register("date")} aria-invalid={!!errors.date} />
              <FieldError errors={[errors.date]} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.startTime}>
            <FieldLabel htmlFor="startTime">Start Time</FieldLabel>
            <FieldContent>
              <Input id="startTime" type="time" {...register("startTime")} />
              <FieldError errors={[errors.startTime]} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.endTime}>
            <FieldLabel htmlFor="endTime">End Time</FieldLabel>
            <FieldContent>
              <Input id="endTime" type="time" {...register("endTime")} />
              <FieldError errors={[errors.endTime]} />
            </FieldContent>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Department / Unit</FieldLabel>
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
          <Field>
            <FieldLabel>Shift Type</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="shiftType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shiftTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="subSpecialty">Sub-specialty (Optional)</FieldLabel>
            <FieldContent>
              <Input id="subSpecialty" placeholder="e.g. Trauma" {...register("subSpecialty")} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.hourlyRate}>
            <FieldLabel htmlFor="hourlyRate">Hourly Rate ($)</FieldLabel>
            <FieldContent>
              <Input
                id="hourlyRate"
                type="number"
                min={1}
                {...register("hourlyRate", { valueAsNumber: true })}
              />
              <FieldError errors={[errors.hourlyRate]} />
            </FieldContent>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>No. of Doctors Needed</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="doctorsNeeded"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => field.onChange(Math.max(1, field.value - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <div className="flex h-9 w-14 items-center justify-center rounded-md border border-input text-sm font-medium">
                      {field.value}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => field.onChange(Math.min(10, field.value + 1))}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                )}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Experience Level</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="experienceLevel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel>Location</FieldLabel>
          <FieldContent>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              {myFacility ? `${myFacility.name}, ${myFacility.city}` : "No facility record found for your account"}
            </div>
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Shift Description / Requirements</FieldLabel>
          <FieldContent>
            <Textarea
              id="description"
              rows={3}
              placeholder="Seeking experienced physicians for this shift. Must have relevant certifications."
              {...register("description")}
            />
            <FieldError errors={[errors.description]} />
          </FieldContent>
        </Field>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="size-4 text-brand" /> Smart Match Targeting
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Users className="mx-auto mb-1 size-4 text-muted-foreground" />
              <p className="text-lg font-semibold text-foreground">48</p>
              <p className="text-xs text-muted-foreground">Target Doctors</p>
            </div>
            <div>
              <Building2 className="mx-auto mb-1 size-4 text-muted-foreground" />
              <p className="text-lg font-semibold text-foreground">95%</p>
              <p className="text-xs text-muted-foreground">Match Score</p>
            </div>
            <div>
              <Sparkles className="mx-auto mb-1 size-4 text-muted-foreground" />
              <p className="text-lg font-semibold text-foreground">5–10 min</p>
              <p className="text-xs text-muted-foreground">Est. Response</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-danger-muted px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Code Red Emergency</p>
              <p className="text-xs text-muted-foreground">
                Enable to get priority visibility and instant alerts.
              </p>
            </div>
          </div>
          <Controller
            control={control}
            name="codeRed"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm text-muted-foreground">Estimated Total Cost</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(estimatedTotal, { decimals: false })}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(hourlyRate || 0)}/hr × {hours.toFixed(0)} hrs × {doctorsNeeded} doctor
              {doctorsNeeded > 1 ? "s" : ""}
            </p>
          </div>
          <Button type="submit" size="lg" variant={codeRed ? "destructive" : "default"} disabled={isSubmitting}>
            {codeRed ? "Broadcast Code Red Shift" : "Broadcast Shift"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
