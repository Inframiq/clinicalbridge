"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import type { Shift } from "@/types";

const schema = z.object({
  reason: z.string().min(5, "Tell the hospital why you need coverage"),
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
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: "",
      hourlyCompensation: shift.hourlyRate,
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createReplacementRequest({
        shiftId: shift.id,
        requestingDoctorId,
        reason: values.reason,
        preferredReplacementType: "Locum Tenens",
        hourlyCompensation: values.hourlyCompensation,
        notes: values.notes || undefined,
      });
    } catch {
      // AppDataProvider already rolled back and showed an error toast
      return;
    }
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
