# Codex task · M3 · One‑click: right‑click → clipcard on the clipboard

**Branch:** `feat/m3-one-click` · **Needs:** M1, M2 · **Parallel with:** M6 (cards part), M8

## Read first
- `AGENTS.md`
- `docs/PRD.md` §4 F1 (and F3's context-menu items)
- `docs/ARCHITECTURE.md` §2 (contexts), §3 (permissions), §4 (pipeline), §10 (storage)
- `docs/DESIGN.md` §2 rows "Copied toast" and "Context menu"
- `design/screens/M1-one-click-copied.png`, `E1-context-menu.png`

## Build (`apps/extension`)
1. **Context menus**: parent "Clipcard"; on links/page: Copy as clipcard · Edit clipcard… · Copy clean link; on selection: Copy as quote card · Edit quote card…. Titles come from `chrome.i18n`. **Command** `copy-clipcard` with suggested key `Alt+Shift+S`.
2. **Hints**: on right‑click, the injected script finds the matching `a[href]` (also matching unwrapped/cleaned forms) and walks up to 6 ancestors for the preview's largest image (`currentSrc`) and heading text. Track the last `contextmenu` target in a capture listener.
3. **Offscreen pipeline**: `resolveUrl` → fetch the HTML (credentials omit, 8 s timeout, ≤ 2 MB, text/html only) → `extract` → merge with the hints → fetch the image as a blob → measure luminance → `renderCard` with per‑site prefs (default Overlay, 4:5, Midnight) → PNG.
4. **Clipboard + toast** (in the page, closed shadow DOM): write `ClipboardItem({'image/png'})`; show the toast per M1 (thumb 64×80, ✓ Copied, Share / Edit / Dismiss, 6 s auto‑dismiss with a progress line, pauses on hover; bottom‑right, bottom‑left in RTL; `aria-live="polite"` announces "Clipcard copied to clipboard"). If the write fails, show a single **Copy** button that retries the write (a user gesture).
5. **Fallbacks**: article fetch fails or times out → render from the hints; no usable image → **Solid**. Missing optional permission → current‑page cards only, and the toast offers "Allow photos" (requests `<all_urls>`).
6. **Copy clean link**: writes `resolveUrl(...).url` as text, with a small "Link copied" toast.
7. **Storage**: per‑site prefs `{format, template, color}` in `chrome.storage.local`; history of the last 30 in IndexedDB (`idb`) with a 120×150 WebP thumbnail.
8. Share and Edit on the toast: stub them, emitting events that M4 wires up.

## Test setup
- Serve `fixtures/pages` locally. Add `fixtures/pages/feed.html`, a copy of the E1 social feed with a link preview whose `href` is a local wrapper (`/l.php?u=<encoded article URL>`), plus a local redirect endpoint standing in for `t.co`. Register the local wrapper host in tests only.

## Don't
- Build the quick sheet (M4) or the hover/selection UI (M5).
- Write to the clipboard from the service worker.

## Done when
- [ ] e2e: right‑click the preview in `feed.html` → menu item → the clipboard contains a PNG; decoding its QR gives the **cleaned canonical** URL of the article fixture.
- [ ] e2e: the same flow with the network blocked for the article → a card is still produced from the hints; with no image → a Solid card.
- [ ] e2e: a quote card from a selection has a `#:~:text=` QR URL.
- [ ] Measured over 20 runs on fixtures: click → toast p50 ≤ 1.2 s, p95 ≤ 2.5 s (log the numbers in the PR).
- [ ] Toast matches `M1-one-click-copied.png`; axe has no violations on the toast.
- [ ] `docs/TASKS.md` M3 ticked.

## Report back
Timings, a GIF or screenshots of the flow, fallback behaviour, decisions.
