"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong — try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f6f4",
        color: "#17181a",
        fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: 360, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Binder Sync" style={{ height: 170, width: "auto", alignSelf: "center", marginBottom: 14 }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Reset your password</h1>

        {sent ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
              If an account exists for <strong>{email}</strong>, a reset link is on its way. Check
              your inbox (and spam folder) — the link is valid for 1 hour.
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.7 }}>
              <Link href="/login" style={{ fontWeight: 600 }}>
                Back to log in
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.7 }}>
              Enter your account email and we&rsquo;ll send you a link to set a new password.
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </label>
            {error ? <div style={{ fontSize: 12.5, color: "#ab1d18" }}>{error}</div> : null}
            <button
              type="submit"
              disabled={loading}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 9,
                padding: "11px 16px",
                fontFamily: "inherit",
                fontSize: 13.5,
                fontWeight: 700,
                color: "#ffffff",
                background: loading ? "#8a8c92" : "#17181a",
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Please wait…" : "Send reset link"}
            </button>
            <div style={{ fontSize: 12.5, opacity: 0.7 }}>
              Remembered it?{" "}
              <Link href="/login" style={{ fontWeight: 600 }}>
                Log in
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 13,
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "transparent",
  color: "inherit",
  outline: "none",
};
