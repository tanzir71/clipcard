# DESIGN — Clipcard

Visual source of truth: `design/cards/*.png` (true export size) and `design/screens/*.png`. Figma node IDs are in `design/figma.md`. Tokens are in `design/tokens.json`.

## 1. Language of the design

Learned from the news pages our users follow (Nutshell News, Cablgram, The Noiseless News): a **split panel** next to the photo, **small text with texture** (two weights, a highlighted key phrase, tiny kicker and source lines), and **subtle patterns** so a card never looks like a template.

- **Photo first.** The photo carries the card. Text stays small (§3).
- **Texture, never flat.** Grain on every dark area, plus one quiet pattern per template (photo echo, halftone, hairlines, oversized mark). All of them sit at ≤ 6% and fade in and out on smootherstep curves (§4.1). **No harsh transitions.**
- **Newspaper typography.** Libre Caslon Text for serif headlines, Geist for panels, Schibsted Grotesk for caps. **No italics anywhere.**
- **Calm color.** Monochrome ink UI; one deep theme; light, quiet emphasis tones (§4.5).
- **Square.** Cards, photos, chips and QR tiles have 0 radius. The UI uses 2–6 px.
- **Automatic first.** The user finds; Clipcard prepares; overrides hide behind the Auto chip (§2).

## 2. UI (extension)

**Placement rule.** Every extension surface floats at the **top right**, under the toolbar icon: 12 px from the right edge, 8 px below the browser toolbar. In‑page surfaces (toast, tray, clip pill) sit 12 px from the viewport's top‑right corner. Nothing is vertically centered and nothing dims the page (no scrim).

**Autopilot rule.** The user's only required step is *finding* (right‑click, clip, select, mark a range). Output type, template, key phrase, colors, format, captions, scene order and durations are chosen automatically (PRD §5). Every surface shows what was chosen in one **Auto chip** ("Auto · 4:5 for Facebook"); clicking it opens the overrides. Manual controls never appear unless asked for.

| Surface | Spec | PNG |
|---|---|---|
| **Popup** (one surface for every workflow) | Extension page in an iframe, 392 wide (Drafts 340), white, radius 6, Elevation/Overlay, no header, no scrim. Rows: **(1) Preview**, edge to edge, no padding. At rest it shows only the output. Hover shows ‹ › (template or layout) and, on grids, a per‑cell × and drag handle; clicking the headline opens the **text bar**. **(2) Mode row**, padding 10/12/0: mode switch (Card · Grid · Video, 32×32 icon buttons, selected = ink fill, white icon) left; **Auto chip** right (`#F4F4F5`, 6 px theme dot, label, chevron). **(3) Actions**, padding 12, gap 6: primary (42 high, ink; *Copy* for images, *Export · 0:32* for video) + **Save for later** (bookmark, 42×42 outline) + **Share** (42×42 outline). **Close:** 28×28 ink‑60% square with a white ×, inset 8 px from the preview's top‑right, always visible; also Esc. Work is auto‑saved to the current draft, so closing never loses anything. | `P1-quick-share.png` |
| Text bar | Ink capsule, 6/8 padding, placed 10 px below the headline in the preview. Groups split by 1 px white‑20% dividers: emphasis style **Box · Line · Color** (selected = white 16%) · emphasis color dots (18 px hit area, 12 px chip): White, Mist `#A9BCDF`, Rose `#E7A7B0`, Sage `#A3CDB6`, Aqua `#93C9D3`, Lilac `#CDB0D6`, custom (dashed) · **Aa** = headline color, same set. Hint under it: "Click words to pick the key phrase". Clicking words sets a contiguous key‑phrase range. Colors failing contrast (PRD §5) are disabled, with a tooltip. | `P2-text-bar.png` |
| Grid mode | Same popup. Between the preview and the mode row: a strip of the clips (40×40, gap 6, drag to reorder, × on hover) + a dashed **+** tile that opens Library · GIFs. ‹ › on the preview cycles layouts. | `P3-grid.png` |
| Video mode | Same popup. Preview 392×480 on ink with the 9:16 output centered (plays on hover; click = play/pause). **Scenes strip**: 52×72 thumbs + mono duration under each; selected = 2 px ink inset; drag to reorder; click a clip scene to trim (handles appear on the thumb); dashed **+** tile. **Reaction step** (the only question we ask): "Add a reaction?" + 3 suggested GIFs (44×44) + Skip. Primary: *Export · duration*. | `P4-video.png` |
| Library · GIFs | Opens in the popup from any **+**. Tabs Library · GIFs · This page (13 px; active = 600 weight + 28×2 ink underline) and a close ×. Search field (36 high). Provider chips GIPHY · KLIPY (mono 11). Results in 3 columns of square tiles, gap 4, looping MP4 previews, a GIF/MP4 badge, selection = 3 px ink inset + check. Footer: the required attribution ("Powered by GIPHY" while GIPHY results show) on the left + **Add N** on the right. | `P5-library-gifs.png` |
| Drafts | Toolbar click when nothing is selected. Head "Drafts · 3". Rows: 36×45 thumb, title (first headline, editable), "5 clips · 3 sources · 2h", output‑mode icon. Actions: **Card from this page** (primary) + **＋ Draft** (adds this page to the open draft). | `P6-drafts.png` |
| Batch | From a drag‑select over links, "Cards from open tabs", or pasting a list. Output chips: **Carousel · N**, **Roundup**, **Digest video** (auto‑picked: ≤ 4 links → Roundup, 5–10 → Carousel, any video link → Digest video). Link list with checkboxes (title + domain mono). Primary *Copy* (carousel → numbered PNGs, zipped for download). | `P7-batch-links.png` |
| Copied toast | Shadow DOM, fixed 12 px from the top right. Ink, radius 6, padding 10: 64×80 thumb · ✓ Copied · [Share] [Edit] [×] · 2 px auto‑dismiss bar (6 s, pauses on hover). After an image copy, the toast's second line offers **Copy link for the comment** (the clean URL), because many pages post the link in the first comment. | `M1-one-click-copied.png` |
| Clip tray | Shadow DOM, top right 12 px. Dark capsule `#1C1C1F`, 8 px padding: stacked thumbs (40×52, 22 px overlap) · "3 clips / 2 sources" · **Card** (outline) · **Video →** (white) · ×. Hidden while the popup is open. | `K1-clip-mode.png`, `Y1-video-clip.png` |
| Clip mode | Hover outline: 2 px ink, 3% ink fill, with a kind tag (Text / Image / Section) on its top‑right corner. Clipped items get a 28×28 ink ✓ badge. Drag a rectangle for a region. Esc exits. Pill "● Clipping · Done" at the top right, under the tray. | `K1-clip-mode.png` |
| Selection toolbar | Ink bar 10 px above the selection: [❝ Quote card] [＋ Clip] [🔗 Copy with link]. | `K2a-select-clip.png` |
| Context menu | Parent "Clipcard". Link: Copy as clipcard (`Alt+Shift+S`) · Add link to draft · Copy clean link. Page: Copy as clipcard · Start clipping (`Alt+Shift+C`) · Add page to draft. Image: Clip image · Copy as clipcard. Selection: Copy as quote card · Clip. Video: Clip this video. | `E1-context-menu.png`, `K2b-image-clip.png` |
| Video clip | On YouTube, a **Clip** button (scissors + "Clip", white 16% fill) sits in the player's right controls. On any other `<video>`, it appears top‑right on hover. Clicking it shows the range on the progress bar (Mist `#A9BCDF`, white 6×18 handles; it defaults to the 20 s around the playhead, snapped to transcript sentences when available) and a capsule above it: scissors · `01:23 – 01:41` · `18s` · [Card] [＋ Add clip]. **Card** makes a moment card (frame + caption + QR to the timestamp). **Add clip** records the range (ARCHITECTURE §13). | `Y1-video-clip.png` |
| Hover button · toolbar · welcome · settings | Unchanged from v1 (`E2`, `E4`, `O1`, `O2`), except that the hover button and the popup follow the placement rule. Settings adds: **Your mark** (upload SVG/PNG), GIF provider + key, Drafts (keep 30 days / forever), Texture on/off. | `E2…`, `O1`, `O2` |

Icons: lucide‑react, 20 px, strokeWidth 1.75 (16 px inside buttons). UI color tokens: `design/tokens.json → ui.color`. Dark mode follows `prefers-color-scheme`.

## 3. Card typography (by script)

All fonts are OFL: bundle WOFF2 subsets and lazy‑load them per script. **No italics anywhere** (cards, video, UI, landing). Emphasis is shown by weight, underline, a highlight box or color, never by slant. Keep text small next to the photo: the headline block takes ≤ 32% of the card height, and the cap height stays around 4.5–6% of the width.

| Role (Latin) | Font | Weights | Size/line at 1080 wide | Tracking |
|---|---|---|---|---|
| Newspaper serif: Split, Solid, Quote, Roundup, clip excerpts, grid bands | **Libre Caslon Text** | 400 text · 700 key phrase | Split 52/64 · Solid 62/76 · Quote 44/60 · Roundup 30/38 · band 46/56 · 16:9 44/56 | −0.5% |
| Panel sans: Header, Duotone, video panels, Roundup title | **Geist** | 300 text · 600 key phrase | Header 48/60 · Duotone 54/62 · scene 52/64 | 0 / −1.5% (Duotone) |
| Caps | **Schibsted Grotesk** | 900, uppercase | 56/58 | −1% |
| Overlay | **Schibsted Grotesk** | 800 | 56/62 | −1.5% |
| Kicker (Header, scenes) | Geist | 600 + 400 at 50% | 21/28 | 0 |
| Kicker chip · meta line | **Geist Mono** | 500 chip · 400 meta | chip 17/22 +8% · meta 16/22 +4% | caps |
| Header meta · credits · dek | Geist | 400 at 55–72% | 18–24 | 0 |
| Captions (video) | Geist | 600 | 38/48 on a white box | 0 |

Scripts other than Latin use their own designed faces (`docs/I18N.md` §2) at the same two‑weight pairing (light/regular text + semibold/bold key phrase): Bangla **Anek Bangla** 300/600 (50/66 in Header); Devanagari **Mukta** 300/600 (48/64); Urdu **Lateef** 400/700 (64/84); Arabic **Cairo** 400/700; and so on. Serif templates (Split, Solid, Quote, Roundup) use the script's own text face in those scripts. No non‑Latin script gets negative tracking or uppercase.

## 4. Cards

### 4.1 Common

| Item | Value |
|---|---|
| Formats | 4:5 1080×1350 · 1:1 1080×1080 · 9:16 1080×1920 · 16:9 1600×900 · 1.91:1 1200×628 |
| Margins | Marks, QR and meta 56 from the edges; text 60 (16:9: 48 / 56). |
| **Your mark** | The user's logo from Settings (SVG/PNG, shown white on dark), max box 120×56. Top‑left on most templates, bottom‑left on the photo in Header. No mark set → the slot stays empty. The sample "river desk." in Figma is invented. |
| Kicker | `article:section` (else the first URL path segment, title‑cased; else none). Header and scenes show "Section  Subsection" in Geist; Split, Solid and Duotone show a mono caps **chip** (Mist fill, ink text, padding 7/12). |
| Meta line | Date from `article:published_time` + outlet. Header: `Source : Outlet   \|   20 Nov 2026`. Others: mono caps `20 NOV 2026  \|  SOURCE: OUTLET`. Bangla, Hindi and other scripts use the script's font and native numerals (I18N §3). **Old‑news flag:** published more than 365 days ago → the kicker becomes the year (`2019`) in a Rose chip. It can't be turned off. |
| QR | White tile, 10 px padding, error correction M, dark modules `#0A0A0A`. 112 (Header) · 104 (other 4:5) · 92 (16:9) · 84 per story (Roundup) · 220 per source (video end card). Bottom‑right at 56; bottom‑left in RTL. |
| **Grain** | Every dark area: monotone white noise, 6–8% alpha, 1 px grain. In code: one 256 px SVG `feTurbulence` tile (baseFrequency 0.9, 2 octaves) baked to PNG once and repeated as a background at the given opacity. |
| **Gradients** | Always the smootherstep curve: alpha(t) = max · (1 − (6t⁵ − 15t⁴ + 10t³)), sampled at 17 stops. Each fade covers ≥ 35% of the photo it sits on. Max alpha by role: head shade 0.25–0.28 · foot shade 0.30–0.32 · text foot (Overlay) 0.86 · Duotone foot 0.90 (theme color) · Caps photo‑top fade 1.0 over 760 px. Grain always sits over a gradient, so it never bands. **No visible edge, ever.** |
| Halftone | Dots on a 14 px pitch, radius ≤ 0.38 × pitch, white at 6% (Solid 4.5%). They fade out with smootherstep over ≥ 380 px (seam) or across the whole quadrant (Solid). |
| Hairlines | 1 px white lines at 45°, 26 px apart, 4–5% opacity, masked to dissolve from 35% to 100% of their 900 px height (Caps only). |
| Photo echo | The card's photo blurred 90–110 px at 28–32% opacity under a 45% ink shade (Header panel, Quote, video panels). Gives every card its own tint. |
| Oversized mark | The user's mark at 520–620 px, white 3–3.5%, cropped by the panel (Header, Quote, Solid, Roundup, scenes). Only when a mark is set. |
| Photo | `object-fit: cover`. Focal point: detected face/saliency center when available (`FaceDetector` where supported), else 50% / 40%. Drag in the preview to override. |
| Fit text | Binary‑search the size between max and min (−20%) to fit the box and max lines. Use `text-wrap: balance` for Latin and `pretty` for others. Never break a grapheme cluster. Highlight boxes wrap per line (`box-decoration-break: clone`). |

### 4.2 Templates (4:5 geometry)

| Template | Build (bottom → top) | PNG |
|---|---|---|
| **Header** | Ink panel at the top (height = content + 50 ≈ 29% of H) holding: photo echo, ink 45% shade + grain, oversized mark, kicker at y 50, headline (Geist 300 text + 600 key phrase on a **Mist box**, ink text, padding 0/10, lines 6 apart) at y 96, meta 26 below it. The photo fills the rest, with a foot shade of 0.32 over 500 px. Mark bottom‑left, QR 112 bottom‑right. | `header-4x5.png` |
| **Split** | Photo 0–980 with a 0.28 head shade over 420 px. Ink panel below with grain and a halftone seam (380 px, fading down). Mark top‑left, kicker chip top‑right on the photo. Headline in Libre Caslon 400 52/64 at panel top + 44, width 940; key phrase 700 with a 3 px Mist underline at offset 10. Mono meta bottom‑left, QR 104 bottom‑right. | `split-4x5.png` |
| **Caps** | Ink ground + grain + masked hairlines (top 900). Photo from y 300 to the bottom, under a 760 px top fade (max 1.0) and a 0.30 foot shade. Mark top‑left, "Via \| Outlet" top‑right (Geist 19 at 60%). Headline Schibsted 900 caps 56/58, centered, width 980, at y 170; key words in Mist. Optional dek (Geist 24/32 at 72%, the first clause of `og:description` ≤ 60 chars; off by default). QR 104. | `caps-4x5.png` |
| **Overlay** | Full‑bleed photo, head shade 0.25 over 420 px, text foot 0.86 over 920 px with grain. Mark top‑left. Headline Schibsted 800 56/62, width 800, key phrase in Mist, bottom at H − 56 − 22 − 28. Mono meta at the bottom; QR 104. | `overlay-4x5.png` |
| **Duotone** | Theme deep ground; photo in `mix-blend-mode: luminosity` at 92%. Theme‑colored foot fade (0.90) over 62% of H, with grain. Mark, kicker chip. Headline in two weights (Geist 300 line, then Geist 600 line), key phrase in Mist. Meta; QR 104. | `duotone-4x5.png`, `duotone-1x1.png` |
| **Quote** | Ink + photo echo + shade + grain + oversized mark. Mark top‑left; "Quote  Outlet" kicker top‑right. White quote container with a 10 px Mist rule on the left, padding 46/52/46/44: quote in Libre Caslon 400 44/60 ink, attribution in Geist 21 at 55%. Vertically centered (−30). Meta; QR 104 carrying the `#:~:text=` fragment. | `quote-4x5.png` |
| **Solid** (no usable photo) | Theme deep + grain + halftone (top‑right quadrant, fading) + oversized mark. Kicker chip. Serif headline 62/76 with the key phrase, centered. Meta; QR 104. | `solid-4x5.png` |
| **Roundup** (2–4 links) | Ink + grain + oversized mark. Title "Today in / four stories" (Geist 300/600 52/60), date mono. Up to 4 rows, 230 apart: index (mono, Mist) · 150×150 thumb · Libre Caslon 700 30/38 headline + outlet mono · QR 84. Rules between rows in white 10%. | `roundup-4x5.png` |
| **Clips · Excerpts** (1–3 text clips) | B/W photo + ink 72% + grain. Up to 3 white quote containers (8 px Mist rule, Libre Caslon 400 36/48), then a small headline (Geist 600 28/36 at 75%). Mark; QR with one `text=` directive per excerpt. | `clips-excerpts-4x5.png` |
| **Clips · Grid 4 / Grid 3** (images) | Images in the top 1000 px with 8 px gutters (Grid 3: 712‑wide hero + 2 stacked). A theme‑deep band below with grain: headline in Libre Caslon 700 46/56 + QR. | `clips-grid4-4x5.png`, `clips-grid3-4x5.png` |
| **Clips · Board** (mixed) | Image 1080×560; below it a section clip (contained on white) + an excerpt cell (theme deep, Mist quote mark, Libre Caslon); band. | `clips-board-4x5.png` |

Auto choice of template: PRD §5.

### 4.3 Formats

| Format | Rules |
|---|---|
| 1:1 | 4:5 geometry with H = 1080; max lines −1. |
| 9:16 | Keep text, mark and QR out of the top 250 and bottom 340. Header: panel content starts at y 250; mark and QR sit 340 above the bottom. See `header-9x16-story.png`. |
| 16:9 | Split becomes horizontal: photo left (0–980), ink panel right (620) with a halftone seam that fades rightward over 420 px; chip, headline (44/56, width 510), meta and QR 92 inside the panel. See `split-16x9.png`. Other templates: headline width 50% of W, bottom‑left. |
| 1.91:1 | 16:9 rules scaled to 1200×628; max 3 lines. |

### 4.4 RTL (ur, ar, fa)

Mirror horizontally: mark top‑right, kicker chip top‑left, QR bottom‑left, headline and meta right‑aligned, highlight rows aligned right. URLs and digits that are part of URLs stay LTR inside `<bdi>`. Photos are not mirrored. See `split-4x5-ur-rtl.png`.

### 4.5 Color

- **Theme** (one tap; Auto picks the site's remembered theme, else Midnight): Ink `#0B0B0C`, Midnight `#14243D`, Oxblood `#6A1C27`, Forest `#1C3B30`, Petrol `#0F3B45`, Plum `#3A2341`, or a custom pick clamped to OKLCH L ≤ 0.32. The theme colors the ground of Duotone, Solid, grid bands and excerpt cells. Header, Split, Caps, Overlay, Quote and Roundup panels stay **Ink**, so the photo carries the color.
- **Text colors** (text bar): emphasis color defaults to the theme's light tone (Ink → White, Midnight → Mist `#A9BCDF`, Oxblood → Rose `#E7A7B0`, Forest → Sage `#A3CDB6`, Petrol → Aqua `#93C9D3`, Plum → Lilac `#CDB0D6`). Headline color defaults to White. Either can be set to any of these, or to a custom pick clamped to OKLCH L ≥ 0.78. Contrast: text ≥ 4.5:1 against its measured background. For Box emphasis, ink text on the box must reach ≥ 7:1.
- **Emphasis style** per template: Header = Box, Split / Solid / serif = Line (bold + underline), Caps / Overlay / Duotone = Color. The text bar can switch any card between Box, Line and Color.
- No bright, saturated or warm UI colors; the UI stays monochrome ink.

### 4.6 Video scenes (1080×1920; 4:5 and 16:9 adapt the same parts)

| Scene | Build | Auto duration | PNG |
|---|---|---|---|
| Title | Header layout (panel + highlight headline + photo/first frame). | 2.5 s | `header-9x16-story.png` |
| **Clip** | Ink panel (0–640) with photo echo, grain and oversized mark; kicker at y 268 (inside the safe area); highlight headline (Geist 52/64); meta `Source : Channel on YouTube \| 01:23 – 01:41`. Below it, the clip **fitted** at 16:9 (y 680) over a blurred echo of itself (110 px, 55%) and a 0.5 shade. Mono timecode chip top‑left on the video. **Captions** from the transcript: a white box with Geist 600 38/48 ink text, 40 px under the video, one sentence at a time. Original audio. | the trimmed range | `clip-9x16.png` |
| Excerpt | Ink + photo echo + grain + oversized mark; kicker; white quote container (Libre Caslon 46/60) centered; domain mono under it. | 14 chars/s, 3–7 s | `excerpt-9x16.png` |
| Image | Photo full‑bleed, slow push (scale 1.00 → 1.06), source line. | 3 s | (no PNG) |
| Reaction | Library item or GIF full‑bleed (cover), head and foot shades, optional typed caption in the white box. Muted. | GIF loop, clamped 1.5–3 s | `reaction-9x16.png` |
| **Sources** (always last) | Ink + grain + oversized mark; "Watch and read / the originals" (Geist 300/600 56/66); one row per source (≤ 4): QR 220 + outlet (Geist 600 40) + kind (mono, Mist: ARTICLE / YOUTUBE) + date or range. | 4 s (+1 s per source beyond 2) | `sources-9x16.png` |

Transitions: 200 ms crossfade only. No music is added. Captions are on by default when a transcript exists.

## 5. Brand

- Mark: black square, a white "photo" block, a white text line and a steel‑blue `#A9BCDF` QR dot (`brand/mark` in Figma, `design/brand/mark.svg`). Export 16/32/48/128 px PNGs for the manifest, plus the action icon with a badge variant.
- Name: **Clipcard** (cards, grids and video clips). Store title: "Clipcard – Link to Photo Card & Video Clip Maker with QR Code".
- Sample content in the designs is fictional (Delta Dispatch, নদীবার্তা, नदी समाचार, دریا نیوز). Never ship real outlet names in demos or store screenshots.
