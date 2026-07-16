import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalH2 } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Binder Sync",
  description: "The terms that govern your use of Binder Sync.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 15, 2026">
      <p>
        By creating an account or using bindersync.com you agree to these terms. If you do not
        agree, please don&rsquo;t use the service.
      </p>

      <LegalH2>The service</LegalH2>
      <p>
        Binder Sync lets you browse Pokémon TCG sets, track your collection, and — on paid plans —
        publish &ldquo;sell binder&rdquo; pages that showcase cards you want to sell. Free
        accounts include a limited number of saved binders; Pro and Master are monthly
        subscriptions you can cancel anytime, effective at the end of the billing period. Your
        data is never deleted for downgrading.
      </p>

      <LegalH2>Marketplace disclaimer</LegalH2>
      <p>
        Binder Sync is a <strong>showcase, not a marketplace</strong>: we do not process card
        sales, hold funds, take commissions, or participate in transactions between buyers and
        sellers. Any sale arranged from a sell-binder page is strictly between the buyer and the
        seller, at their own risk. We are not responsible for the accuracy of listings, card
        conditions, payment disputes, or shipping. Deal with people you trust and use payment
        methods with buyer/seller protection.
      </p>

      <LegalH2>Acceptable use</LegalH2>
      <p>
        Don&rsquo;t use the service to mislead buyers (counterfeit cards, misdescribed
        conditions), spam, scrape at abusive rates, attempt to breach other accounts, or break the
        law. We may suspend accounts that do.
      </p>

      <LegalH2>Prices and card data</LegalH2>
      <p>
        Market prices come from third-party sources (TCGplayer, Cardmarket) and are estimates
        provided as-is — they can be wrong or stale and are not an offer to buy or sell. Card
        images and set data come from community databases (TCGdex, the Pokémon TCG API).
      </p>

      <LegalH2>Intellectual property</LegalH2>
      <p>
        Pokémon and Pokémon TCG card images are the property of Nintendo, Creatures, GAME FREAK,
        and The Pokémon Company. Binder Sync is a fan-made tool and is not affiliated with or
        endorsed by them.
      </p>

      <LegalH2>Warranty &amp; liability</LegalH2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum
        extent permitted by law, our liability for any claim related to the service is limited to
        the amount you paid us in the twelve months before the claim.
      </p>

      <LegalH2>Changes</LegalH2>
      <p>
        We may update these terms; material changes will be dated above and announced to
        registered users. Continued use after a change means you accept the new terms.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Questions? See the <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
