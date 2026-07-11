export type Look = "Gallery" | "Linen" | "Night";

export interface ThemeTokens {
  bg: string;
  ink: string;
  surf: string;
  paper: string;
  pocket: string;
  l1: string;
  l2: string;
  stitch: string;
  accent: string;
  dim: string;
}

export const themes: Record<Look, ThemeTokens> = {
  Gallery: {
    bg: "#f7f6f4",
    ink: "#17181a",
    surf: "#ffffff",
    paper: "#fbfaf8",
    pocket: "rgba(0,0,0,0.055)",
    l1: "#33343a",
    l2: "#1e1f24",
    stitch: "rgba(255,255,255,0.16)",
    accent: "oklch(0.60 0.16 27)",
    dim: "filter:grayscale(1);opacity:0.3",
  },
  Linen: {
    bg: "#f2ede2",
    ink: "#221c14",
    surf: "#fdfaf2",
    paper: "#fdfbf4",
    pocket: "rgba(70,50,20,0.07)",
    l1: "#7a5334",
    l2: "#57381e",
    stitch: "rgba(255,240,220,0.22)",
    accent: "oklch(0.60 0.16 60)",
    dim: "filter:grayscale(1);opacity:0.3",
  },
  Night: {
    bg: "#121316",
    ink: "#e8e7e3",
    surf: "#1c1e23",
    paper: "#212329",
    pocket: "rgba(255,255,255,0.055)",
    l1: "#2a2c34",
    l2: "#191a20",
    stitch: "rgba(255,255,255,0.10)",
    accent: "oklch(0.72 0.14 27)",
    dim: "filter:grayscale(1) brightness(0.8);opacity:0.35",
  },
};

export interface Leather {
  id: string;
  l1: string;
  l2: string;
}

export const leathers: Leather[] = [
  { id: "charcoal", l1: "#33343a", l2: "#1e1f24" },
  { id: "red", l1: "#e8362c", l2: "#ab1d18" },
  { id: "orange", l1: "#f5821e", l2: "#c85e06" },
  { id: "yellow", l1: "#f6c513", l2: "#cc9c02" },
  { id: "green", l1: "#2fb14e", l2: "#1e8234" },
  { id: "teal", l1: "#0fb3ac", l2: "#0a827e" },
  { id: "blue", l1: "#2172e8", l2: "#134bb0" },
  { id: "purple", l1: "#8140dd", l2: "#5a28a8" },
  { id: "pink", l1: "#f5619f", l2: "#cc3a78" },
  { id: "white", l1: "#f4f5f7", l2: "#ced3da" },
];

export function leatherById(id: string | null | undefined): Leather {
  return leathers.find((l) => l.id === id) ?? leathers[0];
}

/** `color-mix(in srgb, currentColor X%, transparent)` — matches the prototype's translucency pattern. */
export function mix(pct: number): string {
  return `color-mix(in srgb, currentColor ${pct}%, transparent)`;
}

export function leatherGradient(l1: string, l2: string): string {
  return `linear-gradient(145deg,${l1},${l2})`;
}
