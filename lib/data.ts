import { prisma } from "@/lib/prisma";

export async function getSeriesWithSets() {
  // Newest-first: latest era at the top, and within each era the latest set
  // first. `order`/`position` hold tcgdex's canonical chronological ordering,
  // so descending gives newest → oldest.
  const series = await prisma.series.findMany({
    orderBy: { order: "desc" },
    include: {
      sets: {
        orderBy: { position: "desc" },
      },
    },
  });
  return series.filter((s) => s.sets.length > 0);
}

/** Numeric-aware card ordering (e.g. "2" before "10", official numbers before promo/secret suffixes). */
function sortByNumber<T extends { number: string }>(cards: T[]): T[] {
  const numOf = (v: string) => {
    const m = v.match(/\d+/);
    return m ? parseInt(m[0], 10) : 1e9;
  };
  const grp = (v: string) => (/^\d+$/.test(v) ? 0 : 1);
  return cards.slice().sort(
    (a, b) => grp(a.number) - grp(b.number) || numOf(a.number) - numOf(b.number) || a.number.localeCompare(b.number)
  );
}

export async function getSetWithCards(setId: string) {
  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: {
      series: true,
      cards: {
        include: {
          priceSnapshots: {
            orderBy: { fetchedAt: "desc" },
            take: 8,
          },
        },
      },
    },
  });
  if (!set) return null;
  return { ...set, cards: sortByNumber(set.cards) };
}

export async function searchCards(query: string, limit = 40) {
  if (query.trim().length < 3) return [];
  return prisma.card.findMany({
    where: { name: { contains: query, mode: "insensitive" } },
    include: { set: { include: { series: true } } },
    take: limit,
    orderBy: { name: "asc" },
  });
}

export async function getOwnedMap(userId: string): Promise<Record<string, boolean>> {
  const rows = await prisma.ownedCard.findMany({
    where: { userId, owned: true },
    select: { cardId: true, variant: true },
  });
  const map: Record<string, boolean> = {};
  for (const row of rows) {
    map[row.variant === "reverse" ? `${row.cardId}::r` : row.cardId] = true;
  }
  return map;
}

export async function getOwnedCollection(userId: string) {
  const rows = await prisma.ownedCard.findMany({
    where: { userId, owned: true },
    include: {
      card: {
        include: {
          set: { include: { series: true } },
          priceSnapshots: { orderBy: { fetchedAt: "desc" }, take: 8 },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const bySet = new Map<
    string,
    {
      setId: string;
      setName: string;
      seriesName: string;
      setSymbolUrl: string | null;
      setCardCount: number;
      cards: {
        cardId: string;
        name: string;
        number: string;
        variant: string;
        imageUrl: string | null;
        priceValue: number | null;
        priceCurrency: "USD" | "EUR" | null;
      }[];
    }
  >();

  for (const row of rows) {
    const set = row.card.set;
    if (!bySet.has(set.id)) {
      bySet.set(set.id, {
        setId: set.id,
        setName: set.name,
        seriesName: set.series.name,
        setSymbolUrl: set.symbolUrl,
        setCardCount: set.cardCount,
        cards: [],
      });
    }
    const snapshot =
      row.card.priceSnapshots.find((p) => p.variant === row.variant) ?? row.card.priceSnapshots[0];
    bySet.get(set.id)!.cards.push({
      cardId: row.cardId,
      name: row.card.name,
      number: row.card.number,
      variant: row.variant,
      imageUrl: row.card.imageUrl,
      priceValue: snapshot ? Number(snapshot.price) : null,
      priceCurrency: snapshot ? snapshot.currency : null,
    });
  }

  return [...bySet.values()];
}

export async function getOwnedSetIds(userId: string): Promise<string[]> {
  const rows = await prisma.ownedCard.findMany({
    where: { userId, owned: true },
    select: { card: { select: { setId: true } } },
    distinct: ["cardId"],
  });
  return [...new Set(rows.map((r) => r.card.setId))];
}
