import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOwnedBinder(userId: string, id: string) {
  const binder = await prisma.sellBinder.findUnique({ where: { id } });
  if (!binder || binder.userId !== userId) return null;
  return binder;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/sell-binders/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const binder = await requireOwnedBinder(session.user.id, id);
  if (!binder) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const full = await prisma.sellBinder.findUnique({
    where: { id },
    include: { cards: { include: { card: true } } },
  });
  return NextResponse.json({ binder: full });
}

const cardSchema = z.object({
  cardId: z.string().min(1),
  variant: z.string().min(1).default("base"),
  slotPosition: z.number().int().min(0),
  price: z.number().nonnegative(),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]).default("NM"),
});

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  note: z.string().max(2000).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  showPrices: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  size: z.union([z.literal(4), z.literal(9), z.literal(12)]).optional(),
  cards: z.array(cardSchema).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/sell-binders/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const binder = await requireOwnedBinder(session.user.id, id);
  if (!binder) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { cards, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (cards) {
      await tx.sellBinderCard.deleteMany({ where: { sellBinderId: id } });
      if (cards.length) {
        await tx.sellBinderCard.createMany({
          data: cards.map((c) => ({ ...c, sellBinderId: id })),
        });
      }
    }
    return tx.sellBinder.update({
      where: { id },
      data: rest,
      include: { cards: { include: { card: true } } },
    });
  });

  return NextResponse.json({ binder: updated });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/sell-binders/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const binder = await requireOwnedBinder(session.user.id, id);
  if (!binder) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.sellBinder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
