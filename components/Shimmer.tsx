import { mix } from "@/lib/theme";

export function Shimmer({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: `linear-gradient(90deg, ${mix(6)} 25%, ${mix(12)} 50%, ${mix(6)} 75%)`,
        backgroundSize: "200% 100%",
        animation: "bdxsh 1.3s linear infinite",
        ...style,
      }}
    />
  );
}
