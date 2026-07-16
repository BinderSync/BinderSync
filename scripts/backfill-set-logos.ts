// One-off: fill Set.logoUrl/symbolUrl from pokemontcg.io for sets tcgdex
// has no assets for (Temporal Forces, Shiny Vaults, trainer galleries...).
// Usage: DATABASE_URL=<url> npx tsx scripts/backfill-set-logos.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { ptcgSetImages } from "../lib/pokemontcg.js";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const sets = await prisma.set.findMany({
    where: { OR: [{ logoUrl: null }, { symbolUrl: null }] },
    select: { id: true, name: true, logoUrl: true, symbolUrl: true },
  });
  console.log(`${sets.length} sets missing logo or symbol`);

  let filled = 0;
  for (const set of sets) {
    const imgs = await ptcgSetImages(set.id, set.name).catch(() => null);
    const logoUrl = set.logoUrl ?? imgs?.logo ?? null;
    const symbolUrl = set.symbolUrl ?? imgs?.symbol ?? null;
    if (logoUrl === set.logoUrl && symbolUrl === set.symbolUrl) {
      console.log(`  ${set.id} (${set.name}) — no pokemontcg.io assets`);
      continue;
    }
    await prisma.set.update({ where: { id: set.id }, data: { logoUrl, symbolUrl } });
    filled++;
    console.log(`  ${set.id} (${set.name}) — filled${logoUrl !== set.logoUrl ? " logo" : ""}${symbolUrl !== set.symbolUrl ? " symbol" : ""}`);
  }

  console.log(`Done. Updated ${filled}/${sets.length}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
