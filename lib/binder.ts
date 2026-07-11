export const BINDER_LIMIT = 5;
export const FLIP_MS = 700;
export const PAGE_SIZES = [4, 9, 12] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export type BinderMode = "base" | "master";
export type ViewMode = "collect" | "view";

export interface CardBrief {
  id: string;
  name: string;
  number: string;
  imageUrl: string | null;
  rarity: string | null;
  hasReverse: boolean;
  priceBase: number | null;
  priceReverse: number | null;
  priceCurrency: "USD" | "EUR" | null;
}

export interface SeqCard extends CardBrief {
  rev: boolean;
  key: string;
}

const DIMS: Record<PageSize, [number, number]> = {
  4: [2, 2],
  9: [3, 3],
  12: [4, 3],
};

export function gridDims(size: PageSize): { cols: number; rows: number } {
  const [cols, rows] = DIMS[size] ?? DIMS[9];
  return { cols, rows };
}

export function cardKey(cardId: string, rev: boolean): string {
  return rev ? `${cardId}::r` : cardId;
}

/** Base mode: cards as-is. Master mode: insert a synthetic reverse-holo row after each card that has one. */
export function seqFor(cards: CardBrief[], mode: BinderMode): SeqCard[] {
  const seq: SeqCard[] = [];
  for (const c of cards) {
    seq.push({ ...c, rev: false, key: cardKey(c.id, false) });
    if (mode === "master" && c.hasReverse) {
      seq.push({ ...c, rev: true, key: cardKey(c.id, true) });
    }
  }
  return seq;
}

export function buildPages(seq: SeqCard[], size: PageSize): (SeqCard | null)[][] {
  const pages: (SeqCard | null)[][] = [];
  for (let i = 0; i < seq.length; i += size) {
    const page: (SeqCard | null)[] = seq.slice(i, i + size);
    while (page.length < size) page.push(null);
    pages.push(page);
  }
  return pages;
}

export function spreadMaxFor(pageCount: number): number {
  return pageCount > 0 ? Math.ceil((pageCount - 1) / 2) : 0;
}

/** Page layout geometry, mirroring the prototype's fixed pageH=620 / 63:88 card aspect ratio. */
export interface Price {
  value: number;
  currency: "USD" | "EUR";
}

export function priceFor(card: CardBrief, rev: boolean): Price | null {
  if (rev) {
    if (card.priceReverse != null && card.priceCurrency) {
      return { value: card.priceReverse, currency: card.priceCurrency };
    }
  }
  if (card.priceBase != null && card.priceCurrency) {
    return { value: card.priceBase, currency: card.priceCurrency };
  }
  return null;
}

export function convertPrice(value: number, from: "USD" | "EUR", to: "USD" | "EUR"): number {
  if (from === to) return value;
  return from === "EUR" ? value * 1.08 : value / 1.08;
}

export function fmtAmt(v: number, currency: "USD" | "EUR"): string {
  const sym = currency === "EUR" ? "€" : "$";
  const num = v >= 1000 ? Math.round(v).toLocaleString("en-US") : v >= 100 ? v.toFixed(0) : v.toFixed(2);
  return sym + num;
}

const EUR_USD = 1.08;

export function sumKeys(
  cardsById: Map<string, CardBrief>,
  keys: string[]
): { usd: number; eur: number } {
  let usd = 0;
  let eur = 0;
  for (const key of keys) {
    const [cardId, revFlag] = key.split("::");
    const card = cardsById.get(cardId);
    if (!card) continue;
    const pr = priceFor(card, revFlag === "r");
    if (!pr) continue;
    if (pr.currency === "EUR") eur += pr.value;
    else usd += pr.value;
  }
  return { usd, eur };
}

export function fmtTotal(t: { usd: number; eur: number }, currency: "USD" | "EUR"): string {
  const total = currency === "EUR" ? t.eur + t.usd / EUR_USD : t.usd + t.eur * EUR_USD;
  if (total <= 0) return "—";
  return fmtAmt(total, currency);
}

export function pageGeometry(size: PageSize) {
  const { cols, rows } = gridDims(size);
  const pad = 18;
  const gap = 10;
  const pageH = 620;
  const slotH = (pageH - 2 * pad - (rows - 1) * gap) / rows;
  const slotW = (slotH * 63) / 88;
  const pageW = Math.round(cols * slotW + (cols - 1) * gap + 2 * pad);
  return { cols, rows, pad, gap, pageH, pageW };
}
