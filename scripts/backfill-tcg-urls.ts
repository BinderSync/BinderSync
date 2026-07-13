/**
 * One-off backfill: populate Card.tcgplayerUrl for the whole catalog using
 * pokemontcg.io's bulk per-set data (1–2 requests per set — no slow per-card
 * fetching). Future `ingest --details` runs keep URLs fresh automatically.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { resolvePtcgSetId, fetchPtcgSetPrices } from "../lib/pokemontcg.js";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const sets = await prisma.set.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  let updated = 0;
  let skippedSets = 0;
  for (const set of sets) {
    const pid = await resolvePtcgSetId(set.id, set.name).catch(() => null);
    if (!pid) {
      skippedSets++;
      continue;
    }
    const prices = await fetchPtcgSetPrices(pid).catch(() => null);
    if (!prices || prices.size === 0) {
      skippedSets++;
      continue;
    }

    const cards = await prisma.card.findMany({
      where: { setId: set.id },
      select: { id: true, number: true },
    });
    for (const card of cards) {
      const raw = card.number.toLowerCase();
      const entry = prices.get(raw) ?? prices.get(raw.replace(/^0+(?=.)/, ""));
      if (!entry?.url) continue;
      await prisma.card.update({ where: { id: card.id }, data: { tcgplayerUrl: entry.url } });
      updated++;
    }
    console.log(`${set.id} → ${pid}`);
  }

  console.log(`Done. ${updated} cards updated, ${skippedSets} sets without pokemontcg.io data.`);
  await prisma.$disconnect();
}

main();
