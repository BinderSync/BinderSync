"use client";

import { useEffect, useRef, useState } from "react";
import { mix, site, leatherById, leatherGradient } from "@/lib/theme";
import type { PageSize } from "@/lib/binder";

export interface SellSlot {
  key: string;
  name: string;
  num: string;
  img: string | null;
  rev: boolean;
  priceTag: string;
}

const DIMS: Record<number, [number, number]> = { 4: [2, 2], 9: [3, 3], 12: [4, 3] };

function useViewport() {
  const [size, setSize] = useState({ vw: 1280, vh: 800 });
  useEffect(() => {
    const update = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

/**
 * The sell binder's page-flip spread (editor + buyer view + public page).
 * Mirrors the prototype's geometry: 560px pages, 44px spine, 16px cover pad.
 */
export function SellSpread({
  title,
  slots,
  size,
  color,
  coverStats,
  coverHint,
  spread,
  onSpreadChange,
  editMode,
  onZoom,
  onRemove,
  onChangeCard,
  onEditListing,
  onPlus,
  onMove,
}: {
  title: string;
  slots: (SellSlot | null)[];
  size: PageSize;
  color: string | null;
  coverStats: { k: string; v: string }[];
  coverHint: string;
  spread: number;
  onSpreadChange: (n: number) => void;
  editMode: boolean;
  onZoom?: (i: number) => void;
  onRemove?: (i: number) => void;
  onChangeCard?: (i: number) => void;
  onEditListing?: (i: number) => void;
  onPlus?: (i: number) => void;
  onMove?: (from: number, to: number) => void;
}) {
  const theme = site;
  const { vw, vh } = useViewport();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [cols, rows] = DIMS[size] ?? DIMS[9];
  const pad = 18;
  const gap = 10;
  const pageH = 560;
  const slotH = (pageH - 2 * pad - (rows - 1) * gap) / rows;
  const slotW = (slotH * 63) / 88;
  const pageW = Math.round(cols * slotW + (cols - 1) * gap + 2 * pad);

  const pages: (SellSlot | null)[][] = [];
  for (let i = 0; i < slots.length; i += size) pages.push(slots.slice(i, i + size));
  const pageCount = pages.length;

  // Phones show one page at a time (position 0 = cover, then page 1..N);
  // wider screens keep the two-page spread (position = spread index).
  const singlePage = vw < 640;
  const max = singlePage ? pageCount : pageCount > 0 ? Math.ceil((pageCount - 1) / 2) : 0;
  const k = Math.min(spread, max);

  const spine = 44;
  const coverPad = 16;
  const coverW = singlePage ? pageW + 2 * coverPad : 2 * pageW + spine + 2 * coverPad;
  const coverH = pageH + 2 * coverPad;
  const scale = Math.max(
    0.2,
    Math.min(1, (vw - (singlePage ? 24 : 60)) / (coverW + (singlePage ? 4 : 130)), (vh - 280) / coverH)
  );
  const stageH = Math.round(coverH * scale);

  const lc = leatherById(color);
  const isWhite = lc.id === "white";

  const left = k === 0 ? null : (pages[2 * k - 1] ?? null);
  const right = pages[2 * k] ?? null;

  // Warm the cache for the pages one flip away — slot images are CSS
  // backgrounds that otherwise start downloading mid-flip.
  useEffect(() => {
    const idxs = singlePage
      ? [k, k + 1, k - 1]
      : [2 * k - 3, 2 * k - 2, 2 * k + 1, 2 * k + 2];
    for (const i of idxs) {
      const page = i >= 0 && i < pageCount ? pages[i] : null;
      if (!page) continue;
      for (const s of page) {
        if (s?.img) new Image().src = s.img;
      }
    }
    // pages is rebuilt each render from slots; keying on slots avoids re-running per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, slots, pageCount, singlePage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "ArrowLeft") onSpreadChange(Math.max(0, k - 1));
      if (e.key === "ArrowRight") onSpreadChange(Math.min(max, k + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [k, max, onSpreadChange]);

  function renderSlot(slot: SellSlot | null, index: number) {
    const beingDragged = dragIndex === index;
    return (
      <div
        key={slot?.key ?? `g${index}`}
        draggable={editMode && !!slot}
        onDragStart={editMode && slot ? (e) => {
          setDragIndex(index);
          e.dataTransfer.effectAllowed = "move";
        } : undefined}
        onDragOver={editMode ? (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        } : undefined}
        onDrop={editMode ? (e) => {
          e.preventDefault();
          const from = dragIndex;
          setDragIndex(null);
          if (from == null || from === index) return;
          onMove?.(from, index);
        } : undefined}
        onDragEnd={editMode ? () => setDragIndex(null) : undefined}
        onClick={!editMode && slot ? () => onZoom?.(index) : undefined}
        style={{
          position: "relative",
          borderRadius: 7,
          overflow: "hidden",
          background: theme.pocket,
          boxShadow: `inset 0 0 0 1px ${mix(8)}, inset 0 -12px 16px -14px rgba(0,0,0,0.4)`,
          cursor: !editMode && slot ? "zoom-in" : undefined,
          opacity: beingDragged ? 0.35 : undefined,
          outline: beingDragged ? `2px dashed ${mix(30)}` : undefined,
        }}
      >
        {slot ? (
          <>
            {slot.img ? (
              <div
                onClick={editMode ? (e) => {
                  e.stopPropagation();
                  onZoom?.(index);
                } : undefined}
                style={{
                  position: "absolute",
                  inset: "3.5%",
                  backgroundImage: `url('${slot.img}')`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  cursor: editMode ? "grab" : undefined,
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: "8%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.5,
                }}
              >
                {slot.name}
              </div>
            )}
            {slot.rev ? (
              <div
                style={{
                  position: "absolute",
                  top: "6%",
                  ...(editMode ? { left: "50%", transform: "translateX(-50%)" } : { right: "6%" }),
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
            ) : null}
            {editMode ? (
              <>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(index);
                  }}
                  title="Remove from sell binder"
                  style={roundBtn("4%", "left")}
                >
                  ✕
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeCard?.(index);
                  }}
                  title="Change which card goes here"
                  style={roundBtn("4%", "right")}
                >
                  ⇄
                </div>
              </>
            ) : null}
            <div
              onClick={editMode ? (e) => {
                e.stopPropagation();
                onEditListing?.(index);
              } : undefined}
              title={editMode ? "Edit price & condition" : undefined}
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
                cursor: editMode ? "pointer" : undefined,
              }}
            >
              {slot.priceTag}
            </div>
          </>
        ) : editMode ? (
          <div
            onClick={() => onPlus?.(index)}
            title="Add a card here"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: `1.5px dashed ${mix(30)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 300,
                opacity: 0.5,
              }}
            >
              +
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderPage(page: (SellSlot | null)[], pageIndex: number) {
    return (
      <div
        style={{
          width: pageW,
          height: pageH,
          position: "relative",
          borderRadius: 8,
          background: theme.paper,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
            gridTemplateRows: `repeat(${rows},minmax(0,1fr))`,
            gap,
            padding: pad,
          }}
        >
          {page.map((slot, i) => renderSlot(slot, pageIndex * size + i))}
        </div>
      </div>
    );
  }

  const jumpOpts: { v: string; label: string }[] = [];
  for (let j = 0; j <= max; j++) {
    jumpOpts.push({
      v: String(j),
      label: singlePage
        ? j === 0
          ? "Cover"
          : `Page ${j}`
        : j === 0
          ? "Cover · Page 1"
          : `Pages ${2 * j}${2 * j + 1 <= pageCount ? `–${2 * j + 1}` : ""}`,
    });
  }
  const pagesLabel = pageCount
    ? singlePage
      ? k === 0
        ? `Cover · ${pageCount} page${pageCount === 1 ? "" : "s"}`
        : `Page ${k} of ${pageCount}`
      : k === 0
        ? `Cover · Page 1 of ${pageCount}`
        : `Pages ${2 * k}${2 * k + 1 <= pageCount ? `–${2 * k + 1}` : ""} of ${pageCount}`
    : "Empty binder";

  // Touch swipe (primary navigation on phones)
  const touchStartX = useRef<number | null>(null);
  const touchHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < 48) return;
      if (delta < 0) onSpreadChange(Math.min(max, k + 1));
      else onSpreadChange(Math.max(0, k - 1));
    },
  };

  return (
    <>
      <div style={{ height: stageH, overflow: "visible", marginTop: 28 }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: coverW,
            position: "relative",
            left: "50%",
            marginLeft: -Math.round(coverW / 2),
          }}
        >
          <div
            {...touchHandlers}
            style={{
              position: "relative",
              width: coverW,
              height: coverH,
              borderRadius: 18,
              background: leatherGradient(lc.l1, lc.l2),
              boxShadow: "0 30px 70px -24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 7,
                border: `1.5px dashed ${isWhite ? "rgba(0,0,0,0.18)" : site.stitch}`,
                borderRadius: 12,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "absolute", inset: 16, display: "flex" }}>
              {k === 0 ? (
                <div style={{ width: pageW, height: pageH, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      width: "76%",
                      borderRadius: 12,
                      padding: "28px 26px",
                      background: theme.paper,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 15,
                      alignItems: "center",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10, letterSpacing: "0.18em", opacity: 0.45 }}>
                      FOR SALE
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
                    <div style={{ width: "100%", height: 1, background: mix(12) }} />
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
                      {coverStats.map((row) => (
                        <div key={row.k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                          <span style={{ opacity: 0.55, whiteSpace: "nowrap" }}>{row.k}</span>
                          <span style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {row.v}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{coverHint}</div>
                  </div>
                </div>
              ) : singlePage ? (
                renderPage(pages[k - 1] ?? [], k - 1)
              ) : left ? (
                renderPage(left, 2 * k - 1)
              ) : (
                <div style={{ width: pageW, height: pageH }} />
              )}

              {!singlePage ? (
                <>
                  <div
                    style={{
                      width: spine,
                      flex: "none",
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,0.38), rgba(0,0,0,0) 32%, rgba(0,0,0,0) 68%, rgba(0,0,0,0.38))",
                    }}
                  />

                  {right ? (
                    renderPage(right, 2 * k)
                  ) : (
                    <div style={{ width: pageW, height: pageH, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div
                        style={{
                          fontFamily: "ui-monospace,SFMono-Regular,monospace",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.22em",
                          padding: "8px 14px",
                          borderRadius: 6,
                          color: isWhite ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)",
                          border: isWhite ? "1px solid rgba(0,0,0,0.2)" : "1px solid rgba(255,255,255,0.22)",
                        }}
                      >
                        END OF BINDER
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <NavArrow side="left" inset={singlePage} disabled={k <= 0} onClick={() => onSpreadChange(Math.max(0, k - 1))} />
          <NavArrow side="right" inset={singlePage} disabled={k >= max} onClick={() => onSpreadChange(Math.min(max, k + 1))} />
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
        <select
          value={String(k)}
          onChange={(e) => onSpreadChange(parseInt(e.target.value, 10))}
          style={{
            appearance: "none",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            padding: "7px 28px 7px 12px",
            borderRadius: 8,
            border: `1px solid ${mix(15)}`,
            color: "inherit",
            cursor: "pointer",
            background: theme.surf,
          }}
        >
          {jumpOpts.map((j) => (
            <option key={j.v} value={j.v}>
              {j.label}
            </option>
          ))}
        </select>
        <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 11, opacity: 0.55 }}>{pagesLabel}</div>
      </div>
    </>
  );
}

function NavArrow({
  side,
  disabled,
  onClick,
  inset = false,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  inset?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "absolute",
        [side]: inset ? 8 : -62,
        top: "50%",
        transform: "translateY(-50%)",
        width: 46,
        height: 46,
        borderRadius: "50%",
        border: `1px solid ${mix(14)}`,
        background: "var(--surf)",
        color: "inherit",
        fontSize: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 16px -8px rgba(0,0,0,0.3)",
        opacity: disabled ? 0.3 : inset ? 0.85 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {side === "left" ? "←" : "→"}
    </button>
  );
}

function roundBtn(inset: string, side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: inset,
    [side]: inset,
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    cursor: "pointer",
    background: "rgba(20,20,24,0.68)",
    color: "#ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  };
}
