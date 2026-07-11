"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mix } from "@/lib/theme";
import { Header } from "@/components/Header";
import { Shimmer } from "@/components/Shimmer";
import { PaywallModal } from "@/components/PaywallModal";

interface SetBrief {
  id: string;
  name: string;
  logoUrl: string | null;
  symbolUrl: string | null;
  cardCount: number;
}

interface SeriesBrief {
  id: string;
  name: string;
  sets: SetBrief[];
}

interface CardHit {
  id: string;
  name: string;
  img: string | null;
  meta: string;
  setId: string;
}

export function HomeClient({ series }: { series: SeriesBrief[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [cardHits, setCardHits] = useState<CardHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchToken = useRef(0);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return series;
    return series
      .map((se) => ({
        ...se,
        sets: se.sets.filter(
          (st) => st.name.toLowerCase().includes(q) || se.name.toLowerCase().includes(q)
        ),
      }))
      .filter((se) => se.sets.length > 0);
  }, [series, q]);

  const showCardResults = q.length >= 3;

  useEffect(() => {
    if (!showCardResults) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting stale results when the search query drops below the search threshold
      setCardHits(null);
      return;
    }
    const token = ++searchToken.current;
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/cards/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (token !== searchToken.current) return;
          setCardHits(data.results ?? []);
          setSearching(false);
        })
        .catch(() => {
          if (token !== searchToken.current) return;
          setCardHits([]);
          setSearching(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, showCardResults]);

  const noMatch = !!q && filtered.length === 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f6f4",
        color: "#17181a",
        fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
      }}
    >
      <style>{`
        .bdx-era-rail { display: none; }
        .bdx-era-chips { display: flex; }
        @media (min-width: 880px) {
          .bdx-era-rail { display: flex; }
          .bdx-era-chips { display: none; }
        }
      `}</style>

      <Header
        variant="home"
        query={query}
        onQueryChange={setQuery}
        onOpenPlans={() => setPaywallOpen(true)}
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 28px 20px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          Every set. In your binder.
        </h1>
        <p style={{ margin: "14px 0 0", fontSize: 15, opacity: 0.55, maxWidth: 560, lineHeight: 1.5 }}>
          Pick a set, choose a binder size, and flip through the whole thing page by page —
          including the full master set with reverse holos. Click cards to track what you own.
        </p>
      </div>

      {showCardResults ? (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px 8px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Cards matching &ldquo;{query}&rdquo;
            </h2>
            <div
              style={{
                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                fontSize: 10.5,
                opacity: 0.45,
              }}
            >
              {searching
                ? "searching…"
                : `${cardHits?.length ?? 0} card${(cardHits?.length ?? 0) === 1 ? "" : "s"}`}
            </div>
          </div>
          {searching ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                gap: 12,
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Shimmer key={i} style={{ aspectRatio: "63/88", borderRadius: 10 }} />
              ))}
            </div>
          ) : cardHits && cardHits.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.55 }}>
              No cards found — try more of the name, e.g. &ldquo;Charizard&rdquo;.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                gap: 12,
              }}
            >
              {(cardHits ?? []).map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/sets/${c.setId}?card=${c.id}`)}
                  style={{
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    cursor: "pointer",
                    border: `1px solid ${mix(10)}`,
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "63/88",
                      borderRadius: 7,
                      backgroundImage: c.img ? `url('${c.img}')` : undefined,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        opacity: 0.5,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="bdx-era-chips" style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 28px 0", flexWrap: "wrap", gap: 6 }}>
        {filtered.map((se) => (
          <a
            key={se.id}
            href={`#era-${se.id}`}
            style={{
              appearance: "none",
              border: `1px solid ${mix(14)}`,
              background: "transparent",
              color: "inherit",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 600,
              opacity: 0.7,
              padding: "6px 11px",
              borderRadius: 99,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {se.name}
          </a>
        ))}
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
        <div
          className="bdx-era-rail"
          style={{
            position: "sticky",
            top: 72,
            width: 180,
            flex: "none",
            padding: "32px 0 28px 28px",
            boxSizing: "border-box",
            flexDirection: "column",
            gap: 2,
            maxHeight: "calc(100vh - 90px)",
            overflow: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace,SFMono-Regular,monospace",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              opacity: 0.45,
              marginBottom: 8,
            }}
          >
            ERAS
          </div>
          {filtered.map((se) => (
            <a
              key={se.id}
              href={`#era-${se.id}`}
              style={{
                appearance: "none",
                border: 0,
                background: "transparent",
                color: "inherit",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 600,
                opacity: 0.6,
                textAlign: "left",
                padding: "6px 9px",
                borderRadius: 7,
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {se.name}
            </a>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {noMatch ? (
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 28px", fontSize: 14, opacity: 0.55 }}>
              No sets match &ldquo;{query}&rdquo;.
            </div>
          ) : null}

          {filtered.map((se) => (
            <div key={se.id} id={`era-${se.id}`} style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 28px 38px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {se.name}
                </h2>
                <div
                  style={{
                    fontFamily: "ui-monospace,SFMono-Regular,monospace",
                    fontSize: 10.5,
                    opacity: 0.45,
                  }}
                >
                  {se.sets.length} {se.sets.length === 1 ? "set" : "sets"}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                  gap: 14,
                }}
              >
                {se.sets.map((st) => (
                  <SetCard key={st.id} set={st} onOpen={() => router.push(`/sets/${st.id}`)} />
                ))}
              </div>
            </div>
          ))}

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
            Card data &amp; images via TCGdex · market prices via the Pokémon TCG API (TCGplayer /
            Cardmarket). Fan-made viewer — not affiliated with or endorsed by Nintendo, Creatures,
            GAME FREAK, or The Pokémon Company.
          </div>
        </div>
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}

function SetCard({ set, onOpen }: { set: SetBrief; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        border: `1px solid ${mix(10)}`,
        background: "#ffffff",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 12px 26px -14px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {set.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${set.logoUrl}.webp`}
            alt=""
            loading="lazy"
            style={{ maxWidth: "86%", maxHeight: 54, objectFit: "contain" }}
          />
        ) : (
          <div style={{ fontSize: 15, fontWeight: 700, opacity: 0.4, textAlign: "center" }}>
            {set.name}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {set.symbolUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${set.symbolUrl}.webp`}
            alt=""
            loading="lazy"
            style={{ width: 15, height: 15, objectFit: "contain", flex: "none" }}
          />
        ) : null}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {set.name}
        </div>
        <div
          style={{
            fontFamily: "ui-monospace,SFMono-Regular,monospace",
            fontSize: 10.5,
            opacity: 0.5,
            whiteSpace: "nowrap",
          }}
        >
          {set.cardCount} cards
        </div>
      </div>
    </div>
  );
}
