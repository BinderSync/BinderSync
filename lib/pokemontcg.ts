const PTCG_BASE = "https://api.pokemontcg.io/v2";

function headers(): Record<string, string> {
  const key = process.env.POKEMONTCG_API_KEY?.trim();
  return key ? { "X-Api-Key": key } : {};
}

interface PtcgSet {
  id: string;
  name: string;
  images?: { symbol?: string; logo?: string };
}

let setsCache: PtcgSet[] | null = null;

async function loadSets(): Promise<PtcgSet[]> {
  if (setsCache) return setsCache;
  // pokemontcg.io intermittently 504s — retry before giving up, or a single
  // failed fetch makes every set lookup silently miss.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${PTCG_BASE}/sets?pageSize=250&select=id,name,images`, {
        headers: headers(),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: PtcgSet[] };
        setsCache = json.data ?? [];
        return setsCache;
      }
      console.warn(`pokemontcg.io /sets HTTP ${res.status} (attempt ${attempt + 1})`);
    } catch (err) {
      console.warn(`pokemontcg.io /sets fetch failed (attempt ${attempt + 1}):`, err);
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  return [];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function findPtcgSet(
  tcgdexSetId: string,
  tcgdexSetName: string
): Promise<PtcgSet | null> {
  const sets = await loadSets();
  if (!sets.length) return null;

  let hit = sets.find((s) => s.id === tcgdexSetId);
  if (!hit) {
    // tcgdex zero-pads set numbers ("me01"), pokemontcg.io doesn't ("me1")
    const alt = tcgdexSetId.replace(/^([a-z]+)0(\d)/, "$1$2");
    if (alt !== tcgdexSetId) hit = sets.find((s) => s.id === alt);
  }
  if (!hit) {
    const target = norm(tcgdexSetName);
    hit = sets.find((s) => norm(s.name) === target);
  }
  return hit ?? null;
}

export async function resolvePtcgSetId(
  tcgdexSetId: string,
  tcgdexSetName: string
): Promise<string | null> {
  return (await findPtcgSet(tcgdexSetId, tcgdexSetName))?.id ?? null;
}

/** Set logo/symbol fallback for sets tcgdex has no assets for. */
export async function ptcgSetImages(
  tcgdexSetId: string,
  tcgdexSetName: string
): Promise<{ logo: string | null; symbol: string | null }> {
  const hit = await findPtcgSet(tcgdexSetId, tcgdexSetName);
  return { logo: hit?.images?.logo ?? null, symbol: hit?.images?.symbol ?? null };
}

export interface PtcgPrice {
  base: { value: number; currency: "USD" | "EUR" } | null;
  reverse: { value: number; currency: "USD" | "EUR" } | null;
  /** True only when a genuine reverse-holo price exists (not the base-price fallback) — proof the variant is printed. */
  hasReverseVariant: boolean;
  /** Direct TCGplayer product page for this card, when pokemontcg.io provides one. */
  url: string | null;
  /** Card scan (hi-res) — fallback for cards tcgdex has no image for. */
  image: string | null;
}

interface PtcgCard {
  number: string;
  images?: { small?: string; large?: string };
  tcgplayer?: { url?: string; prices?: Record<string, { market?: number; mid?: number; low?: number }> };
  cardmarket?: { prices?: Record<string, number> };
}

function extractPtcgPrices(card: PtcgCard): PtcgPrice {
  const out: PtcgPrice = {
    base: null,
    reverse: null,
    hasReverseVariant: false,
    url: card.tcgplayer?.url ?? null,
    image: card.images?.large ?? card.images?.small ?? null,
  };
  const num = (v: unknown): number | null =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : null;

  const tp = card.tcgplayer?.prices;
  if (tp) {
    const pick = (key: string) => {
      const o = tp[key];
      return o ? num(o.market) ?? num(o.mid) ?? num(o.low) : null;
    };
    const baseV =
      pick("normal") ??
      pick("holofoil") ??
      pick("1stEditionNormal") ??
      pick("1stEditionHolofoil") ??
      pick("unlimited") ??
      pick("unlimitedHolofoil");
    const revV = pick("reverseHolofoil");
    if (baseV) out.base = { value: baseV, currency: "USD" };
    if (revV) out.reverse = { value: revV, currency: "USD" };
    // TCGplayer only lists a reverseHolofoil product when the variant is
    // actually printed, so its presence (even without a usable price) is
    // proof of existence. Cardmarket's reverseHolo* trend fields are NOT —
    // they appear generically on cards with no reverse print.
    out.hasReverseVariant = "reverseHolofoil" in tp;
  }

  const cm = card.cardmarket?.prices;
  if (cm) {
    const baseV =
      num(cm.trendPrice) ??
      num(cm.averageSellPrice) ??
      num(cm.avg30) ??
      num(cm.avg7) ??
      num(cm.avg1) ??
      num(cm.lowPrice);
    const revV =
      num(cm.reverseHoloTrend) ??
      num(cm.reverseHoloAvg30) ??
      num(cm.reverseHoloAvg7) ??
      num(cm.reverseHoloAvg1) ??
      num(cm.reverseHoloLow);
    if (!out.base && baseV) out.base = { value: baseV, currency: "EUR" };
    if (!out.reverse && revV) out.reverse = { value: revV, currency: "EUR" };
  }

  if (!out.reverse && out.base) out.reverse = out.base;
  return out;
}

/** Bulk-fetches prices for a pokemontcg.io set, keyed by lowercased card number. */
export async function fetchPtcgSetPrices(ptcgSetId: string): Promise<Map<string, PtcgPrice>> {
  const byNumber = new Map<string, PtcgPrice>();
  let page = 1;
  for (;;) {
    // Retry each page — pokemontcg.io 504s intermittently, and a dropped
    // page silently truncates the overlay for big (250+) sets.
    let json: { data?: PtcgCard[] } | null = null;
    for (let attempt = 0; attempt < 3 && !json; attempt++) {
      try {
        const res = await fetch(
          `${PTCG_BASE}/cards?q=${encodeURIComponent(`set.id:${ptcgSetId}`)}&pageSize=250&page=${page}&select=number,images,tcgplayer,cardmarket`,
          { headers: headers() }
        );
        if (res.ok) {
          json = (await res.json()) as { data?: PtcgCard[] };
          break;
        }
        console.warn(`pokemontcg.io ${ptcgSetId} p${page} HTTP ${res.status} (attempt ${attempt + 1})`);
      } catch (err) {
        console.warn(`pokemontcg.io ${ptcgSetId} p${page} fetch failed (attempt ${attempt + 1}):`, err);
      }
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
    if (!json) break;
    const cards = json.data ?? [];
    for (const c of cards) byNumber.set(String(c.number).toLowerCase(), extractPtcgPrices(c));
    if (cards.length < 250 || page >= 6) break;
    page++;
  }
  return byNumber;
}

export function hasPokemonTcgApiKey(): boolean {
  return !!process.env.POKEMONTCG_API_KEY?.trim();
}
