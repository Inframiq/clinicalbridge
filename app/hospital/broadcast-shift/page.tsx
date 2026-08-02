"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BroadcastShiftForm } from "@/components/forms/broadcast-shift-form";
import { Card, CardContent } from "@/components/ui/card";

export default function BroadcastShiftPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Broadcast New Shift"
        description="Create and broadcast a shift instantly to the right doctors."
      />
      <Card className="max-w-3xl">
        <CardContent>
          <BroadcastShiftForm onSuccess={() => router.push("/hospital/active-shifts")} />
        </CardContent>
      </Card>
    </div>
  );
}
