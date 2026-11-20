# Codex task · M11 · Popup (one surface for every workflow)

**Branch:** `feat/m11-popup` · **Needs:** M3, M10 · **Parallel with:** M12, M15 (storage part)

## Read first
- `docs/DESIGN.md` §2 (placement rule, autopilot rule, Popup, Text bar, Copied toast)
- `docs/PRD.md` §4 F1, F2, §5
- **Visual truth:** `design/screens/P1-quick-share.png`, `P2-text-bar.png`, `M1-one-click-copied.png`

## Build
1. Placement: every surface sits at the top right (12 px from the right, 8 px under the toolbar; in‑page surfaces 12/12). No scrim. Remove the v1 centered sheet.
2. Popup iframe `popup.html?draft=<id>`: an edge‑to‑edge preview (DOM render) with hover‑only ‹ ›; the mode switch (Card · Grid · Video) and the **Auto chip** describing the auto choices (template · format · destination); actions Copy · Save for later · Share; the always‑visible 28×28 close; Esc.
3. Override panel (from the Auto chip): theme swatches, format, template, mark on/off. Every override is stored on the draft and in per‑site prefs.
4. Text bar on headline click (below the headline): emphasis style, emphasis color, headline color, click‑words key‑phrase selection, contrast‑disabled states with tooltips.
5. Destination detection for the auto format (PRD §5): track the last focused social tab with `chrome.tabs.onActivated` + URL match (host permission), else the referrer of the source page.
6. Toast at the top right, with "Copy link for the comment" after an image copy.

## Done when
- [ ] Playwright screenshots of P1 and P2 states match the PNGs (≤ 3%, page masked).
- [ ] e2e: one‑click copy → toast top right → Edit opens the popup on the same draft; closing and reopening restores it.
- [ ] Keyboard path: open → ←/→ → Tab to the Auto chip → Enter → pick 9:16 → Ctrl+C → Esc.
- [ ] axe clean. `docs/TASKS.md` M11 ticked.
