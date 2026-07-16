"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { mix } from "@/lib/theme";
import { PlanChip } from "@/components/PlanChip";

interface PillOption {
  label: string;
  active: boolean;
  onPick: () => void;
}

interface CardDropRow {
  key: string;
  num: string;
  name: string;
  rev: boolean;
  loc: string;
  onJump: () => void;
}

type HeaderProps =
  | {
      variant: "home";
      query: string;
      onQueryChange: (v: string) => void;
      onOpenPlans: () => void;
    }
  | {
      variant: "set";
      setName: string;
      setSerie: string;
      setSymbolUrl?: string | null;
      progressPct: number;
      progressLabel: string;
      cardQuery: string;
      onCardQueryChange: (v: string) => void;
      cardDropRows: CardDropRow[];
      sizeOpts: PillOption[];
      modeOpts: PillOption[];
      viewOpts: PillOption[];
      priceActive: boolean;
      priceLocked: boolean;
      onPriceToggle: () => void;
      needCount: number;
      needActive: boolean;
      onNeedToggle: () => void;
      onOpenPlans: () => void;
    }
  | { variant: "dashboard"; onOpenPlans: () => void }
  | { variant: "sell"; onOpenPlans: () => void };

const barBase: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  backdropFilter: "blur(12px)",
  background: "rgba(247,246,244,0.82)",
  borderBottom: `1px solid ${mix(9)}`,
};

const rowBase: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "12px 28px",
  display: "flex",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 13,
  padding: "8px 32px 8px 14px",
  borderRadius: 9,
  border: `1px solid ${mix(15)}`,
  background: "transparent",
  color: "inherit",
  outline: "none",
  width: 230,
  boxSizing: "border-box",
};

const collectionBtn: React.CSSProperties = {
  appearance: "none",
  border: `1px solid ${mix(15)}`,
  background: "transparent",
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 9,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const divider: React.CSSProperties = {
  width: 1,
  height: 22,
  background: mix(15),
};

/** Signed out: explicit signup CTA (the bare "FREE" chip read as a plan
 * badge, not a call to action). Signed in: the usual plan chip. */
function PlanChipOrSignup({ onOpenPlans }: { onOpenPlans: () => void }) {
  const { status } = useSession();
  const router = useRouter();
  if (status === "unauthenticated") {
    return (
      <button
        onClick={() => router.push("/register")}
        style={{
          appearance: "none",
          border: 0,
          borderRadius: 9,
          padding: "8px 14px",
          fontFamily: "inherit",
          fontSize: 12.5,
          fontWeight: 700,
          color: "#ffffff",
          background: "oklch(0.60 0.16 27)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Create Free Account
      </button>
    );
  }
  return <PlanChip onClick={onOpenPlans} />;
}

function SessionButton() {
  const { status } = useSession();
  const router = useRouter();
  if (status === "loading") return null;
  if (status === "authenticated") {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{ ...collectionBtn, opacity: 0.65 }}
      >
        Sign out
      </button>
    );
  }
  return (
    <button onClick={() => router.push("/login")} style={collectionBtn}>
      Log in
    </button>
  );
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Binder Sync"
      onClick={onClick}
      style={{ height: 40, width: "auto", cursor: "pointer", flex: "none" }}
    />
  );
}

function PillGroup({ options }: { options: PillOption[] }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 10,
        border: `1px solid ${mix(12)}`,
      }}
    >
      {options.map((o) => (
        <button
          key={o.label}
          onClick={o.onPick}
          style={{
            appearance: "none",
            border: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "6px 11px",
            borderRadius: 7,
            background: o.active ? "#17181a" : "transparent",
            color: o.active ? "#f7f6f4" : "inherit",
            opacity: o.active ? 1 : 0.55,
            whiteSpace: "nowrap",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Header(props: HeaderProps) {
  const router = useRouter();
  const goHome = () => router.push("/");
  const goDash = () => router.push("/dashboard");

  return (
    <div style={barBase}>
      <div style={rowBase}>
        <Logo onClick={goHome} />

        {props.variant === "home" ? (
          <>
            <div
              style={{
                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                fontSize: 10,
                letterSpacing: "0.18em",
                opacity: 0.45,
                whiteSpace: "nowrap",
              }}
            >
              POKÉMON TCG · MASTER-SET BINDERS
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                value={props.query}
                onChange={(e) => props.onQueryChange(e.target.value)}
                placeholder="Search sets or Pokémon…"
                style={inputStyle}
              />
              {props.query ? (
                <button
                  onClick={() => props.onQueryChange("")}
                  title="Clear search"
                  style={{
                    position: "absolute",
                    right: 6,
                    appearance: "none",
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    fontSize: 13,
                    lineHeight: 1,
                    cursor: "pointer",
                    opacity: 0.45,
                    padding: 5,
                    borderRadius: 6,
                  }}
                >
                  ✕
                </button>
              ) : null}
            </div>
            <PlanChipOrSignup onOpenPlans={props.onOpenPlans} />
            <button onClick={goDash} style={collectionBtn}>
              My collection
            </button>
          </>
        ) : null}

        {props.variant === "dashboard" ? (
          <>
            <div style={divider} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>My collection</div>
            <div style={{ flex: 1 }} />
            <PlanChipOrSignup onOpenPlans={props.onOpenPlans} />
            <SessionButton />
          </>
        ) : null}

        {props.variant === "sell" ? (
          <>
            <div style={divider} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Sell Binder</div>
            <div style={{ flex: 1 }} />
            <PlanChipOrSignup onOpenPlans={props.onOpenPlans} />
            <button onClick={goDash} style={collectionBtn}>
              My collection
            </button>
          </>
        ) : null}

        {props.variant === "set" ? (
          <>
            <div style={divider} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {props.setSymbolUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.setSymbolUrl}
                  alt=""
                  style={{ width: 18, height: 18, objectFit: "contain" }}
                />
              ) : null}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {props.setName}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.5, whiteSpace: "nowrap" }}>
                  {props.setSerie}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 110,
                  height: 4,
                  borderRadius: 2,
                  background: mix(12),
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    width: `${props.progressPct}%`,
                    background: "oklch(0.60 0.16 27)",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "ui-monospace,SFMono-Regular,monospace",
                  fontSize: 11,
                  opacity: 0.6,
                  whiteSpace: "nowrap",
                }}
              >
                {props.progressLabel}
              </div>
            </div>
            <button onClick={goDash} style={collectionBtn}>
              My collection
            </button>

            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginTop: -8,
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  value={props.cardQuery}
                  onChange={(e) => props.onCardQueryChange(e.target.value)}
                  placeholder="Find a card…"
                  style={{ ...inputStyle, fontSize: 12, padding: "7px 28px 7px 12px", width: 138 }}
                />
                {props.cardQuery ? (
                  <button
                    onClick={() => props.onCardQueryChange("")}
                    title="Clear search"
                    style={{
                      position: "absolute",
                      right: 5,
                      appearance: "none",
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: "pointer",
                      opacity: 0.45,
                      padding: 4,
                      borderRadius: 6,
                    }}
                  >
                    ✕
                  </button>
                ) : null}
                {props.cardQuery && props.cardDropRows.length >= 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      width: 300,
                      maxHeight: 330,
                      overflow: "auto",
                      borderRadius: 12,
                      border: `1px solid ${mix(12)}`,
                      boxShadow: "0 24px 60px -20px rgba(0,0,0,0.4)",
                      zIndex: 50,
                      padding: 5,
                      boxSizing: "border-box",
                      background: "#ffffff",
                    }}
                  >
                    {props.cardDropRows.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 12, opacity: 0.55 }}>
                        No cards match &ldquo;{props.cardQuery}&rdquo; in this binder.
                      </div>
                    ) : (
                      props.cardDropRows.map((h) => (
                        <div
                          key={h.key}
                          onClick={h.onJump}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "7px 9px",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "ui-monospace,SFMono-Regular,monospace",
                              fontSize: 10.5,
                              opacity: 0.5,
                              width: 36,
                              flex: "none",
                            }}
                          >
                            {h.num}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 12.5,
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h.name}
                          </div>
                          {h.rev ? (
                            <div
                              style={{
                                fontFamily: "ui-monospace,SFMono-Regular,monospace",
                                fontSize: 8.5,
                                fontWeight: 600,
                                letterSpacing: "0.06em",
                                background: mix(12),
                                padding: "2px 5px",
                                borderRadius: 4,
                                flex: "none",
                              }}
                            >
                              REV
                            </div>
                          ) : null}
                          <div
                            style={{
                              fontFamily: "ui-monospace,SFMono-Regular,monospace",
                              fontSize: 10.5,
                              opacity: 0.55,
                              whiteSpace: "nowrap",
                              flex: "none",
                            }}
                          >
                            {h.loc}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <PillGroup options={props.sizeOpts} />
              <PillGroup options={props.modeOpts} />
              <PillGroup options={props.viewOpts} />

              <div
                style={{
                  display: "flex",
                  padding: 3,
                  borderRadius: 10,
                  border: `1px solid ${mix(12)}`,
                }}
              >
                <button
                  onClick={props.onPriceToggle}
                  style={{
                    appearance: "none",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "6px 11px",
                    borderRadius: 7,
                    background: props.priceActive ? "#17181a" : "transparent",
                    color: props.priceActive ? "#f7f6f4" : "inherit",
                    opacity: props.priceActive ? 1 : 0.55,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  $ Prices
                  {props.priceLocked ? (
                    <span
                      style={{
                        fontFamily: "ui-monospace,SFMono-Regular,monospace",
                        fontSize: 8,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        padding: "2px 5px",
                        borderRadius: 4,
                        color: "#ffffff",
                        background: "oklch(0.60 0.16 27)",
                      }}
                    >
                      MASTER
                    </span>
                  ) : null}
                </button>
              </div>

              <div style={{ flex: 1 }} />

              <div
                style={{
                  display: "flex",
                  padding: 3,
                  borderRadius: 10,
                  border: `1px solid ${mix(12)}`,
                }}
              >
                <button
                  onClick={props.onNeedToggle}
                  style={{
                    appearance: "none",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "6px 11px",
                    borderRadius: 7,
                    background: props.needActive ? "#17181a" : "transparent",
                    color: props.needActive ? "#f7f6f4" : "inherit",
                    opacity: props.needActive ? 1 : 0.55,
                    whiteSpace: "nowrap",
                  }}
                >
                  Need list · {props.needCount}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
