"use client";

import { useState, type ReactNode, type FormEvent } from "react";

export function AuthForm({
  title,
  submitLabel,
  loading,
  error,
  onSubmit,
  footer,
}: {
  title: string;
  submitLabel: string;
  loading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
  footer: ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(email, password);
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
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Binder Sync
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error ? (
          <div style={{ fontSize: 12.5, color: "#ab1d18" }}>{error}</div>
        ) : null}
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
          {loading ? "Please wait…" : submitLabel}
        </button>
        <div style={{ fontSize: 12.5, opacity: 0.7 }}>{footer}</div>
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
