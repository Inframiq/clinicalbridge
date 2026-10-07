import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL, PLATFORM } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Privacy Policy — ${PLATFORM.name}`,
  description: `How ${PLATFORM.name} collects, uses and protects personal data.`,
};

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    paragraphs: [
      `${LEGAL.entityName} (${LEGAL.registeredAddress}) operates ${PLATFORM.name} and is responsible for the personal data described here. Contact us about privacy at ${LEGAL.privacyEmail}.`,
    ],
  },
  {
    heading: "What we collect",
    paragraphs: [
      "Account details: name, email, phone number, role and password (stored only as a secure hash by our authentication provider).",
      "Professional and organisation details: for Clinicians — specialty, experience, licence or registration numbers and expiry dates, work preferences and availability; for Facilities — organisation name, registration and licence numbers, address and contact person.",
      "Verification documents you upload, such as licences, registrations, degrees and identity documents.",
      "Activity on the platform: shifts, applications, check-in and check-out times, payouts, ratings, messages and notifications.",
      "Technical data needed to run the service securely, such as sign-in sessions and server logs.",
    ],
  },
  {
    heading: "How we use it",
    paragraphs: [
      "To create and secure your account, verify credentials, match Clinicians with shifts, record attendance, calculate and track payouts, deliver messages and notifications, prevent fraud and misuse, meet legal and financial record-keeping obligations, and support you when you contact us.",
      "We do not sell personal data and do not use it for third-party advertising.",
    ],
  },
  {
    heading: "Who can see it",
    paragraphs: [
      "Facilities see the profile of Clinicians who apply for or are assigned to their shifts. Clinicians see the details of Facilities they apply to or work with. Messages are visible only to the two people in the conversation.",
      "Verification documents are visible only to you and to our verification administrators. They are stored privately and opened only through short-lived, access-checked links. Administrator reviews of your account and documents are recorded in an audit log.",
      "We use service providers to host and run the platform (database, file storage and authentication hosting, web hosting, and email delivery). They process data only on our instructions. Payments may be handled by a payment provider under its own privacy terms. We may disclose data where the law requires it.",
    ],
  },
  {
    heading: "How long we keep it",
    paragraphs: [
      "We keep your data while your account is open. When you delete your account, we delete your personal details and uploaded documents. If you have completed shifts, payouts or ratings, those records are kept in anonymised form, without your name or contact details, because the other party relies on them and financial record-keeping rules require it.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      "You can view and correct most of your details in Settings. You can download a copy of your data or delete your account at any time from Settings → Privacy.",
      `Depending on where you live you may have further rights, such as to object to or restrict certain processing, or to complain to a data protection authority. To exercise them, email ${LEGAL.privacyEmail}.`,
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "Data is encrypted in transit. Access is controlled at the database level so each user can only read and change what their role allows, and sensitive changes (verification decisions, payout status changes, account deletions) are logged. No system is perfectly secure; if we become aware of a breach affecting you, we will notify you and the authorities as the law requires.",
    ],
  },
  {
    heading: "Children",
    paragraphs: ["The platform is for professionals and organisations only. It is not intended for anyone under 18."],
  },
  {
    heading: "Changes",
    paragraphs: [
      "We will post any changes here and update the date above. If a change is material we will tell you before it takes effect.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what personal data ${PLATFORM.name} collects, why, who can see it, and the choices you have.`}
      sections={sections}
    />
  );
}
