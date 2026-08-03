import type {
  ShiftStatus,
  ApplicationStatus,
  PayoutStatus,
  TimelineEventStatus,
} from "@/types";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

export const toneClassNames: Record<StatusTone, string> = {
  success: "bg-success-muted text-success border-transparent",
  warning: "bg-warning-muted text-warning-foreground border-transparent",
  danger: "bg-danger-muted text-destructive border-transparent",
  info: "bg-info-muted text-info border-transparent",
  neutral: "bg-muted text-muted-foreground border-transparent",
  brand: "bg-brand-muted text-brand border-transparent",
};

export const toneDotClassNames: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
  brand: "bg-brand",
};

interface StatusMeta {
  label: string;
  tone: StatusTone;
}

export const shiftStatusMeta: Record<ShiftStatus, StatusMeta> = {
  open: { label: "Open", tone: "info" },
  active: { label: "In Progress", tone: "brand" },
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const applicationStatusMeta: Record<ApplicationStatus, StatusMeta> = {
  accepted: { label: "Accepted", tone: "success" },
  in_review: { label: "In Review", tone: "info" },
  rejected: { label: "Rejected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export const payoutStatusMeta: Record<PayoutStatus, StatusMeta> = {
  pending_approval: { label: "Pending Approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  payment_processed: { label: "Payment Processed", tone: "info" },
  disputed: { label: "Disputed", tone: "danger" },
};

export const timelineStatusMeta: Record<TimelineEventStatus, StatusMeta> = {
  done: { label: "Done", tone: "success" },
  current: { label: "Current", tone: "brand" },
  upcoming: { label: "Upcoming", tone: "neutral" },
  alert: { label: "Alert", tone: "danger" },
};
