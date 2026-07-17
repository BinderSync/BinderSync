"use client";

import { useState, type FormEvent } from "react";
import { mix } from "@/lib/theme";

export function GiveawayEntryForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/giveaway/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Could not submit your entry — try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Could not reach the server — check your connection.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p style={{ fontWeight: 600 }}>
        You&rsquo;re in! 🎉 Winners are notified by email after the entry period ends.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 240px", maxWidth: 340 }}>
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            fontFamily: "inherit",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 9,
            border: `1px solid ${mix(15)}`,
            background: "transparent",
            color: "inherit",
            outline: "none",
            boxSizing: "border-box",
            width: "100%",
          }}
        />
        {error ? <div style={{ fontSize: 12, color: "#ab1d18" }}>{error}</div> : null}
        <div style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.5 }}>
          One entry per person. We&rsquo;ll only use this address for the giveaway (winner
          notification) — no marketing without asking first.
        </div>
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        style={{
          appearance: "none",
          border: 0,
          borderRadius: 9,
          padding: "10px 18px",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 700,
          color: "#ffffff",
          background: state === "sending" ? "#8a8c92" : "oklch(0.60 0.16 27)",
          cursor: state === "sending" ? "default" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {state === "sending" ? "Entering…" : "Enter giveaway"}
      </button>
    </form>
  );
}
