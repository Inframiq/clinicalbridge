export interface Facility {
  id: string;
  name: string;
  city: string;
}

export const facilities: Facility[] = [
  { id: "fac-city-medical", name: "City Medical Center", city: "New York, NY" },
  { id: "fac-metro-health", name: "Metro Health System", city: "Newark, NJ" },
  { id: "fac-st-marys", name: "St. Mary's Hospital", city: "Boston, MA" },
  { id: "fac-riverside", name: "Riverside Community Hospital", city: "Riverside, CA" },
  { id: "fac-northside", name: "Northside Medical Center", city: "Atlanta, GA" },
];

export const currentFacility = facilities[0];
