import Image from "next/image";
import { CheckCircle2, MapPinned, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { IMAGES } from "@/lib/config/images";

const features = [
  {
    icon: Sparkles,
    title: "AI Smart Matching",
    description: "Ranks available doctors by specialty, distance, and rating in real time.",
  },
  {
    icon: MapPinned,
    title: "Live Shift Tracking",
    description: "Follow check-in, progress, and location for every active shift.",
  },
  {
    icon: Wallet,
    title: "Secure Escrow Payments",
    description: "Funds are held safely and released automatically on approval.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Credentialing",
    description: "Licenses, certifications, and background checks verified up front.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-2xl shadow-lg lg:order-1">
          <Image
            src={IMAGES.equipmentRoom.src}
            alt={IMAGES.equipmentRoom.alt}
            fill
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover"
          />
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Built for the pace of healthcare
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every workflow — from broadcasting a shift to processing payment — is
            designed to move at the speed patient care demands.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <f.icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{f.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
          <ul className="mt-8 space-y-2">
            {["SOC 2-minded infrastructure", "Role-based access control", "Full audit trail on every shift"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-success" /> {item}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
