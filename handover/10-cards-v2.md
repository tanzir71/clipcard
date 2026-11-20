# Codex task · M10 · Cards v2 (texture, emphasis, newspaper type)

**Branch:** `feat/m10-cards-v2` · **Needs:** M0 (merge with M2 if neither started) · **Parallel with:** M1, M8

## Read first
- `AGENTS.md` (non‑negotiables 2–5)
- `docs/DESIGN.md` §1, §3, §4.1–§4.5
- `docs/PRD.md` §5 (automatic decisions) and §6
- `docs/ARCHITECTURE.md` §7 (rendering), §17 (emphasis and contrast)
- **Visual truth:** `design/cards/{header,split,caps,overlay,duotone,quote,solid,roundup}-4x5.png`, `duotone-1x1.png`, `header-9x16-story.png`, `split-16x9.png`, `header-4x5-bn.png`, `header-4x5-hi.png`, `split-4x5-ur-rtl.png`

## Build
1. `packages/cards/src/texture/`: `grain.ts` (256 px feTurbulence tile baked once to a PNG data URL), `fade.ts` (`smootherstep(max, dir) → CSS linear-gradient` with 17 stops), `halftone.ts` (SVG generator: pitch, falloff fn, opacity), `hairlines.ts` (SVG + mask‑image fade), `echo.tsx` (blurred photo layer), `oversizedMark.tsx`.
2. Templates as React components rendered at true size: Header, Split, Caps, Overlay, Duotone, Quote, Solid, Roundup (DESIGN §4.2). Shared parts: `Mark`, `Kicker` (text and chip variants), `Meta` (Header and mono variants), `QR`, `Headline` with `emphasis: { style: 'box' | 'line' | 'color', range: [start, end], color }`.
3. `packages/core/keyphrase.ts` per PRD §5, with tests over `fixtures/headlines.json` (add 20 Latin cases from real wire headlines; expected ranges in the fixture).
4. Text colors + contrast guard (ARCH §17). The custom emphasis clamp is OKLCH L ≥ 0.78; the theme clamp is L ≤ 0.32.
5. Formats: 1:1, 9:16 safe areas, 16:9 horizontal Split, 1.91:1. RTL mirror.
6. Old‑news chip (> 365 days → year in Rose). Fonts: Libre Caslon Text 400/700, Geist 300/400/600, Geist Mono 400/500, Schibsted Grotesk 800/900, plus the script fonts from I18N §2. Subset WOFF2.
7. A lint rule (stylelint + an ESLint custom rule on style objects) that fails on `italic`, and a CI check that no `*Italic*` font file is bundled.

## Don't
- Add any gradient that isn't from `fade.ts`. No hard edges.
- Put any texture above 8% opacity.
- Use italics or synthetic oblique.

## Done when
- [ ] Snapshot PNGs of every template and format, compared with `design/cards/*` (≤ 2% diff).
- [ ] Key‑phrase tests green; the contrast guard is unit tested (a white photo under Overlay text forces the stronger shade).
- [ ] Bangla, Hindi and Urdu snapshots match the PNGs.
- [ ] `docs/TASKS.md` M10 ticked.

## Report back
Side‑by‑side snapshots with the PNGs, any font‑metric adjustments, and decisions.
