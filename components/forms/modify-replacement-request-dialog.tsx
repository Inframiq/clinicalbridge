"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { currencyField, optionalTextField } from "@/lib/validation";
import type { ReplacementRequest } from "@/types";

const schema = z.object({
  hourlyCompensation: currencyField(1, 2000),
  notes: optionalTextField(1000),
});

type FormValues = z.infer<typeof schema>;

export function ModifyReplacementRequestDialog({
  request,
  trigger,
}: {
  request: ReplacementRequest;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { modifyReplacementRequest } = useReplacementRequests();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      hourlyCompensation: request.hourlyCompensation,
      notes: request.notes ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    modifyReplacementRequest(request.id, values);
    toast.success("Replacement requirements updated");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modify Replacement Requirements</DialogTitle>
          <DialogDescription>
            Adjust the hourly compensation before approving.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.hourlyCompensation}>
              <FieldLabel htmlFor="hourlyCompensation">Hourly Compensation ($)</FieldLabel>
              <FieldContent>
                <Input
                  id="hourlyCompensation"
                  type="number"
                  min={1}
                  max={2000}
                  step="0.01"
                  aria-invalid={!!errors.hourlyCompensation}
                  {...register("hourlyCompensation", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.hourlyCompensation]} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <FieldContent>
                <Textarea id="notes" rows={3} maxLength={1000} {...register("notes")} />
                <FieldError errors={[errors.notes]} />
              </FieldContent>
            </Field>

            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
