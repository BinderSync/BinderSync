"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { mix } from "@/lib/theme";
import { BINDER_LIMIT } from "@/lib/binder";

const ACCENT = "oklch(0.60 0.16 27)";

export type PaywallReason = "browse" | "limit" | "sell" | "prices";

const FREE_FEATS = [
  "Browse every set & era",
  `${BINDER_LIMIT} saved binders`,
  "Master sets & reverse holos",
  "JSON & CSV export",
];
const PRO_FEATS = ["Unlimited binders", "Sync across devices", "Everything in Free"];
const MASTER_FEATS = [
  "Sell Binders — any cards, your order & prices",
  "QR share pages for buyers",
  "Market prices in every binder",
  "Printable QR insert card",
  "Sell analytics — views & scans",
  "Everything in Pro",
];

export function PaywallModal({
  open,
  reason = "browse",
  onClose,
}: {
  open: boolean;
  reason?: PaywallReason;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const plan = session?.user?.plan ?? "free";
  const isMaster = plan === "master";
  const isPro = plan === "pro" || isMaster;
  const signedIn = !!session?.user;

  const title =
    reason === "limit"
      ? "Your free binders are full"
      : reason === "sell"
        ? "Sell Binder is a Master feature"
        : reason === "prices"
          ? "Market pricing is a Master feature"
          : "Plans";
  const sub =
    reason === "limit"
      ? `Free includes ${BINDER_LIMIT} saved binders and you're using all of them. Go Pro to track every set — your existing binders stay exactly as they are.`
      : reason === "sell"
        ? "Build a binder of exactly the cards you're selling — your order, your prices — and share it with a QR code."
        : reason === "prices"
          ? "See live market values on every card, right in your binder pages."
          : `Track up to ${BINDER_LIMIT} binders free, go unlimited with Pro, or sell with Master.`;

  async function checkout(target: "pro" | "master") {
    if (!signedIn) {
      router.push("/register");
      return;
    }
    setError(null);
    setLoadingPlan(target);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = body.url;
    } finally {
      setLoadingPlan(null);
    }
  }

  const proBtnLabel = isMaster
    ? "Included in Master"
    : isPro
      ? "Current plan"
      : loadingPlan === "pro"
        ? "Starting checkout…"
        : "Upgrade to Pro";
  const masterBtnLabel = isMaster
    ? "Current plan"
    : loadingPlan === "master"
      ? "Starting checkout…"
      : "Upgrade to Master";

  return (
    <div
      onClick={onClose}
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
          width: 860,
          maxWidth: "100%",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 18,
          padding: 30,
          boxSizing: "border-box",
          boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)",
          background: "#ffffff",
          color: "#17181a",
          fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
            <div style={{ fontSize: 13, opacity: 0.55, marginTop: 6, lineHeight: 1.5, maxWidth: 420 }}>{sub}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              color: "inherit",
              fontSize: 16,
              cursor: "pointer",
              opacity: 0.45,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error ? <div style={{ marginTop: 12, fontSize: 12.5, color: "#ab1d18" }}>{error}</div> : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 14,
            marginTop: 22,
          }}
        >
          {/* Free */}
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${mix(12)}`,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxSizing: "border-box",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Free</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                $0<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.5 }}> forever</span>
              </div>
            </div>
            <FeatList feats={FREE_FEATS} />
            <div style={{ marginTop: "auto", fontSize: 11.5, fontWeight: 600, opacity: 0.45, textAlign: "center", padding: "9px 0 0" }}>
              {isPro ? "Included in your plan" : "Your current plan"}
            </div>
          </div>

          {/* Pro */}
          <div
            style={{
              borderRadius: 14,
              border: `2px solid ${mix(22)}`,
              position: "relative",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxSizing: "border-box",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Pro</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                $3<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.5 }}> / month</span>
              </div>
            </div>
            <FeatList feats={PRO_FEATS} />
            <button
              onClick={() => !isPro && checkout("pro")}
              style={{
                marginTop: "auto",
                appearance: "none",
                border: 0,
                borderRadius: 9,
                padding: 11,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                cursor: isPro ? "default" : "pointer",
                background: ACCENT,
                opacity: isPro ? 0.45 : 1,
              }}
            >
              {proBtnLabel}
            </button>
          </div>

          {/* Master */}
          <div
            style={{
              borderRadius: 14,
              border: `2px solid ${ACCENT}`,
              position: "relative",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -9,
                right: 14,
                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: "0.14em",
                padding: "3px 8px",
                borderRadius: 5,
                color: "#ffffff",
                background: ACCENT,
              }}
            >
              SELL BINDER
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Master</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                $6<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.5 }}> / month</span>
              </div>
            </div>
            <FeatList feats={MASTER_FEATS} />
            <button
              onClick={() => !isMaster && checkout("master")}
              style={{
                marginTop: "auto",
                appearance: "none",
                border: 0,
                borderRadius: 9,
                padding: 11,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                cursor: isMaster ? "default" : "pointer",
                background: ACCENT,
                opacity: isMaster ? 0.45 : 1,
              }}
            >
              {masterBtnLabel}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, opacity: 0.4, lineHeight: 1.5 }}>
          Cancel anytime · Your binders are never deleted, even if you downgrade
        </div>
      </div>
    </div>
  );
}

function FeatList({ feats }: { feats: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {feats.map((t) => (
        <div key={t} style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "baseline" }}>
          <span style={{ opacity: 0.45 }}>✓</span>
          <span style={{ opacity: 0.75 }}>{t}</span>
        </div>
      ))}
    </div>
  );
}
