import {
  HeartPulse,
  Baby,
  Bone,
  Brain,
  Stethoscope,
  Syringe,
  Ambulance,
  Activity,
} from "lucide-react";

const specialties = [
  { icon: Ambulance, label: "Emergency Medicine" },
  { icon: HeartPulse, label: "Critical Care / ICU" },
  { icon: Baby, label: "Pediatrics" },
  { icon: Bone, label: "Orthopedics" },
  { icon: Brain, label: "Neurology" },
  { icon: Stethoscope, label: "Internal Medicine" },
  { icon: Syringe, label: "Anesthesiology" },
  { icon: Activity, label: "Hospitalist" },
];

export function Specialties() {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Every specialty, covered
          </h2>
          <p className="mt-3 text-muted-foreground">
            From ER to ICU, we match facilities with credentialed specialists across
            the acuity spectrum.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {specialties.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-brand-muted text-brand">
                <s.icon className="size-5" />
              </div>
              <p className="text-sm font-medium text-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
