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

  // eslint-disable-next-line react-hooks/purity -- server component; the 14-day window is intentionally computed per request
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [binder, siblings, ownedGroups, visits] = await Promise.all([
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
    prisma.binderVisit.findMany({
      where: { sellBinder: { id: binderId }, createdAt: { gte: since } },
      select: { createdAt: true, fromQr: true },
    }),
  ]);
  if (!binder || binder.userId !== session.user.id) notFound();

  // Aggregate visits into 14 daily buckets, oldest first.
  const days = Array.from({ length: 14 }, () => ({ views: 0, scans: 0 }));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const v of visits) {
    const d = new Date(v.createdAt);
    d.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((now.getTime() - d.getTime()) / 86_400_000);
    const idx = 13 - daysAgo;
    if (idx < 0 || idx > 13) continue;
    days[idx].views++;
    if (v.fromQr) days[idx].scans++;
  }

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
            tcgplayerUrl: c.card.tcgplayerUrl,
            marketPrice: snapshot ? Number(snapshot.price) : null,
            marketCurrency: snapshot ? snapshot.currency : null,
          };
        }),
      }}
      siblings={siblings}
      ownedGroups={ownedGroups}
      visitDays={days}
    />
  );
}
