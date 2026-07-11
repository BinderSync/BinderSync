import { NextResponse } from "next/server";
import { searchCards } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const cards = await searchCards(q);
  const results = cards.map((c) => ({
    id: c.id,
    name: c.name,
    img: c.imageUrl,
    meta: `${c.set.series.name} · ${c.set.name}`,
    setId: c.setId,
  }));

  return NextResponse.json({ results });
}
