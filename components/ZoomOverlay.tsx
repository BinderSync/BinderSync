"use client";

import { useEffect, useState } from "react";
import { fmtAmt } from "@/lib/binder";

const ACCENT = "oklch(0.60 0.16 27)";

export interface ZoomState {
  img: string | null;
  name: string;
  num: string;
  rev: boolean;
  setName?: string;
  localId?: string;
  setTotal?: number;
  /** Market price in USD, if known. */
  marketPrice: number | null;
}

/**
 * Full-screen card zoom, per the prototype: big card left, info column right.
 * Master plan sees market insights + outbound links; free sees a blurred
 * locked panel. When `sellAsk` is provided (sell binder editor), an
 * asking-price editor is shown.
 */
export function ZoomOverlay({
  zoom,
  isMaster,
  sellAsk,
  onClose,
  onUpgrade,
}: {
  zoom: ZoomState;
  isMaster: boolean;
  sellAsk?: { initial: string; onApply: (price: number) => void } | null;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const [askVal, setAskVal] = useState(sellAsk?.initial ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const znum = zoom.localId ? `${zoom.localId}${zoom.setTotal ? `/${zoom.setTotal}` : ""}` : "";
  const tcgUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(
    `${zoom.name} ${znum}`.trim()
  )}${zoom.setName ? `&setName=${encodeURIComponent(zoom.setName)}` : ""}`;
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    `${zoom.name} ${zoom.setName ?? ""} ${znum} pokemon card${zoom.rev ? " reverse holo" : ""}`
      .replace(/\s+/g, " ")
      .trim()
  )}&LH_Sold=1&LH_Complete=1`;

  function applyAsk() {
    const n = Number(askVal.replace(/[^0-9.]/g, ""));
    if (isFinite(n) && n > 0) sellAsk?.onApply(Math.round(n * 100) / 100);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(10,10,14,0.74)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        cursor: "zoom-out",
        padding: 30,
        boxSizing: "border-box",
        flexWrap: "wrap",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          height: "82vh",
          maxHeight: "82vh",
          aspectRatio: "63/88",
          maxWidth: "56vw",
          backgroundImage: zoom.img ? `url('${zoom.img}')` : undefined,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 330,
          maxWidth: "92vw",
          color: "#ffffff",
          cursor: "default",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" }}>{zoom.name}</div>
            <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 12, opacity: 0.6 }}>
              {zoom.num}
            </div>
          </div>
          {zoom.rev ? (
            <div
              style={{
                display: "inline-block",
                marginTop: 7,
                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                background: "rgba(255,255,255,0.16)",
                padding: "3px 7px",
                borderRadius: 4,
              }}
            >
              REVERSE HOLO
            </div>
          ) : null}
        </div>

        {isMaster ? (
          <div
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>MARKET INSIGHTS</div>
              <div
                style={{
                  fontFamily: "ui-monospace,SFMono-Regular,monospace",
                  fontSize: 8.5,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  padding: "2px 6px",
                  borderRadius: 4,
                  color: "#ffffff",
                  background: ACCENT,
                }}
              >
                MASTER
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 26, fontWeight: 700 }}>
                {zoom.marketPrice != null ? fmtAmt(zoom.marketPrice, "USD") : "—"}
              </div>
            </div>
            <div style={{ fontSize: 9.5, opacity: 0.45, lineHeight: 1.5 }}>
              {zoom.marketPrice != null
                ? "TCGplayer market price"
                : "No market price found for this card — check the links below."}
            </div>
            <div style={{ display: "flex", gap: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
              <a href={tcgUrl} target="_blank" rel="noopener" style={linkStyle}>
                TCGplayer prices <span style={{ fontSize: 9 }}>↗</span>
              </a>
              <a href={ebayUrl} target="_blank" rel="noopener" style={linkStyle}>
                eBay sold listings <span style={{ fontSize: 9 }}>↗</span>
              </a>
            </div>
            {sellAsk ? (
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                  paddingTop: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", opacity: 0.55 }}>
                  YOUR ASKING PRICE
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 11,
                        fontFamily: "ui-monospace,SFMono-Regular,monospace",
                        fontSize: 13,
                        opacity: 0.55,
                      }}
                    >
                      $
                    </span>
                    <input
                      value={askVal}
                      onChange={(e) => setAskVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applyAsk()}
                      placeholder="0.00"
                      inputMode="decimal"
                      style={{
                        width: "100%",
                        fontFamily: "ui-monospace,SFMono-Regular,monospace",
                        fontSize: 14,
                        fontWeight: 600,
                        padding: "9px 11px 9px 24px",
                        borderRadius: 9,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button
                    onClick={applyAsk}
                    style={{
                      appearance: "none",
                      border: 0,
                      borderRadius: 9,
                      padding: "9px 15px",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      background: ACCENT,
                    }}
                  >
                    Set price
                  </button>
                </div>
                {zoom.marketPrice != null ? (
                  <button
                    onClick={() => sellAsk.onApply(Math.round(zoom.marketPrice! * 100) / 100)}
                    style={{
                      appearance: "none",
                      border: 0,
                      background: "transparent",
                      color: "#8ec9ff",
                      fontFamily: "inherit",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    Use market price ({fmtAmt(zoom.marketPrice, "USD")})
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>MARKET INSIGHTS</div>
            <div
              aria-hidden="true"
              style={{ filter: "blur(6px)", pointerEvents: "none", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 24, fontWeight: 700 }}>
                $24.50 <span style={{ fontSize: 12, color: "#7ee2a8" }}>+12%</span>
              </div>
              <svg viewBox="0 0 280 60" style={{ width: "100%", height: 54, display: "block" }}>
                <polyline
                  points="0,44 28,38 56,46 84,30 112,34 140,22 168,28 196,18 224,24 252,12 280,16"
                  fill="none"
                  stroke="#7ee2a8"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.55 }}>
              Live market prices and direct TCGplayer &amp; eBay links are part of the Master plan.
            </div>
            <button
              onClick={onUpgrade}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 9,
                padding: 11,
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
                background: ACCENT,
              }}
            >
              Unlock with Master
            </button>
          </div>
        )}

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
          Click outside the card or press Esc to close
        </div>
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#8ec9ff",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: 5,
};
