"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BroadcastShiftForm } from "@/components/forms/broadcast-shift-form";

export function BroadcastShiftDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Broadcast New Shift</DialogTitle>
          <DialogDescription>
            Create and broadcast a shift instantly to the right doctors.
          </DialogDescription>
        </DialogHeader>
        <BroadcastShiftForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
