/**
 * Delete a user account: cancels any active Stripe subscription, then
 * removes the user row (cascades: collection, sell binders, visits, tokens).
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/delete-account.ts <email>         # dry run
 *   npx tsx -r dotenv/config scripts/delete-account.ts <email> --yes   # actually delete
 *
 * Run against production by prefixing DATABASE_URL=<supabase url> and
 * making sure STRIPE_SECRET_KEY is the live key once live.
 */
import Stripe from "stripe";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: delete-account.ts <email> [--yes]");
    process.exit(1);
  }
  const confirmed = flag === "--yes";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      plan: true,
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { ownedCards: true, sellBinders: true } },
    },
  });
  if (!user) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }

  console.log(
    `${user.email} — plan ${user.plan}, since ${user.createdAt.toISOString().slice(0, 10)}, ` +
      `${user._count.ownedCards} owned cards, ${user._count.sellBinders} sell binders, ` +
      `stripe ${user.stripeCustomerId ?? "none"}`
  );

  if (!confirmed) {
    console.log("Dry run — pass --yes to delete.");
    await prisma.$disconnect();
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.replace(/\s+/g, "");
  if (user.stripeCustomerId && stripeKey) {
    const stripe = new Stripe(stripeKey);
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 20,
    });
    for (const sub of subs.data) {
      if (["active", "trialing", "past_due", "unpaid"].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`Cancelled Stripe subscription ${sub.id} (${sub.status})`);
      }
    }
  } else if (user.stripeCustomerId) {
    console.warn(
      "WARNING: user has a Stripe customer but STRIPE_SECRET_KEY is not set — cancel their subscription in the Stripe dashboard manually!"
    );
  }

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
  console.log(`Deleted ${user.email} and all their data.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
