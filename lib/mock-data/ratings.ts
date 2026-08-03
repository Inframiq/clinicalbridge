import type { Rating } from "@/types";

export const ratings: Rating[] = [
  {
    id: "rating-001",
    shiftId: "shift-er-past-012",
    direction: "hospital_to_doctor",
    doctorId: "doc-sarah-johnson",
    facilityId: "fac-city-medical",
    categories: {
      Punctuality: 5,
      Professionalism: 5,
      "Clinical Performance": 4,
      Communication: 5,
    },
    overallScore: 4.8,
    comment: "Excellent coverage under pressure, great communication with the care team.",
    createdAt: "2025-05-19T09:30:00.000Z",
  },
  {
    id: "rating-002",
    shiftId: "shift-er-night-008",
    direction: "hospital_to_doctor",
    doctorId: "doc-daniel-kim",
    facilityId: "fac-city-medical",
    categories: {
      Punctuality: 4,
      Professionalism: 5,
      "Clinical Performance": 5,
      Communication: 4,
    },
    overallScore: 4.5,
    comment: "Solid overnight coverage, handled a code red smoothly.",
    createdAt: "2025-05-22T08:00:00.000Z",
  },
];
