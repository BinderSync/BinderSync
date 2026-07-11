const TCGDEX_BASE = "https://api.tcgdex.net/v2/en";

export interface TcgdexSeriesListItem {
  id: string;
  name: string;
  logo?: string;
}

export interface TcgdexSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount?: { official?: number; total?: number };
}

export interface TcgdexSeriesDetail {
  id: string;
  name: string;
  releaseDate?: string;
  sets: TcgdexSetBrief[];
}

export interface TcgdexCardBrief {
  id: string;
  name: string;
  localId: string;
  image?: string;
}

export interface TcgdexSetDetail {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  serie: { id: string; name: string };
  cardCount?: { official?: number; total?: number };
  cards: TcgdexCardBrief[];
}

export interface TcgdexCardDetail {
  id: string;
  name: string;
  localId: string;
  image?: string;
  rarity?: string;
  variants?: { reverse?: boolean };
  pricing?: {
    tcgplayer?: Record<string, { marketPrice?: number; midPrice?: number; lowPrice?: number }>;
    cardmarket?: Record<string, number>;
  };
}

async function tcgdexGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${TCGDEX_BASE}${path}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export function fetchSeriesList() {
  return tcgdexGet<TcgdexSeriesListItem[]>("/series").then((v) => v ?? []);
}

export function fetchSeriesDetail(seriesId: string) {
  return tcgdexGet<TcgdexSeriesDetail>(`/series/${seriesId}`);
}

export function fetchSetDetail(setId: string) {
  return tcgdexGet<TcgdexSetDetail>(`/sets/${setId}`);
}

export function fetchCardDetail(cardId: string) {
  return tcgdexGet<TcgdexCardDetail>(`/cards/${cardId}`);
}

export interface ExtractedPrice {
  value: number;
  currency: "USD" | "EUR";
}

/** Mirrors the prototype's `extractPrices`: prefer tcgplayer (USD), fall back to cardmarket (EUR). */
export function extractTcgdexPrices(card: TcgdexCardDetail): {
  base: ExtractedPrice | null;
  reverse: ExtractedPrice | null;
} {
  const pricing = card.pricing;
  const out: { base: ExtractedPrice | null; reverse: ExtractedPrice | null } = {
    base: null,
    reverse: null,
  };
  if (!pricing) return out;

  const num = (v: unknown): number | null =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : null;

  const tp = pricing.tcgplayer;
  if (tp) {
    const pick = (key: string) => {
      const o = tp[key];
      return o ? num(o.marketPrice) ?? num(o.midPrice) ?? num(o.lowPrice) : null;
    };
    const baseV =
      pick("normal") ??
      pick("holofoil") ??
      pick("1st-edition") ??
      pick("1st-edition-holofoil") ??
      pick("unlimited") ??
      pick("unlimited-holofoil");
    const revV = pick("reverse-holofoil") ?? pick("reverseHolofoil");
    if (baseV) out.base = { value: baseV, currency: "USD" };
    if (revV) out.reverse = { value: revV, currency: "USD" };
  }

  const cm = pricing.cardmarket;
  if (cm) {
    const baseV =
      num(cm.trend) ?? num(cm.avg) ?? num(cm.avg30) ?? num(cm.avg7) ?? num(cm.avg1) ?? num(cm.low);
    const revV =
      num(cm["trend-holo"]) ??
      num(cm["avg-holo"]) ??
      num(cm["avg30-holo"]) ??
      num(cm["avg7-holo"]) ??
      num(cm["low-holo"]);
    if (!out.base && baseV) out.base = { value: baseV, currency: "EUR" };
    if (!out.reverse && revV) out.reverse = { value: revV, currency: "EUR" };
  }

  if (!out.reverse && out.base) out.reverse = out.base;
  return out;
}
