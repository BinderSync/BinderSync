"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mix, themes, leathers, leatherById, leatherGradient } from "@/lib/theme";
import {
  BINDER_LIMIT,
  FLIP_MS,
  PAGE_SIZES,
  type PageSize,
  type BinderMode,
  type ViewMode,
  type CardBrief,
  type SeqCard,
  seqFor,
  buildPages,
  spreadMaxFor,
  pageGeometry,
  priceFor,
  fmtAmt,
  sumKeys,
  fmtTotal,
  convertPrice,
  setImageUrl,
  lowResCardImage,
} from "@/lib/binder";
import { Header } from "@/components/Header";
import { CardPocket } from "@/components/CardPocket";
import { ZoomOverlay, type ZoomState } from "@/components/ZoomOverlay";
import { PaywallModal } from "@/components/PaywallModal";

interface SetBrief {
  id: string;
  name: string;
  seriesName: string;
  logoUrl: string | null;
  symbolUrl: string | null;
  releaseDate: string | null;
  officialCount: number;
}

interface Prefs {
  size: PageSize;
  mode: BinderMode;
  viewMode: ViewMode;
  showPrices: boolean;
  binderColor: string | null;
}

const DEFAULT_PREFS: Prefs = {
  size: 9,
  mode: "base",
  viewMode: "collect",
  showPrices: false,
  binderColor: null,
};

function useViewportSize() {
  const [size, setSize] = useState({ vw: 1280, vh: 800 });
  useEffect(() => {
    const update = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export function BinderClient({
  set,
  cards,
  initialOwned,
  isSignedIn,
  plan,
  ownedSetIds: initialOwnedSetIds,
}: {
  set: SetBrief;
  cards: CardBrief[];
  initialOwned: Record<string, boolean>;
  isSignedIn: boolean;
  plan: string;
  ownedSetIds: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = themes.Gallery;

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<{ dir: 1 | -1; angle: number; go: boolean } | null>(null);
  const [zoomCard, setZoomCard] = useState<SeqCard | null>(null);
  const [owned, setOwned] = useState(initialOwned);
  const [ownedSetIds, setOwnedSetIds] = useState(new Set(initialOwnedSetIds));
  const [cardQuery, setCardQuery] = useState("");
  const [needOpen, setNeedOpen] = useState(false);
  const [paywall, setPaywall] = useState<import("@/components/PaywallModal").PaywallReason | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { vw, vh } = useViewportSize();

  const isPro = plan === "pro" || plan === "master";
  const isMaster = plan === "master";
  const collect = prefs.viewMode === "collect";
  const showPrices = prefs.showPrices && isMaster;

  // Load persisted prefs once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bdx-prefs");
      if (raw) {
        const p = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from browser-only localStorage, not available during SSR
        setPrefs((prev) => ({
          size: PAGE_SIZES.includes(p.size) ? p.size : prev.size,
          mode: p.mode === "master" ? "master" : "base",
          viewMode: p.viewMode === "view" ? "view" : "collect",
          showPrices: !!p.showPrices,
          binderColor: p.binderColor ?? null,
        }));
      }
    } catch {
      // ignore
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem("bdx-prefs", JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs, prefsLoaded]);

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const seq = useMemo(() => seqFor(cards, prefs.mode), [cards, prefs.mode]);
  const pages = useMemo(() => buildPages(seq, prefs.size), [seq, prefs.size]);
  const pageCount = pages.length;
  // Phones show one page per position (0 = cover, then page 1..N); wider
  // screens keep the two-page spread with the 3D flip.
  const singlePage = vw < 640;
  const spreadMax = singlePage ? pageCount : spreadMaxFor(pageCount);
  const k = Math.min(spread, spreadMax);

  const { cols, rows, pageW, pageH } = pageGeometry(prefs.size);

  const pageAt = (i: number) => (i >= 0 && i < pageCount ? pages[i] : null);

  let leftPage: (SeqCard | null)[] | null;
  let rightPage: (SeqCard | null)[] | null;
  let leftIsCover: boolean;
  if (flip && flip.dir > 0) {
    leftIsCover = k === 0;
    leftPage = k === 0 ? null : pageAt(2 * k - 1);
    rightPage = pageAt(2 * k + 2);
  } else if (flip && flip.dir < 0) {
    leftIsCover = k - 1 === 0;
    leftPage = k - 1 === 0 ? null : pageAt(2 * k - 3);
    rightPage = pageAt(2 * k);
  } else {
    leftIsCover = k === 0;
    leftPage = k === 0 ? null : pageAt(2 * k - 1);
    rightPage = pageAt(2 * k);
  }
  const rightIsEnd = !rightPage;

  let flipFront: (SeqCard | null)[] | null = null;
  let flipBack: (SeqCard | null)[] | null = null;
  if (flip) {
    flipFront = flip.dir > 0 ? pageAt(2 * k) : pageAt(2 * k - 2);
    flipBack = flip.dir > 0 ? pageAt(2 * k + 1) : pageAt(2 * k - 1);
  }

  // Warm the browser cache for the pages one flip away in each direction —
  // pocket images are CSS backgrounds, which only start downloading when
  // their page mounts, i.e. mid-flip. Preloading kills that jank.
  useEffect(() => {
    const idxs = singlePage
      ? [k, k + 1, k - 1]
      : [2 * k - 3, 2 * k - 2, 2 * k + 1, 2 * k + 2];
    for (const i of idxs) {
      const page = i >= 0 && i < pageCount ? pages[i] : null;
      if (!page) continue;
      for (const c of page) {
        const src = c?.imageUrl ? lowResCardImage(c.imageUrl) : null;
        if (src) new Image().src = src;
      }
    }
  }, [k, pages, pageCount, singlePage]);

  const coverPad = 16;
  const spine = 44;
  const coverW = singlePage ? pageW + 2 * coverPad : 2 * pageW + spine + 2 * coverPad;
  const coverH = pageH + 2 * coverPad;
  const coverHalf = Math.round(coverW / 2);
  const scale = Math.max(
    0.2,
    Math.min(1, (vw - (singlePage ? 24 : 60)) / (coverW + (singlePage ? 4 : 130)), (vh - 240) / coverH)
  );
  const stageH = Math.round(coverH * scale);

  const ownedN = useMemo(() => seq.filter((c) => owned[c.key]).length, [seq, owned]);
  const progressPct = seq.length ? Math.round((100 * ownedN) / seq.length) : 0;
  const progressLabel = `${ownedN}/${seq.length} · ${progressPct}%`;

  const coverStats = useMemo(() => {
    const stats: { k: string; v: string }[] = [{ k: "Official cards", v: String(set.officialCount) }];
    stats.push({ k: prefs.mode === "master" ? "Master set size" : "Cards in view", v: String(seq.length) });
    stats.push({ k: "Binder pages", v: `${pageCount} × ${prefs.size}-pocket` });
    if (set.releaseDate) stats.push({ k: "Released", v: set.releaseDate });
    stats.push({ k: "Collected", v: `${ownedN} / ${seq.length}` });
    const setTotal = sumKeys(cardsById, seq.map((c) => c.key));
    const ownTotal = sumKeys(cardsById, seq.filter((c) => owned[c.key]).map((c) => c.key));
    stats.push({ k: "Set value (market)", v: fmtTotal(setTotal, "USD") });
    if (ownedN > 0) stats.push({ k: "Your cards' value", v: fmtTotal(ownTotal, "USD") });
    return stats;
  }, [set, seq, prefs.mode, prefs.size, pageCount, ownedN, owned, cardsById]);

  const needRows = useMemo(() => {
    return seq
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !owned[c.key])
      .map(({ c, i }) => {
        const p = Math.floor(i / prefs.size) + 1;
        const pk = (i % prefs.size) + 1;
        return {
          key: c.key,
          num: `#${c.number}`,
          name: c.name,
          rev: c.rev,
          loc: `Pg ${p} · Pk ${pk}`,
          target: singlePage ? p : Math.ceil((p - 1) / 2),
        };
      });
  }, [seq, owned, prefs.size, singlePage]);

  const needCountLabel = useMemo(() => {
    const total = fmtTotal(sumKeys(cardsById, needRows.map((r) => r.key)), "USD");
    return `${needRows.length} missing${total === "—" ? "" : ` · ≈ ${total}`}`;
  }, [needRows, cardsById]);

  const cardDropRows = useMemo(() => {
    const q = cardQuery.trim().toLowerCase();
    if (!q) return [];
    return seq
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.name.toLowerCase().includes(q))
      .slice(0, 40)
      .map(({ c, i }) => ({
        key: c.key,
        num: `#${c.number}`,
        name: c.name,
        rev: c.rev,
        loc: `Pg ${Math.floor(i / prefs.size) + 1} · Pk ${(i % prefs.size) + 1}`,
        seqIndex: i,
      }));
  }, [seq, cardQuery, prefs.size]);

  const flashCard = useCallback((key: string) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlight(key);
    highlightTimer.current = setTimeout(() => setHighlight(null), 2800);
  }, []);

  const jumpToSeqIndex = useCallback(
    (i: number, key: string) => {
      const page = Math.floor(i / prefs.size) + 1;
      setSpread(singlePage ? page : Math.ceil((page - 1) / 2));
      setFlip(null);
      flashCard(key);
    },
    [prefs.size, flashCard, singlePage]
  );

  // Jump to a card passed via ?card= query param (from Home's global search).
  useEffect(() => {
    const cardId = searchParams.get("card");
    if (!cardId || !seq.length) return;
    const i = seq.findIndex((c) => !c.rev && c.id === cardId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time jump triggered by an incoming ?card= URL param, not by a render
    if (i >= 0) jumpToSeqIndex(i, seq[i].key);
    router.replace(`/sets/${set.id}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq.length]);

  function nav(dir: 1 | -1) {
    if (flip) return;
    if (dir > 0 && k >= spreadMax) return;
    if (dir < 0 && k <= 0) return;
    if (singlePage) {
      // No spread to flip on phones — just switch pages.
      setSpread(k + dir);
      return;
    }
    const startA = dir > 0 ? 0 : -180;
    const endA = dir > 0 ? -180 : 0;
    setFlip({ dir, angle: startA, go: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setFlip({ dir, angle: endA, go: true }))
    );
    if (flipTimer.current) clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(finishFlip, FLIP_MS + 200);
  }

  function finishFlip() {
    setFlip((f) => {
      if (!f) return null;
      setSpread(k + (f.dir > 0 ? 1 : -1));
      return null;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") nav(-1);
      if (e.key === "ArrowRight") nav(1);
      if (e.key === "Escape") {
        setZoomCard(null);
        setCardQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip, k, spreadMax]);

  async function persistOwned(cardId: string, variant: "base" | "reverse", nextOwned: boolean) {
    if (!isSignedIn) return;
    try {
      await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, variant, owned: nextOwned }),
      });
    } catch {
      // best-effort; local state already reflects the intent
    }
  }

  function toggleOwned(card: SeqCard) {
    const key = card.key;
    const isOwned = !!owned[key];
    if (!isSignedIn && !nudgeDismissed) setShowNudge(true);
    if (isSignedIn && !isOwned && plan === "free" && !ownedSetIds.has(set.id) && ownedSetIds.size >= BINDER_LIMIT) {
      setPaywall("limit");
      return;
    }
    setOwned((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
    if (!isOwned) setOwnedSetIds((prev) => new Set(prev).add(set.id));
    void persistOwned(card.id, card.rev ? "reverse" : "base", !isOwned);
  }

  function openZoom(card: SeqCard) {
    setZoomCard(card);
  }

  const lockBannerOn = !isPro && collect && !ownedSetIds.has(set.id) && ownedSetIds.size >= BINDER_LIMIT;

  const jumpOpts = useMemo(() => {
    const opts: { v: string; label: string }[] = [];
    for (let j = 0; j <= spreadMax; j++) {
      opts.push({
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
    return opts;
  }, [spreadMax, pageCount, singlePage]);

  const pagesLabel = singlePage
    ? k === 0
      ? pageCount
        ? `Cover · ${pageCount} pages`
        : "Empty set"
      : `Page ${k} of ${pageCount}`
    : k === 0
      ? pageCount
        ? `Cover · Page 1 of ${pageCount}`
        : "Empty set"
      : `Pages ${2 * k}${2 * k + 1 <= pageCount ? `–${2 * k + 1}` : ""} of ${pageCount}`;

  const lc = leatherById(prefs.binderColor);

  function priceLabelFor(card: SeqCard): string | null {
    if (!showPrices) return null;
    const pr = priceFor(card, card.rev);
    if (!pr) return null;
    return fmtAmt(convertPrice(pr.value, pr.currency, "USD"), "USD");
  }

  function renderPage(page: (SeqCard | null)[] | null, live: boolean) {
    if (!page) return null;
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
            gap: 10,
            padding: 18,
          }}
        >
          {page.map((card, i) => (
            <CardPocket
              key={card?.key ?? `empty-${i}`}
              card={card}
              owned={card ? !!owned[card.key] : false}
              collect={collect}
              live={live}
              highlight={card ? highlight === card.key : false}
              priceLabel={card ? priceLabelFor(card) : null}
              onToggleOwned={() => card && toggleOwned(card)}
              onZoom={() => card && openZoom(card)}
              pocketBg={theme.pocket}
              accent={theme.accent}
              dimEnabled
            />
          ))}
        </div>
      </div>
    );
  }

  const zoomState: ZoomState | null = zoomCard
    ? {
        img: zoomCard.imageUrl,
        name: zoomCard.name,
        num: `#${zoomCard.number}`,
        rev: zoomCard.rev,
        setName: set.name,
        localId: zoomCard.number,
        setTotal: set.officialCount,
        tcgplayerUrl: zoomCard.tcgplayerUrl,
        marketPrice: (() => {
          const pr = priceFor(zoomCard, zoomCard.rev);
          return pr ? convertPrice(pr.value, pr.currency, "USD") : null;
        })(),
      }
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.ink,
        fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
      }}
    >
      <Header
        variant="set"
        setName={set.name}
        setSerie={set.seriesName}
        setSymbolUrl={setImageUrl(set.symbolUrl)}
        progressPct={progressPct}
        progressLabel={progressLabel}
        cardQuery={cardQuery}
        onCardQueryChange={setCardQuery}
        cardDropRows={cardDropRows.map((r) => ({
          key: r.key,
          num: r.num,
          name: r.name,
          rev: r.rev,
          loc: r.loc,
          onJump: () => {
            jumpToSeqIndex(r.seqIndex, r.key);
            setCardQuery("");
          },
        }))}
        sizeOpts={PAGE_SIZES.map((n) => ({
          label: `${n}-pocket`,
          active: prefs.size === n,
          onPick: () => {
            setPrefs((p) => ({ ...p, size: n }));
            setSpread(0);
            setFlip(null);
          },
        }))}
        modeOpts={[
          { label: "Set", m: "base" as const },
          { label: "Master set", m: "master" as const },
        ].map((o) => ({
          label: o.label,
          active: prefs.mode === o.m,
          onPick: () => {
            setPrefs((p) => ({ ...p, mode: o.m }));
            setFlip(null);
          },
        }))}
        viewOpts={[
          { label: "Collect", m: "collect" as const },
          { label: "View", m: "view" as const },
        ].map((o) => ({
          label: o.label,
          active: prefs.viewMode === o.m,
          onPick: () => setPrefs((p) => ({ ...p, viewMode: o.m })),
        }))}
        priceActive={showPrices}
        priceLocked={!isMaster}
        onPriceToggle={() => {
          if (!isMaster) {
            setPaywall("prices");
            return;
          }
          setPrefs((p) => ({ ...p, showPrices: !p.showPrices }));
        }}
        needCount={needRows.length}
        needActive={needOpen}
        onNeedToggle={() => setNeedOpen((v) => !v)}
        onOpenPlans={() => setPaywall("browse")}
      />

      <div style={{ padding: "30px 0 10px" }}>
        {lockBannerOn ? (
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto 18px",
              padding: "11px 16px",
              borderRadius: 11,
              border: `1px solid ${mix(14)}`,
              background: theme.surf,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 12.5, opacity: 0.75, flex: 1, minWidth: 220, lineHeight: 1.5 }}>
              This set would be binder #{ownedSetIds.size + 1} — Free saves {BINDER_LIMIT}. Browse
              freely; tracking cards here needs Pro.
            </div>
            <button
              onClick={() => setPaywall("limit")}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 8,
                padding: "8px 14px",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
                background: "oklch(0.60 0.16 27)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              See Pro
            </button>
          </div>
        ) : null}

        <div style={{ height: stageH, overflow: "visible" }}>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: coverW,
              position: "relative",
              left: "50%",
              marginLeft: -coverHalf,
            }}
          >
            <div
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null) return;
                const delta = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(delta) < 48) return;
                nav(delta < 0 ? 1 : -1);
              }}
              style={{
                position: "relative",
                width: coverW,
                height: coverH,
                borderRadius: 18,
                background: leatherGradient(lc.l1, lc.l2),
                boxShadow: "0 30px 70px -24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                perspective: 2600,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 7,
                  border: `1.5px dashed ${prefs.binderColor === "white" ? "rgba(0,0,0,0.18)" : theme.stitch}`,
                  borderRadius: 12,
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "absolute", inset: 16, display: "flex" }}>
                {leftIsCover ? (
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
                      {set.logoUrl ? (
                        <div
                          style={{
                            width: "82%",
                            height: 82,
                            backgroundImage: `url('${setImageUrl(set.logoUrl)}')`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                          }}
                        />
                      ) : null}
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{set.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>{set.seriesName}</div>
                      </div>
                      <div style={{ width: "100%", height: 1, background: mix(12) }} />
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
                        {coverStats.map((row) => (
                          <div key={row.k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                            <span style={{ opacity: 0.55, whiteSpace: "nowrap" }}>{row.k}</span>
                            <span
                              style={{
                                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.v}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ width: "100%", height: 5, borderRadius: 3, background: mix(10), overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${progressPct}%`,
                            background: "oklch(0.60 0.16 27)",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>
                        {collect ? "Click a card or its ✓ to mark it as owned" : "Viewing mode — click a card to enlarge it"}
                      </div>
                    </div>
                  </div>
                ) : singlePage ? (
                  renderPage(pageAt(k - 1) ?? [], true)
                ) : leftPage ? (
                  renderPage(leftPage, true)
                ) : (
                  <div style={{ width: pageW, height: pageH }} />
                )}

                {!singlePage ? (
                  <>
                    <div
                      style={{
                        width: 44,
                        flex: "none",
                        background:
                          "linear-gradient(90deg, rgba(0,0,0,0.38), rgba(0,0,0,0) 32%, rgba(0,0,0,0) 68%, rgba(0,0,0,0.38))",
                      }}
                    />

                    {rightPage ? (
                      renderPage(rightPage, true)
                    ) : rightIsEnd ? (
                      <div style={{ width: pageW, height: pageH, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div
                          style={{
                            fontFamily: "ui-monospace,SFMono-Regular,monospace",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.22em",
                            padding: "8px 14px",
                            borderRadius: 6,
                            color:
                              prefs.binderColor === "white" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)",
                            border:
                              prefs.binderColor === "white"
                                ? "1px solid rgba(0,0,0,0.2)"
                                : "1px solid rgba(255,255,255,0.22)",
                          }}
                        >
                          END OF SET
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: pageW, height: pageH }} />
                    )}
                  </>
                ) : null}
              </div>

              {flip ? (
                <div
                  onTransitionEnd={(e) => {
                    if (e.propertyName && e.propertyName !== "transform") return;
                    finishFlip();
                  }}
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16 + pageW + 44,
                    width: pageW,
                    height: pageH,
                    transformStyle: "preserve-3d",
                    transformOrigin: "-22px center",
                    zIndex: 5,
                    transform: `rotateY(${flip.angle}deg)`,
                    transition: flip.go ? `transform ${FLIP_MS}ms cubic-bezier(0.25,0.1,0.25,1)` : "none",
                    willChange: "transform",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      borderRadius: 8,
                      background: theme.paper,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                    }}
                  >
                    {renderPage(flipFront, false)}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderRadius: 8,
                      background: theme.paper,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                    }}
                  >
                    {renderPage(flipBack, false)}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              onClick={() => nav(-1)}
              disabled={!!flip || k <= 0}
              style={{
                position: "absolute",
                left: singlePage ? 8 : -62,
                top: "50%",
                transform: "translateY(-50%)",
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: `1px solid ${mix(14)}`,
                background: theme.surf,
                color: "inherit",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px -8px rgba(0,0,0,0.3)",
                opacity: !flip && k > 0 ? 1 : 0.3,
                pointerEvents: !flip && k > 0 ? "auto" : "none",
              }}
            >
              ←
            </button>
            <button
              onClick={() => nav(1)}
              disabled={!!flip || k >= spreadMax}
              style={{
                position: "absolute",
                right: singlePage ? 8 : -62,
                top: "50%",
                transform: "translateY(-50%)",
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: `1px solid ${mix(14)}`,
                background: theme.surf,
                color: "inherit",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px -8px rgba(0,0,0,0.3)",
                opacity: !flip && k < spreadMax ? 1 : 0.3,
                pointerEvents: !flip && k < spreadMax ? "auto" : "none",
              }}
            >
              →
            </button>
          </div>
        </div>

        <div style={{ padding: "18px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Binder</div>
            {leathers.map((l) => (
              <div
                key={l.id}
                onClick={() => setPrefs((p) => ({ ...p, binderColor: l.id }))}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  cursor: "pointer",
                  background: leatherGradient(l.l1, l.l2),
                  boxShadow:
                    (prefs.binderColor || "charcoal") === l.id
                      ? `0 0 0 2px ${theme.bg}, 0 0 0 4px ${theme.ink}`
                      : "inset 0 0 0 1px rgba(0,0,0,0.25)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select
              value={String(k)}
              onChange={(e) => {
                setSpread(parseInt(e.target.value, 10));
                setFlip(null);
              }}
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
            <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 11, opacity: 0.55 }}>
              {pagesLabel}
            </div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.4 }}>Use ← → arrow keys or the buttons to turn pages</div>
        </div>
      </div>

      {needOpen ? (
        <div
          style={{
            position: "fixed",
            top: 78,
            right: 18,
            bottom: 18,
            width: 302,
            zIndex: 40,
            borderRadius: 14,
            border: `1px solid ${mix(12)}`,
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxSizing: "border-box",
            background: theme.surf,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: `1px solid ${mix(10)}`,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em", flex: 1 }}>Need list</div>
            <div
              style={{
                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                fontSize: 10.5,
                opacity: 0.55,
                whiteSpace: "nowrap",
              }}
            >
              {needCountLabel}
            </div>
            <button
              onClick={() => setNeedOpen(false)}
              style={{
                appearance: "none",
                border: 0,
                background: "transparent",
                color: "inherit",
                fontSize: 14,
                lineHeight: 1,
                cursor: "pointer",
                opacity: 0.45,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
          {needRows.length === 0 ? (
            <div style={{ padding: "24px 18px", fontSize: 12.5, opacity: 0.55, lineHeight: 1.6 }}>
              Nothing missing — this set is complete. 🎉
            </div>
          ) : null}
          <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
            {needRows.map((r) => (
              <div
                key={r.key}
                onClick={() => {
                  setSpread(r.target);
                  setFlip(null);
                  flashCard(r.key);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontFamily: "ui-monospace,SFMono-Regular,monospace",
                    fontSize: 10.5,
                    opacity: 0.5,
                    width: 34,
                    flex: "none",
                  }}
                >
                  {r.num}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12.5,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.name}
                </div>
                {r.rev ? (
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
                    fontSize: 10.5,
                    opacity: 0.55,
                    whiteSpace: "nowrap",
                    flex: "none",
                  }}
                >
                  {r.loc}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${mix(10)}`, fontSize: 10.5, opacity: 0.45 }}>
            Click a card to flip to its page
          </div>
        </div>
      ) : null}

      {zoomState ? (
        <ZoomOverlay
          zoom={zoomState}
          isMaster={isMaster}
          onClose={() => setZoomCard(null)}
          onUpgrade={() => {
            setZoomCard(null);
            setPaywall("prices");
          }}
        />
      ) : null}

      {showNudge && !nudgeDismissed ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 26,
            transform: "translateX(-50%)",
            zIndex: 55,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 10px 10px 18px",
            borderRadius: 12,
            border: `1px solid ${mix(12)}`,
            boxShadow: "0 18px 44px -14px rgba(0,0,0,0.45)",
            background: theme.surf,
            maxWidth: "92vw",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
            You&rsquo;re not signed in — cards you mark won&rsquo;t be saved.
          </div>
          <button
            onClick={() => router.push("/register")}
            style={{
              appearance: "none",
              border: 0,
              borderRadius: 8,
              padding: "7px 12px",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff",
              background: "oklch(0.60 0.16 27)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Create free account
          </button>
          <button
            onClick={() => router.push("/login")}
            style={{
              appearance: "none",
              border: `1px solid ${mix(18)}`,
              background: "transparent",
              color: "inherit",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Log in
          </button>
          <button
            onClick={() => setNudgeDismissed(true)}
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              color: "inherit",
              fontSize: 13,
              lineHeight: 1,
              cursor: "pointer",
              opacity: 0.4,
              padding: "6px 8px",
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      <PaywallModal open={paywall !== null} reason={paywall ?? "browse"} onClose={() => setPaywall(null)} />
    </div>
  );
}
