import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedCollection } from "@/lib/data";
import { SellBinderClient } from "@/components/SellBinderClient";

export default async function SellBinderPage({
  params,
}: PageProps<"/sell/[binderId]">) {
  const { binderId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [binder, siblings, ownedGroups] = await Promise.all([
    prisma.sellBinder.findUnique({
      where: { id: binderId },
      include: {
        cards: {
          include: {
            card: {
              include: { priceSnapshots: { orderBy: { fetchedAt: "desc" }, take: 8 } },
            },
          },
          orderBy: { slotPosition: "asc" },
        },
      },
    }),
    prisma.sellBinder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
    getOwnedCollection(session.user.id),
  ]);
  if (!binder || binder.userId !== session.user.id) notFound();

  return (
    <SellBinderClient
      binder={{
        id: binder.id,
        title: binder.title,
        note: binder.note,
        shareId: binder.shareId,
        isPublished: binder.isPublished,
        color: binder.color,
        size: binder.size,
        cards: binder.cards.map((c) => {
          const snapshot =
            c.card.priceSnapshots.find((p) => p.variant === c.variant) ?? c.card.priceSnapshots[0];
          return {
            cardId: c.cardId,
            variant: c.variant,
            slotPosition: c.slotPosition,
            price: Number(c.price),
            condition: c.condition,
            name: c.card.name,
            number: c.card.number,
            imageUrl: c.card.imageUrl,
            marketPrice: snapshot ? Number(snapshot.price) : null,
            marketCurrency: snapshot ? snapshot.currency : null,
          };
        }),
      }}
      siblings={siblings}
      ownedGroups={ownedGroups}
    />
  );
}
