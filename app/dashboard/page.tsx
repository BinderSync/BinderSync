import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedCollection } from "@/lib/data";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [groups, sellBinders] = await Promise.all([
    getOwnedCollection(session.user.id),
    prisma.sellBinder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: { cards: { select: { price: true } } },
    }),
  ]);

  return (
    <DashboardClient
      groups={groups}
      plan={session.user.plan ?? "free"}
      currency={session.user.currency === "EUR" ? "EUR" : "USD"}
      sellBinders={sellBinders.map((b) => ({
        id: b.id,
        title: b.title,
        cardCount: b.cards.length,
        asking: b.cards.reduce((sum, c) => sum + Number(c.price), 0),
      }))}
    />
  );
}
