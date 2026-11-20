# Codex task · M7 · Welcome + Settings

**Branch:** `feat/m7-onboarding-settings` · **Needs:** M3 · **Parallel with:** M5, M6, M8

## Read first
- `AGENTS.md`
- `docs/PRD.md` §4 F4
- `docs/DESIGN.md` §2 row "Welcome / Settings", §4.5 colors
- `design/screens/O1-welcome.png`, `O2-settings.png`

## Build
1. **Welcome (`welcome.html`)**: opens on install (`runtime.onInstalled`, reason `install`). Left: lockup, H1 "Any link → a clipcard.", one line, a fan of 3 sample cards (rendered with `packages/cards`). Right panel: Language chips (native names in their own fonts; shows the wave‑1 list plus "More…"), Handle input (optional, stored without "@"), Permission row "Read links you choose" + **Allow** (requests `<all_urls>`; the row turns into a ✓ state), **Done** (closes the tab).
2. **Settings (`options.html`)**: left nav (General · Quick access · Cards · Privacy); rows exactly as O2:
   - General: interface language, card language (Auto + list), numerals (Native / 0–9), default format, default template, **default color** (6 swatches + custom).
   - Quick access: button on links (Off / Previews / All), selection toolbar, shortcut (shows the current binding; link to `chrome://extensions/shortcuts`).
   - Cards: QR code, mark edited headlines.
   - Privacy: keep history (30), Clear history (confirm inline, no dialog).
3. Changes apply immediately (no Save button) and are synced to running content scripts.
4. Dark mode via `prefers-color-scheme` using the UI tokens. Monochrome ink UI: no blue anywhere.

## Done when
- [ ] Visuals match O1/O2 (≤ 3% diff).
- [ ] e2e: install → the welcome tab opens; choosing বাংলা switches the UI language; Allow grants the permission (Playwright auto‑accepts) and the hover button becomes available.
- [ ] e2e: each setting changes behaviour (e.g. Off hides the hover button; the default color changes the next card's color; Clear empties history).
- [ ] `docs/TASKS.md` M7 ticked.
