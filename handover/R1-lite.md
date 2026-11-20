# Codex release · R1 · Web app + bookmark + phone app (no install) · `v0.1`

**Needs released:** R0 · **Read first:** `AGENTS.md`, `docs/ROADMAP.md` (this row), then each prompt named below for detail. Build **only** the scope below; anything else stays behind `FLAGS` or waits for its release.

## Scope
- **M1 core, page‑side parts** (`01-core.md`): `cleanUrl`, `unwrapUrl`, `extract(doc)`, `cleanTitle`, `detectScript`, `textFragment`; plus `keyphrase.ts` (`10-cards-v2.md` step 3). Skip `resolveUrl` and fetching (Lite reads the page it's on).
- **M2 + M10 cards** (`02-cards.md`, `10-cards-v2.md`), **cut to**: Header, Split, Overlay, Solid, Quote; formats 4:5, 1:1, 9:16; Latin fonts only; the full texture system, emphasis styles, text colors, contrast guard, QR, old‑news chip, meta line. Your mark comes later (R4); keep the slot empty.
- **Popup components, Card mode only** (`11-popup.md` steps 2–4, as a shared React package `packages/ui` used by Lite now and the extension in R2). Auto chip overrides: theme, format, template. Text bar.
- **Web app at `/app/`** (`16-lite.md` steps 1–6, ARCH §18, `P9-web-app.png`, `design/phone/A1`–`A3`): paste flows (URL slug headline, copied HTML, images, "Add a photo"), the bookmark (desktop one‑click) + its window, handshake + validation, image fallback chain, **PWA install + offline + Android share target**, phone layout (Home, Shared into Clipcard). History of the last 30 cards in IndexedDB (full drafts arrive in R3).
- **Landing** (LANDING §3 row 2, §3.2): the hero **app shortcut**: a paste bar whose Make card works in place (it shares the `/app` code via `packages/ui`); paths ✂ bookmark · Open full app; nav "Web app"; mobile **Install the app** (`beforeinstallprompt`) + iPhone hint; the No‑install block; live CardDemo (`08-landing.md` step 7); "One‑click cards" tile → live. Set `RELEASED.app`, `RELEASED.pwa`, `RELEASED.cards`, `RELEASED.lite`.

## Lanes
**Engine** (core + cards) · **UI** (packages/ui popup) · **Lite** (after engine + UI) · **Landing** (bookmarklet link, CardDemo after engine).

## Done when
- [ ] On 5 real news sites + Facebook: drag the bookmark from the live landing page, click it, Copy → paste into Facebook's composer works; the QR decodes to the clean URL.
- [ ] Landing hero: paste a URL → a card appears in the hero → Copy works; Open in app keeps the card.
- [ ] Android phone: install from the landing page; share a link from the Facebook app → Clipcard opens with the card; Share sends the PNG to WhatsApp. iPhone: Add to Home Screen works; the Share sheet sends the PNG.
- [ ] Lighthouse PWA installable; cached cards work offline.
- [ ] Visual snapshots of the 5 templates match `design/cards/*` (≤ 2%).
- [ ] `ship.md` complete.

Finish with `handover/ship.md`.
