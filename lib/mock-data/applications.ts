import type { Application } from "@/types";

export const applications: Application[] = [
  {
    id: "app-001",
    shiftId: "shift-er-001",
    doctorId: "doc-sarah-johnson",
    status: "accepted",
    appliedAt: "2025-05-25T04:15:00",
    matchScorePct: 95,
  },
  {
    id: "app-002",
    shiftId: "shift-icu-002",
    doctorId: "doc-michael-lee",
    status: "accepted",
    appliedAt: "2025-05-24T18:30:00",
    matchScorePct: 92,
  },
  {
    id: "app-003",
    shiftId: "shift-ped-003",
    doctorId: "doc-priya-shah",
    status: "accepted",
    appliedAt: "2025-05-24T10:00:00",
    matchScorePct: 90,
  },
  {
    id: "app-004",
    shiftId: "shift-ped-006",
    doctorId: "doc-priya-shah",
    status: "in_review",
    appliedAt: "2025-05-25T09:20:00",
    matchScorePct: 88,
  },
  {
    id: "app-005",
    shiftId: "shift-icu-007",
    doctorId: "doc-michael-lee",
    status: "in_review",
    appliedAt: "2025-05-25T11:05:00",
    matchScorePct: 91,
  },
  {
    id: "app-006",
    shiftId: "shift-er-005",
    doctorId: "doc-emily-roberts",
    status: "rejected",
    appliedAt: "2025-05-24T08:45:00",
    matchScorePct: 76,
  },
  {
    id: "app-007",
    shiftId: "shift-er-005",
    doctorId: "doc-daniel-kim",
    status: "withdrawn",
    appliedAt: "2025-05-23T16:10:00",
    matchScorePct: 85,
  },
];

export function getApplicationsForShift(shiftId: string) {
  return applications.filter((a) => a.shiftId === shiftId);
}

export function getApplicationsForDoctor(doctorId: string) {
  return applications.filter((a) => a.doctorId === doctorId);
}
