/**
 * Draw giveaway winner(s) at random from the entry pool: email-form entries
 * plus accounts created in the entry window, deduped by email.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/draw-winner.ts --from=2026-08-01 --to=2026-08-15 [--n=1]
 *
 * Prefix DATABASE_URL=<supabase url> to draw against production.
 */
import { randomInt } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const from = arg("from");
  const to = arg("to");
  const n = parseInt(arg("n") ?? "1", 10);
  if (!from || !to || !Number.isFinite(n) || n < 1) {
    console.error("Usage: draw-winner.ts --from=YYYY-MM-DD --to=YYYY-MM-DD [--n=1]");
    process.exit(1);
  }
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T23:59:59.999Z`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const [entries, users] = await Promise.all([
    prisma.giveawayEntry.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { email: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { email: true },
    }),
  ]);

  const pool = [...new Set([...entries, ...users].map((e) => e.email.toLowerCase()))];
  console.log(
    `Pool: ${pool.length} unique entrants (${entries.length} form entries, ${users.length} new accounts) between ${from} and ${to}.`
  );
  if (!pool.length) {
    console.log("Nobody to draw.");
    await prisma.$disconnect();
    return;
  }

  const winners: string[] = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const idx = randomInt(pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  console.log(`Winner${winners.length === 1 ? "" : "s"}:`);
  for (const w of winners) console.log(`  ${w}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
