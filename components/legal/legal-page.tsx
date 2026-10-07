import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export interface LegalSection {
  heading: string;
  paragraphs: React.ReactNode[];
}

/** Shared shell for the Terms of Service and Privacy Policy pages. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
          <p className="mt-6 text-base leading-7 text-muted-foreground">{intro}</p>
          {sections.map((section, i) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">
                {i + 1}. {section.heading}
              </h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mt-3 text-sm leading-6 text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
