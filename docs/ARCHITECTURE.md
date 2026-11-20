# ARCHITECTURE — Clipcard

## 1. Monorepo

```
apps/extension   WXT (MV3) + React + TS
apps/landing     Astro (static) + i18n routes
packages/core    URL unwrap/clean · metadata extraction · script detection · types   (no UI)
packages/cards   Templates (React) · fit-text · palette · QR · renderCard() → PNG Blob
packages/i18n    messages/<locale>.json · font map · numerals · rtl helpers · chrome _locales generator
```

`packages/cards` is shared: the extension renders real cards with it, and the landing page uses it for a live demo built from the sample data in `design/photos`.

## 2. Extension contexts

| Context | Responsibilities |
|---|---|
| **Service worker** (`background.ts`) | Context menus, command (`Alt+Shift+S`), toolbar action, badge, permission checks, orchestration, history (IndexedDB via `idb`), per‑site prefs (`chrome.storage.local`). |
| **Offscreen document** (`offscreen.html`, reasons `DOM_PARSER` + `BLOBS`) | Fetch article HTML and images (needs host permission), parse with `DOMParser`, compute the palette, load fonts, render the card DOM, `domToBlob` → PNG. Closed after 60 s idle. |
| **Injected script** (via `chrome.scripting.executeScript`, using `activeTab`) | Reads the live DOM: the current page's metadata, or the right‑clicked link's preview data. Writes the PNG to the clipboard. Shows the toast (shadow DOM). Mounts the quick‑sheet iframe. |
| **Quick sheet** (`sheet.html`, an extension page in an iframe inside the page's shadow root) | Edit UI: card preview with template arrows, color swatches, format chip, Copy, and Share (Download lives in Share). Talks to the service worker over `chrome.runtime` ports. |
| **Persistent content script** (registered dynamically only after the optional permission is granted) | Hover button (E2), selection toolbar (E3), page‑is‑article badge signal. |
| **Pages** | `welcome.html` (O1), `options.html` (O2), `popup-fallback.html` (sheet in a popup window where injection is impossible: Chrome Web Store, `chrome://`, PDF viewer). |

## 3. Permissions

Install‑time (no scary warning): `contextMenus`, `storage`, `unlimitedStorage`, `offscreen`, `clipboardWrite`, `activeTab`, `scripting`, `tabCapture` (see §13 for its warning check).
Optional: `optional_host_permissions: ["<all_urls>"]`, requested on the welcome page ("Read links you choose") or the first time it's needed. It enables:
- fetching linked articles and their images across origins;
- the hover button and selection toolbar (dynamic content scripts).

Without it, a card can still be made **from the current page** (activeTab). If the image is cross‑origin and can't be read, the card falls back to **Solid**. The toast then offers a one‑time "Allow photos" action.

## 4. One‑click pipeline (F1)

```
contextMenus.onClicked(info, tab)
  └─ SW: target = info.linkUrl ?? info.pageUrl ; selection = info.selectionText
     ├─ executeScript(tab, frameId) → collectHints(target)          # optimistic data from the DOM
     │     · current page → extractFromDocument(document)
     │     · link → find a[href] matching target (also matching unwrapped/cleaned forms),
     │       walk up ≤ 6 ancestors for the preview card: largest <img> (src/srcset/currentSrc), heading text
     ├─ core.resolveUrl(target)        # unwrap wrappers → follow redirects (fetch, redirect:'follow', 5 s) → clean
     ├─ offscreen: fetchArticle(url)   # credentials:'omit', 8 s timeout, ≤ 2 MB, text/html only
     │     → core.extract(doc, finalUrl) → merge(hints, extracted)   # extracted wins, except image when hints has larger
     ├─ offscreen: loadImage(best) → blob URL (no taint) → palette → focal point
     ├─ offscreen: renderCard(model, prefs.format, prefs.template)  → PNG Blob
     ├─ SW → tab: { png: base64, meta }   # chrome.tabs.sendMessage
     └─ injected: navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
           ok   → toast "Copied"
           fail → toast with [Copy] (user gesture) → retry write
```

Timeouts: if the article fetch fails or takes longer than 8 s, render from the hints; with no image, use **Solid**. Record `fallback: true` in history.

The clipboard is written from the page (injected script), never the service worker. Chrome grants `clipboard-write` to the focused active tab, and the page regains focus when the context menu closes.

## 5. Metadata extraction (`packages/core/extract.ts`)

Input: a `Document` and its final URL. Output: `CardSource`.

| Field | Priority |
|---|---|
| `canonicalUrl` | `link[rel=canonical]` → `og:url` → final URL. Then `cleanUrl()`. AMP pages (`/amp/`, `?amp=1`, `*.ampproject.org/c/s/…`, `google.com/amp/s/…`) → canonical. |
| `title` | `og:title` → `twitter:title` → JSON‑LD `headline` (NewsArticle/Article/BlogPosting) → `<title>`. Clean it: decode entities, collapse whitespace, strip a site suffix/prefix (`" | X"`, `" - X"`, `" – X"`, `" — X"`, `"X: "`) when X fuzzy‑matches `siteName` or the hostname; max 140 chars. |
| `image` | `og:image:secure_url` → `og:image` → `twitter:image` → JSON‑LD `image` (string/array/ImageObject; take the largest) → the largest `<img>` inside `article`/`main` with a natural width ≥ 600. Resolve relative URLs and reject SVG, GIF and data URIs < 10 KB. |
| `siteName` | `og:site_name` → JSON‑LD `publisher.name` → `application-name` → prettified hostname (strip `www.`, title‑case the first label). |
| `favicon` | Largest `apple-touch-icon` → largest `icon` with sizes → `/favicon.ico`. If unavailable, a monogram tile (first grapheme of `siteName`, white on `#0A0A0A`). |
| `lang`, `dir` | `<html lang>` → `og:locale` → `detectScript(title)`. `dir` from `<html dir>`, or from the script (Arabic → rtl). |
| `description` | `og:description` → `meta[name=description]`. Not shown on the card; used in the share caption fallback. |
| `publishedAt` | `article:published_time` → JSON‑LD `datePublished`. History only. |
| `themeColor` | `meta[name=theme-color]`. Stored only; not used on cards. |
| `script` | `detectScript(title)`: `latin`, `bengali`, `devanagari`, `arabic`, `tamil`, `sinhala` or `myanmar`. Without `<html lang>`, a Latin title gives `lang = "en"`. |
| `isArticle` | `og:type=article`, or a JSON‑LD Article/NewsArticle/BlogPosting, or an `<article>` element containing an `<h1>`. Drives the toolbar badge and the selection toolbar. |

Script detection (`detectScript`): count code points by Unicode block (Bengali U+0980–09FF, Devanagari U+0900–097F, Arabic U+0600–06FF/0750–077F/FB50–FDFF/FE70–FEFF, Tamil U+0B80–0BFF, Sinhala U+0D80–0DFF, Myanmar U+1000–109F) and take the majority script. Within Arabic script, Urdu‑specific letters (ٹ ڈ ڑ ں ے ۂ ھ) → `ur`, otherwise `ar`. Devanagari defaults to `hi` unless `lang` says `ne`/`mr`.

Fixtures: `fixtures/pages/*.html` → `fixtures/expected/*.json`. Tests must pass exactly (ignore key order).

## 6. URL handling (`packages/core/url.ts`)

`resolveUrl(input) = clean(followRedirects(unwrap(input)))`

- **unwrap** (no network): `l.facebook.com/l.php?u=`, `lm.facebook.com/l.php?u=`, `l.instagram.com/?u=`, `www.google.com/url?q=|url=`, `out.reddit.com/…?url=`, `www.youtube.com/redirect?q=`, `l.messenger.com/l.php?u=`, `href.li/?`, `link.medium.com` (needs network), `slack-redir.net/link?url=`. Decode repeatedly until stable (max 3).
- **follow** (network, `<all_urls>` needed): `t.co`, `lnkd.in`, `bit.ly`, `ow.ly`, `buff.ly`, `news.google.com/rss/articles/…`, `fb.me`, `youtu.be` (no fetch needed: map to `youtube.com/watch?v=`).
- **clean**: remove `utm_*`, `fbclid`, `gclid`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `yclid`, `twclid`, `ttclid`, `igshid`, `igsh`, `mc_cid`, `mc_eid`, `ref_src`, `ref_url`, `_ga`, `_gl`, `mkt_tok`, `li_fat_id`, `oly_anon_id`, `oly_enc_id`, `vero_id`, `rb_clickid`, `s_cid`, `cmpid`, `ocid`, `si` (on youtube.com, youtu.be, open.spotify.com), `feature=share` (YouTube), `s` and `t` (on x.com/twitter.com status URLs only). Keep `v`, `t` (YouTube timestamp), `id`, `p`, `page` and every other parameter. Drop an empty `?`, lowercase the host, drop default ports, keep the trailing slash as found, remove `#` fragments except `#:~:text=` produced by us.
- **text fragment** (Quote): `#:~:text=` + `encodeURIComponent(start)`; if the selection is > 80 chars, use `start,end` with the first and last 4 words each. Escape `-`, `,` and `&` per spec.

Test table: `fixtures/urls.json`.

## 7. Rendering (`packages/cards`)

- `renderCard(model: CardModel, opts: { format, template, color: { deep, light }, lang, dir }) → Promise<Blob>`.
- Templates are React components that render at true pixel size in an offscreen container (`position: fixed; left: -99999px`), with fonts preloaded via `FontFace` (`await document.fonts.ready`).
- Export: `modern-screenshot` `domToBlob(node, { width, height, scale: 1, type: 'image/png', font: { preferredFormat: 'woff2' } })`. Avoid `backdrop-filter` in templates (not captured). `mix-blend-mode: multiply` (Duotone) and CSS `filter` are fine; verify them in snapshot tests.
- Images are always blob URLs fetched by the extension (never cross‑origin `<img>`), so the canvas is never tainted.
- Photo luminance: downscale to 48×48 to measure the luminance under the headline box for scrim strength. Color is never auto‑picked from photos (that gives garish results); the user chooses from the presets.
- QR: encode `model.qrUrl` at EC level M → SVG `<path>` (one path), crisp edges.
- Fit text: measure with the real DOM (offscreen container) using binary search over font size (step 2 px). Cache by `(text, font, width)`.
- Determinism: same model + options → identical PNG bytes (no `Date.now()` in templates).
- Output file name: `clipcard-<domain>-<slug-6-words>-<format>.png`.

## 8. Quick sheet

- Mount: the injected script creates `<clipcard-root>` with a closed shadow root containing a full‑viewport scrim plus an iframe `chrome-extension://…/sheet.html?id=<cardId>`. The iframe gets focus; Esc closes it; the page scroll is locked while open.
- State: `{ cardId, source, edits: { headline?, imageId?, focal?, zoom?, highlight?[] }, template, format, color }`. Every change re‑renders the preview as live DOM (not PNG) for speed. **Copy** exports the PNG and writes the clipboard from the sheet (it is focused, so it has a user gesture).
- Inline headline edit: `contenteditable` on the preview's headline. Enter commits, Esc reverts. Show the "Edited · Reset" affordance only after an edit.
- Keyboard: ←/→ templates, 1–4 formats, Ctrl/Cmd+C copy, Ctrl/Cmd+S download, Esc close.
- Color: `color` is a preset key or a custom hex. Templates receive `{ deep, light }` (`DESIGN.md` §4.5). Duotone is CSS‑only (`mix-blend-mode: luminosity` over the color); verify that modern‑screenshot captures it in the snapshot tests.

## 9. Share intents

Each share action first writes the PNG to the clipboard, then opens a new tab:

| Target | URL |
|---|---|
| Facebook | `https://www.facebook.com/` (paste into the composer) |
| WhatsApp | `https://web.whatsapp.com/` |
| X | `https://x.com/intent/post?text={caption}` |
| LinkedIn | `https://www.linkedin.com/feed/?shareActive=true&text={caption}` |
| Threads | `https://www.threads.net/intent/post?text={caption}` |
| More… | `navigator.share({ files: [png], text: caption })` where `canShare` (Windows, ChromeOS, macOS); hidden otherwise |

`caption = headline + "\n" + cleanUrl`. Verify the intent URLs at implementation time and keep them in one config file.

## 10. Storage

- `chrome.storage.local`: `prefs` (language, numerals, default format, template and color, quick‑access modes, QR on, markEdited, handle), `sitePrefs[eTLD+1] = { format, template, color }`.
- IndexedDB `clipcard` → store `cards` (the last 30): `{ id, url, source, edits, template, format, createdAt, thumb (webp 120×150) }`.
- Nothing leaves the device. One exception, only in developer‑mode builds: a once‑a‑day check of the public GitHub Releases API for a newer version (no identifiers sent).

## 11. Cross‑browser

Chrome and Edge first. Firefox (later milestone): replace the offscreen document with the background page's DOM, and `contextMenus` with `menus` (WXT handles most of this). Safari: out of scope.

## 12. Drafts and clips (storage)

- **IndexedDB** (`clipcard` DB, via `idb`): `drafts` (id, title, createdAt, updatedAt, mode, overrides, order[]), `clips` (id, draftId, kind: link | text | image | section | video | library | gif, sourceUrl (canonical), outlet, publishedAt, title, text, range {start,end}, transcript[], textFragment, rect, mediaKey, createdAt), `library` (id, kind, tags[], favorite, sourceUrl, savedAt, mediaKey), `prefs`.
- **OPFS** (`navigator.storage.getDirectory()`): media blobs keyed by `mediaKey` (PNG/WebP stills, WebM/MP4 clips, GIF→MP4). Call `navigator.storage.persist()` the first time the Library or a video clip is saved. Show used space in Settings.
- The current draft is `prefs.currentDraftId`. Every find action (clip, add link, record, save GIF) appends to it. A new draft starts after 6 h idle. Retention sweep runs on startup (30 days default).
- Export/import: Settings → "Export library" writes a `.zip` (JSON + media); import merges by id.

## 13. Video capture (store‑safe)

- **Never fetch video streams or files.** Clips are recorded from what is playing in the tab, in real time: `chrome.tabCapture.getMediaStreamId({ targetTabId })` from the service worker on the user's click, then `getUserMedia({ video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId } }, audio: … })` in the **offscreen document** (reason `USER_MEDIA`). Audio keeps playing for the user (route it back through an `AudioContext`).
- Before recording, the content script scrolls the `<video>` into view and applies a temporary **clean‑capture style** (the video element `position: fixed; inset: 0; object-fit: contain; z-index: max`, page chrome hidden, player controls hidden). It seeks to `start`, plays to `end`, then restores everything. A pill "Recording 0:07 / 0:18 · Stop" shows at the top right (outside the captured region via the clean style).
- Crop: frames are drawn to an `OffscreenCanvas` using the element rect × `devicePixelRatio`, then encoded with **WebCodecs** (`VideoEncoder` H.264, `AudioEncoder` AAC) and muxed with `mp4-muxer`. Fallback: `MediaRecorder` WebM.
- Transcript: on YouTube, read the caption track the player already loaded (the transcript panel or the `timedtext` response the page requested); never call private APIs with keys. Elsewhere, use `<track>` elements when present.
- DRM (EME) players capture black frames: detect it (sample frame luminance + `video.mediaKeys`) and refuse with the moment‑card fallback.
- Permission: `tabCapture` is added to the manifest (it's needed on a user gesture). Check its install warning during M12. If it adds a warning, request it as an optional permission at the first **Add clip** where Chrome allows that, and record the result in `docs/DECISIONS.md`. Firefox has no tabCapture: moment cards only.
- Store listing language: "record a clip of what's playing, with a link to the moment". Never "download".

## 14. Video render

- One `renderScene(scene, t)` per scene type (DESIGN §4.6), drawn to an `OffscreenCanvas` 1080×1920 at 30 fps, reusing `packages/cards` layout code (the scene components are React → canvas via the same layout engine: precomputed text layout from DOM measurement, then canvas draws).
- Clip scenes decode the recorded MP4 with `VideoDecoder` and composite it (fit + blurred echo).
- GIF/MP4 reactions: use the provider's MP4 rendition; decode and loop.
- Captions: transcript cues clipped to the range; one cue at a time; box per DESIGN.
- Audio: clip audio only, with 150 ms fades at scene edges; other scenes are silent.
- Encode H.264 High / AAC 128 kbps; target ≤ 20 MB for 60 s. Progress → the popup's primary button. The worker runs in the offscreen document; the service worker keeps it alive with a port.

## 15. Library and GIF providers

- Providers: **GIPHY** (`api.giphy.com/v1/gifs/search`, `/trending`) and **KLIPY** (`api.klipy.com`). **Tenor is not supported** (its API was shut down on 30 June 2026).
- Keys: ship with the project's production keys once approved. Until then, a field in Settings lets users paste their own key (GIPHY beta keys allow 100 calls/hour). Never commit keys: inject them at build time from `.env` (`VITE_GIPHY_KEY`, `VITE_KLIPY_KEY`).
- Requests only happen when the user opens the GIFs tab or the Reaction step. Debounce search by 300 ms, cache results for 24 h in IndexedDB, and send `rating=pg-13` plus the UI language.
- Optional host permissions requested at first use: `https://api.giphy.com/*`, `https://media*.giphy.com/*`, `https://api.klipy.com/*`, `https://*.klipy.com/*`.
- Attribution: show "Powered by GIPHY" (their mark, per their terms) whenever GIPHY results show, and keep the provider and source URL on saved items.
- Suggestions for "Add a reaction?": tags from the Library that match headline keywords first, then a provider search on 1–2 keywords from the key phrase.
- **Privacy note** (update the privacy page and the store's data disclosure): GIF search terms go to the chosen provider. This is the only network call that isn't the user's own page or article.

## 16. Batch

- Drag‑select over links: a content script draws the marquee, collects `<a href>` elements inside it, dedupes by canonical URL, and drops nav and footer links (role=navigation, `<nav>`, `<footer>`, or links shorter than 20 characters of text).
- Open tabs: `chrome.tabs.query({ currentWindow: true })`. Tab `url` and `title` are only visible for sites Clipcard has host permission for, so this uses the optional `<all_urls>` permission from F4. Don't add the `tabs` permission. Without it, offer "current tab only".
- Each link goes through the F1 pipeline in parallel (max 4 at a time) in the offscreen document.
- Carousel export: numbered PNGs, zipped with `fflate`; Copy puts card 1 on the clipboard and shows "Copy next (2/6)".

## 17. Text emphasis and contrast

- Key phrase detection: `packages/core/keyphrase.ts` (rules in PRD §5), unit tested on `fixtures/headlines.json`.
- Contrast: sample the photo luminance under the text box (downscaled canvas, 95th percentile) and compute WCAG contrast. If it fails, raise the shade toward its max, then fall back to White.

## 18. Web app (`/app`), bookmark and phone app

- `apps/lite` (package `@clipcard/lite`) builds the web app with Vite `base: '/app/'`. It's deployed with the landing page at `<site>/app/`, reusing `packages/core`, `packages/cards`, `packages/ui` and the storage layer.
- **Inputs**: (1) paste events: `text/uri-list` / `text/plain` URL → `cleanUrl` + `slugHeadline(url)` (hyphen/underscore split, stop‑word aware, title case per script; ids and dates dropped); `text/html` → parse it with `DOMParser` in a sandboxed document, take the first `h1`/`h2`/`strong` as the headline and the first `img[src]` as the image candidate; `image/*` → the photo. (2) drop and the file picker. (3) `?url=&title=&text=` from the share target or the hero. (4) `postMessage` from the bookmark (below).
- Images are loaded with `fetch(url, { mode: 'cors' })`. If that fails, show "Add a photo" (never a server proxy). YouTube: `https://i.ytimg.com/vi/<id>/hqdefault.jpg` when CORS allows (verify; otherwise the user adds a frame).
- **Bookmark** (`apps/lite/bookmarklet.ts` → a `javascript:` URL under 4 KB, no external loads): reads the page (og/article meta, canonical, title, favicon, selection, image candidates, the playing video's time and frame), then `window.open('<site>/app/?from=bookmark', 'clipcard', 'popup,width=420,height=760')` and `postMessage(payload, '<site origin>')` after `ready`. It reuses the named window. Why a window, not an iframe: Chrome partitions iframe storage per top‑level site, but a top‑level window on our origin keeps one store. Validate origin and schema (zod) and cap field lengths.
- **PWA**: `manifest.webmanifest` (name Clipcard, `display: standalone`, `start_url: /app/`, `scope: /app/`, theme ink, maskable icons from the brand mark). A service worker (Workbox) precaches the app shell, fonts and templates so it works offline (GIF search needs a network). `share_target`: `action: /app/share`, `method: POST`, `enctype: multipart/form-data`, params `title`, `text`, `url`, `files` (image/*, video/mp4). The service worker turns the POST into a draft entry and redirects to `/app/?draft=<id>`. iOS has no share target and no install prompt: show the Add to Home Screen hint.
- **Install prompt** on the landing page (mobile): capture `beforeinstallprompt` (Chromium) and call `prompt()` from the **Install the app** button. When it isn't available (iOS, already installed), show the hint or "Open the app".
- Clipboard: `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` on Copy. Share: `navigator.share({ files })` where `canShare` allows it (phones), else Download.
- Recording (optional, R7): `getDisplayMedia({ video: { displaySurface: 'browser' }, preferCurrentTab: true, audio: true })` after a click; same policy as §13.
- The web app and the extension keep separate storage (different origins). Settings in both offer Export/Import of drafts and the Library (zip, §12) to move work between them.
