import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PublicSellBinder } from "@/components/PublicSellBinder";
import { fmtAmt } from "@/lib/binder";

export async function generateMetadata({
  params,
}: PageProps<"/s/[shareId]">): Promise<Metadata> {
  const { shareId } = await params;
  const binder = await prisma.sellBinder.findUnique({
    where: { shareId },
    include: { cards: { select: { price: true } } },
  });
  if (!binder || !binder.isPublished) return { title: "Binder not found" };

  const n = binder.cards.length;
  const ask = binder.cards.reduce((sum, c) => sum + Number(c.price), 0);
  const description = `${n} card${n === 1 ? "" : "s"} for sale${
    binder.showPrices && ask > 0 ? ` · asking ${fmtAmt(ask, "USD")}` : ""
  } — browse the binder page by page.`;

  return {
    title: binder.title,
    description,
    openGraph: { title: `${binder.title} · For sale on Binder Sync`, description },
  };
}

export default async function PublicSellBinderPage({
  params,
  searchParams,
}: PageProps<"/s/[shareId]">) {
  const { shareId } = await params;
  const { src } = await searchParams;

  const binder = await prisma.sellBinder.findUnique({
    where: { shareId },
    include: {
      cards: { include: { card: true }, orderBy: { slotPosition: "asc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!binder || !binder.isPublished) notFound();

  // Count the visit (QR scans arrive with ?src=qr) — but not the seller's own.
  const session = await auth();
  if (session?.user?.id !== binder.user.id) {
    await prisma.binderVisit
      .create({ data: { sellBinderId: binder.id, fromQr: src === "qr" } })
      .catch(() => {});
  }

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
