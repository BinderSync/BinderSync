import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sets = await prisma.set.findMany({ select: { id: true } });
  return [
    {
      url: "https://bindersync.com",
      changeFrequency: "daily",
      priority: 1,
    },
    ...["privacy", "terms", "contact"].map((p) => ({
      url: `https://bindersync.com/${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...sets.map((s) => ({
      url: `https://bindersync.com/sets/${s.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
