# Codex task · M12 · Clips → grid

**Branch:** `feat/m12-clips` · **Needs:** M11 · **Parallel with:** M13, M15

## Read first
- `docs/PRD.md` F5 · `docs/DESIGN.md` §2 rows Grid mode, Clip tray, Clip mode, Selection toolbar, Context menu; §4.2 clip layouts
- `docs/ARCHITECTURE.md` §12 (storage)
- **Visual truth:** `design/screens/K1-clip-mode.png`, `K2a-select-clip.png`, `K2b-image-clip.png`, `P3-grid.png`; `design/cards/clips-*.png`

## Build
1. Clip mode (`Alt+Shift+C`, the page menu, the "+ Clip" in the selection toolbar): hover outline + kind tag, click to add, drag for a region, Esc exits, top‑right pill.
2. Capture: text → string + `textFragment`; image → fetch as a blob (host permission), fallback to a crop of `captureVisibleTab`; section → `captureVisibleTab` cropped to the element rect × DPR. Save to OPFS with metadata in IndexedDB.
3. Tray at the top right (thumbs, counts, Card, Video →, ×). Hidden while the popup is open.
4. Layouts Excerpts / Grid 3 / Grid 4 / Board with the auto choice, ‹ › cycling, drag reorder, × remove in Grid mode (`P3`).
5. QR: one per source; excerpts add `text=` directives (`#:~:text=a&text=b`).

## Done when
- [ ] e2e on `fixtures/pages/news-og.html`: clip 2 paragraphs + 1 image → Board → Copy → the PNG matches the layout; the QR decodes to the canonical URL with both `text=` directives.
- [ ] Clips persist across reloads in the current draft.
- [ ] `docs/TASKS.md` M12 ticked.
