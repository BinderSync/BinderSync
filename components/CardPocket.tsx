"use client";

import { mix } from "@/lib/theme";
import type { SeqCard } from "@/lib/binder";

export function CardPocket({
  card,
  owned,
  collect,
  live,
  highlight,
  priceLabel,
  onToggleOwned,
  onZoom,
  pocketBg,
  accent,
  dimEnabled,
}: {
  card: SeqCard | null;
  owned: boolean;
  collect: boolean;
  live: boolean;
  highlight: boolean;
  priceLabel: string | null;
  onToggleOwned: () => void;
  onZoom: () => void;
  pocketBg: string;
  accent: string;
  dimEnabled: boolean;
}) {
  if (!card) {
    return <div style={{ position: "relative", borderRadius: 7, overflow: "hidden", background: pocketBg }} />;
  }

  const missing = collect && !owned;

  return (
    <div
      onClick={() => (collect ? onToggleOwned() : onZoom())}
      style={{
        position: "relative",
        borderRadius: 7,
        overflow: "hidden",
        cursor: "pointer",
        background: pocketBg,
        boxShadow: `inset 0 0 0 1px ${mix(8)}, inset 0 -12px 16px -14px rgba(0,0,0,0.4)`,
        outline: highlight ? `3px solid ${accent}` : undefined,
        outlineOffset: highlight ? 2 : undefined,
        zIndex: highlight ? 2 : undefined,
      }}
    >
      {card.imageUrl ? (
        <div
          style={{
            position: "absolute",
            inset: "3.5%",
            backgroundImage: `url('${card.imageUrl}')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            filter: missing && dimEnabled ? "grayscale(1)" : undefined,
            opacity: missing && dimEnabled ? 0.3 : undefined,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: "8%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            textAlign: "center",
            fontSize: 11,
            fontWeight: 600,
            opacity: 0.5,
          }}
        >
          {card.name}
        </div>
      )}

      {card.rev ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: "3.5%",
              borderRadius: 6,
              pointerEvents: "none",
              background:
                "linear-gradient(115deg, rgba(255,80,180,0) 30%, rgba(160,220,255,0.3) 46%, rgba(255,255,255,0.2) 52%, rgba(120,255,190,0) 68%)",
              mixBlendMode: "screen",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "6%",
              right: "6%",
              fontFamily: "ui-monospace,SFMono-Regular,monospace",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.08em",
              background: "rgba(20,20,24,0.75)",
              color: "#ffffff",
              padding: "3px 5px",
              borderRadius: 4,
              pointerEvents: "none",
            }}
          >
            REV
          </div>
        </>
      ) : null}

      {missing ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "7%",
            transform: "translateX(-50%)",
            fontFamily: "ui-monospace,SFMono-Regular,monospace",
            fontSize: 10,
            fontWeight: 600,
            opacity: 0.7,
            background: mix(10),
            padding: "2px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          #{card.number}
        </div>
      ) : null}

      {live && collect ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleOwned();
          }}
          style={{
            position: "absolute",
            top: "4%",
            left: "4%",
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            boxSizing: "border-box",
            background: owned ? accent : "rgba(255,255,255,0.82)",
            color: owned ? "#ffffff" : "transparent",
            border: owned ? undefined : "1.5px solid rgba(0,0,0,0.28)",
          }}
        >
          ✓
        </div>
      ) : null}

      {live && card.imageUrl ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          style={{
            position: "absolute",
            bottom: "4%",
            right: "4%",
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-in",
            background: "rgba(20,20,24,0.68)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="white" strokeWidth="1.4" />
            <line x1="7.7" y1="7.7" x2="10.8" y2="10.8" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      ) : null}

      {live && priceLabel ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "5%",
            transform: "translateX(-50%)",
            fontFamily: "ui-monospace,SFMono-Regular,monospace",
            fontSize: 10,
            fontWeight: 700,
            background: "rgba(20,20,24,0.78)",
            color: "#ffffff",
            padding: "3px 8px",
            borderRadius: 5,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {priceLabel}
        </div>
      ) : null}
    </div>
  );
}
