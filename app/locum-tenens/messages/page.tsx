"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MessagesPanel } from "@/components/dashboard/messages-panel";

export default function MessagesPage() {
  return (
    <div>
      <PageHeader title="Messages" description="Communicate with hospitals you've applied to or work with." />
      <MessagesPanel />
    </div>
  );
}
