import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** DB connectivity check. Returns the driver's error message (no stack,
 * no credentials) so misconfigured env vars are diagnosable in prod. */
export async function GET() {
  try {
    const cards = await prisma.card.count();
    return NextResponse.json({ ok: true, cards });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
