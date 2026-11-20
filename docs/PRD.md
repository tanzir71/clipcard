# PRD — Clipcard

## 1. Problem

In Bangladesh and similar markets (South Asia, Southeast Asia, Africa, the Arab world, Latin America), news spreads on Facebook and WhatsApp as **photo cards**: a photo, a bold headline and an outlet name in one image. They travel well, but they are slow to make and easy to fake. Fact‑checkers in Bangladesh debunked hundreds of fake clipcards that copy real outlets' look in the run‑up to the 2026 election.

Clipcard turns what you find (links, quotes, images, charts, video moments) into a good‑looking card or video **automatically**, and every card carries a **QR code to the original article**, so anyone can check the source.

## 2. Users

- **Sharers**: people who post news and links to Facebook, WhatsApp, X, LinkedIn and Threads, mostly on desktop Chrome or Edge.
- **Small newsrooms, page admins and creators** who make cards daily without a designer.
- **Fact‑conscious readers**: they scan the QR to verify.

## 3. Principles

1. **Find, then share.** Finding is the only required step; everything else is automatic, with manual overrides when needed.
2. Minimal text on cards and in the UI.
3. Photo first; vivid but cool; square.
4. Fonts designed for each script.
5. Verifiable by construction (clean canonical URL in the QR, edited headlines tracked).
6. Local‑only and private.

## 4. Core flows

**One idea runs through every flow: the user only has to find things.** Right‑click, clip, select or mark a range, and Clipcard prepares the share. The only question it may ask is at the very end ("Add a reaction?" for videos). Everything else is automatic (§5), with manual overrides behind the Auto chip.

The same **popup** (top right, under the toolbar icon) serves every workflow and switches mode without losing work: **Card · Grid · Video** (`design/screens/P1`–`P4`). Everything the user finds goes into the **current draft** automatically, so nothing is lost and work can be finished later (F9).

### F1 — One‑click card · `M1-one-click-copied.png`
1. Right‑click any link, page or selection → **Clipcard › Copy as clipcard** (`Alt+Shift+S`).
2. The card renders with the auto template and format (§5).
3. The PNG goes to the clipboard. A toast appears at the top right: ✓ Copied · [Share] [Edit] [×], plus **Copy link for the comment**.
- Acceptance: ≤ 1.2 s p50 from click to toast and ≤ 2.5 s p95. Wrapped links resolve (`fixtures/urls.json`). If the clipboard write fails, the toast shows one **Copy** button. No image → Solid.

### F2 — Popup (review and override) · `P1-quick-share.png`, `P2-text-bar.png`
Opens from the toast's Edit, the toolbar icon, the shortcut, or **Card** in the clip tray.
- The preview is edge to edge with no chrome. Hover shows ‹ › to cycle templates. Click the headline to open the **text bar**: click words to pick the key phrase; choose the emphasis style (Box · Line · Color), emphasis color and headline color.
- **Auto chip** ("Auto · 4:5 for Facebook") opens overrides: theme, format, template, your mark on/off.
- Copy · Save for later · Share (Download PNG, Facebook, WhatsApp, X, LinkedIn, Threads, More…). Close: × on the preview (always visible) or Esc.

### F3 — Entry points · `E1`–`E5`, `K2a`, `K2b`
Context menu (links, page, images, selection, video), hover button on link previews and videos, selection toolbar ([Quote card] [+ Clip] [Copy with link]), toolbar icon + `Alt+Shift+S`, and paste a link.

### F4 — First run & settings · `O1`, `O2`
As v1, plus: **Your mark** (upload), GIF provider (GIPHY · KLIPY · Off), Drafts retention (30 days / forever), Texture (on by default).

### F5 — Clips → grid · `K1-clip-mode.png`, `P3-grid.png`
- **Start clipping** (`Alt+Shift+C`, page menu, or the selection toolbar's **+ Clip**). Hover outlines the element under the cursor (Text / Image / Section); click adds it to the draft; drag draws a region. Esc or **Done** exits.
- Text clips: 1–280 characters each, ≤ 3 per excerpt card. Images: ≤ 6. A mixed grid holds ≤ 4 cells.
- The tray (top right) counts clips and sources: [Card] [Video →].
- Card from clips: same‑source clips make one card with one QR (`text=` directives for excerpts). Clips from different sources make one cell per source, each with its own small QR (Roundup rules).
- Layout is automatic: text only → Excerpts; 3–4 images → Grid 3/4; mixed → Board. ‹ › cycles them, cells drag to reorder, × removes.

### F6 — Video clips · `Y1-video-clip.png`
- On YouTube, a **Clip** button sits in the player controls. On any page `<video>`, it appears on hover; there is also a "Clip this video" context menu.
- Clicking it selects a range around the playhead (20 s by default, snapped to transcript sentences when captions exist). Drag the handles to adjust.
- **Card** → a moment card: the video frame + a caption line + a QR to `youtu.be/ID?t=83` (or the page URL + `#t=`). **Add clip** → recorded from the playing tab in real time (ARCHITECTURE §13) and added to the draft with its source, channel, range and transcript lines.
- Limits: ≤ 60 s per clip, ≤ 3 min per video. DRM‑protected players (EME) can't be recorded: show "This player can't be recorded" and offer the moment card instead.
- **We never download video files or streams**: Chrome Web Store policy rejects YouTube downloaders, and recording the visible tab is the allowed path. Never say "download YouTube" anywhere (UI, listing, landing).

### F7 — One video from many sources · `P4-video.png`, `design/scenes/*`
- **Video →** in the tray, or the Video mode in the popup. Clips, excerpts, images and library items from any number of pages become scenes: **Title (auto) → clips/excerpts/images in the order found → Sources (auto, always last)**.
- Automatic: scene durations (DESIGN §4.6), captions from transcripts, 9:16 for Reels/Shorts/TikTok (4:5 or 16:9 by destination, §5), theme, headline and key phrase (from the first source).
- The only question: **"Add a reaction?"** with 3 suggested GIFs (Library tags first, then a GIF search on the headline's keywords) + Skip. Picking one inserts it as a Reaction scene after the clip it fits best (after the first clip by default).
- Export renders on the device (MP4, H.264 + AAC, 1080×1920, 30 fps) with progress in the primary button. Then Download, or Share (`navigator.share` with files where supported).

### F8 — Library and GIFs · `P5-library-gifs.png`
- **Library**: images, GIFs and video clips the user saved ("Save to library" on any image or clip, drag‑and‑drop files into the popup, or a star on any tray item). Tags (auto‑suggested from page title and alt text, editable), search, favorites. Each item keeps its source URL and date.
- **GIFs**: search GIPHY or KLIPY inside the popup (official APIs only; Tenor's API was shut down on 30 June 2026). Results loop as MP4. Picked GIFs can be saved to the Library. The required "Powered by GIPHY" attribution shows while GIPHY results are shown.
- **This page**: images and videos detected on the current page.

### F9 — Drafts (save now, post later) · `P6-drafts.png`
- Everything found goes into the **current draft** automatically. A new draft starts after 6 hours idle or from **＋ New**. **Save for later** names the draft (first headline) and closes the popup.
- The toolbar popup lists drafts (title, clip count, source count, age, output mode). Opening one restores mode, layout, overrides and scene order exactly. Add more sources from other pages and days with "Add page to draft" or by clipping while the draft is open.
- Drafts live on the device (ARCHITECTURE §14). Retention: 30 days by default (Settings: forever); the media is kept with the draft.

### F10 — Batch from many links · `P7-batch-links.png`
- **Drag‑select over links** on any page (e.g. a news homepage), **Cards from open tabs** (pick tabs), or **paste a list** of URLs.
- Output, picked automatically: 2–4 links → **Roundup** card; 5–10 → **Carousel** (one card per link, same theme, numbered `1/6` in the meta line, downloaded as a zip or copied one by one); any video link → **Digest video** (one Title/Clip scene per link + Sources).
- Every story keeps its own QR.

### F11 — Your mark
Settings → upload SVG/PNG. It's placed on every card and video (DESIGN §4.1) and used as the oversized pattern. Without a mark, no slot or pattern is shown.

### F12 — Lite: no install, just a bookmark · `P8-lite-bookmark.png`
- On the landing page, the user drags **✂ Clipcard** to the bookmarks bar. Clicking it on any page reads the page (title, image, canonical URL, date, outlet, the selected text, and the playing video's time and frame) and opens a small **Clipcard window** with the same popup (Card · Grid · Video, Auto chip, Copy · Save · Share).
- Drafts, the Library and the GIF cache live in the Clipcard site's browser storage (IndexedDB + OPFS). They're shared across every site where the bookmark is used, in that browser.
- Clicking the bookmark again adds the current page (or the selection) to the open draft. A second click on a video page adds a **moment** (frame + timestamp QR).
- Not in Lite (extension only): right‑click menus, the hover button, the selection toolbar, clip mode, one‑click copy without a window, video recording. Lite can record a clip only after the browser's "Share this tab" prompt (`getDisplayMedia`), every time.
- Cross‑origin images that can't be read become Solid, with "Paste or drop a photo" (Ctrl+V works in the window).
- Mobile: Lite installs as a PWA; on Android it's a **share target** (share a link to Clipcard → card from the title; paste or pick a photo).

## 5. Automatic decisions (overridable)

| Decision | Rule |
|---|---|
| Output | 1 link → Card · clips from one or more pages without video → Grid · any video clip → Video · ≥ 2 links via batch → Roundup / Carousel / Digest (F10). |
| Template | No usable image (< 600 px) → Solid · created from a selection → Quote · person/portrait photo (face box > 8% of the image) → Overlay · headline > 90 chars → Split · otherwise **Header**. Sites remember the last manual choice (eTLD+1). |
| Key phrase | Latin: from the start of the headline up to the first comma, colon, " says" or a preposition after the main verb (in, at, on, with, after, amid, over, for), 3–9 words, ≤ 60% of the headline. Caps: the two strongest noun phrases (proper nouns first). Quoted headlines: the quote up to its first clause. Other scripts: the clause before the first comma or "—"; none if unclear. The user can always click words to change it. |
| Format | By destination: the most recently focused social tab or the referrer. facebook.com / instagram.com → 4:5 · x.com / linkedin.com → 16:9 (1.91:1 for link‑preview style) · whatsapp status, tiktok, shorts, reels → 9:16 · unknown → 4:5. Video defaults to 9:16. |
| Theme | Site memory, else Midnight. Emphasis color = the theme's light tone. |
| Video | Range snaps to transcript sentences; captions on when a transcript exists; scene durations per DESIGN §4.6; Sources scene always last. |
| Date / old news | `article:published_time`; > 365 days → the year chip (not overridable). |

Contrast guard: any text color must reach 4.5:1 against its measured background (7:1 for ink on a highlight box). Otherwise the automatic choice falls back to White on a stronger shade, and manual picks are disabled with a tooltip.

## 6. Templates & formats

Templates: **Header** (auto default), **Split**, **Caps**, **Overlay**, **Duotone**, **Quote**, **Solid** (no photo), **Roundup** (batch); clip layouts **Excerpts**, **Grid 3**, **Grid 4**, **Board**. Video scenes: Title, Clip, Excerpt, Image, Reaction, Sources.
Formats: 4:5 1080×1350, 1:1, 9:16 1080×1920, 16:9 1600×900, 1.91:1 1200×628.
Colors: theme (Ink, Midnight, Oxblood, Forest, Petrol, Plum, custom) + text colors (DESIGN §4.5). Remembered per site.

## 7. Languages

Prioritized for markets where misinformation spreads fastest as shared images. **Every script renders correctly on cards at launch** (30 languages). UI translations ship in waves:
- **Wave 1:** English, Bangla, Hindi, Urdu, Indonesian, Filipino, Arabic, Spanish, Brazilian Portuguese, Swahili, Amharic, Burmese.
- **Wave 2:** Nepali, Tamil, Telugu, Marathi, Malayalam, Kannada, Gujarati, Punjabi, Sinhala, Hausa, Yoruba.
- **Wave 3:** French, Persian, Ukrainian, Vietnamese, Thai, Malay, Odia.

The card language follows the article (detected automatically); the UI language is chosen in settings. See `docs/I18N.md`.

## 8. Out of scope (v1)

Accounts, cloud sync, scheduled posting, link shorteners, analytics, AI rewriting, music, downloading video files or streams, mobile extension (the landing page's "Send to my computer" covers mobile visitors).

## 9. Success metrics (local, opt‑in only if added later)

Time to first copy, share‑menu use, % of cards edited, fallback rate (Solid / no‑permission).
