"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useRatings } from "@/hooks/use-ratings";
import { cn } from "@/lib/utils";
import type { Shift } from "@/types";

const CATEGORIES = ["Work Environment", "Staff Cooperation", "Facilities", "Shift Management"];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          >
            <Star className={cn("size-5 text-warning", filled && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}

export function RateHospitalDialog({
  shift,
  doctorId,
  trigger,
}: {
  shift: Shift;
  doctorId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { submitRating } = useRatings();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map((c) => [c, 5]))
  );
  const [comment, setComment] = useState("");

  async function onSubmit() {
    const overallScore =
      Object.values(scores).reduce((sum, v) => sum + v, 0) / Object.values(scores).length;
    try {
      await submitRating({
        shiftId: shift.id,
        direction: "doctor_to_hospital",
        doctorId,
        facilityId: shift.facilityId,
        categories: scores,
        overallScore: Math.round(overallScore * 10) / 10,
        comment: comment || undefined,
      });
    } catch {
      // AppDataProvider already rolled back and showed an error toast
      return;
    }
    toast.success(`Rated ${shift.facilityName}`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {shift.facilityName}</DialogTitle>
          <DialogDescription>{shift.title} · {shift.department}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {CATEGORIES.map((category) => (
            <Field key={category}>
              <FieldLabel>{category}</FieldLabel>
              <FieldContent>
                <StarPicker
                  value={scores[category]}
                  onChange={(v) => setScores((s) => ({ ...s, [category]: v }))}
                />
              </FieldContent>
            </Field>
          ))}

          <Field>
            <FieldLabel htmlFor="comment">Comment (Optional)</FieldLabel>
            <FieldContent>
              <Textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </FieldContent>
          </Field>

          <Button className="w-full" onClick={onSubmit}>
            Submit Rating
          </Button>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
