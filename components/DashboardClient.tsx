"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { mix } from "@/lib/theme";
import { Header } from "@/components/Header";
import { PaywallModal } from "@/components/PaywallModal";
import { BINDER_LIMIT, convertPrice, fmtAmt, setImageUrl } from "@/lib/binder";

const ACCENT = "oklch(0.60 0.16 27)";

interface OwnedCardRow {
  cardId: string;
  name: string;
  number: string;
  variant: string;
  imageUrl: string | null;
  priceValue: number | null;
  priceCurrency: "USD" | "EUR" | null;
}

interface SetGroup {
  setId: string;
  setName: string;
  seriesName: string;
  setSymbolUrl: string | null;
  setCardCount: number;
  cards: OwnedCardRow[];
}

interface SellBinderRow {
  id: string;
  title: string;
  cardCount: number;
  asking: number;
}

type Currency = "USD" | "EUR";

type ClearTarget = { all: true } | { setId: string; name: string; count: number };

export function DashboardClient({
  groups,
  plan,
  currency: initialCurrency,
  sellBinders,
}: {
  groups: SetGroup[];
  plan: string;
  currency: Currency;
  sellBinders: SellBinderRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const [paywall, setPaywall] = useState<import("@/components/PaywallModal").PaywallReason | null>(null);
  const setPaywallOpen = (open: boolean) => setPaywall(open ? "browse" : null);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [clearConfirm, setClearConfirm] = useState<ClearTarget | null>(null);
  const [dashMsg, setDashMsg] = useState<string | null>(null);
  const [undoData, setUndoData] = useState<{
    cards: { cardId: string; variant: string }[];
    msg: string;
  } | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPro = plan === "pro" || plan === "master";
  const isMaster = plan === "master";

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      updateSession();
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const totalCards = useMemo(() => groups.reduce((n, g) => n + g.cards.length, 0), [groups]);
  const revCount = useMemo(
    () => groups.reduce((n, g) => n + g.cards.filter((c) => c.variant === "reverse").length, 0),
    [groups]
  );

  const totalValue = useMemo(() => {
    let v = 0;
    for (const g of groups) {
      for (const c of g.cards) {
        if (c.priceValue != null && c.priceCurrency) {
          v += convertPrice(c.priceValue, c.priceCurrency, currency);
        }
      }
    }
    return v;
  }, [groups, currency]);

  const dashRows = useMemo(() => {
    return groups
      .map((g) => {
        const uniqueBase = new Set(g.cards.map((c) => c.cardId)).size;
        const pct = g.setCardCount
          ? Math.min(100, Math.round((100 * uniqueBase) / g.setCardCount))
          : 0;
        let value = 0;
        for (const c of g.cards) {
          if (c.priceValue != null && c.priceCurrency) {
            value += convertPrice(c.priceValue, c.priceCurrency, currency);
          }
        }
        const valSuffix = value > 0 ? ` · ${fmtAmt(value, currency)}` : "";
        return {
          setId: g.setId,
          name: g.setName,
          serie: g.seriesName,
          symbolUrl: setImageUrl(g.setSymbolUrl),
          pct,
          count: g.cards.length,
          label: g.setCardCount
            ? `${uniqueBase}/${g.setCardCount} unique · ${g.cards.length} total${valSuffix}`
            : `${g.cards.length} cards${valSuffix}`,
        };
      })
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
  }, [groups, currency]);

  const dashStats = [
    { k: "Cards collected", v: String(totalCards) },
    { k: "Sets started", v: String(groups.length) },
    { k: "Reverse holos", v: String(revCount) },
    { k: "Est. value (market)", v: totalValue > 0 ? `≈ ${fmtAmt(totalValue, currency)}` : "—" },
  ];

  const planTitle = isMaster ? "Binder Sync Master" : isPro ? "Binder Sync Pro" : "Free plan";
  const planDesc = isMaster
    ? "Sell Binder, QR sharing, and unlimited binders. Billed $6.00 monthly — cancel anytime."
    : isPro
      ? "Unlimited binders, synced everywhere. Billed $3.00 monthly — cancel anytime."
      : `Saving ${groups.length} of ${BINDER_LIMIT} free binders. Pro removes the limit.`;

  async function pickCurrency(c: Currency) {
    setCurrency(c);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: c }),
    });
    updateSession();
  }

  function exportJson() {
    const flat = groups.flatMap((g) => g.cards.map((c) => ({ cardId: c.cardId, variant: c.variant })));
    downloadBlob(JSON.stringify(flat, null, 2), "bindersync-collection.json", "application/json");
    setDashMsg(`Exported ${flat.length} cards.`);
  }

  function exportCsv() {
    const rows = [["setId", "setName", "cardId", "name", "number", "variant"]];
    for (const g of groups) {
      for (const c of g.cards) {
        rows.push([g.setId, g.setName, c.cardId, c.name, c.number, c.variant]);
      }
    }
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadBlob(csv, "bindersync-collection.csv", "text/csv");
    setDashMsg(`Exported ${rows.length - 1} cards.`);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    let cards: { cardId: string; variant: string }[] = [];
    try {
      cards = JSON.parse(text);
      if (!Array.isArray(cards)) throw new Error("not an array");
    } catch {
      setDashMsg("Could not parse that file — expected a JSON export.");
      return;
    }
    setBusy(true);
    await fetch("/api/collection/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards }),
    });
    setBusy(false);
    setDashMsg(`Imported ${cards.length} cards.`);
    router.refresh();
  }

  async function doClear() {
    if (!clearConfirm) return;
    const target = clearConfirm;
    const affected =
      "all" in target
        ? groups.flatMap((g) => g.cards.map((c) => ({ cardId: c.cardId, variant: c.variant })))
        : (groups.find((g) => g.setId === target.setId)?.cards ?? []).map((c) => ({
            cardId: c.cardId,
            variant: c.variant,
          }));
    const msg = "all" in target ? "All binders cleared" : `Cleared “${target.name}”`;

    setBusy(true);
    await fetch("/api/collection", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("all" in target ? {} : { setId: target.setId }),
    });
    setBusy(false);
    setClearConfirm(null);
    setDashMsg(`${msg}.`);
    setUndoData({ cards: affected, msg });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoData(null), 10000);
    router.refresh();
  }

  async function undoClear() {
    if (!undoData) return;
    setBusy(true);
    await fetch("/api/collection/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: undoData.cards }),
    });
    setBusy(false);
    setUndoData(null);
    setDashMsg("Restored.");
    router.refresh();
  }

  async function createSellBinder() {
    const res = await fetch("/api/sell-binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Sell Binder" }),
    });
    const body = await res.json();
    if (res.ok) router.push(`/sell/${body.binder.id}`);
    else setDashMsg(body.error ?? "Could not create a sell binder.");
  }

  async function commitRename(id: string) {
    const title = renameVal.trim();
    setRenameId(null);
    if (!title) return;
    await fetch(`/api/sell-binders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
      <Header variant="dashboard" onOpenPlans={() => setPaywallOpen(true)} />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "52px 28px 64px" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>My collection</h1>

        <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
          {dashStats.map((d) => (
            <div
              key={d.k}
              style={{
                flex: 1,
                minWidth: 150,
                borderRadius: 12,
                padding: "16px 18px",
                border: `1px solid ${mix(10)}`,
                background: "var(--surf)",
              }}
            >
              <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 24, fontWeight: 700 }}>
                {d.v}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4 }}>{d.k}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            padding: "18px 20px",
            border: `1px solid ${mix(10)}`,
            background: "var(--surf)",
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{planTitle}</div>
              {isPro ? (
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
                  {isMaster ? "MASTER" : "PRO"}
                </div>
              ) : null}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.55, lineHeight: 1.5, maxWidth: 420 }}>{planDesc}</div>
            {!isPro ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 180, height: 5, borderRadius: 3, background: mix(10), overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 3,
                      width: `${Math.min(100, Math.round((100 * groups.length) / BINDER_LIMIT))}%`,
                      background: ACCENT,
                    }}
                  />
                </div>
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10.5, opacity: 0.6 }}>
                  {groups.length} / {BINDER_LIMIT} binders
                </div>
              </div>
            ) : null}
          </div>
          {!isPro ? (
            <button
              onClick={() => setPaywallOpen(true)}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 10,
                padding: "11px 18px",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
                background: ACCENT,
              }}
            >
              Upgrade to Pro — $3/mo
            </button>
          ) : (
            <button
              onClick={async () => {
                const res = await fetch("/api/stripe/portal", { method: "POST" });
                const body = await res.json();
                if (res.ok) window.location.href = body.url;
                else setDashMsg(body.error ?? "Could not open the billing portal.");
              }}
              style={{ ...outlineBtn, opacity: 0.75 }}
            >
              Manage subscription
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            padding: "18px 20px",
            border: `1px solid ${mix(10)}`,
            background: "var(--surf)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Sell Binders</div>
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
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.55, lineHeight: 1.5, maxWidth: 420 }}>
                Pick any cards from any set, place them where you want, set asking prices, and share
                each binder with its own QR code.
              </div>
            </div>
            {isMaster ? (
              <button onClick={createSellBinder} style={outlineBtn}>
                ＋ New sell binder
              </button>
            ) : (
              <button
                onClick={() => setPaywall("sell")}
                style={{
                  appearance: "none",
                  border: 0,
                  borderRadius: 10,
                  padding: "11px 18px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  background: ACCENT,
                }}
              >
                Unlock with Master
              </button>
            )}
          </div>
          {isMaster && sellBinders.length > 0 ? (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {sellBinders.map((sb) => (
                <div
                  key={sb.id}
                  onClick={() => renameId !== sb.id && router.push(`/sell/${sb.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: `1px solid ${mix(10)}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renameId === sb.id ? (
                      <input
                        value={renameVal}
                        autoFocus
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => commitRename(sb.id)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: `1px solid ${mix(25)}`,
                          background: "transparent",
                          color: "inherit",
                          outline: "none",
                          width: "100%",
                          maxWidth: 280,
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sb.title || "Untitled binder"}
                      </div>
                    )}
                    <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10.5, opacity: 0.55, marginTop: 2 }}>
                      {sb.cardCount
                        ? `${sb.cardCount} card${sb.cardCount === 1 ? "" : "s"}${sb.asking > 0 ? ` · asking ${fmtAmt(sb.asking, "USD")}` : ""}`
                        : "No cards listed yet"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameId(sb.id);
                      setRenameVal(sb.title);
                    }}
                    title="Rename binder"
                    style={{
                      appearance: "none",
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      opacity: 0.45,
                      padding: 6,
                      lineHeight: 1,
                      display: "flex",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14">
                      <path d="M9.7 1.7l2.6 2.6L4.6 12 1.5 12.5 2 9.4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.55, whiteSpace: "nowrap" }}>Open →</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Prices in</div>
            <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, border: `1px solid ${mix(12)}` }}>
              {(["USD", "EUR"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => pickCurrency(c)}
                  style={{
                    appearance: "none",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "6px 11px",
                    borderRadius: 7,
                    background: currency === c ? "var(--ink)" : "transparent",
                    color: currency === c ? "var(--bg)" : "inherit",
                    opacity: currency === c ? 1 : 0.55,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c === "USD" ? "$ USD" : "€ EUR"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={exportJson} style={outlineBtn}>Export collection (.json)</button>
          <button onClick={exportCsv} style={outlineBtn}>Export for Excel (.csv)</button>
          <label style={{ ...outlineBtn, display: "inline-block" }}>
            Import collection
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              disabled={busy}
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {totalCards > 0 ? (
            <button
              onClick={() => setClearConfirm({ all: true })}
              style={{
                ...outlineBtn,
                border: "1px solid color-mix(in srgb, #c0392b 45%, transparent)",
                color: "#c0392b",
              }}
            >
              Clear all binders
            </button>
          ) : null}
          {dashMsg ? <div style={{ fontSize: 12, opacity: 0.6 }}>{dashMsg}</div> : null}
        </div>

        {totalCards === 0 ? (
          <div style={{ marginTop: 40, fontSize: 14, opacity: 0.55, lineHeight: 1.6 }}>
            No cards marked yet. Open a set and click cards (or their ✓) to start tracking — your
            progress will show up here.
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 30 }}>
          {dashRows.map((r) => (
            <div
              key={r.setId}
              onClick={() => router.push(`/sets/${r.setId}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderRadius: 12,
                padding: "14px 18px",
                cursor: "pointer",
                border: `1px solid ${mix(10)}`,
                background: "var(--surf)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {r.symbolUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.symbolUrl} alt="" loading="lazy" style={{ width: 20, height: 20, objectFit: "contain", flex: "none" }} />
              ) : null}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{r.serie}</div>
              </div>
              <div style={{ width: 200, flex: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ height: 5, borderRadius: 3, background: mix(10), overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${r.pct}%`, background: ACCENT }} />
                </div>
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10.5, opacity: 0.55 }}>
                  {r.label}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setClearConfirm({ setId: r.setId, name: r.name, count: r.count });
                }}
                title="Clear this binder"
                style={{
                  appearance: "none",
                  border: 0,
                  background: "transparent",
                  color: "#c0392b",
                  fontSize: 14,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  opacity: 0.45,
                  flex: "none",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <DeleteAccountSection />
      </div>

      {clearConfirm ? (
        <div
          onClick={() => setClearConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(10,10,14,0.62)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 26,
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: "100%",
              borderRadius: 16,
              padding: 26,
              background: "var(--surf)",
              boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>
              {"all" in clearConfirm ? "Clear all binders?" : `Clear “${clearConfirm.name}”?`}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
              {"all" in clearConfirm
                ? `This removes all ${totalCards} tracked cards across ${groups.length} binder${groups.length === 1 ? "" : "s"} from your account. Consider exporting a backup first.`
                : `This removes the ${clearConfirm.count} tracked card${clearConfirm.count === 1 ? "" : "s"} in this binder from your account. Consider exporting a backup first.`}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => setClearConfirm(null)} style={outlineBtn}>
                Cancel
              </button>
              <button
                onClick={doClear}
                disabled={busy}
                style={{
                  appearance: "none",
                  border: 0,
                  borderRadius: 9,
                  padding: "9px 16px",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "#c0392b",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                {"all" in clearConfirm ? "Clear everything" : "Clear binder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {undoData ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 26,
            transform: "translateX(-50%)",
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 10px 10px 18px",
            borderRadius: 12,
            border: `1px solid ${mix(12)}`,
            boxShadow: "0 18px 44px -14px rgba(0,0,0,0.45)",
            background: "var(--surf)",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>{undoData.msg}</div>
          <button
            onClick={undoClear}
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#c0392b",
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: 8,
            }}
          >
            Undo
          </button>
          <button
            onClick={() => {
              if (undoTimer.current) clearTimeout(undoTimer.current);
              setUndoData(null);
            }}
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

const outlineBtn: React.CSSProperties = {
  appearance: "none",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  background: "transparent",
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  padding: "9px 15px",
  borderRadius: 9,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/** Account danger zone: self-serve deletion. Cancels any Stripe
 * subscription server-side and removes all data, gated behind typing
 * DELETE so a stray click can't do it. */
function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Could not delete the account (HTTP ${res.status}).`);
        setBusy(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Could not reach the server — check your connection.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 46,
        borderRadius: 12,
        border: `1px solid ${mix(10)}`,
        background: "var(--surf)",
        padding: "16px 20px",
      }}
    >
      {!open ? (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240, fontSize: 12.5, opacity: 0.6, lineHeight: 1.5 }}>
            Done with Binder Sync? Deleting your account removes your collection, sell binders,
            and any subscription — permanently.
          </div>
          <button onClick={() => setOpen(true)} style={{ ...outlineBtn, color: "#c0392b", borderColor: "rgba(192,57,43,0.4)" }}>
            Delete my account
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#c0392b" }}>Delete this account?</div>
          <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.55 }}>
            This permanently deletes your collection, sell binders (their share links stop
            working), and cancels any active subscription immediately. There is no undo —
            consider exporting your collection above first. Type <strong>DELETE</strong> to
            confirm.
          </div>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            style={{
              fontFamily: "inherit",
              fontSize: 12.5,
              padding: "9px 12px",
              borderRadius: 9,
              border: `1px solid ${mix(15)}`,
              background: "transparent",
              color: "inherit",
              outline: "none",
              width: 220,
              boxSizing: "border-box",
            }}
          />
          {error ? <div style={{ fontSize: 12, color: "#ab1d18" }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || busy}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 9,
                padding: "9px 16px",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#ffffff",
                background: confirmText === "DELETE" && !busy ? "#c0392b" : "#8a8c92",
                cursor: confirmText === "DELETE" && !busy ? "pointer" : "default",
              }}
            >
              {busy ? "Deleting…" : "Permanently delete account"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              style={outlineBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
