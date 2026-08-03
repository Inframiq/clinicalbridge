/**
 * Placeholder photography, sourced from Unsplash (free-to-use license).
 * Swap these for licensed/owned photography when deploying for a real
 * organization — every image reference in the app resolves through here.
 */

function unsplash(id: string, params = "w=1600&q=80&auto=format&fit=crop") {
  return `https://images.unsplash.com/${id}?${params}`;
}

export const IMAGES = {
  heroConsultation: {
    src: unsplash("photo-1666214280391-8ff5bd3c0bf0"),
    alt: "Doctor reviewing a patient chart on a tablet in a modern hospital",
  },
  loginSide: {
    src: unsplash("photo-1622902046580-2b47f47f5471"),
    alt: "Two clinicians consulting over a tablet in a hospital corridor",
  },
  authSecondary: {
    src: unsplash("photo-1631217868264-e5b90bb7e133"),
    alt: "Physician reviewing patient records on a digital tablet",
  },
  hospitalInterior: {
    src: unsplash("photo-1516549655169-df83a0774514"),
    alt: "Bright, modern hospital corridor",
  },
  careTeam: {
    src: unsplash("photo-1551076805-e1869033e561"),
    alt: "A team of doctors walking together in a hospital hallway",
  },
  equipmentRoom: {
    src: unsplash("photo-1516574187841-cb9cc2ca948b"),
    alt: "Modern medical equipment in a treatment room",
  },
  doctorPortrait: {
    src: unsplash("photo-1582750433449-648ed127bb54"),
    alt: "Portrait of a physician with a stethoscope",
  },
  emergencyTeam: {
    src: unsplash("photo-1584982751601-97dcc096659c"),
    alt: "Emergency department clinical team in scrubs",
  },
} as const;
