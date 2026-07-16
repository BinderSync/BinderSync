import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalH2 } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Binder Sync",
  description: "How Binder Sync collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 15, 2026">
      <p>
        Binder Sync (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a Pokémon TCG binder viewer and
        marketplace at bindersync.com. This policy describes what we collect and how we use it.
      </p>

      <LegalH2>What we collect</LegalH2>
      <p>
        <strong>Account data.</strong> Your email address and a hashed password (we never store
        your password in readable form), plus an optional display name.
      </p>
      <p>
        <strong>Collection data.</strong> The cards you mark as owned, the binders you create, and
        the sell binders you publish — this is the product working as intended.
      </p>
      <p>
        <strong>Payment data.</strong>{" "}Subscriptions are processed by Stripe. Your card number
        never touches our servers; we store only your Stripe customer reference and current plan.
        See Stripe&rsquo;s privacy policy for how they handle payment details.
      </p>
      <p>
        <strong>Share-page analytics.</strong> Public sell-binder pages count views and QR scans.
        These counters are aggregate — we do not build profiles of visitors.
      </p>
      <p>
        <strong>Cookies.</strong> We use a session cookie to keep you signed in. No advertising or
        cross-site tracking cookies.
      </p>

      <LegalH2>How we use it</LegalH2>
      <p>
        To run the service: sign you in, store your collection, process your subscription, and
        show sellers how their share pages perform. We do not sell your data, and we do not share
        it with third parties except the processors that run the service (hosting, database, and
        payments).
      </p>

      <LegalH2>What&rsquo;s public</LegalH2>
      <p>
        Sell binders you publish are visible to anyone with the share link, including the display
        name you chose and any note you write. Your email address is never shown on public pages.
        Unpublish a binder at any time to take its page down.
      </p>

      <LegalH2>Data retention &amp; deletion</LegalH2>
      <p>
        Your data is kept while your account exists. To delete your account and everything in it,{" "}
        <Link href="/contact">contact us</Link>{" "}and we&rsquo;ll remove it.
      </p>

      <LegalH2>Changes</LegalH2>
      <p>
        If this policy changes materially, we&rsquo;ll note the new date above and, for
        significant changes, tell registered users by email.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Questions? See the <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
