import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicSellBinder } from "@/components/PublicSellBinder";

export default async function PublicSellBinderPage({
  params,
}: PageProps<"/s/[shareId]">) {
  const { shareId } = await params;

  const binder = await prisma.sellBinder.findUnique({
    where: { shareId },
    include: {
      cards: { include: { card: true }, orderBy: { slotPosition: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!binder || !binder.isPublished) notFound();

  return (
    <PublicSellBinder
      title={binder.title}
      note={binder.note}
      color={binder.color}
      size={binder.size}
      showPrices={binder.showPrices}
      cards={binder.cards.map((c) => ({
        key: c.id,
        slotPosition: c.slotPosition,
        name: c.card.name,
        number: c.card.number,
        imageUrl: c.card.imageUrl,
        rev: c.variant === "reverse",
        price: Number(c.price),
        condition: c.condition,
      }))}
      sellerLabel={binder.user.name ?? binder.user.email}
      sellerEmail={binder.user.email}
    />
  );
}
