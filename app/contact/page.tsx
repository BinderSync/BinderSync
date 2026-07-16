import type { Metadata } from "next";
import { LegalPage, LegalH2 } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Binder Sync.",
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>Questions, bug reports, account or billing help — we read everything.</p>

      <LegalH2>Email</LegalH2>
      <p>
        <a href="mailto:support@bindersync.com" style={{ fontWeight: 600 }}>
          support@bindersync.com
        </a>
      </p>
      <p style={{ opacity: 0.7 }}>
        For account deletion requests, email us from the address on the account so we can verify
        it&rsquo;s you.
      </p>

      <LegalH2>Sellers &amp; buyers</LegalH2>
      <p>
        Binder Sync doesn&rsquo;t broker sales — if you&rsquo;re asking about a specific sell
        binder, contact the seller directly using the note on their page. For reporting a listing
        that violates our terms (counterfeits, scams), email us with the share link.
      </p>
    </LegalPage>
  );
}
