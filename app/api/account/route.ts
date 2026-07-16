import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/** Self-serve account deletion: cancels any active Stripe subscription,
 * then removes the user row (cascades collection, sell binders, visits,
 * reset tokens). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const stripe = getStripe();
  if (user.stripeCustomerId && stripe) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 20,
      });
      for (const sub of subs.data) {
        if (["active", "trialing", "past_due", "unpaid"].includes(sub.status)) {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
    } catch (err) {
      // Don't strand the user's data behind a billing hiccup — log loudly
      // so the subscription can be cancelled manually if this ever fires.
      console.error(`Account deletion: Stripe cancel failed for ${user.email}:`, err);
    }
  }

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
