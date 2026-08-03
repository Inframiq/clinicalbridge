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
import { RegisterDoctorForm } from "@/components/forms/register-doctor-form";

export function RegisterDoctorDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Doctor</DialogTitle>
          <DialogDescription>
            Add a doctor to your hospital&apos;s roster. They can log in once verification is complete.
          </DialogDescription>
        </DialogHeader>
        <RegisterDoctorForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
