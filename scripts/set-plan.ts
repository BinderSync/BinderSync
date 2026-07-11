/**
 * Dev helper: set a user's plan without going through Stripe.
 * Usage: npx tsx -r dotenv/config scripts/set-plan.ts <email> <free|pro|master>
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

async function main() {
  const [email, plan] = process.argv.slice(2);
  if (!email || !["free", "pro", "master"].includes(plan)) {
    console.error("Usage: set-plan.ts <email> <free|pro|master>");
    process.exit(1);
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const user = await prisma.user.update({
    where: { email },
    data: { plan: plan as "free" | "pro" | "master" },
    select: { email: true, plan: true },
  });
  console.log(`${user.email} → ${user.plan}`);
  await prisma.$disconnect();
}

main();
