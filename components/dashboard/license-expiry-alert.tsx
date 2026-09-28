"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { licenseExpiryStatus } from "@/lib/license-expiry";

/** Dashboard warning when the signed-in doctor's licence has expired or expires soon. */
export function LicenseExpiryAlert({
  licenseExpiry,
  updateHref,
}: {
  licenseExpiry: string | undefined;
  /** Where the doctor can update their licence details, if they can do it themselves. */
  updateHref?: string;
}) {
  const { state, daysLeft } = licenseExpiryStatus(licenseExpiry);
  if (state !== "expired" && state !== "expiring") return null;

  const title =
    state === "expired"
      ? "Your medical licence has expired"
      : daysLeft === 0
        ? "Your medical licence expires today"
        : `Your medical licence expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  return (
    <Alert variant={state === "expired" ? "destructive" : "default"} className="mb-6">
      <ShieldAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {state === "expired"
          ? "You shouldn't take shifts until it's renewed. "
          : "Renew it before it lapses so your shifts aren't affected. "}
        {updateHref ? (
          <Link href={updateHref} className="font-medium underline">
            Update your licence details
          </Link>
        ) : (
          "Send your renewed licence to your hospital's administrator."
        )}
      </AlertDescription>
    </Alert>
  );
}
