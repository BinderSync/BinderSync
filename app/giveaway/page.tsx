import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalH2 } from "@/components/LegalPage";
import { GiveawayEntryForm } from "@/components/GiveawayEntryForm";
import { GIVEAWAY_ACTIVE } from "@/lib/giveaway";

export const metadata: Metadata = {
  title: "Giveaway",
  description: "Enter the Binder Sync giveaway — free to enter, no purchase necessary.",
};

export default function GiveawayPage() {
  return (
    <LegalPage title="Giveaway">
      {GIVEAWAY_ACTIVE ? (
        <>
          <p>
            Enter for a chance to win free months of Binder Sync Pro or Master. Free to enter — no
            purchase necessary. See the current prizes and entry period in the announcement post,
            and the <Link href="/giveaway-rules">official rules</Link> for the fine print.
          </p>

          <LegalH2>Enter with your email</LegalH2>
          <GiveawayEntryForm />

          <LegalH2>Already have an account?</LegalH2>
          <p>
            Creating a free <Link href="/register">Binder Sync account</Link> during the entry
            period counts as an entry too — one entry per person either way, so no need to do
            both.
          </p>
        </>
      ) : (
        <p>
          There&rsquo;s no giveaway running right now — follow the announcements for the next one.
          In the meantime, <Link href="/register">a free account</Link> lets you start tracking
          your collection today.
        </p>
      )}
    </LegalPage>
  );
}
