"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mix } from "@/lib/theme";
import { Header } from "@/components/Header";
import { PaywallModal } from "@/components/PaywallModal";

interface BinderBrief {
  id: string;
  title: string;
  cardCount: number;
  isPublished: boolean;
  shareId: string;
}

export function SellListClient({ binders }: { binders: BinderBrief[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  async function createBinder() {
    if (!title.trim()) return;
    setCreating(true);
    const res = await fetch("/api/sell-binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const body = await res.json();
    setCreating(false);
    if (res.ok) router.push(`/sell/${body.binder.id}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
      <Header variant="sell" onOpenPlans={() => setPaywallOpen(true)} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px 80px" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>Sell binders</h1>
        <p style={{ margin: "10px 0 28px", fontSize: 13, opacity: 0.6 }}>
          Curate a subset of your collection into a shareable binder with prices.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New sell binder title…"
            style={{
              flex: 1,
              maxWidth: 320,
              fontFamily: "inherit",
              fontSize: 13,
              padding: "9px 12px",
              borderRadius: 9,
              border: `1px solid ${mix(15)}`,
              background: "transparent",
              color: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={createBinder}
            disabled={creating || !title.trim()}
            style={{
              appearance: "none",
              border: 0,
              borderRadius: 9,
              padding: "9px 16px",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              color: "#ffffff",
              background: "var(--ink)",
              cursor: creating ? "default" : "pointer",
            }}
          >
            Create
          </button>
        </div>

        {binders.length === 0 ? (
          <div style={{ fontSize: 14, opacity: 0.55 }}>No sell binders yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
            {binders.map((b) => (
              <div
                key={b.id}
                onClick={() => router.push(`/sell/${b.id}`)}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${mix(10)}`,
                  background: "var(--surf)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{b.title}</div>
                <div style={{ fontSize: 11.5, opacity: 0.55 }}>
                  {b.cardCount} card{b.cardCount === 1 ? "" : "s"} ·{" "}
                  {b.isPublished ? "Published" : "Draft"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
