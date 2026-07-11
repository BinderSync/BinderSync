import { notFound } from "next/navigation";
import { getSetWithCards, getOwnedMap, getOwnedSetIds } from "@/lib/data";
import { auth } from "@/lib/auth";
import { BinderClient } from "@/components/BinderClient";
import type { CardBrief } from "@/lib/binder";

export default async function SetPage({
  params,
}: PageProps<"/sets/[setId]">) {
  const { setId } = await params;
  const set = await getSetWithCards(setId);
  if (!set) notFound();

  const session = await auth();
  const [owned, ownedSetIds] = session?.user?.id
    ? await Promise.all([getOwnedMap(session.user.id), getOwnedSetIds(session.user.id)])
    : [{}, []];

  const cards: CardBrief[] = set.cards.map((c) => {
    const base = c.priceSnapshots.find((p) => p.variant === "base");
    const reverse = c.priceSnapshots.find((p) => p.variant === "reverse");
    const chosen = base ?? reverse;
    return {
      id: c.id,
      name: c.name,
      number: c.number,
      imageUrl: c.imageUrl,
      rarity: c.rarity,
      hasReverse: c.hasReverse,
      priceBase: base ? Number(base.price) : null,
      priceReverse: reverse ? Number(reverse.price) : null,
      priceCurrency: chosen ? chosen.currency : null,
    };
  });

  return (
    <BinderClient
      set={{
        id: set.id,
        name: set.name,
        seriesName: set.series.name,
        logoUrl: set.logoUrl,
        symbolUrl: set.symbolUrl,
        releaseDate: set.releaseDate ? set.releaseDate.toISOString().slice(0, 10) : null,
        officialCount: set.cardCount,
      }}
      cards={cards}
      initialOwned={owned}
      isSignedIn={!!session?.user?.id}
      plan={session?.user?.plan ?? "free"}
      ownedSetIds={ownedSetIds}
    />
  );
}
