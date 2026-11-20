# Codex task · M2 · Cards: templates, colors, QR, renderer, gallery

> **Update (v2):** build the render engine, export and QR here, but take the **template list and visuals from `10-cards-v2.md`** (Header, Split, Caps, Overlay, Duotone, Quote, Solid, Roundup). The v1 templates (Lower Third, Poster) were removed. Run 02 and 10 as one branch if neither has started.

**Branch:** `feat/m2-cards` · **Needs:** M0 · **Parallel with:** M1, M8

## Read first
- `AGENTS.md`
- `docs/DESIGN.md` §3 (typography) and §4 (cards: common rules, 6 templates, formats, RTL, **colors**), word for word
- `design/tokens.json` → `card.*`
- **Visual truth:** `design/cards/*.png` (true export size) and `design/screens/C1-colors.png`. When the docs and a PNG disagree on a visual detail, follow the PNG.
- `docs/ARCHITECTURE.md` §7 (rendering)

## Build (`packages/cards`)
1. **Model**:
   ```ts
   type Template = 'overlay'|'lowerThird'|'duotone'|'poster'|'quote'|'solid';
   type Format = '4:5'|'1:1'|'9:16'|'16:9'|'1.91:1';
   interface CardModel { headline: string; outlet: string; favicon: string | null; image: string | null /* blob/object URL */;
     qrUrl: string; lang: string; dir: 'ltr'|'rtl'; focal?: {x:number;y:number}; zoom?: number; highlight?: [number,number][];
     edited?: boolean; quoteAttribution?: string; handle?: string | null; }
   interface CardColor { deep: string; light: string }   // presets in tokens; custom via toCardColor(hex)
   ```
2. **Templates**: React components rendering at true pixel size, one per template, handling all 5 formats and RTL per §4.2–§4.4. Pure: no network, no storage, no `Date.now()`. Mark + kicker + headline + meta + QR only (DESIGN §4.1–§4.2; the Quote card also has its attribution).
3. **Colors** (§4.5): the 6 presets; `toCardColor(hex)` clamps OKLCH L ≤ 0.32 and derives the light tint; Ink special cases; Overlay neutral unless a color is passed explicitly; Duotone = color background + photo with `mix-blend-mode: luminosity` + `contrast(1.18) brightness(1.08)`.
4. **Fonts**: Latin (Schibsted Grotesk 800/900, Geist 300/400/600, Geist Mono 400/500, Libre Caslon Text 400/700, Geist 600) plus Anek Bangla 800, Mukta 800, Lateef 800 and Cairo 700 for now (M6 adds the rest). Self‑hosted WOFF2 under `packages/cards/fonts/<family>/` with their OFL license files. Prefer Fontsource packages if available; verify the names. Load them with a `FontFace` loader, by script, on demand.
5. **FitText**: binary search between max and min size per template, max lines, `text-wrap: balance` for Latin and `pretty` otherwise, measured in a real DOM container, cached.
6. **QR**: EC level M → one SVG `<path>`; module‑size growth rule (min 3.2 px per module, up to +48 px tile).
7. **Renderer**: `renderCard(model, { template, format, color }) → Promise<Blob>` using `modern-screenshot` `domToBlob` at scale 1, after `document.fonts.ready`. Deterministic output.
8. **Gallery** (`pnpm dev:gallery`, a Vite page in `packages/cards/gallery`): renders the 12 designed cards with the sample data shown in the PNGs (photos from `design/photos/*.jpg`; QR URL `https://deltadispatch.news/city/electric-river-buses`) and the C1 colors board. Each card has a "Download PNG" button. This is the review surface.

## Don't
- Add text that isn't in the PNGs (no dates, domains, "scan me", summaries).
- Use canvas text layout or Satori.
- Use rounded corners on cards, photos, tags or QR tiles.

## Done when
- [ ] Playwright visual tests render each of the 12 designed cards and compare them with `design/cards/<name>.png`: ≤ 2% pixel difference at the same size (threshold 0.1; note in DECISIONS if the AI sample photo's crop makes one exceed this and why).
- [ ] The colors board in the gallery matches `C1-colors.png`: 4 templates × 6 presets.
- [ ] For every rendered PNG, `jsqr` decodes the QR to the exact `qrUrl`.
- [ ] Computed `font-family` assertions pass for headline and outlet in en, bn, hi, ur.
- [ ] Unit tests: `toCardColor` (contrast ≥ 7:1 with white for 20 random hexes), FitText edge cases (very long headline → min size + ellipsis).
- [ ] `docs/TASKS.md` M2 ticked.

## Report back
Gallery screenshots (attach), diff percentages per card, and any deviations with reasons.
