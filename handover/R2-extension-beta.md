# Codex release · R2 · Extension beta (one‑click cards) · `v0.2`

**Needs released:** R1 · **Read first:** `AGENTS.md`, `docs/ROADMAP.md` (this row), then each prompt named below for detail. Build **only** the scope below; anything else stays behind `FLAGS` or waits for its release.

## Scope
- **M1 core, the rest**: `resolveUrl`, fetch + extract of linked articles (all fixtures).
- **M3 one‑click** (`03-one-click.md`): offscreen pipeline, context menu on links, page and selection, the toast at the top right with "Copy link for the comment", per‑site prefs.
- **M11 popup in the extension** (`11-popup.md`, using `packages/ui` from R1): Card mode only; **hide** the Grid and Video buttons until R3/R5. Save for later is hidden until R3.
- **M5 entry points, cut to** (`05-entry-points.md`): toolbar icon, `Alt+Shift+S`, paste a link (E4, E5). Hover button and selection toolbar come in R3.
- **Cards**: add Caps and Duotone; formats 16:9 and 1.91:1.
- **Release workflow + dev‑mode update check** (`09-release.md` steps 1–2).
- **Throwaway check**: build a variant with `tabCapture` and record whether Chrome shows an install warning, and whether it can be an optional permission. Write the result to `docs/DECISIONS.md` (ROADMAP risk).
- **Landing**: Install section live (Download .zip + steps); hero CTA "Download for Chrome" + secondary "No install? Use the bookmark".

## Lanes
**Core** · **Extension** (M3 → popup → entry points) · **Cards** (Caps, Duotone, formats) · **Release/landing**.

## Done when
- [ ] `v0.2.0` zip installs via Load unpacked on Chrome, Edge and Brave from a clean profile; a right‑click on a link in a Facebook feed copies a card in ≤ 1.2 s p50.
- [ ] The popup matches `P1`/`P2`; Grid and Video modes are not visible.
- [ ] `ship.md` complete.

Finish with `handover/ship.md`.
