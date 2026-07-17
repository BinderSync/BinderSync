import Link from "next/link";

const linkStyle: React.CSSProperties = {
  color: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

/** Shared site footer: trust links + data-source / non-affiliation notices. */
export function SiteFooter() {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px 28px 48px",
        fontFamily: "ui-monospace,SFMono-Regular,monospace",
        fontSize: 10,
        opacity: 0.4,
        lineHeight: 1.7,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <Link href="/privacy" style={linkStyle}>
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/terms" style={linkStyle}>
          Terms of Service
        </Link>
        {" · "}
        <Link href="/contact" style={linkStyle}>
          Contact
        </Link>
        {" · "}
        <Link href="/giveaway-rules" style={linkStyle}>
          Giveaway Rules
        </Link>
      </div>
      Card data &amp; images via TCGdex and the Pokémon TCG API · market prices via TCGplayer /
      Cardmarket. Fan-made viewer — not affiliated with or endorsed by Nintendo, Creatures, GAME
      FREAK, or The Pokémon Company.
    </div>
  );
}
