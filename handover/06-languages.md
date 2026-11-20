# Codex task · M6 · Languages, scripts and RTL

**Branch:** `feat/m6-languages` · **Needs:** M2 for the card part; M4 + M7 merged before the UI‑strings part (split it into two PRs if needed) · **Parallel with:** M3–M5, M8

## Read first
- `AGENTS.md`
- `docs/I18N.md` (all), especially §2, the font table: **use fonts designed for each script**, never a pan‑Unicode fallback
- `docs/DESIGN.md` §3 and §4.4 (RTL)
- `design/tokens.json` → `card.scriptFonts`
- `fixtures/headlines.json`, `design/screens/C2-languages.png`, `design/cards/header-4x5-bn.png`, `header-4x5-hi.png`, `split-4x5-ur-rtl.png`

## Part A · Cards (after M2 + M10)
1. Add every card font in `I18N.md` §2 (WOFF2 subsets, ≤ 2 weights per script, OFL files alongside). Budget: ≤ 6 MB of fonts in total. Load them lazily, by script.
2. Font selection from `CardModel.lang` + detected script; per‑font optical size factors (`DESIGN.md` §3 note); no negative tracking for non‑Latin; Caps uses the script's headline font (no uppercase) for non‑Latin; serif templates use the script's own text face (DESIGN §3).
3. Glyph coverage: if `document.fonts.check()` fails for any character in the headline with the chosen font, switch to the declared fallback (Noto Sans for `ha`/`yo`). Never render tofu.
4. Line breaking: `Intl.Segmenter` word granularity for `th` and `my` (insert soft wrap opportunities).
5. **Zawgyi**: detect it with Google's `myanmar-tools` (or an equivalent maintained detector) and convert it to Unicode before rendering. Add a real Zawgyi sample to `fixtures/headlines.json` (as an extra entry; don't edit existing ones).
6. Numerals per `I18N.md` §3 (affects only history dates and any numerals you render).
7. RTL (`ur`, `ar`, `fa`): mirrored layout per `DESIGN.md` §4.4; URLs and handles inside `<bdi dir="ltr">`.

## Part B · UI strings (after M11 + M7)
1. Move every UI string into `packages/i18n/locales/en.json` (no hard‑coded copy left; add a lint rule or test that fails on JSX string literals in `apps/extension`).
2. Generate the wave‑1 locales from `en` with `"_status": "needs-review"`; keep `bn` as provided (also `needs-review`). Generate `_locales` for the manifest and menus.
3. UI RTL: `dir="rtl"` + logical CSS properties in the popup, toast, tray, welcome, settings and the Lite window for `ur`, `ar`, `fa`.

## Done when
- [ ] Smoke test: every sample in `fixtures/headlines.json` renders in Header and Split at 4:5 with no missing glyphs (check each character with `document.fonts.check`), no clipping, and the expected `font-family` and `dir`.
- [ ] Visual tests for the bn, hi and ur cards vs their PNGs (≤ 2%).
- [ ] The Zawgyi sample renders identically to its Unicode equivalent.
- [ ] Extension size report in the PR (fonts per script, total).
- [ ] `docs/TASKS.md` M6 ticked.

## Report back
A screenshot grid of all 30 languages (one card each), font sizes added, anything that needed a fallback.
