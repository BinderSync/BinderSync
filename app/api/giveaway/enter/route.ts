import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { GIVEAWAY_ACTIVE } from "@/lib/giveaway";

const enterSchema = z.object({ email: z.string().email().max(200) });

export async function POST(request: Request) {
  if (!GIVEAWAY_ACTIVE) {
    return NextResponse.json({ error: "There's no active giveaway right now." }, { status: 404 });
  }
  if (!rateLimit(`giveaway:${clientIp(request.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many entries — try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = enterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  // Duplicate entries are silently fine — one entry per email either way.
  await prisma.giveawayEntry.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
