import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getStripe, priceIdForPlan } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "master"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing isn't configured on this instance yet (no Stripe key set)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const priceId = priceIdForPlan(parsed.data.plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for the ${parsed.data.plan} plan.` },
      { status: 503 }
    );
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      metadata: { userId: session.user.id, plan: parsed.data.plan },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    // Configuration mistakes (wrong price id, key/price mode mismatch) land
    // here — surface Stripe's message so they're diagnosable from the UI.
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    console.error("Stripe checkout failed:", message);
    return NextResponse.json({ error: `Stripe rejected the request: ${message}` }, { status: 502 });
  }
}
