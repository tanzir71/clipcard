# LANDING — Clipcard website (`apps/landing`)

Visuals: `design/screens/L1-landing-desktop.png` (1440) and `L2-landing-mobile.png` (390). Figma nodes `26:3` and `28:223`.

## 1. Stack & hosting

- Astro, `output: 'static'`. No client JS except two islands: **CardDemo** (renders real cards with `packages/cards` from `design/photos` sample data, so the template row is live, not screenshots) and **SendToComputer** (mobile CTA).
- Styles: plain CSS with the tokens from `design/tokens.json` (`--pc-*`). Fonts are self‑hosted; preload Geist and the hero script font only.
- Deploy target: any static host (Cloudflare Pages or GitHub Pages). Build output goes to `apps/landing/dist`.
- Budget: Lighthouse ≥ 95 on all four categories, LCP < 2.0 s on 4G, total JS < 40 KB gz.

## 2. Routes (one per language)

Wave 1 at launch: `/` (en) · `/bn/` · `/hi/` · `/ur/` (rtl) · `/id/` · `/fil/` · `/ar/` (rtl) · `/es/` · `/pt-br/` · `/sw/` · `/am/` · `/my/`. Add wave 2–3 routes as their translations are signed off (`docs/I18N.md` §1). Also `/privacy/` (+ localized) and `/404`.
Copy lives in `apps/landing/src/i18n/<lang>.json` and is short by design (≈ 30 strings). Native review is required before launch (same process as the extension).

## 3. Sections (top → bottom, minimal text)

| # | Section | Content |
|---|---|---|
| 1 | Nav (on dark) | Logo · Templates · How it works · FAQ · language switcher (globe + native name) · **Download** (pre‑store) / **Add to Chrome** (after publishing) |
| 2 | Hero (dark `#0A0A0A`) = **app shortcut** | H1 "Share the news as cards, grids and video" · sub · **paste bar** (680×60, white: link icon, "Paste any link, copied text or an image", ink **Make card**). It runs the web app flow in place: the result replaces the center card of the card row, with a small bar Copy · Download · Open in app. Under it: "Card · Grid · Video, made in your browser. Nothing is uploaded." · **paths row**: [⤓ Download for Chrome] (outline) · [✂ Clipcard · drag to bookmarks] (dashed, a real bookmarklet link) · "Open full app →" (`/app/`) · beta line · the card row bleeding off both edges. **Mobile**: paste bar (350×52) · **Install the app** (white, primary; triggers the PWA install prompt, or opens the app if installed) · iPhone hint "Share → Add to Home Screen" · **Send to my computer** (outline) · beta line. Nav adds **Web app** (first link). |
| 3 | How it works | H2 "Three ways in. No account." · 3 tiles: Share in one click · Clip and arrange · Join into a video |
| 3b | **Features** | H2 "Everything it does" · 6 tiles (384×280 visual + title + one line): One‑click cards · Clips and grids · Video clips · One video, many sources · Library and GIFs · Drafts. Then one "Also:" line (your mark · key phrase and color · captions from transcripts · old stories show their year · no account). Mobile: a list of title + line. |
| 4 | **Install** (`#install`, pre‑store only) | H2 "Install in a minute." + "Until it’s on the Chrome Web Store." · **Download .zip** (latest GitHub Release asset) + **View on GitHub** · a dark code bar "or build": `git clone … && cd share-card && pnpm i && pnpm build` with a Copy button (load `apps/extension/.output/chrome-mv3`) · 4 step tiles, each with a tiny visual: 01 Unzip (file chip) · 02 Open extensions (`chrome://extensions` pill) · 03 Developer mode (switch on) · 04 Load unpacked (button) · footnote: Edge `edge://extensions` · Brave `brave://extensions` · pin from the puzzle menu · **No‑install block** (bordered): "No install? Use the bookmark." + a draggable ink **✂ Clipcard** bookmarklet link (`<a href="javascript:…">`, built from `apps/lite/bookmarklet.ts`) + "← drag to bookmarks". On mobile, show "Add to Home Screen" instructions instead (Lite as a PWA). |
| 5 | Verifiable | H2 "Every card links back to the source." · 3 icon bullets (QR to original · trackers removed · edited headlines marked) · a card with the QR highlighted and a "Scan → original" callout |
| 6 | Templates | H2 "Six looks. Every format." (Header, Split, Caps, Overlay, Duotone, Quote) · format chips · 6 live cards (CardDemo) |
| 7 | Languages (dark) | H2 "Made for your language." · word cloud of all language names, each in its own script font, at **uniform optical size**: 24 px base (Lateef ×1.3; Tamil/Malayalam/Myanmar ×0.9), one fixed 44 px line height so rows align, 32 px horizontal / 6 px vertical gaps, max width 1040. The page's language at 100%, others at 50% white. Below it, 3 cards (bn, hi, ur). Mobile: 17 px base, 32 px line, 18/2 gaps. |
| 8 | FAQ | 5 collapsible questions (first open). Also emitted as FAQPage JSON‑LD. |
| 9 | CTA band (Midnight `#14243D`) | "Make your first clipcard." + button |
| 10 | Footer (dark) | Logo · Privacy · Terms · GitHub · **tanziro.com** · language links · "© 2026 Clipcard · Made by **tanziro.com** · Inspired by **Zibon**" (underlined links to https://tanziro.com and https://frame.zibon.design/) |

Mobile: a single column. The hero CTA becomes **Send to my computer**, because Chrome extensions don't install on phones. It uses `navigator.share({ url, title })` and falls back to copying the link, with a short "Link copied" state. The card row becomes a horizontal scroll‑snap carousel. The Install section shows the 4 steps as compact rows plus "View on GitHub".

### 3.1 Pre‑store mode

One config file, `apps/landing/src/config.ts`:

```ts
export const STORE_URL = '';  // set when the Chrome Web Store listing is live
export const REPO_URL = 'https://github.com/tanziro/share-card';            // placeholder: confirm the owner
export const ZIP_URL = `${REPO_URL}/releases/latest/download/clipcard-chrome.zip`;
```

- `STORE_URL` empty → pre‑store mode: CTAs say "Download for Chrome" and link to `ZIP_URL`, the Install section is shown, and the hero shows the beta note.
- `STORE_URL` set → CTAs say "Add to Chrome" and link to the store; the Install section and beta note are hidden (keep the `#install` anchor pointing to the store).
- Release workflow (`.github/workflows/release.yml`): on a tag `v*`, build the extension and attach `clipcard-chrome.zip` (the zipped `apps/extension/.output/chrome-mv3` folder) to the GitHub Release. The zip must unpack to a folder containing `manifest.json` at its root.
- Developer‑mode installs don't auto‑update. Show a quiet "Update available" dot in the extension's settings when the GitHub latest release is newer: check the public releases API at most once a day. That is the only network call not initiated by the user; document it in the privacy page.

### 3.2 Released features (incremental launch)

The landing page only promises what has shipped. `apps/landing/src/config.ts`:

```ts
export const RELEASED = {
  lite: false,        // R1: bookmarklet block, hero CTA "Try it now: drag the bookmark"
  cards: false,       // R1: "One‑click cards" tile, live CardDemo
  extension: false,   // R2: Install section, "Download for Chrome"
  clips: false,       // R3: "Clips and grids" tile
  drafts: false,      // R3: "Drafts" tile
  languages: false,   // R4: wave‑1 routes, language switcher
  videoClips: false,  // R5: "Video clips" tile, recording FAQ
  videoJoin: false,   // R6: "One video, many sources" tile
  gifs: false,        // R6: "Library and GIFs" tile, privacy line
  app: false,         // R1: hero paste bar works, nav "Web app", "Open full app" path
  pwa: false,         // R1: mobile "Install the app" + share target
  batch: false,       // R7: Roundup in templates
} as const;
```

- An unreleased Features tile keeps its visual but drops to 60% opacity with a quiet mono **Soon** chip (Geist Mono 11, `#F4F4F5` fill) after the title. No links or CTAs on it.
- Hero by state: **R0** H1 + sub + "Follow on GitHub" (no paste bar). **R1** the paste bar works + paths "✂ bookmark · Open full app"; mobile "Install the app". **R2+** adds "Download for Chrome" to the paths. With `STORE_URL`: "Add to Chrome" replaces Download.
- `/changelog/`: generated from `CHANGELOG.md` at build time, newest first, one block per version with the date. Linked in the footer.
- The ship checklist (`handover/ship.md`) updates `RELEASED` in the same PR that tags the release.

## 4. SEO

- `<title>` and meta description per locale (e.g. en: "Clipcard – Photo cards and video clips from any link, with QR code"; bn: "ক্লিপকার্ড – যেকোনো লিংক থেকে ফটোকার্ড ও ভিডিও ক্লিপ, QR কোডসহ").
- `hreflang` alternates for every locale + `x-default`; `<html lang dir>` per route; canonical URLs.
- Open Graph/Twitter: a 1200×630 image per locale, made **with Clipcard itself** (Split 1.91:1) and generated at build time from `packages/cards`.
- JSON‑LD: `SoftwareApplication` (applicationCategory BrowserApplication, offers price 0, operatingSystem Chrome) + `FAQPage` + `Organization`.
- `sitemap.xml` (with alternates) and `robots.txt`.
- Semantic HTML: one H1 per page; H2 per section; alt text on cards in that page's language ("Clipcard example: Overlay template").
- Keywords per market are listed in `docs/I18N.md` §6. Use them naturally in the H1/H2 and alt text, not stuffed.
- Chrome Web Store link: `STORE_URL` (see §3.1), with `?utm_source=landing&utm_medium=cta&utm_campaign=<lang>`. This is the one place UTM is allowed: our own link.

## 5. Privacy page

Plain language and short: no account, no analytics, everything stays in the browser, plus the optional permission and why it's needed.

## 6. Acceptance

- Matches L1/L2 visually. RTL routes mirror correctly.
- CardDemo renders identical pixels to the extension for the same input (shared package).
- Passes HTML validation, axe (no violations) and the Lighthouse budget above.
