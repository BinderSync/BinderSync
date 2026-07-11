import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedMap } from "@/lib/data";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const owned = await getOwnedMap(session.user.id);
  return NextResponse.json({ owned });
}

const toggleSchema = z.object({
  cardId: z.string().min(1),
  variant: z.string().min(1).default("base"),
  owned: z.boolean(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { cardId, variant, owned } = parsed.data;

  await prisma.ownedCard.upsert({
    where: { userId_cardId_variant: { userId: session.user.id, cardId, variant } },
    create: { userId: session.user.id, cardId, variant, owned },
    update: { owned },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // Optional { setId } body clears just that set's binder; no body clears everything.
  const body = await request.json().catch(() => null);
  const setId = typeof body?.setId === "string" ? body.setId : null;
  await prisma.ownedCard.deleteMany({
    where: { userId: session.user.id, ...(setId ? { card: { setId } } : {}) },
  });
  return NextResponse.json({ ok: true });
}
