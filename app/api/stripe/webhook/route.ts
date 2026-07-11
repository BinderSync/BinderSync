import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

function planForPriceId(priceId: string | undefined): "pro" | "master" | null {
  if (!priceId) return null;
  if (priceId === priceIdForPlan("master")) return "master";
  if (priceId === priceIdForPlan("pro")) return "pro";
  return null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Billing isn't configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing signature");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      if (userId && (plan === "pro" || plan === "master")) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan, ...(customerId ? { stripeCustomerId: customerId } : {}) },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      // Plan switches (pro <-> master) via the billing portal, and
      // cancellations that Stripe delivers as status changes.
      const sub = event.data.object;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (!customerId) break;
      if (sub.status === "active" || sub.status === "trialing") {
        const plan = planForPriceId(sub.items.data[0]?.price?.id);
        if (plan) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { plan },
          });
        }
      } else if (["canceled", "unpaid", "incomplete_expired"].includes(sub.status)) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: "free" },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: "free" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
