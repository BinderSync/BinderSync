import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe keys/ids never contain whitespace — strip ALL of it, including
 * line breaks introduced when a long key wraps during copy-paste into env
 * UIs (an embedded newline corrupts the auth header and surfaces as a
 * misleading "connection to Stripe" error). */
function clean(value: string | undefined): string | null {
  const v = value?.replace(/\s+/g, "");
  return v || null;
}

export function getStripe(): Stripe | null {
  const key = clean(process.env.STRIPE_SECRET_KEY);
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function priceIdForPlan(plan: "pro" | "master"): string | null {
  return clean(plan === "pro" ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_MASTER);
}
