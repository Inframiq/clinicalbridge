"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthRole } from "@/context/auth-provider";
import { deleteMyAccount, exportMyData } from "@/lib/supabase/services/account";

const CONFIRM_WORD = "DELETE";

/** "Your data" panel shared by every non-admin role's Settings page. */
export function AccountDataCard() {
  const router = useRouter();
  const { profile, logout } = useAuthRole();
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const { data, error } = await exportMyData();
    setExporting(false);
    if (error) {
      toast.error(`Couldn't export your data: ${error}`);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicalbridge-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!profile?.id) return;
    setDeleting(true);
    const { error } = await deleteMyAccount(profile.id);
    if (error) {
      setDeleting(false);
      toast.error(`Couldn't delete your account: ${error}`);
      return;
    }
    await logout();
    toast.success("Your account has been deleted");
    router.replace("/");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>Download a copy of your data or permanently delete your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Download my data</p>
            <p className="text-sm text-muted-foreground">
              Your profile, shifts, applications, payouts, ratings and messages as a JSON file.
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="size-4" /> {exporting ? "Preparing..." : "Download"}
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Delete my account</p>
            <p className="text-sm text-muted-foreground">
              Removes your personal details and uploaded documents. Completed shifts, payouts and ratings stay
              on record without your name, because the other party and our financial records need them.
            </p>
          </div>
          <Dialog onOpenChange={(open) => !open && setConfirmText("")}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="size-4" /> Delete account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This can&apos;t be undone. You&apos;ll be signed out and won&apos;t be able to sign in again with
                  this account. Type {CONFIRM_WORD} to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                aria-label={`Type ${CONFIRM_WORD} to confirm`}
                autoComplete="off"
              />
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText !== CONFIRM_WORD || deleting}
                >
                  {deleting ? "Deleting..." : "Permanently delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
