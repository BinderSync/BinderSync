import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { mix } from "@/lib/theme";

/** Static-page shell for privacy / terms / contact. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(12px)",
          background: "color-mix(in srgb, var(--bg) 82%, transparent)",
          borderBottom: `1px solid ${mix(9)}`,
          padding: "12px 28px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ display: "inline-flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Binder Sync" style={{ height: 36, width: "auto", display: "block" }} />
          </Link>
          <div style={{ flex: 1 }} />
          <ThemeToggle />
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 28px 60px" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h1>
        {updated ? (
          <div style={{ fontFamily: "ui-monospace,SFMono-Regular,monospace", fontSize: 10.5, opacity: 0.5, marginTop: 8 }}>
            Last updated {updated}
          </div>
        ) : null}
        <div style={{ fontSize: 13.5, lineHeight: 1.65, opacity: 0.85, marginTop: 20 }}>{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, margin: "26px 0 8px" }}>{children}</h2>;
}
