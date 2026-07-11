import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const rows = await prisma.$queryRaw<{ seriesId: string; total: bigint; withrev: bigint }[]>`
    SELECT s."seriesId", COUNT(c.id) AS total, COUNT(c.id) FILTER (WHERE c."hasReverse") AS withrev
    FROM "Card" c JOIN "Set" s ON c."setId" = s.id
    GROUP BY s."seriesId" ORDER BY s."seriesId"`;
  for (const r of rows) console.log(`${r.seriesId.padEnd(8)} cards=${r.total} withReverse=${r.withrev}`);
  await prisma.$disconnect();
}

main();
