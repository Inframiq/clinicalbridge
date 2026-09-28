import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL, PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Terms of Service — ${PLATFORM.name}`,
  description: `The terms that govern use of ${PLATFORM.name}.`,
};

const sections: LegalSection[] = [
  {
    heading: "What the platform is",
    paragraphs: [
      `${PLATFORM.name} is a marketplace that lets hospitals and clinics ("Facilities") post shifts and lets licensed doctors ("Clinicians") find, accept and complete them. ${LEGAL.entityName} operates the platform.`,
      `We are not a healthcare provider, an employer of Clinicians, or a staffing agency. We do not provide medical care, and we do not direct or supervise the clinical work performed during a shift. Each Facility is responsible for the clinical environment, supervision and patient care at its premises, and each Clinician is responsible for their own professional practice.`,
    ],
  },
  {
    heading: "Eligibility and accounts",
    paragraphs: [
      "You must be at least 18 and legally able to enter into a contract. Clinicians must hold a current, unrestricted licence to practise for the work they accept. Facilities must be lawfully registered and able to engage Clinicians for the shifts they post.",
      "You must give accurate information, keep it up to date and keep your login credentials secure. You are responsible for activity on your account. One person or organisation per account; accounts may not be shared or transferred.",
    ],
  },
  {
    heading: "Verification",
    paragraphs: [
      "Before an account can use the marketplace, we review the registration details and documents you upload (for example licences, registrations and identity documents). Approval means only that the documents looked genuine and complete when we reviewed them. It is not a guarantee of a Clinician's competence or a Facility's standards.",
      "Facilities remain responsible for their own credentialing and for confirming a Clinician's suitability for a particular shift. You must tell us promptly if a licence or registration expires, is suspended or is restricted. We may re-verify, suspend or remove an account at any time if information turns out to be inaccurate or out of date.",
    ],
  },
  {
    heading: "Shifts, applications and attendance",
    paragraphs: [
      "Facilities set the details and pay rate of each shift. When a Facility assigns a shift and the Clinician accepts it, the engagement is between the Facility and the Clinician. Both parties must honour confirmed shifts; if you cannot, cancel or request a replacement through the platform as early as possible.",
      "Check-in, check-out and attendance verification recorded on the platform are used to calculate payment, so they must be accurate.",
    ],
  },
  {
    heading: "Fees and payments",
    paragraphs: [
      "Payouts shown on the platform are calculated from verified hours and the agreed rate, less the platform fee shown on the payout. Facilities approve payouts; approved amounts are paid to the Clinician. Payments may be processed by a third-party payment provider, whose terms also apply.",
      "Taxes, insurance (including professional indemnity), and any registrations required for the work are the responsibility of the party the law places them on. We are not responsible for either party's tax or employment obligations.",
    ],
  },
  {
    heading: "Ratings and messages",
    paragraphs: [
      "After a shift, Facilities and Clinicians may rate each other. Ratings must be honest, based on the actual shift and free of discrimination, harassment or confidential patient information. Messages sent through the platform must relate to shifts and professional matters.",
      "Never share patient-identifiable information through the platform. It is not designed to store clinical records.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: [
      "Do not misuse the platform: no false identities or credentials, no attempts to access other users' data or bypass security controls, no scraping, no spam, and no arranging to take a relationship introduced through the platform off-platform to avoid fees where that is prohibited by your agreement with us.",
    ],
  },
  {
    heading: "Suspension and closing your account",
    paragraphs: [
      "We may suspend or close an account that breaches these terms, poses a risk to patients or other users, or where we are required to by law.",
      <>
        You can delete your account at any time from Settings → Privacy. Some records (such as completed shifts,
        payouts and ratings) are kept in anonymised form because the other party and financial record-keeping rules
        rely on them — see the <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
      </>,
    ],
  },
  {
    heading: "Disclaimers and liability",
    paragraphs: [
      "The platform is provided \"as is\". To the extent the law allows, we do not guarantee that it will be uninterrupted or error-free, or that any shift will be filled.",
      "To the extent the law allows, we are not liable for the acts or omissions of Facilities or Clinicians, for clinical outcomes, or for indirect or consequential losses, and our total liability for any claim is limited to the fees we received from you in the twelve months before the claim. Nothing in these terms limits liability that cannot be limited by law.",
    ],
  },
  {
    heading: "Changes and governing law",
    paragraphs: [
      "We may update these terms. If a change is material we will tell you before it takes effect, and continuing to use the platform after that means you accept the new terms.",
      `These terms are governed by ${LEGAL.governingLaw}.`,
    ],
  },
  {
    heading: "Contact",
    paragraphs: [`${LEGAL.entityName}, ${LEGAL.registeredAddress}. Email: ${PLATFORM.supportEmail}.`],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms apply to everyone who uses ${PLATFORM.name}. By creating an account you agree to them.`}
      sections={sections}
    />
  );
}
