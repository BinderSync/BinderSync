// One-off: fill Card.imageUrl from pokemontcg.io for cards tcgdex has no
// scan for (Shiny Vault, trainer galleries, promos, some vintage sets).
// Usage: DATABASE_URL=<url> npx tsx scripts/backfill-images.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { resolvePtcgSetId, fetchPtcgSetPrices } from "../lib/pokemontcg.js";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const missing = await prisma.card.findMany({
    where: { imageUrl: null },
    select: { id: true, number: true, set: { select: { id: true, name: true } } },
  });
  console.log(`${missing.length} cards without images`);

  const bySet = new Map<string, { name: string; cards: { id: string; number: string }[] }>();
  for (const c of missing) {
    const entry = bySet.get(c.set.id) ?? { name: c.set.name, cards: [] };
    entry.cards.push({ id: c.id, number: c.number });
    bySet.set(c.set.id, entry);
  }

  let filled = 0;
  for (const [setId, { name, cards }] of bySet) {
    const ptcgId = await resolvePtcgSetId(setId, name).catch(() => null);
    if (!ptcgId) {
      console.log(`  ${setId} (${name}) — no pokemontcg.io match, skipped (${cards.length} cards)`);
      continue;
    }
    const overlay = await fetchPtcgSetPrices(ptcgId).catch(() => null);
    if (!overlay?.size) {
      console.log(`  ${setId} (${name}) — fetch failed, skipped`);
      continue;
    }
    let n = 0;
    for (const card of cards) {
      const image = overlay.get(card.number.toLowerCase())?.image;
      if (!image) continue;
      await prisma.card.update({ where: { id: card.id }, data: { imageUrl: image } });
      n++;
    }
    filled += n;
    console.log(`  ${setId} (${name}) — filled ${n}/${cards.length}`);
  }

  console.log(`Done. Filled ${filled}/${missing.length}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
