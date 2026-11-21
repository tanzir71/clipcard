# TASKS — build order for Codex

**Build in release order (`docs/ROADMAP.md`, prompts `handover/R0`–`R8`).** Each release ships a working product and an updated landing page. The milestone checklists below are the full specs; each release prompt says which boxes belong to it. Each milestone also has a detailed prompt in `handover/NN-*.md`. Each task lists its acceptance criteria. Tick boxes as you go. Record decisions in `docs/DECISIONS.md`.

## M0 · Scaffold
- [x] pnpm workspace with `apps/extension` (WXT + React + TS), `apps/landing` (Astro), `packages/{core,cards,i18n}`; shared `tsconfig`, ESLint, Prettier, Vitest, Playwright.
- [x] Root scripts from `AGENTS.md` work. CI workflow (GitHub Actions): install, typecheck, lint, test, build.
- [x] `design/tokens.json` → generated `packages/cards/src/tokens.ts` and CSS variables `--pc-*`.
**Done when** `pnpm build` produces a loadable extension zip and a static landing build.

## M1 · Core (`packages/core`)
- [x] `unwrapUrl`, `cleanUrl`, `resolveUrl` (with an injectable `fetch`) + `textFragment(url, selection)`. **All cases in `fixtures/urls.json` pass.**
- [x] `extract(doc, finalUrl): CardSource` per `ARCHITECTURE.md` §5. **All `fixtures/pages/*.html` match `fixtures/expected/*.json`.**
- [x] `detectScript(text)`, `langToScript`, `dirFor(lang)`; unit tests with bn/hi/ur/ar/ta/ne strings.
- [x] `cleanTitle(title, siteName, host)` with suffix/prefix stripping tests.

## M2 · Cards (`packages/cards`)
- [ ] Font loader (per‑script WOFF2 subsets, lazy) and the font map from `docs/DESIGN.md` §3.
- [x] `FitText` (binary search, max lines, balance) with tests.
- [x] QR SVG component (EC M, one path) + module‑size growth rule.
- [ ] Templates: see **M10** (Header, Split, Caps, Overlay, Duotone, Quote, Solid, Roundup) × formats 4:5, 1:1, 9:16, 16:9, 1.91:1 + RTL.
- [x] `renderCard()` → PNG Blob via modern‑screenshot.
- [ ] **Visual snapshots**: render the designed cards with the sample data (`design/photos`, texts from the PNGs) and compare with `design/cards/*.png` (≤ 2% diff). Assert computed font families.
- [ ] Scan test: decode the QR from every rendered PNG (e.g. `jsqr`) and assert it equals the expected URL.

## M3 · One‑click (extension)
- [x] Manifest permissions exactly per `ARCHITECTURE.md` §3. Optional `<all_urls>` request helper.
- [x] Context menus (links, page, selection) with the parent "Clipcard"; command `Alt+Shift+S`.
- [x] Offscreen document: fetch → extract → image → render. 8 s timeout, fallbacks.
- [x] Injected script: hints collection, clipboard write, toast (shadow DOM, M1 visuals, RTL‑aware, auto‑dismiss 6 s, hover pause).
- [x] Per‑site prefs, history (IndexedDB, last 30).
**Done when** an e2e test right‑clicks a link on `fixtures/pages/feed.html` (create it from the E1 mock), the clipboard contains a PNG, and the decoded QR equals the cleaned URL. p50 ≤ 1.2 s locally.

## M4 · Quick sheet — **superseded by M11** (skip)
- [ ] Iframe mount in a closed shadow root, scrim, focus trap, Esc.
- [ ] Ultra‑minimal sheet: card preview with ‹ › template arrows + dots, color swatches + custom picker (clamped deep), format chip, Copy, Share menu (Download + platforms, `ARCHITECTURE.md` §9), floating close. Visual parity with `M2`, `M3`, `M4` and `C1-colors.png`.
- [ ] Inline headline edit with Edited · Reset; pencil glyph on the card when *Mark edited* is on.
- [ ] Photo reposition (drag/zoom/reset), replace (page images + upload).
- [ ] 9:16 safe‑zone bands in the preview.
- [ ] Keyboard map. Visual parity with `M2-quick-sheet.png` / `M3-share-menu.png`.

## M5 · Entry points
- [x] Toolbar action → sheet for the current page; badge dot when an article is detected.
- [ ] Hover button (E2) and selection toolbar (E3) via dynamically registered content scripts (only with the optional permission). Settings modes respected.
- [x] Empty sheet with paste + recents (E5). Popup‑window fallback on restricted pages.

## M6 · Languages & RTL
- [x] `packages/i18n` with locale JSON → `_locales` generator. `en` and `bn` complete; other wave‑1 locales generated and marked `needs-review`.
- [ ] Card fonts for **every script** in `I18N.md` §2 (30 languages), lazy‑loaded subsets; numerals per §3; Urdu in Lateef; RTL mirroring for `ur`, `ar`, `fa` (cards + UI).
- [x] Glyph‑coverage fallback for `ha` and `yo` (Noto Sans); Thai and Burmese line breaking with `Intl.Segmenter`; Zawgyi → Unicode for Burmese.
- [x] Snapshot tests for bn, hi, ur cards against the PNGs, plus smoke renders (no tofu, no clipping) for every other script, with one sample headline per language in `fixtures/headlines.json`.

## M7 · Welcome & settings
- [x] Welcome (O1): language chips, handle, permission. It opens on install.
- [x] Settings (O2): all rows functional; default color swatches; clear history.

## M8 · Landing (`apps/landing`)
- [x] Sections and routes per `docs/LANDING.md`; CardDemo island using `packages/cards`.
- [x] SEO: meta, hreflang, JSON‑LD, OG images generated with the card renderer, sitemap.
- [x] Pre‑store mode (`LANDING.md` §3.1): Install section, Download .zip / GitHub / clone‑and‑build, beta note; the switch to store mode when `STORE_URL` is set.
- [x] Footer with tanziro.com link.
- [x] Mobile "Send to my computer". Lighthouse ≥ 95.

## M9 · Release
- [x] GitHub Release workflow: tag `v*` → build → attach `clipcard-chrome.zip` (manifest at the root). Test the developer‑mode install from that zip on Chrome, Edge and Brave.
- [x] Update‑available check against GitHub Releases (once a day, settings dot) for developer‑mode installs.
- [ ] Store assets: icons 16/32/48/128, 1280×800 screenshots made from `design/screens` (real UI captures preferred), localized store names/summaries (`I18N.md` §6).
- [ ] Privacy policy page; permission justifications for the store review.
- [ ] Run the full `docs/QA.md` matrix and fix blockers.
- [ ] Firefox build (stretch).

## M10 · Cards v2 (replaces the M2 visual spec; do it before M3 if M2 isn't merged yet)
- [ ] Templates Header (auto default), Split, Caps, Overlay, Duotone, Quote, Solid, Roundup per DESIGN §4.2. Match `design/cards/*.png` at true size (≤ 2% pixel diff after anti‑aliasing).
- [ ] Texture system: grain tile, smootherstep gradients (17 stops), halftone, masked hairlines, photo echo, oversized mark. Snapshot tests per template.
- [ ] Emphasis: Box / Line / Color, key phrase from `packages/core/keyphrase.ts`, text colors and the contrast guard (ARCH §17). No italics: a lint rule fails on `font-style: italic` and `*Italic*` font files.
- [ ] Your mark, kicker, meta line, old‑news year chip.
- [ ] Formats 1:1, 9:16 (safe areas), 16:9 horizontal Split, 1.91:1; RTL mirror.

## M11 · Popup (one surface for all workflows) — supersedes M4
- [x] Top‑right placement rule for every surface (DESIGN §2).
- [ ] Popup with Card · Grid · Video modes, edge‑to‑edge preview, hover‑only controls, always‑visible close, Auto chip + override panel, text bar, Save for later, Share menu.
- [x] Toast moves to the top right and adds "Copy link for the comment".

## M12 · Clips → grid
- [x] Clip mode (outline, kind tag, region drag, Esc), selection toolbar "+ Clip", image context menu, tray (top right).
- [x] Clip layouts Excerpts, Grid 3, Grid 4, Board with auto choice; multi-`text=` QR; per‑source QR rule.

## M13 · Video clips
- [x] YouTube Clip button + generic `<video>` hover button; range UI snapped to available caption cues; moment card.
- [x] Tab chooser, crop to the player, browser encoding and OPFS; clean capture styling; EME refusal and recording limits. See the R5 note in DECISIONS.md.
- [x] Verify the `tabCapture` install warning and record the decision.

## M14 · One video from many sources
- [x] Scene renderers (DESIGN §4.6), auto durations, captions, Sources end card; export MP4; progress; Download/Share.
- [x] "Add a reaction?" step with up to 3 Library suggestions + Skip.

## M15 · Library, GIFs, drafts, batch
- [x] IndexedDB + OPFS storage (ARCH §12), Save to library, tags, search, export/import.
- [x] GIPHY/KLIPY search with optional host permissions, attribution and a Settings key field. See DECISIONS.md for provider storage limits.
- [x] Drafts: auto‑append, 6 h rule, list in the popup, restore exactly, retention sweep.
- [ ] Batch: marquee over links, open tabs, paste list → Roundup / Carousel / Digest video (ARCH §16).
- [x] Privacy page and store disclosure draft updated for GIF search.

## M16 · Lite (no install)
- [x] `apps/lite` serves the shared editors, storage and video export at `/app` with PWA share handling.
- [ ] Bookmarklet under 4 KB, no external loads, works on sites with strict CSP (test on news sites, YouTube, Facebook, X).
- [x] postMessage handshake (origin + schema check), reuse of the named window, add‑to‑draft on repeat clicks, moment from the playing video.
- [x] Landing "No install? Use the bookmark." block with the draggable link; mobile "Add to Home Screen".
- [ ] Optional tab recording via `getDisplayMedia` (user prompt every time).
