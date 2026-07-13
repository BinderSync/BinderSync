import { ImageResponse } from "next/og";

export const alt = "Binder Sync — Pokémon TCG binders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(145deg, #33343a, #1e1f24)",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        {/* Binder spine */}
        <div
          style={{
            width: 140,
            height: "100%",
            background: "linear-gradient(145deg, #e8362c, #ab1d18)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 90,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                border: "7px solid #f7f6f4",
              }}
            />
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 90px",
          }}
        >
          <div
            style={{
              fontSize: 30,
              letterSpacing: 8,
              color: "rgba(247,246,244,0.5)",
              marginBottom: 18,
            }}
          >
            POKÉMON TCG · MASTER-SET BINDERS
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, color: "#f7f6f4", letterSpacing: -2 }}>
            Binder Sync
          </div>
          <div style={{ fontSize: 42, color: "rgba(247,246,244,0.75)", marginTop: 20 }}>
            Every set. In your binder.
          </div>
        </div>

        {/* Card pockets */}
        <div
          style={{
            width: 378,
            display: "flex",
            flexWrap: "wrap",
            alignContent: "center",
            gap: 18,
            paddingRight: 70,
          }}
        >
          {[0.95, 0.7, 0.5, 0.32].map((o, i) => (
            <div
              key={i}
              style={{
                width: 145,
                height: 200,
                borderRadius: 14,
                background: "#fbfaf8",
                opacity: o,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
