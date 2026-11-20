# Codex release · R1 · Lite (no install) · `v0.1`

**Needs released:** R0 · **Read first:** `AGENTS.md`, `docs/ROADMAP.md` (this row), then each prompt named below for detail. Build **only** the scope below; anything else stays behind `FLAGS` or waits for its release.

## Scope
- **M1 core, page‑side parts** (`01-core.md`): `cleanUrl`, `unwrapUrl`, `extract(doc)`, `cleanTitle`, `detectScript`, `textFragment`; plus `keyphrase.ts` (`10-cards-v2.md` step 3). Skip `resolveUrl` and fetching (Lite reads the page it's on).
- **M2 + M10 cards** (`02-cards.md`, `10-cards-v2.md`), **cut to**: Header, Split, Overlay, Solid, Quote; formats 4:5, 1:1, 9:16; Latin fonts only; the full texture system, emphasis styles, text colors, contrast guard, QR, old‑news chip, meta line. Your mark comes later (R4); keep the slot empty.
- **Popup components, Card mode only** (`11-popup.md` steps 2–4, as a shared React package `packages/ui` used by Lite now and the extension in R2). Auto chip overrides: theme, format, template. Text bar.
- **M16 Lite, cut to** (`16-lite.md` steps 1–5): bookmarklet, the Lite window in Card mode, handshake + validation, image fallback chain, the landing bookmarklet link. History of the last 30 cards in IndexedDB (full drafts arrive in R3).
- **Landing**: the No‑install block, hero CTA "Try it now: drag the bookmark", live CardDemo with the real renderer (`08-landing.md` step 7), "One‑click cards" tile → live.

## Lanes
**Engine** (core + cards) · **UI** (packages/ui popup) · **Lite** (after engine + UI) · **Landing** (bookmarklet link, CardDemo after engine).

## Done when
- [ ] On 5 real news sites + Facebook: drag the bookmark from the live landing page, click it, Copy → paste into Facebook's composer works; the QR decodes to the clean URL.
- [ ] Visual snapshots of the 5 templates match `design/cards/*` (≤ 2%).
- [ ] `ship.md` complete.

Finish with `handover/ship.md`.
