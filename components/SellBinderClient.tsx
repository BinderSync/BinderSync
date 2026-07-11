"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mix, leathers, leatherGradient, leatherById } from "@/lib/theme";
import { Header } from "@/components/Header";
import { PaywallModal } from "@/components/PaywallModal";
import { ZoomOverlay } from "@/components/ZoomOverlay";
import { SellSpread, type SellSlot } from "@/components/SellSpread";
import { fmtAmt, convertPrice, PAGE_SIZES, type PageSize } from "@/lib/binder";

const ACCENT = "oklch(0.60 0.16 27)";
const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;

interface SlotCard {
  cardId: string;
  variant: string;
  price: string; // keep as string for free-form input; "" = make offer
  condition: string;
  name: string;
  number: string;
  imageUrl: string | null;
  /** Latest market price in USD, if known. */
  marketPrice: number | null;
}

interface OwnedCard {
  cardId: string;
  name: string;
  number: string;
  variant: string;
  imageUrl: string | null;
  priceValue: number | null;
  priceCurrency: "USD" | "EUR" | null;
}

interface OwnedGroup {
  setId: string;
  setName: string;
  seriesName: string;
  cards: OwnedCard[];
}

interface Binder {
  id: string;
  title: string;
  note: string | null;
  shareId: string;
  isPublished: boolean;
  color: string | null;
  size: number;
  cards: {
    cardId: string;
    variant: string;
    slotPosition: number;
    price: number;
    condition: string;
    name: string;
    number: string;
    imageUrl: string | null;
    marketPrice: number | null;
    marketCurrency: "USD" | "EUR" | null;
  }[];
}

export function SellBinderClient({
  binder: initial,
  siblings,
  ownedGroups,
}: {
  binder: Binder;
  siblings: { id: string; title: string }[];
  ownedGroups: OwnedGroup[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [note, setNote] = useState(initial.note ?? "");
  const [color, setColor] = useState(initial.color);
  const [size, setSize] = useState<PageSize>(PAGE_SIZES.includes(initial.size as PageSize) ? (initial.size as PageSize) : 9);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [slots, setSlots] = useState<(SlotCard | null)[]>(() => {
    const arr: (SlotCard | null)[] = [];
    for (const c of initial.cards) {
      while (arr.length <= c.slotPosition) arr.push(null);
      arr[c.slotPosition] = {
        cardId: c.cardId,
        variant: c.variant,
        price: c.price > 0 ? String(c.price) : "",
        condition: c.condition,
        name: c.name,
        number: c.number,
        imageUrl: c.imageUrl,
        marketPrice:
          c.marketPrice != null && c.marketCurrency
            ? Math.round(convertPrice(c.marketPrice, c.marketCurrency, "USD") * 100) / 100
            : null,
      };
    }
    return arr;
  });
  const [spread, setSpread] = useState(0);
  const [preview, setPreview] = useState(false);
  const [pickerFor, setPickerFor] = useState<number | null | false>(false); // false=closed, null=append, number=slot
  const [pickerQuery, setPickerQuery] = useState("");
  const [editSlot, setEditSlot] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/s/${initial.shareId}` : `/s/${initial.shareId}`;

  const persist = useCallback(
    async (extra?: { isPublished?: boolean }) => {
      dirty.current = false;
      await fetch(`/api/sell-binders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled binder",
          note,
          color,
          size,
          ...extra,
          cards: slots
            .map((s, i) => (s ? { cardId: s.cardId, variant: s.variant, slotPosition: i, price: Number(s.price) > 0 ? Number(s.price) : 0, condition: s.condition } : null))
            .filter((x): x is NonNullable<typeof x> => x !== null),
        }),
      });
    },
    [initial.id, title, note, color, size, slots]
  );

  // Autosave (debounced) whenever the binder content changes.
  useEffect(() => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(), 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, note, color, size, slots]);

  const nCards = slots.filter(Boolean).length;
  const { ask, priced } = useMemo(() => {
    let a = 0;
    let p = 0;
    for (const s of slots) {
      if (!s) continue;
      const n = Number(s.price);
      if (isFinite(n) && n > 0) {
        a += n;
        p++;
      }
    }
    return { ask: a, priced: p };
  }, [slots]);

  const totalLabel =
    `${nCards} card${nCards === 1 ? "" : "s"}` +
    (ask > 0 ? ` · asking ${fmtAmt(ask, "USD")}` : "") +
    (priced < nCards && nCards ? ` · ${nCards - priced} unpriced` : "");

  // Edit mode shows one extra blank page of pockets to grow into.
  const usedPages = Math.ceil(slots.length / size) || 0;
  const totalSlots = preview
    ? Math.ceil(nCards ? slots.length / size : 0) * size
    : (usedPages + 1) * size;

  const spreadSlots: (SellSlot | null)[] = useMemo(() => {
    const out: (SellSlot | null)[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const s = slots[i];
      if (!s) {
        out.push(null);
        continue;
      }
      const askLabel = Number(s.price) > 0 ? fmtAmt(Number(s.price), "USD") : "Make offer";
      out.push({
        key: `${s.cardId}::${s.variant}::${i}`,
        name: s.name,
        num: `#${s.number}`,
        img: s.imageUrl,
        rev: s.variant === "reverse",
        priceTag: `${askLabel} · ${s.condition}`,
      });
    }
    // In preview, trim trailing empty pages
    if (preview) {
      let last = -1;
      for (let i = 0; i < out.length; i++) if (out[i]) last = i;
      return out.slice(0, Math.max(0, Math.ceil((last + 1) / size)) * size);
    }
    return out;
  }, [slots, totalSlots, preview, size]);

  const coverStats = useMemo(() => {
    const stats = [{ k: "Cards for sale", v: String(nCards) }];
    if (ask > 0) stats.push({ k: "Asking total", v: fmtAmt(ask, "USD") });
    if (priced < nCards && nCards) stats.push({ k: "Open to offers", v: String(nCards - priced) });
    const pageCount = Math.ceil(spreadSlots.length / size);
    if (pageCount) stats.push({ k: "Pages", v: `${pageCount} × ${size}-pocket` });
    return stats;
  }, [nCards, ask, priced, spreadSlots.length, size]);

  function moveCard(from: number, to: number) {
    setSlots((prev) => {
      const arr = prev.slice();
      while (arr.length <= Math.max(from, to)) arr.push(null);
      const t = arr[to];
      arr[to] = arr[from];
      arr[from] = t ?? null;
      return arr;
    });
  }

  function removeAt(i: number) {
    setSlots((prev) => {
      const arr = prev.slice();
      arr[i] = null;
      return arr;
    });
  }

  function updateAt(i: number, patch: Partial<SlotCard>) {
    setSlots((prev) => prev.map((s, j) => (j === i && s ? { ...s, ...patch } : s)));
  }

  const inBinder = useMemo(() => new Set(slots.filter(Boolean).map((s) => `${s!.cardId}::${s!.variant}`)), [slots]);

  const pickRows = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const rows: (OwnedCard & { setName: string })[] = [];
    for (const g of ownedGroups) {
      for (const c of g.cards) {
        if (rows.length >= 200) break;
        if (q && !(c.name.toLowerCase().includes(q) || g.setName.toLowerCase().includes(q))) continue;
        rows.push({ ...c, setName: g.setName });
      }
    }
    return rows;
  }, [ownedGroups, pickerQuery]);

  function slotCardFrom(oc: OwnedCard): SlotCard {
    const market =
      oc.priceValue != null && oc.priceCurrency
        ? Math.round(convertPrice(oc.priceValue, oc.priceCurrency, "USD") * 100) / 100
        : null;
    return {
      cardId: oc.cardId,
      variant: oc.variant,
      price: market != null ? String(market) : "",
      condition: "NM",
      name: oc.name,
      number: oc.number,
      imageUrl: oc.imageUrl,
      marketPrice: market,
    };
  }

  function pickCard(oc: OwnedCard) {
    const key = `${oc.cardId}::${oc.variant}`;
    if (typeof pickerFor === "number") {
      setSlots((prev) => {
        const arr = prev.slice();
        while (arr.length <= pickerFor) arr.push(null);
        arr[pickerFor] = slotCardFrom(oc);
        return arr;
      });
      setPickerFor(false);
    } else if (inBinder.has(key)) {
      setSlots((prev) => prev.map((s) => (s && `${s.cardId}::${s.variant}` === key ? null : s)));
    } else {
      setSlots((prev) => [...prev, slotCardFrom(oc)]);
    }
  }

  async function deleteBinder() {
    if (!window.confirm(`Delete “${title || "this binder"}”? Your cards stay in your collection.`)) return;
    await fetch(`/api/sell-binders/${initial.id}`, { method: "DELETE" });
    const next = siblings.find((s) => s.id !== initial.id);
    router.push(next ? `/sell/${next.id}` : "/dashboard");
    router.refresh();
  }

  async function openShare() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist({ isPublished: true });
    setIsPublished(true);
    setShareOpen(true);
  }

  function copyLink() {
    try {
      navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopied(true);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  function printInsert() {
    const w = window.open("", "_blank");
    if (!w) return;
    const safeTitle = (title || "My Sell Binder").replace(/</g, "&lt;");
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=10&data=${encodeURIComponent(shareUrl)}`;
    w.document.write(
      `<!DOCTYPE html><html><head><title>QR insert</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Helvetica,Arial,sans-serif;">` +
        `<div style="width:3.5in;height:2.5in;border:1px dashed #bbb;border-radius:12px;display:flex;align-items:center;gap:0.16in;padding:0.2in;box-sizing:border-box;">` +
        `<img src="${qr}" style="width:1.9in;height:1.9in;" />` +
        `<div><div style="font-size:13px;font-weight:700;">${safeTitle}</div>` +
        `<div style="font-size:10px;color:#666;margin-top:4px;">Scan to browse every card, price, and condition.</div></div>` +
        `</div><script>window.onload=()=>window.print()<\/script></body></html>`
    );
    w.document.close();
  }

  // Deterministic fake analytics seeded from shareId (prototype parity — real
  // view tracking is a server-side follow-up).
  const analytics = useMemo(() => {
    if (!isPublished) return null;
    const sid = initial.shareId;
    const hsh = (n: number) => {
      let x = 0;
      const s = `${sid}:${n}`;
      for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
      return x;
    };
    let tv = 0;
    let ts = 0;
    let mx = 1;
    const days: { v: number; sc: number }[] = [];
    for (let d = 13; d >= 0; d--) {
      const v = (hsh(d) % 13) + (d < 4 ? hsh(d + 100) % 7 : 0);
      const sc = Math.min(v, hsh(d + 50) % 5);
      tv += v;
      ts += sc;
      if (v > mx) mx = v;
      days.push({ v, sc });
    }
    return {
      views: tv,
      scans: ts,
      bars: days.map((x) => ({
        hPct: Math.max(4, Math.round((x.v / mx) * 100)),
        sPct: Math.round((x.v ? x.sc / x.v : 0) * 100),
      })),
    };
  }, [isPublished, initial.shareId]);

  const editingSlot = editSlot != null ? slots[editSlot] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f6f4", color: "#17181a", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
      <Header variant="sell" onOpenPlans={() => setPaywallOpen(true)} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 28px 80px" }}>
        {!preview ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10, letterSpacing: "0.18em", opacity: 0.45 }}>
                    SELL BINDER · MASTER
                  </div>
                  <select
                    value={initial.id}
                    onChange={(e) => router.push(`/sell/${e.target.value}`)}
                    style={{
                      appearance: "none",
                      fontFamily: "inherit",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "5px 24px 5px 10px",
                      borderRadius: 7,
                      border: `1px solid ${mix(15)}`,
                      color: "inherit",
                      cursor: "pointer",
                      background: "#ffffff",
                    }}
                  >
                    {siblings.map((sb) => (
                      <option key={sb.id} value={sb.id}>
                        {sb.title || "Untitled binder"}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/sell-binders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: "My Sell Binder" }),
                      });
                      const body = await res.json();
                      if (res.ok) {
                        router.push(`/sell/${body.binder.id}`);
                        router.refresh();
                      }
                    }}
                    style={{ ...smallBtn }}
                  >
                    ＋ New binder
                  </button>
                  {siblings.length > 1 ? (
                    <button
                      onClick={deleteBinder}
                      style={{
                        appearance: "none",
                        border: 0,
                        background: "transparent",
                        color: "#c0392b",
                        fontFamily: "inherit",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "5px 4px",
                        cursor: "pointer",
                        opacity: 0.8,
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    fontFamily: "inherit",
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    outline: "none",
                    padding: 0,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 11, opacity: 0.55 }}>{totalLabel}</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Note for buyers — payment, shipping, where to find you…"
                  style={{
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    padding: "9px 12px",
                    borderRadius: 9,
                    border: `1px solid ${mix(13)}`,
                    background: "transparent",
                    color: "inherit",
                    outline: "none",
                    resize: "vertical",
                    maxWidth: 520,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setPickerFor(null)} style={mediumBtn}>
                  + Add cards
                </button>
                <button
                  onClick={() => {
                    setPreview(true);
                    setSpread(0);
                  }}
                  style={mediumBtn}
                >
                  Buyer view
                </button>
                <button
                  onClick={openShare}
                  style={{
                    appearance: "none",
                    border: 0,
                    borderRadius: 9,
                    padding: "10px 16px",
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    background: ACCENT,
                  }}
                >
                  Share · QR
                </button>
              </div>
            </div>

            <SellSpread
              title={title || "My Sell Binder"}
              slots={spreadSlots}
              size={size}
              color={color}
              coverStats={coverStats}
              coverHint="Tap a price tag to edit · use + on an empty pocket to add a card"
              spread={spread}
              onSpreadChange={setSpread}
              editMode
              onZoom={(i) => {
                if (slots[i]?.imageUrl) setZoomIndex(i);
              }}
              onRemove={removeAt}
              onChangeCard={(i) => {
                setPickerFor(i);
                setPickerQuery("");
              }}
              onEditListing={setEditSlot}
              onPlus={(i) => {
                setPickerFor(i);
                setPickerQuery("");
              }}
              onMove={moveCard}
            />

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>Binder</div>
                {leathers.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setColor(l.id)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      cursor: "pointer",
                      background: leatherGradient(l.l1, l.l2),
                      boxShadow:
                        leatherById(color).id === l.id
                          ? "0 0 0 2px #f7f6f4, 0 0 0 4px #17181a"
                          : "inset 0 0 0 1px rgba(0,0,0,0.25)",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, border: `1px solid ${mix(12)}` }}>
                {PAGE_SIZES.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSize(n)}
                    style={{
                      appearance: "none",
                      border: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "6px 11px",
                      borderRadius: 7,
                      background: size === n ? "#17181a" : "transparent",
                      color: size === n ? "#f7f6f4" : "inherit",
                      opacity: size === n ? 1 : 0.55,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n}-pocket
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, opacity: 0.4 }}>
                Use ← → arrow keys to turn pages · drag cards to reorder · tap a price tag to edit
              </div>
            </div>

            <div style={{ marginTop: 26, borderRadius: 12, border: `1px solid ${mix(10)}`, background: "#ffffff", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>Analytics</div>
                <div
                  style={{
                    fontFamily: "ui-monospace,SFMono-Regular,monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    padding: "3px 7px",
                    borderRadius: 5,
                    color: "#ffffff",
                    background: ACCENT,
                  }}
                >
                  MASTER
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 11, opacity: 0.45 }}>Last 14 days</div>
              </div>
              {!analytics ? (
                <div style={{ marginTop: 12, fontSize: 12.5, opacity: 0.55, lineHeight: 1.55 }}>
                  Share your binder to start tracking — you&rsquo;ll see how many people view it and how
                  many arrived by scanning your QR code.
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 14, display: "flex", alignItems: "flex-end", gap: 26, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 26 }}>
                      <div>
                        <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 22, fontWeight: 700 }}>
                          {analytics.views}
                        </div>
                        <div style={{ fontSize: 10.5, opacity: 0.5, marginTop: 2 }}>Binder views</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 22, fontWeight: 700 }}>
                          {analytics.scans}
                        </div>
                        <div style={{ fontSize: 10.5, opacity: 0.5, marginTop: 2 }}>QR scans</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "flex-end", gap: 4, height: 52 }}>
                      {analytics.bars.map((b, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${b.hPct}%`,
                            borderRadius: "3px 3px 0 0",
                            position: "relative",
                            background: mix(14),
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${b.sPct}%`, background: ACCENT }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: 10, opacity: 0.45 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: mix(25), display: "inline-block" }} />
                      Views
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, display: "inline-block", background: ACCENT }} />
                      From QR scans
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10, letterSpacing: "0.18em", opacity: 0.45 }}>
                  FOR SALE · BINDER SYNC
                </div>
                <h1 style={{ margin: "6px 0 0", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {title || "My Sell Binder"}
                </h1>
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 11, opacity: 0.55, marginTop: 8 }}>
                  {totalLabel}
                </div>
                {note.trim() ? (
                  <div style={{ fontSize: 12.5, opacity: 0.7, lineHeight: 1.55, marginTop: 10, maxWidth: 460 }}>{note}</div>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setPreview(false);
                  setSpread(0);
                }}
                style={mediumBtn}
              >
                Back to editing
              </button>
            </div>

            <SellSpread
              title={title || "My Sell Binder"}
              slots={spreadSlots}
              size={size}
              color={color}
              coverStats={coverStats}
              coverHint="Flip through to see every card, price, and condition"
              spread={spread}
              onSpreadChange={setSpread}
              editMode={false}
              onZoom={(i) => {
                if (slots[i]?.imageUrl) setZoomIndex(i);
              }}
            />

            <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, opacity: 0.4 }}>
              Use ← → arrow keys or the buttons to turn pages
            </div>

            <div
              style={{
                marginTop: 28,
                borderRadius: 12,
                border: `1px solid ${mix(10)}`,
                background: "#ffffff",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
                This is what buyers see when they scan your QR code — read-only, with a way to reach you.
              </div>
              <button
                style={{
                  appearance: "none",
                  border: 0,
                  borderRadius: 9,
                  padding: "10px 16px",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  opacity: 0.9,
                  background: ACCENT,
                }}
              >
                Message seller
              </button>
            </div>
          </>
        )}
      </div>

      {/* --- Listing editor modal --- */}
      {editingSlot && editSlot != null ? (
        <div onClick={() => setEditSlot(null)} style={overlayStyle(69)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, width: 380, gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 74, height: 103, borderRadius: 6, flex: "none", position: "relative", overflow: "hidden", background: "rgba(0,0,0,0.055)" }}>
                {editingSlot.imageUrl ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: "3%",
                      backgroundImage: `url('${editingSlot.imageUrl}')`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{editingSlot.name}</div>
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10.5, opacity: 0.5, marginTop: 3 }}>
                  #{editingSlot.number}
                  {editingSlot.variant === "reverse" ? " · Reverse Holo" : ""}
                </div>
              </div>
              <button onClick={() => setEditSlot(null)} style={closeBtn}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, letterSpacing: "0.08em" }}>ASKING PRICE</div>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${mix(15)}`, borderRadius: 8, padding: "0 10px" }}>
                  <span style={{ fontSize: 12, opacity: 0.45 }}>$</span>
                  <input
                    value={editingSlot.price}
                    onChange={(e) => updateAt(editSlot, { price: e.target.value })}
                    placeholder="0.00"
                    inputMode="decimal"
                    style={{
                      width: "100%",
                      minWidth: 0,
                      fontFamily: "ui-monospace,SFMono-Regular,monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      outline: "none",
                      padding: "9px 5px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, letterSpacing: "0.08em" }}>CONDITION</div>
                <select
                  value={editingSlot.condition}
                  onChange={(e) => updateAt(editSlot, { condition: e.target.value })}
                  style={{
                    appearance: "none",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${mix(15)}`,
                    color: "inherit",
                    cursor: "pointer",
                    background: "#ffffff",
                  }}
                >
                  {CONDITIONS.map((co) => (
                    <option key={co} value={co}>
                      {co}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  const slot = editSlot;
                  setEditSlot(null);
                  setPickerFor(slot);
                  setPickerQuery("");
                }}
                style={{ ...mediumBtn, flex: 1, padding: 10 }}
              >
                ⇄ Change card
              </button>
              <button
                onClick={() => {
                  removeAt(editSlot);
                  setEditSlot(null);
                }}
                style={{
                  ...mediumBtn,
                  border: "1px solid color-mix(in srgb, #c0392b 45%, transparent)",
                  color: "#c0392b",
                  padding: "10px 14px",
                }}
              >
                Remove
              </button>
            </div>
            <button onClick={() => setEditSlot(null)} style={accentBtn}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      {/* --- Card picker modal --- */}
      {pickerFor !== false ? (
        <div onClick={() => setPickerFor(false)} style={overlayStyle(70)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, width: 560, height: "86vh", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {typeof pickerFor === "number" ? "Pick a card for this pocket" : "Add cards to sell"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>
                  From your collection — click to add or remove.
                </div>
              </div>
              <button onClick={() => setPickerFor(false)} style={closeBtn}>
                ✕
              </button>
            </div>
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search your cards or sets…"
              style={{
                fontFamily: "inherit",
                fontSize: 13,
                padding: "9px 14px",
                borderRadius: 9,
                border: `1px solid ${mix(15)}`,
                background: "transparent",
                color: "inherit",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {pickRows.length === 0 ? (
                <div style={{ padding: 20, fontSize: 12.5, opacity: 0.55, lineHeight: 1.6 }}>
                  No owned cards found. Open a set and mark cards as owned first — they&rsquo;ll show up here.
                </div>
              ) : (
                pickRows.map((pr) => {
                  const key = `${pr.cardId}::${pr.variant}`;
                  const added = inBinder.has(key);
                  const markLabel = typeof pickerFor === "number" ? "Use this" : added ? "✓ Added" : "+ Add";
                  return (
                    <div
                      key={key}
                      onClick={() => pickCard(pr)}
                      style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 9px", borderRadius: 9, cursor: "pointer" }}
                    >
                      <div style={{ width: 34, height: 47, borderRadius: 4, flex: "none", position: "relative", overflow: "hidden", background: "rgba(0,0,0,0.055)" }}>
                        {pr.imageUrl ? (
                          <div
                            style={{
                              position: "absolute",
                              inset: "2%",
                              backgroundImage: `url('${pr.imageUrl}')`,
                              backgroundSize: "contain",
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "center",
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pr.name}
                        </div>
                        <div style={{ fontSize: 10.5, opacity: 0.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pr.setName} · #{pr.number}
                        </div>
                      </div>
                      {pr.variant === "reverse" ? (
                        <div
                          style={{
                            fontFamily: "ui-monospace,SFMono-Regular,monospace",
                            fontSize: 8.5,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            background: mix(12),
                            padding: "2px 5px",
                            borderRadius: 4,
                            flex: "none",
                          }}
                        >
                          REV
                        </div>
                      ) : null}
                      <div
                        style={{
                          fontFamily: "ui-monospace,SFMono-Regular,monospace",
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "5px 9px",
                          borderRadius: 99,
                          whiteSpace: "nowrap",
                          flex: "none",
                          ...(added
                            ? { border: "1px solid transparent", color: "#ffffff", background: ACCENT }
                            : { border: `1px solid ${mix(18)}`, opacity: 0.7 }),
                        }}
                      >
                        {markLabel}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button onClick={() => setPickerFor(false)} style={accentBtn}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      {/* --- Share modal --- */}
      {shareOpen ? (
        <div onClick={() => setShareOpen(false)} style={overlayStyle(72)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, width: 400, alignItems: "center", gap: 16, padding: 28 }}>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>Share your Sell Binder</div>
                <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4, lineHeight: 1.5 }}>
                  Anyone who scans sees the read-only buyer view.
                </div>
              </div>
              <button onClick={() => setShareOpen(false)} style={closeBtn}>
                ✕
              </button>
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, padding: 14, boxShadow: "0 8px 24px -12px rgba(0,0,0,0.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=10&data=${encodeURIComponent(shareUrl)}`}
                alt="QR code for sell binder"
                width={200}
                height={200}
              />
            </div>
            <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 11.5, opacity: 0.65, wordBreak: "break-all", textAlign: "center" }}>
              {shareUrl}
            </div>
            <div style={{ width: "100%", display: "flex", gap: 10 }}>
              <button onClick={copyLink} style={{ ...mediumBtn, flex: 1, padding: 11 }}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button onClick={printInsert} style={{ ...accentBtn, flex: 1, padding: 11, fontSize: 12.5 }}>
                Print QR insert
              </button>
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.4, textAlign: "center", lineHeight: 1.5 }}>
              The insert is sized 3.5″ × 2.5″ — fits a standard card sleeve or binder pocket.
            </div>
          </div>
        </div>
      ) : null}

      {/* --- Zoom overlay --- */}
      {zoomIndex != null && slots[zoomIndex] ? (
        <ZoomOverlay
          zoom={{
            img: slots[zoomIndex]!.imageUrl,
            name: slots[zoomIndex]!.name,
            num: `#${slots[zoomIndex]!.number}`,
            rev: slots[zoomIndex]!.variant === "reverse",
            localId: slots[zoomIndex]!.number,
            marketPrice: slots[zoomIndex]!.marketPrice,
          }}
          isMaster
          sellAsk={
            !preview
              ? {
                  initial: slots[zoomIndex]!.price,
                  onApply: (price) => {
                    updateAt(zoomIndex, { price: String(price) });
                    setZoomIndex(null);
                  },
                }
              : null
          }
          onClose={() => setZoomIndex(null)}
          onUpgrade={() => setZoomIndex(null)}
        />
      ) : null}

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  appearance: "none",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  background: "transparent",
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 600,
  padding: "5px 10px",
  borderRadius: 7,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const mediumBtn: React.CSSProperties = {
  appearance: "none",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  background: "transparent",
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  padding: "10px 16px",
  borderRadius: 9,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const accentBtn: React.CSSProperties = {
  appearance: "none",
  border: 0,
  borderRadius: 10,
  padding: 12,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  color: "#ffffff",
  cursor: "pointer",
  background: "oklch(0.60 0.16 27)",
};

const closeBtn: React.CSSProperties = {
  appearance: "none",
  border: 0,
  background: "transparent",
  color: "inherit",
  fontSize: 16,
  cursor: "pointer",
  opacity: 0.45,
  padding: 4,
  lineHeight: 1,
};

function overlayStyle(z: number): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: z,
    background: "rgba(10,10,14,0.62)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    boxSizing: "border-box",
  };
}

const modalStyle: React.CSSProperties = {
  maxWidth: "100%",
  borderRadius: 18,
  padding: 24,
  boxSizing: "border-box",
  boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)",
  display: "flex",
  flexDirection: "column",
  background: "#ffffff",
};
