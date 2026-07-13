import { NextResponse } from "next/server";
import { searchCards } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const cards = await searchCards(q);
  const results = cards.map((c) => {
    const base = c.priceSnapshots.find((p) => p.variant === "base");
    const reverse = c.priceSnapshots.find((p) => p.variant === "reverse");
    const chosen = base ?? reverse;
    return {
      id: c.id,
      name: c.name,
      number: c.number,
      img: c.imageUrl,
      meta: `${c.set.series.name} · ${c.set.name}`,
      setId: c.setId,
      setName: c.set.name,
      hasReverse: c.hasReverse,
      tcgplayerUrl: c.tcgplayerUrl,
      priceBase: base ? Number(base.price) : null,
      priceReverse: reverse ? Number(reverse.price) : null,
      priceCurrency: chosen ? chosen.currency : null,
    };
  });

  return NextResponse.json({ results });
}
