import { getSeriesWithSets } from "@/lib/data";
import { HomeClient } from "@/components/HomeClient";

// Re-check the DB cache periodically rather than freezing at build time,
// so sets added by a later ingestion run show up without a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  const series = await getSeriesWithSets();

  const brief = series.map((se) => ({
    id: se.id,
    name: se.name,
    sets: se.sets.map((st) => ({
      id: st.id,
      name: st.name,
      logoUrl: st.logoUrl,
      symbolUrl: st.symbolUrl,
      cardCount: st.cardCount,
    })),
  }));

  return <HomeClient series={brief} />;
}
