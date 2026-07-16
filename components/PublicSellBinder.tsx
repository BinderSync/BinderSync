"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { SellSpread, type SellSlot } from "@/components/SellSpread";
import { fmtAmt, lowResCardImage, type PageSize } from "@/lib/binder";
import { mix } from "@/lib/theme";
import { SiteFooter } from "@/components/SiteFooter";

interface PublicCard {
  key: string;
  slotPosition: number;
  name: string;
  number: string;
  imageUrl: string | null;
  rev: boolean;
  price: number;
  condition: string;
}

export function PublicSellBinder({
  title,
  note,
  color,
  size,
  showPrices,
  cards,
  sellerLabel,
  shareId,
}: {
  title: string;
  note: string | null;
  color: string | null;
  size: number;
  showPrices: boolean;
  cards: PublicCard[];
  sellerLabel: string;
  shareId: string;
}) {
  const [spread, setSpread] = useState(0);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const pageSize = ([4, 9, 12].includes(size) ? size : 9) as PageSize;

  // Grid shows low-res; zoom opens the full scan.
  const fullImgBySlot = useMemo(
    () => new Map(cards.map((c) => [c.slotPosition, c.imageUrl])),
    [cards]
  );

  const { slots, nCards, ask, priced } = useMemo(() => {
    const arr: (SellSlot | null)[] = [];
    let a = 0;
    let p = 0;
    for (const c of cards) {
      while (arr.length <= c.slotPosition) arr.push(null);
      const askLabel = c.price > 0 ? fmtAmt(c.price, "USD") : "Make offer";
      if (c.price > 0) {
        a += c.price;
        p++;
      }
      arr[c.slotPosition] = {
        key: c.key,
        name: c.name,
        num: `#${c.number}`,
        img: lowResCardImage(c.imageUrl),
        rev: c.rev,
        priceTag: showPrices ? `${askLabel} · ${c.condition}` : c.condition,
      };
    }
    let last = -1;
    for (let i = 0; i < arr.length; i++) if (arr[i]) last = i;
    const padded = arr.slice(0, Math.max(0, Math.ceil((last + 1) / pageSize)) * pageSize);
    while (padded.length % pageSize !== 0) padded.push(null);
    return { slots: padded, nCards: cards.length, ask: a, priced: p };
  }, [cards, pageSize, showPrices]);

  const coverStats = useMemo(() => {
    const stats = [{ k: "Cards for sale", v: String(nCards) }];
    if (showPrices && ask > 0) stats.push({ k: "Asking total", v: fmtAmt(ask, "USD") });
    if (showPrices && priced < nCards && nCards) stats.push({ k: "Open to offers", v: String(nCards - priced) });
    const pageCount = Math.ceil(slots.length / pageSize);
    if (pageCount) stats.push({ k: "Pages", v: `${pageCount} × ${pageSize}-pocket` });
    return stats;
  }, [nCards, ask, priced, slots.length, pageSize, showPrices]);

  const totalLabel =
    `${nCards} card${nCards === 1 ? "" : "s"}` +
    (showPrices && ask > 0 ? ` · asking ${fmtAmt(ask, "USD")}` : "");

  return (
    <div style={{ minHeight: "100vh", background: "#f7f6f4", color: "#17181a", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(12px)",
          background: "rgba(247,246,244,0.82)",
          borderBottom: `1px solid ${mix(9)}`,
          padding: "14px 28px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" title="Binder Sync home" style={{ display: "flex", flex: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Binder Sync" style={{ height: 36, width: "auto", display: "block" }} />
          </Link>
          <div style={{ flex: 1 }} />
          <Link
            href="/register"
            style={{
              appearance: "none",
              border: 0,
              borderRadius: 9,
              padding: "8px 14px",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff",
              background: "oklch(0.60 0.16 27)",
              whiteSpace: "nowrap",
            }}
          >
            Start your own binder
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 28px 80px" }}>
        <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10, letterSpacing: "0.18em", opacity: 0.45 }}>
          FOR SALE · BINDER SYNC
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h1>
        <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 11, opacity: 0.55, marginTop: 8 }}>
          {totalLabel}
        </div>
        {note?.trim() ? (
          <div style={{ fontSize: 12.5, opacity: 0.7, lineHeight: 1.55, marginTop: 10, maxWidth: 460 }}>{note}</div>
        ) : null}

        <SellSpread
          title={title}
          slots={slots}
          size={pageSize}
          color={color}
          coverStats={coverStats}
          coverHint="Flip through to see every card, price, and condition"
          spread={spread}
          onSpreadChange={setSpread}
          editMode={false}
          onZoom={(i) => {
            const full = fullImgBySlot.get(i);
            if (full || slots[i]?.img) setZoomImg(full ?? slots[i]!.img);
          }}
        />

        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, opacity: 0.4 }}>
          Use ← → arrow keys or the buttons to turn pages
        </div>

        <ContactSeller shareId={shareId} sellerLabel={sellerLabel} />
      </div>

      <SiteFooter />

      {zoomImg ? (
        <div
          onClick={() => setZoomImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(10,10,14,0.74)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
            padding: 30,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              height: "82vh",
              aspectRatio: "63/88",
              maxWidth: "90vw",
              backgroundImage: `url('${zoomImg}')`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Buyer → seller message form. The relay emails the seller with Reply-To
 * set to the buyer, so neither address appears on the page. */
function ContactSeller({ shareId, sellerLabel }: { shareId: string; sellerLabel: string }) {
  const [open, setOpen] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/sell-binders/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId, fromEmail, message }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Could not send the message — try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Could not reach the server — check your connection.");
      setState("idle");
    }
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: 12.5,
    padding: "9px 12px",
    borderRadius: 9,
    border: `1px solid ${mix(15)}`,
    background: "transparent",
    color: "inherit",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  };

  return (
    <div
      style={{
        marginTop: 28,
        borderRadius: 12,
        border: `1px solid ${mix(10)}`,
        background: "#ffffff",
        padding: "16px 20px",
      }}
    >
      {state === "sent" ? (
        <div style={{ fontSize: 12.5, opacity: 0.75, lineHeight: 1.5 }}>
          Message sent — {sellerLabel} will get it by email and can reply straight to you. 📬
        </div>
      ) : !open ? (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
            Interested in something? Send {sellerLabel} a message — it&rsquo;s emailed to them
            privately, and they can reply directly to your address.
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{
              appearance: "none",
              border: 0,
              borderRadius: 9,
              padding: "9px 16px",
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#ffffff",
              background: "oklch(0.60 0.16 27)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Message seller
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Message {sellerLabel}</div>
          <input
            type="email"
            required
            placeholder="Your email (for their reply)"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            style={inputStyle}
          />
          <textarea
            required
            minLength={3}
            maxLength={2000}
            rows={4}
            placeholder="Which cards are you interested in?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          {error ? <div style={{ fontSize: 12, color: "#ab1d18" }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 9,
                padding: "9px 16px",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#ffffff",
                background: state === "sending" ? "#8a8c92" : "oklch(0.60 0.16 27)",
                cursor: state === "sending" ? "default" : "pointer",
              }}
            >
              {state === "sending" ? "Sending…" : "Send message"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                appearance: "none",
                border: 0,
                background: "transparent",
                fontFamily: "inherit",
                fontSize: 12,
                cursor: "pointer",
                opacity: 0.55,
              }}
            >
              Cancel
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 10.5, opacity: 0.45 }}>
              Your email is shared only with the seller.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
