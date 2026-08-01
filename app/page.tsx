import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Specialties } from "@/components/landing/specialties";
import { Features } from "@/components/landing/features";
import { Testimonials } from "@/components/landing/testimonials";
import { EmergencyBanner } from "@/components/landing/emergency-banner";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Stats />
        <HowItWorks />
        <Specialties />
        <Features />
        <Testimonials />
        <EmergencyBanner />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
