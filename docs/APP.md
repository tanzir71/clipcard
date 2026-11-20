# APP — the web app (`/app`) on desktop and phone

The web app is the **whole product without an install**, not a lite version. Everything the extension can make, the web app can make; the only difference is how sources get in (paste, bookmark and share menu instead of right‑click and clip mode). Desktop and phone share the components in `packages/ui`. Only the layout changes.

Visual truth: `design/webapp/W1`–`W4` (desktop, 1440×900) and `design/phone/A1`–`A8` (390×844). Figma pages "Web app (desktop)" and "Phone app (installable web app)" (node IDs in `design/figma.md`).

## 1. Feature parity

| Feature | Extension | Web app · desktop | Web app · phone |
|---|---|---|---|
| Card from a link | Right‑click → copied (M1) | Paste row + **bookmark** (one‑click) → W1 | Paste card, or **Share → Clipcard** from any app → A3 |
| Edit card: template, key phrase, text colors, theme, format, mark, texture | Popup + text bar (P1, P2) | **Inspector** (W1) | **Card editor**: Text · Look · Sources panels (A5) |
| Clips → grid | Clip mode on any site (K1) | Paste text/images/screenshots, bookmark with a selection → Grid mode | Paste, Photo, share images into Clipcard → A6 |
| Video clip from YouTube/page video | Clip button + recording (Y1) | Bookmark on the video page (moment) or "Record tab" (prompt, R7) | Share a YouTube link → moment scene; record not available |
| One video from many sources | Popup Video mode (P4) | **Timeline** + scene inspector (W2) | **Video editor** with timeline (A4) |
| Library and GIFs | P5 | **W3** (masonry, selection panel) | **A7** |
| Drafts | P6 | **W4** (grid of real thumbnails) | **A8** + Home row (A2) |
| Batch / roundup | P7 | Paste several links (one per line) → Roundup / Carousel | Same, in the paste card |
| Share | Copy, Download, platform links | Copy image, Download, Share menu, Save | **Native share sheet with the file**, Download, Save |

## 2. Desktop layout (1440 wide; min 1024)

- **Sidebar** 232: logo; **New** (ink, full width); nav Make · Drafts (count) · Library (count) · GIFs · Settings (selected row `#EDEDF0`); bottom card "One‑click from any page" with the draggable ✂ bookmark and "Get the extension →".
- **Top bar** 56 over the work area: draft title (editable) + "Saved · just now" (mono); right side **Card · Grid · Video** segmented control and the **Auto chip**.
- **Work area** (Make): the **Add source** row (820×44: link icon, "Paste a link, text or an image to add a source", chips Photo · GIF · Library); the **canvas** centered, at 520 px tall for 4:5 (scales with the window, never past 100%); below it a **template strip** (64×80 live thumbnails, Auto first and outlined).
- **Inspector** 340 on the right, scrolling, actions pinned at the bottom:
  - Card (W1): **Sources** (thumb, outlet, domain · date, QR icon; each source removable) · **Text** (headline box: click words to set the key phrase; Emphasis Box/Line/Color; Key color; Text color) · **Look** (Theme, Format, Your mark, Texture, Old‑news year) · actions **Copy image** · Download · Share · Save.
  - Video (W2): **Scene · <kind>** (source, range, Fit/Fill) · **Captions** (on/off + the transcript lines for the range, editable) · **Reaction** (3 suggestions + Skip) · **Export** (format) · **Export MP4 · duration**.
  - Grid: like Card plus **Layout** (Excerpts · Grid 3 · Grid 4 · Board) and the clip list (drag to reorder, × remove).
- **Timeline** (W2, Video mode): under the canvas, 820 wide; play/time row; scene blocks proportional to duration with thumbnails and a label; the selected scene has a 2 px ink outline and white trim handles; red 2 px playhead; drag to reorder.
- **Library · GIFs** (W3): the top bar becomes tabs Library · GIFs · This page, search (420), provider GIPHY · KLIPY; tag chips; a 5‑column masonry of looping previews; selection = 3 px ink inset + check; inspector shows the selection, "Save to Library", the attribution and **Add N to draft**.
- **Drafts** (W4): filters All · Cards · Grids · Videos and "Kept 30 days · Export"; 216×270 real thumbnails with title, meta and a mode icon; a dashed **New draft** tile.
- Keyboard: Ctrl+V anywhere adds a source; Ctrl+C copies the card; ←/→ cycle templates; Space plays the video; Delete removes the selected scene or clip.

## 3. Phone layout (390 wide)

- **Tab bar** (Home, Drafts, Library, Settings) on root screens; editors are full‑screen with a top bar (× · title + status · Auto chip) and a bottom **action bar** (primary 52 high + Download + Save, 34 px home‑indicator padding).
- **A1 Install**: the landing page's bottom sheet (icon, "Install Clipcard", "Works offline · shows in your share menu", Not now / Install; iPhone hint).
- **A2 Home**: "Clipcard" + search; **paste card** (ink: white input + Paste · Photo · GIF); **Start with** tiles Card · Grid · Video (real thumbnails, one‑line explanations); **Drafts** row (104×130 thumbnails, scrolls) + See all; a share‑menu tip.
- **A3 Shared into Clipcard**: opens straight from another app's share sheet; edge‑to‑edge preview; mode + Auto chip; a hint when no photo came with the link; **Share**.
- **A5 Card editor**: preview (300 wide on `#F4F4F5`), template strip (48×60, Auto first), panel tabs **Text · Look · Sources** with the mode switch on the right; the Text panel has the headline box (tap words for the key phrase), Box/Line/Color and the color dots; Look = theme, format, mark, texture; Sources = links and QRs.
- **A6 Grid**: layout chips; clips strip (64×64, drag to reorder, dashed +); add from Paste · Photo · GIF · Library; mode switch.
- **A4 Video editor**: dark preview; a proportional timeline with trim handles and playhead; time row; mode + Captions; **Add a reaction?** (3 GIFs + Skip); **Export · duration**.
- **A7 Library · GIFs**: Library/GIFs + GIPHY/KLIPY toggles, search, tag chips, a 2‑column masonry with multi‑select, a bottom bar with the attribution + **Add N**.
- **A8 Drafts**: big title + count, filter chips, a 2‑column grid of real thumbnails with a mode badge.
- Touch targets ≥ 44 px. Bottom sheets for menus (format, theme, share). Haptics on Copy/Share where supported.

## 4. Responsive rules

- ≥ 1024: the desktop layout. 768–1023: the sidebar collapses to icons (64), the inspector becomes a 320 drawer toggled from the top bar. < 768: the phone layout.
- The same draft opens in every layout; mode, overrides and scene order are stored on the draft.
