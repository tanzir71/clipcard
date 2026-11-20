# Codex release · R0 · Landing live · `v0.0`

**Needs released:** nothing · **Read first:** `AGENTS.md`, `docs/ROADMAP.md` (this row), then each prompt named below for detail. Build **only** the scope below; anything else stays behind `FLAGS` or waits for its release.

## Scope
- **M0 scaffold** (`00-scaffold.md`), plus an empty `apps/lite` Vite app and `packages/core/flags.ts`.
- **M8 landing, static parts** (`08-landing.md` steps 1–2, 4, 6, 8, 9): every section from LANDING.md §3 (English only; language routes come in R4) except the Install block (hidden until R2) and the bookmarklet (hidden until R1). Templates show the PNGs from `design/cards/`. The Features tiles all show **Soon**.
- **Deploy workflow** (from `09-release.md` step 3) + `RELEASED` config + `/changelog/` page (LANDING.md §3.2).
- Hero CTA: "Follow on GitHub" (no download yet).

## Lanes
One lane: scaffold → landing.

## Done when
- [ ] The landing page is live on the chosen host (desktop + mobile match `L1`/`L2` except the hidden parts).
- [ ] Lighthouse ≥ 95 on performance, accessibility, best practices and SEO.
- [ ] `ship.md` steps 1–2, 5–6, 8 done (no zip yet).

Finish with `handover/ship.md`.
