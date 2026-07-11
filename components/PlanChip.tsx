"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { mix } from "@/lib/theme";
import { BINDER_LIMIT } from "@/lib/binder";

const ACCENT = "oklch(0.60 0.16 27)";

export function PlanChip({ onClick }: { onClick: () => void }) {
  const { data: session, status } = useSession();
  const plan = session?.user?.plan ?? "free";
  const isMaster = plan === "master";
  const isPro = plan === "pro" || isMaster;
  const [ownedSets, setOwnedSets] = useState<number | null>(null);

  // Free chip shows binder usage (e.g. "FREE · 2/5") — derive distinct set ids
  // from the owned map, same as the prototype.
  useEffect(() => {
    if (status !== "authenticated" || isPro) return;
    let cancelled = false;
    fetch("/api/collection")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.owned) return;
        const sets = new Set<string>();
        for (const key of Object.keys(data.owned)) {
          const cardId = key.split("::")[0];
          const cut = cardId.lastIndexOf("-");
          if (cut > 0) sets.add(cardId.slice(0, cut));
        }
        setOwnedSets(sets.size);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, isPro]);

  const label = isMaster
    ? "★ MASTER"
    : isPro
      ? "✦ PRO"
      : `FREE${ownedSets != null ? ` · ${ownedSets}/${BINDER_LIMIT}` : ""}`;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        fontFamily: "ui-monospace,SFMono-Regular,monospace",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.12em",
        padding: "6px 11px",
        borderRadius: 99,
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        ...(isPro
          ? { border: "1px solid transparent", color: "#ffffff", background: ACCENT }
          : { border: `1px solid ${mix(18)}`, opacity: 0.75 }),
      }}
    >
      {label}
    </div>
  );
}
