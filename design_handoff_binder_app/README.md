# Handoff: BinderSync — Pokémon Card Binder & Marketplace

## Overview
A digital binder app for Pokémon TCG collectors: browse every set/series, view cards in a virtual page-flip binder (base + reverse-holo/master modes), track owned cards in a personal collection dashboard, see live market pricing, and build a shareable "Sell Binder" to list cards for sale with buyer-facing pages. Monetized via a Free / Pro / Master tier paywall.

This is meant to become a **real product**: user accounts, a database, real Stripe billing, and working public share links — not just a local prototype.

## About the Design Files
The bundled file, `Binder Viewer.dc.html`, is a **design + interaction reference built in HTML**, not production code. It is a fully client-side prototype (React-like component, all state in browser memory + `localStorage`, all data fetched directly from public third-party APIs in the browser). It demonstrates the intended screens, layout, copy, states, and interactions in detail.

The engineering task is to **recreate this experience in a real full-stack codebase** (recommended: a modern web framework — e.g. Next.js/Remix/SvelteKit — plus a proper backend and database), reusing the visual design and interaction patterns shown here, while replacing every part of the plumbing that a real product needs and this prototype fakes (see "What must change" below). Do not ship the DC file itself; treat it as the spec for pixel/interaction fidelity.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interaction behavior in the prototype are intentional and should be recreated closely. Where this doc gives exact values, use them; where it doesn't, read them directly out of the inline styles in `Binder Viewer.dc.html` (all styling is inline `style="…"` per element — no external stylesheet to hunt through).

## What must change from prototype → product
The prototype fakes five things that must become real:

1. **Accounts & persistence** — Currently everything (owned cards, sell binders, plan, prefs) lives in `localStorage` (`bdx-*` keys) with no login. Needs real user accounts + a database so collections sync across devices.
2. **Payments** — Currently `plan: 'free'|'pro'|'master'` is just a state flag set locally when the user clicks through a fake checkout (see `pwDoneGo`, paywall state around line ~1858). Needs real Stripe Checkout/subscriptions, webhook-driven entitlement, and server-side plan checks gating pricing/master-mode/sell features.
3. **Sharing** — The "Sell Binder" share flow builds a QR code for `https://bindersync.app/s/<shareId>` (see line ~2342), a domain/route that does not exist. Needs: a real domain, a public (no-login) buyer-facing page per shared binder, and persisted binder data server-side so the link works from any device.
4. **Card & pricing data** — Currently the browser calls `api.tcgdex.net` and `api.pokemontcg.io` directly, client-side, for every set list, card list, card detail, and price (see all `fetch(...)` calls — series/sets/cards from tcgdex, sets/cards+prices from pokemontcg.io). Two problems: the `pokemontcg.io` API key is passed as a plain prop and would leak to every visitor in production, and there's no resilience if either service is down/rate-limited. Needs a server-side ingestion job that pulls card metadata + images + prices on a schedule into your own database/cache, and app APIs that read from that cache — never call third-party APIs directly from the client.
5. **IP/licensing compliance** — User confirmed this has already been reviewed; still worth a final legal pass specifically on the "Sell Binder" / marketplace feature before public launch, since facilitating sales of card images is a different risk profile than a personal viewer.

## Screens / Views
State is a single `view` field: `home | set | dash | sell` (plus a `zoom` overlay and `paywall` modal usable from any view).

### 1. Home — set browser (`data-screen-label="Home — set browser"`)
- **Purpose:** Browse all Pokémon TCG series/sets, or search cards globally.
- **Layout:** Centered column, `max-width:1280px`. Large hero heading "Every set. In your binder." (42px/800 weight, `-0.03em` tracking), then a search input, then series sections each listing their sets as a card grid.
- **States:** loading (skeleton/spinner while `series` is null), error (`homeError`, with retry), no-match (search yields nothing), and a global card-search-results mode when the query is ≥3 chars (`cardResultsOn`).
- **Data:** series list + per-series set metadata from tcgdex (`GET /v2/en/series`, then `GET /v2/en/series/:id`); global card search (`GET /v2/en/cards?name=`).

### 2. Binder view (`data-screen-label="Binder view"`)
- **Purpose:** The core viewing experience — a virtual binder for one set, page by page.
- **Layout:** Page-flip binder UI with configurable page size (state `size`: pockets per page — options seen: values like 9), mode toggle `base` vs reverse-holo/"master" mode, spread index navigation (`spread`), left/right arrow key nav, click-to-flip, and a zoom overlay for individual cards.
- **States:** loading, error, empty; `zoom` overlay with card detail + price (locked/blurred for non-Master plan — `zoomLockedOn` vs `zoomInsightsOn`); binder appearance controls (color/theme, stored as `binderColor`, `look` prop options `Gallery / Linen / Night`).
- **Data:** set detail + full card list from tcgdex, hydrated card-by-card; pricing from pokemontcg.io if an API key is present, else tcgdex price fields.

### 3. Collection dashboard (`data-screen-label="Collection dashboard"`)
- **Purpose:** Personal "my collection" summary — cards owned across sets, with import/export.
- **Layout:** Centered column `max-width:920px`. Heading "My collection" (34px/800), grouped-by-set list of owned cards, aggregate stats, CSV/JSON import & export actions, clear-collection with confirm + undo toast (`clearConfirm`, `undo`).
- **Data:** `owned` map (card id → owned flags) — currently `localStorage` only; needs to become a per-user server-side collection table so it syncs across devices and survives clearing browser storage.

### 4. Sell Binder (`data-screen-label="Sell binder"`)
- **Purpose:** Core monetization/marketplace feature — user curates a subset of their collection into a shareable "for sale" binder with prices, then shares a public link/QR for buyers to browse.
- **Layout:** Centered column `max-width:1100px`. Binder title/note editable fields, a picker to add owned cards (`sellPicker`), drag-to-place cards into binder slots (`sellDrag`), per-card price tags (`showPrices` toggle), an editor/buyer-view toggle (`sellPreviewOn` / `sellEditOn` — "Buyer view" button), and a share modal (`sellShareOn`) with a QR code + copyable link.
- **Multi-binder:** state supports multiple sell binders (`sellAll.binders[]`), switchable via `sellAll.cur`.
- **Must become real:** binder + placements need to be saved server-side under a stable `shareId`; the QR/link (`bindersync.app/s/<shareId>`) needs an actual public route rendering a read-only buyer view fed by that server data — no login required for the buyer.

### 5. Paywall (modal, any view)
- **Purpose:** Upsell Free → Pro → Master.
- **Layout:** Modal (`paywall` state holds which trigger opened it), plan comparison, "buy" CTA (`pwDoneGo`) that currently just flips `plan` locally and routes to Collection dashboard on success.
- **Must become real:** Stripe Checkout session creation, webhook to update the user's plan in the database, client reads plan from the authenticated user record (not local state).

## Interactions & Behavior
- **Keyboard nav:** Escape closes search/overlays/pickers; in Sell view, ArrowLeft/Right flip binder spreads; in Set view, same arrows navigate spreads (see `componentDidMount`/keydown handler).
- **Drag & drop:** Sell Binder card placement into slots (`sellDrag`) — needs a touch-friendly equivalent for a native/mobile build (see open question below).
- **Persisted prefs:** page size, mode, price-visibility, view mode, binder color saved to `localStorage` under `bdx-prefs` — carry this forward as a per-user preference row server-side once accounts exist.
- **Debounced search:** card search token-guards stale responses (`_searchToken`) — keep this pattern (or swap for a proper cancelable query) in the real data layer.

## State Management (from prototype, as a reference for your real data model)
Key fields on the root component's state: `view`, `series`, `set`/`setData`, `size`, `mode`, `spread`, `flip`, `zoom`, `cardQuery`/`globalHits`, `plan`, `paywall`, `owned` (map), `sellAll.binders[]` (each with `id`, `title`, `note`, `shareId`, `cards[]`), `showPrices`, `sellPreview`, `currency`, `binderColor`.

Map this to real entities:
- **User** (auth, plan/subscription status, currency pref, binder appearance prefs)
- **OwnedCard** (userId, cardId, setId, variant/finish, quantity/flags) — replaces the `owned` map
- **SellBinder** (userId, title, note, shareId [public, unguessable], isPublished)
- **SellBinderCard** (sellBinderId, cardId, slotPosition, price, variant)
- **CardCatalog** (cached from tcgdex/pokemontcg.io: sets, series, cards, images) — refreshed by a server job, not fetched live per request
- **PriceSnapshot** (cardId, variant, price, source, fetchedAt) — refreshed periodically server-side

## Design Tokens
All styling in the prototype is **inline** (no CSS classes/stylesheet) — pull exact hex/px values directly from each element's `style` attribute in `Binder Viewer.dc.html` rather than relying on a token list here, since values vary per theme (`look`: Gallery / Linen / Night) and per binder color. Notable scale references: hero heading 42px/800, dashboard heading 34px/800, base max-widths 920–1280px depending on screen.

## Assets
- Card images, set/series artwork: fetched live from `api.tcgdex.net` in the prototype — in production, mirror/cache these (respect tcgdex's terms on hotlinking/caching).
- Prices: `api.tcgdex.net` (fallback) and `api.pokemontcg.io` (if a key is configured) — same caching note applies.
- QR codes: prototype uses `api.qrserver.com` as a quick placeholder — fine to keep, or generate QR codes server-side/client-side with a library instead.

## Open Questions for the Engineering Team
1. **Target platforms:** confirm web app vs. native iOS/Android vs. both — this changes how drag-and-drop card placement in Sell Binder should be reimplemented (native builds likely want long-press + tap-to-place instead of HTML5 drag events).
2. **Self-hosted card dataset:** decide refresh cadence (e.g. nightly) and whether historical price trends should be stored (the current "Master" tier hints at price insights, which implies keeping price history, not just latest snapshot).
3. **Stripe plan structure:** confirm Free/Pro/Master price points and whether Master is a distinct paid tier or a Pro add-on.
4. **Buyer experience for Sell Binder:** confirm whether buyers can express interest / message the seller in-app, or whether the share link is purely informational (contact happens off-platform) for v1.

## Files
- `Binder Viewer.dc.html` — full interactive design reference (open directly in a browser). Screens are marked with `data-screen-label` attributes (`Home — set browser`, `Binder view`, `Collection dashboard`, `Sell binder`) to help locate each section in the markup.
