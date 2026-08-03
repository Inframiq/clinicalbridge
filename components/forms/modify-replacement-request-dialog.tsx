"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import type { PreferredReplacementType, ReplacementRequest } from "@/types";

const preferredTypes: PreferredReplacementType[] = ["Locum Doctor", "Intern", "Both"];

interface FormValues {
  preferredReplacementType: PreferredReplacementType;
  hourlyCompensation: number;
  notes: string;
}

export function ModifyReplacementRequestDialog({
  request,
  trigger,
}: {
  request: ReplacementRequest;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { modifyReplacementRequest } = useReplacementRequests();

  const { control, register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      preferredReplacementType: request.preferredReplacementType,
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
            Adjust compensation or the preferred replacement type before approving.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
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

            <Field>
              <FieldLabel htmlFor="hourlyCompensation">Hourly Compensation ($)</FieldLabel>
              <FieldContent>
                <Input
                  id="hourlyCompensation"
                  type="number"
                  min={1}
                  {...register("hourlyCompensation", { valueAsNumber: true })}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <FieldContent>
                <Textarea id="notes" rows={3} {...register("notes")} />
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
