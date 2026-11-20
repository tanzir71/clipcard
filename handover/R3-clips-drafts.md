# Codex release · R3 · Clips, grids and drafts · `v0.3`

**Needs released:** R2 · **Read first:** `AGENTS.md`, `docs/ROADMAP.md` (this row), then each prompt named below for detail. Build **only** the scope below; anything else stays behind `FLAGS` or waits for its release.

## Scope
- **M15 part a** (`15-library-drafts-batch.md` steps 1–2): storage layer (IndexedDB + OPFS, persist, retention sweep, export/import), drafts with auto‑append, the 6 h rule, the Drafts popup (`P6`), Save for later. This replaces R1's simple history; migrate it.
- **M12 clips → grid** (`12-clips.md`): clip mode, tray at the top right, Excerpts / Grid 3 / Grid 4 / Board, the Grid mode in the popup.
- **M5 entry points, the rest**: hover button on link previews, selection toolbar with + Clip, image context menu "Clip image".
- **Lite**: drafts (same storage package) + Excerpts grids from repeated bookmark clicks with a selection; images from the page's candidates.
- **Landing**: "Clips and grids" and "Drafts" tiles → live.
- **Owner**: apply for GIPHY and KLIPY keys now.

## Done when
- [ ] e2e: clip on page A, restart the browser, add from page B → the draft holds both; Board card copies with per‑source QRs.
- [ ] Lite: three clicks on three pages with selections → one Excerpts card.
- [ ] `ship.md` complete.

Finish with `handover/ship.md`.
