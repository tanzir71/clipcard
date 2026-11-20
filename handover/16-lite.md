# Codex task · M16 · Web app at /app (no install: paste, bookmark, phone app)

> Updated 2026‑11‑20: see `UPDATE-2026-11-20-web-app.md`. Route `/app/`, standalone paste flows, and the PWA + share target ship in R1.

**Branch:** `feat/m16-lite` · **Needs:** M11, M15a (storage) · **Parallel with:** M12–M14

## Read first
- `docs/PRD.md` F12 · `docs/ARCHITECTURE.md` §18 · `docs/LANDING.md` §3 row 4 (no‑install block)
- **Visual truth:** `design/webapp/*`, `design/phone/*`, `design/screens/P8-lite-bookmark.png`, `L1-landing-desktop.png` (Install section)

## Build
1. `apps/lite`: Vite + React page at **`/app/`** (Vite `base: '/app/'`), usable on its own, built to **`docs/APP.md`** (desktop workspace `design/webapp/W1`–`W4`, phone `design/phone/A1`–`A8`). Paste/drop/Photo inputs feed the Add source row. It also works as the bookmark window hosting the same popup components (Card · Grid · Video, Auto chip, text bar, drafts, Library · GIFs). Window bar label "Clipcard" + a "Saved in this browser · no install" note at the bottom.
2. `bookmarklet.ts` → a `javascript:` URL under 4 KB (minified IIFE): reads metadata, the selection, image candidates and the video moment; opens or reuses the named window; posts the payload after `ready`.
3. Handshake + validation (origin, schema with zod, length limits, URL sanitizing).
4. Image fallback chain (CORS fetch → bookmarklet frame → Solid + paste/drop).
5. Landing: the draggable bookmarklet link (built at landing build time), copy per LANDING.md; mobile Add to Home Screen.
6. PWA manifest + service worker + `share_target` (GET `?title&text&url`).
7. Optional Record (getDisplayMedia) → Blob → window → draft.

## Don't
- Load any external script from the bookmarklet.
- Use an iframe for the Lite UI (storage partitioning).

## Done when
- [ ] Manual: bookmark works on 5 news sites + YouTube + Facebook + X; cards copy; drafts survive closing the browser; the same draft is visible from different sites.
- [ ] Unit: payload validation rejects bad origins and oversized fields.
- [ ] Lighthouse PWA installable; the Android share target opens the window with the shared URL.
- [ ] `docs/TASKS.md` M16 ticked.
