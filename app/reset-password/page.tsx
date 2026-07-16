"use client";

import { useState, Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong — try again.");
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Could not reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
          This reset link is missing its token. Open the link from your email again, or request a
          new one.
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.7 }}>
          <Link href="/forgot-password" style={{ fontWeight: 600 }}>
            Request a new link
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
        New password
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
        Confirm new password
        <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
      </label>
      {error ? <div style={{ fontSize: 12.5, color: "#ab1d18" }}>{error}</div> : null}
      <button
        type="submit"
        disabled={loading}
        onClick={handleSubmit}
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
        {loading ? "Please wait…" : "Set new password"}
      </button>
    </>
  );
}

export default function ResetPasswordPage() {
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
      <form onSubmit={(e) => e.preventDefault()} style={{ width: 360, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Binder Sync" style={{ height: 170, width: "auto", alignSelf: "center", marginBottom: 14 }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Choose a new password</h1>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
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
