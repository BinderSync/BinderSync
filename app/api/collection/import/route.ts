import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const importSchema = z.object({
  cards: z
    .array(
      z.object({
        cardId: z.string().min(1),
        variant: z.string().min(1).default("base"),
      })
    )
    .max(5000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload." }, { status: 400 });
  }

  const userId = session.user.id;
  const { cards } = parsed.data;

  // Imports come from user-supplied files — silently skip card ids we don't know
  // rather than failing the whole batch on a foreign-key violation.
  const known = await prisma.card.findMany({
    where: { id: { in: [...new Set(cards.map((c) => c.cardId))] } },
    select: { id: true },
  });
  const knownIds = new Set(known.map((k) => k.id));
  const valid = cards.filter((c) => knownIds.has(c.cardId));

  await prisma.$transaction(
    valid.map((c) =>
      prisma.ownedCard.upsert({
        where: { userId_cardId_variant: { userId, cardId: c.cardId, variant: c.variant } },
        create: { userId, cardId: c.cardId, variant: c.variant, owned: true },
        update: { owned: true },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    imported: valid.length,
    skipped: cards.length - valid.length,
  });
}
