"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import type { PreferredReplacementType, Shift } from "@/types";

const preferredTypes: PreferredReplacementType[] = ["Locum Doctor", "Intern", "Both"];

const schema = z.object({
  reason: z.string().min(5, "Tell the hospital why you need coverage"),
  preferredReplacementType: z.string().min(1),
  hourlyCompensation: z.number().min(1, "Enter a valid hourly rate"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function RequestReplacementDialog({
  shift,
  requestingDoctorId,
  trigger,
}: {
  shift: Shift;
  requestingDoctorId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { createReplacementRequest } = useReplacementRequests();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: "",
      preferredReplacementType: "Both",
      hourlyCompensation: shift.hourlyRate,
      notes: "",
    },
  });

  function onSubmit(values: FormValues) {
    createReplacementRequest({
      shiftId: shift.id,
      requestingDoctorId,
      reason: values.reason,
      preferredReplacementType: values.preferredReplacementType as PreferredReplacementType,
      hourlyCompensation: values.hourlyCompensation,
      notes: values.notes || undefined,
    });
    toast.success(`Replacement requested for ${shift.title} — sent to your hospital for approval`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Replacement</DialogTitle>
          <DialogDescription>
            {shift.title} · {shift.startTime}–{shift.endTime}. Your hospital reviews this before it&apos;s published.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.reason}>
              <FieldLabel htmlFor="reason">Reason</FieldLabel>
              <FieldContent>
                <Textarea id="reason" rows={2} placeholder="e.g. Family emergency" {...register("reason")} />
                <FieldError errors={[errors.reason]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Preferred Replacement Type</FieldLabel>
              <FieldContent>
                <Controller
                  control={control}
                  name="preferredReplacementType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {preferredTypes.map((t) => (
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

            <Field data-invalid={!!errors.hourlyCompensation}>
              <FieldLabel htmlFor="hourlyCompensation">Hourly Compensation ($)</FieldLabel>
              <FieldContent>
                <Input
                  id="hourlyCompensation"
                  type="number"
                  min={1}
                  {...register("hourlyCompensation", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.hourlyCompensation]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
              <FieldContent>
                <Textarea id="notes" rows={2} {...register("notes")} />
              </FieldContent>
            </Field>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <RefreshCw className="size-4" /> Submit Request
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
