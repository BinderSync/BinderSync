/**
 * Card data ingestion job — pulls series/sets/cards from tcgdex, and optionally
 * per-card rarity/reverse-holo/pricing detail (tcgdex, overlaid with pokemontcg.io
 * if POKEMONTCG_API_KEY is set), into our own Postgres cache.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/ingest.ts                  # all series, metadata only
 *   npx tsx -r dotenv/config scripts/ingest.ts --series=base    # one series
 *   npx tsx -r dotenv/config scripts/ingest.ts --series=base --details   # + rarity/reverse/pricing
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";
import {
  fetchSeriesList,
  fetchSeriesDetail,
  fetchSetDetail,
  fetchCardDetail,
  extractTcgdexPrices,
} from "../lib/tcgdex.js";
import { resolvePtcgSetId, fetchPtcgSetPrices, ptcgSetImages } from "../lib/pokemontcg.js";

const args = process.argv.slice(2);
const seriesFilter = args
  .find((a) => a.startsWith("--series="))
  ?.slice("--series=".length)
  .split(",")
  .filter(Boolean);
const withDetails = args.includes("--details");

// Digital-only games — not physical cards, so they don't belong in a binder app.
const EXCLUDED_SERIES = new Set(["tcgp"]);

const CONCURRENCY = 12;

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  const queue = items.slice();
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length || 1) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) break;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const seriesList = (await fetchSeriesList()).filter((s) => !EXCLUDED_SERIES.has(s.id));
  const targetSeries = seriesFilter
    ? seriesList.filter((s) => seriesFilter.includes(s.id))
    : seriesList;

  console.log(`Ingesting ${targetSeries.length} series${withDetails ? " (with card detail)" : ""}…`);

  let setCount = 0;
  let cardCount = 0;

  for (const brief of targetSeries) {
    // Order comes from the FULL tcgdex series list so a filtered run never
    // renumbers series relative to each other.
    const order = seriesList.findIndex((s) => s.id === brief.id);
    const detail = await fetchSeriesDetail(brief.id);
    if (!detail) {
      console.warn(`  skip series ${brief.id}: could not fetch detail`);
      continue;
    }

    await prisma.series.upsert({
      where: { id: detail.id },
      create: { id: detail.id, name: detail.name, order },
      update: { name: detail.name, order },
    });

    for (const [position, setBrief] of detail.sets.entries()) {
      const setDetail = await fetchSetDetail(setBrief.id);
      if (!setDetail) {
        console.warn(`  skip set ${setBrief.id}: could not fetch detail`);
        continue;
      }

      // tcgdex is missing logo/symbol assets for ~50 sets — fill from
      // pokemontcg.io (cached set list, so this costs nothing extra).
      let logoUrl = setDetail.logo ?? null;
      let symbolUrl = setDetail.symbol ?? null;
      if (!logoUrl || !symbolUrl) {
        const imgs = await ptcgSetImages(setDetail.id, setDetail.name).catch(() => null);
        logoUrl = logoUrl ?? imgs?.logo ?? null;
        symbolUrl = symbolUrl ?? imgs?.symbol ?? null;
      }

      await prisma.set.upsert({
        where: { id: setDetail.id },
        create: {
          id: setDetail.id,
          seriesId: detail.id,
          name: setDetail.name,
          logoUrl,
          symbolUrl,
          cardCount: setDetail.cardCount?.total ?? setDetail.cards.length,
          releaseDate: setDetail.releaseDate ? new Date(setDetail.releaseDate) : null,
          position,
        },
        update: {
          name: setDetail.name,
          logoUrl,
          symbolUrl,
          cardCount: setDetail.cardCount?.total ?? setDetail.cards.length,
          releaseDate: setDetail.releaseDate ? new Date(setDetail.releaseDate) : null,
          position,
        },
      });
      setCount++;

      // Base metadata for every card in the set (cheap: already in the set payload).
      await runPool(setDetail.cards, async (card) => {
        await prisma.card.upsert({
          where: { id: card.id },
          create: {
            id: card.id,
            setId: setDetail.id,
            name: card.name,
            number: card.localId,
            imageUrl: card.image ? `${card.image}/high.webp` : null,
          },
          update: {
            name: card.name,
            number: card.localId,
            imageUrl: card.image ? `${card.image}/high.webp` : null,
          },
        });
      });
      cardCount += setDetail.cards.length;

      if (withDetails) {
        // pokemontcg.io overlay for this set (bulk, one request per 250 cards).
        // Works without an API key too (rate-limited); failures degrade to
        // tcgdex-only data. Besides prices, its reverseHolofoil entries prove a
        // reverse variant exists — tcgdex lacks that flag for BW/XY/SM eras.
        const ptcgPrices = await resolvePtcgSetId(setDetail.id, setDetail.name)
          .then((pid) => (pid ? fetchPtcgSetPrices(pid) : null))
          .catch(() => null);

        await runPool(setDetail.cards, async (card) => {
          const cardDetail = await fetchCardDetail(card.id);
          const overlay = ptcgPrices?.get(card.localId.toLowerCase());
          const hasReverse = !!cardDetail?.variants?.reverse || !!overlay?.hasReverseVariant;
          if (cardDetail || overlay) {
            await prisma.card.update({
              where: { id: card.id },
              data: {
                ...(cardDetail ? { rarity: cardDetail.rarity, hasReverse } : {}),
                ...(overlay?.url ? { tcgplayerUrl: overlay.url } : {}),
                // tcgdex has no scan for some cards (Shiny Vault, galleries,
                // promos) — fall back to pokemontcg.io's image.
                ...(overlay?.image && !card.image ? { imageUrl: overlay.image } : {}),
              },
            });
          }

          const prices = overlay ?? (cardDetail ? extractTcgdexPrices(cardDetail) : null);
          if (!prices) return;

          const snapshots: { variant: string; price: number; currency: "USD" | "EUR" }[] = [];
          if (prices.base) {
            snapshots.push({
              variant: "base",
              price: prices.base.value,
              currency: prices.base.currency,
            });
          }
          if (hasReverse && prices.reverse) {
            snapshots.push({
              variant: "reverse",
              price: prices.reverse.value,
              currency: prices.reverse.currency,
            });
          }

          for (const s of snapshots) {
            await prisma.priceSnapshot.create({
              data: {
                cardId: card.id,
                variant: s.variant,
                source: overlay ? "pokemontcg.io" : "tcgdex",
                price: s.price,
                currency: s.currency,
              },
            });
          }
        });
      }

      console.log(`  ${setDetail.id} — ${setDetail.cards.length} cards`);
    }
  }

  console.log(`Done. ${setCount} sets, ${cardCount} cards.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
