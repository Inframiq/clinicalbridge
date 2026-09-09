import type { ReplacementRequest } from "@/types";

export const replacementRequests: ReplacementRequest[] = [
  {
    id: "rr-001",
    shiftId: "shift-er-005",
    requestingDoctorId: "doc-emily-roberts",
    reason: "Family emergency — need coverage for my confirmed shift.",
    preferredReplacementType: "Locum Tenens",
    hourlyCompensation: 130,
    status: "pending",
    requestedAt: "2025-05-24T09:15:00.000Z",
  },
  {
    id: "rr-002",
    shiftId: "shift-ped-006",
    requestingDoctorId: "doc-emily-roberts",
    reason: "Scheduling conflict with a prior commitment.",
    preferredReplacementType: "Locum Tenens",
    hourlyCompensation: 115,
    notes: "Prefer someone with pediatric outpatient experience.",
    status: "approved",
    requestedAt: "2025-05-20T14:00:00.000Z",
    reviewedAt: "2025-05-20T16:30:00.000Z",
  },
  {
    id: "rr-003",
    shiftId: "shift-ortho-004",
    requestingDoctorId: "doc-james-wilson",
    reason: "Approved personal time off overlaps with this shift.",
    preferredReplacementType: "Locum Tenens",
    hourlyCompensation: 145,
    status: "rejected",
    requestedAt: "2025-05-19T11:00:00.000Z",
    reviewedAt: "2025-05-19T18:45:00.000Z",
  },
];
