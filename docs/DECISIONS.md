# DECISIONS

Newest first. Codex appends here when a spec is unclear or wrong (see AGENTS.md).

## 2026-11-20 · R2 popup references

- P1 and P2 show Grid, Video and Save for later. R2 hides those controls as specified in its handover. Copy fills the available space in the action row.
- The R2 visual comparison masks the surrounding page and includes the full popup. The measured differences after refining the text controls were 3.67% for P1 and 5.02% for P2.

## 2026-11-20 · R2 extension export

- Chromium’s offscreen document captures the rendered DOM with `modern-screenshot` and encodes the resulting canvas synchronously. Profiling showed that Chromium’s async PNG encoding added about one second when the article tab was in front.

## 2026-11-20 · R2 tab recording permission check

- Chrome for Testing 159 reported an added “Read and change all your data on all websites” install warning when a throwaway manifest declared required `tabCapture`. Using `optional_permissions` gave the same install warnings as the R2 manifest. The runtime request waited for consent in the test browser.
- Keep `tabCapture` out of R2. R5 can declare it optional and request it when the user starts recording. This avoids a required-permission upgrade before anyone uses recording. [Chrome permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)

## 2026-11-20 · R1 page metadata

- For long selections, text fragments use four leading words and up to four trailing words. The supplied fixture drops a leading “one” from the trailing phrase. The implementation follows that fixture and trims an initial determiner from the trailing phrase when present.
- URL-slug headlines use title case and preserve the original script. Numeric IDs and date segments are removed, and a domain-derived outlet name covers a missing slug.
- The card gallery uses the original photo fills exported from the referenced Figma nodes. Those files are sample content. User cards use photos from the source or local files.
- Cards created from an image or copied text alone have no QR until a source link is available. A sourced card always uses its actual cleaned URL, including a text fragment for selected quotes.

## 2026-11-20 · R0 scaffold and site

- The owner confirmed `tanzir71/clipcard` as the public repository. GitHub Pages serves the site under `/clipcard/`. The unpublished web app scaffold builds under `/clipcard/app/`; its nav link and hero paste bar stay behind `RELEASED.app`.
- R0 uses the six permissions from the scaffold handover. `unlimitedStorage` and `tabCapture` are deferred to the releases that need them.
- Toolchain: Node 24 LTS, pnpm 10, Astro 7, WXT 0.21, React 19 and TypeScript 6. The TypeScript ESLint parser and Astro checker both support TypeScript 6.
- The revised mobile mock omits the source and template sections and shows three FAQ rows. R0 keeps the sections reachable on mobile and uses the same five questions for both layouts. Mobile keeps Follow on GitHub as the primary action, with Send to my computer available underneath.
- R0 uses a social image cropped from the supplied Split card artwork. Renderer-generated social images depend on the card engine in R1.

## 2026‑11‑20 · Web app route
- The no‑install product is a **web app at `/app/`** (package `apps/lite`), linked from the landing hero (a working paste bar), the nav and "Open full app". The bookmark is the one‑click accelerator, not the only way in.
- The **phone app** is the same web app installed as a PWA with an Android share target. It moved from R7 to **R1**. The mobile landing page leads with **Install the app**.
- No server: without the bookmark or extension, a pasted URL gives a slug headline and needs a user photo. We say "made in your browser" and never promise auto‑fetch.

## 2026‑11‑20 · Release plan
- Deliver incrementally: R0 landing live → R1 Lite (no install) → R2 extension beta (zip) → R3 clips, grids, drafts → R4 languages + store submission → R5 video clips → R6 one video + GIFs → R7 batch + mobile Lite → R8 1.0. Plan: `docs/ROADMAP.md`.
- Lite ships first: it needs no store review or install, and it proves the renderer the extension reuses.
- The landing page shows only shipped features (`RELEASED` flags, **Soon** chips); every release ends with `handover/ship.md`.

## 2026‑11‑20 · Product owner + design
- **Name: Photocard → Clipcard.** The product now makes cards, grids and videos from clips. Store title: "Clipcard – Link to Photo Card & Video Clip Maker with QR Code".
- **Visual system v2**, learned from Nutshell News, Cablgram and The Noiseless News: split panels, small text with two weights and a highlighted key phrase, kicker and source lines, grain plus quiet patterns. Old templates Lower Third and Poster were removed; Header, Split, Caps and Roundup were added.
- **Typography:** Libre Caslon Text is the newspaper serif (Newsreader, Source Serif and Instrument Serif were tried and rejected). **No italics anywhere.**
- **Gradients:** smootherstep only, long and subtle; no visible edges. Halftones at ≤ 6%, fading over ≥ 380 px.
- **Autopilot:** finding is the only required step. One Auto chip for overrides. The only question is "Add a reaction?" for videos.
- **Popup placement:** every surface floats at the top right; no centered sheets, no scrim. Close is always visible.
- **Video:** recorded from the playing tab (tabCapture / getDisplayMedia). Downloading video streams is out: Chrome Web Store policy rejects YouTube downloaders.
- **GIFs:** GIPHY + KLIPY through official APIs. Tenor's API was shut down on 30 June 2026. GIPHY requires "Powered by GIPHY" attribution; its beta keys allow 100 calls/hour, so production keys are needed before launch.
- **Lite (no install):** a bookmarklet plus a top‑level Clipcard window, because iframes get partitioned storage per site.
- Footer credit: "Made by tanziro.com · Inspired by Zibon" (links to https://frame.zibon.design/).
