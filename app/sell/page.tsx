import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SellListClient } from "@/components/SellListClient";

export default async function SellIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const binders = await prisma.sellBinder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  return (
    <SellListClient
      binders={binders.map((b) => ({
        id: b.id,
        title: b.title,
        cardCount: b._count.cards,
        isPublished: b.isPublished,
        shareId: b.shareId,
      }))}
    />
  );
}
