# Codex task · M4 · Quick sheet (ultra‑minimal editor)

> **Superseded by `11-popup.md`.** Skip this prompt. The quick sheet is now the top‑right popup with Card · Grid · Video modes.

**Branch:** `feat/m4-quick-sheet` · **Needs:** M3 · **Parallel with:** M6, M8

## Read first
- `AGENTS.md`
- `docs/PRD.md` §4 F2
- `docs/DESIGN.md` §2 rows "Quick sheet" and "Share menu", §4.5 colors
- `docs/ARCHITECTURE.md` §8 (quick sheet), §9 (share intents)
- **Visual truth:** `design/screens/M2-quick-sheet.png`, `M3-share-menu.png`, `M4-color.png`

## Build
1. **Mount**: from the toast's Edit, the context menu's Edit…, or the shortcut with nothing hovered → closed shadow root with a scrim (`#09090B` at 22%) + an iframe `sheet.html?id=<cardId>`. Focus trap, page scroll locked, Esc / click on the scrim / floating × close it.
2. **Layout exactly per DESIGN §2** (392 wide, padding 12, gap 12): live preview (DOM, not PNG) with ‹ › template arrows; template dots; a row with swatches (6 presets + Custom with a native color input, clamped deep) on the left and the format chip (menu: 4:5 · 1:1 · 9:16 · 16:9) on the right; Copy (primary) + Share.
3. **Editing on the card**:
   - Click the headline → `contenteditable`; Enter commits, Esc reverts; afterwards "Edited · Reset" appears in the dots row.
   - Click the photo → reposition mode (drag, wheel zoom, double‑click resets); hovering shows a small replace icon (images found on the page or an upload).
   - Poster: clicking words toggles the highlight.
   - 9:16: translucent safe‑zone bands in the preview only.
4. **Share menu** (above Share): Download PNG · Facebook · WhatsApp · X · LinkedIn · Threads · More… (Web Share with files, only where `navigator.canShare` allows). Each platform entry copies the PNG and then opens its URL from `ARCHITECTURE.md` §9. Keep the URLs in one config file and verify each one works today.
5. **Persistence**: the template, format and color picked here update per‑site prefs; the card state lives in history (reopen = same edits).
6. **Keyboard**: ←/→ templates, 1–4 formats, Ctrl/Cmd+C copy, Ctrl/Cmd+S download, Esc close. Every icon has a tooltip + `aria-label`.

## Don't
- Add any header, labels, section titles or helper text that the PNGs don't show.
- Re‑introduce a thumbnail strip.

## Done when
- [ ] Playwright screenshots of the three states (default, share menu open, Oxblood + Lower Third) compared with M2/M3/M4 (≤ 3% diff, with the page behind masked).
- [ ] e2e: edit headline → Copy → the PNG's headline matches; Reset restores the original; the card shows the edited mark when "Mark edited headlines" is on.
- [ ] e2e: pick a custom color `#FF00AA` → the rendered panel color has OKLCH L ≤ 0.32.
- [ ] Keyboard‑only path works (open → ← → → 2 → Ctrl+C → Esc).
- [ ] axe: no violations in the sheet.
- [ ] `docs/TASKS.md` M4 ticked.

## Report back
Screenshots side by side with the PNGs, verified share URLs (with the date checked), decisions.
