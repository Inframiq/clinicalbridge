import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PLATFORM } from "@/lib/config/brand";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "For Hospitals", href: "#for-hospitals" },
      { label: "For Doctors", href: "#for-doctors" },
      { label: "How It Works", href: "#how-it-works" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Compliance", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo withTagline />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {PLATFORM.description}
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="size-4" /> {PLATFORM.supportEmail}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4" /> {PLATFORM.supportPhone}
              </p>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {PLATFORM.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
