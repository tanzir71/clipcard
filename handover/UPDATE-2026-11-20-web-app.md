# Change note · 2026‑11‑20 · Web app route, hero app shortcut, phone app

**For Codex, mid‑flight.** Read this, then continue the current release. It doesn't undo any work: the scaffold, `apps/lite` and the landing structure stay. It changes **where the no‑install product lives, how the landing page reaches it, and when the phone app ships**.

## What changed

1. **The no‑install product is a web app at `/app/`.** It's usable on its own, not just through the bookmark. The `apps/lite` package keeps its name; set its Vite `base` to `/app/` and deploy it at `<site>/app/` (e.g. `https://tanzir71.github.io/clipcard/app/`). The bookmark opens the same page. Visual truth: `design/screens/P9-web-app.png`; the bookmark window is `P8-lite-bookmark.png`.
2. **Paste works without the bookmark** (PRD F12, ARCH §18): paste a URL, copied article text/HTML, or an image (Ctrl+V, drop, or the Photo button). The web app can't read other sites by itself, so: URL only → headline from the URL slug + Solid or a user photo; copied HTML → headline + image from the clipboard; the bookmark → full one‑click reading.
3. **The landing hero is now a shortcut to the app** (LANDING §3 row 2, `L1`/`L2`): a paste bar with **Make card** that works in place (the result renders in the hero card row with Copy · Download · Open in app), then the paths: **Download for Chrome · drag the ✂ Clipcard bookmark · Open full app**. The nav gets **Web app**. On phones the primary button is **Install the app** (PWA prompt; iPhone hint), with Send to my computer as secondary.
4. **The phone app ships in R1, not R7**: an installable PWA (manifest, offline service worker) with an Android **share target** (links and images). Visual truth: `design/phone/A1-install.png`, `A2-home.png`, `A3-shared-into-clipcard.png`, `A4-video.png` (video arrives in R6).
5. Small design fixes: the Split and Solid underline now has more air (line height 70/82, underline offset 6, 2 px); see `design/cards/split-4x5.png` and `solid-4x5.png`.

## Impact by release

| Release | Change |
|---|---|
| **R0 (in progress)** | No functional change. Add the **Web app** nav link and the hero paste bar **behind `RELEASED.app`** (both hidden in R0; the hero keeps "Follow on GitHub"). If the Lite Vite base is `/lite/`, switch it to `/app/` now. |
| **R1** | Now "**Web app + bookmark + phone install**": `/app` with paste flows, the hero app shortcut, PWA install + share target, mobile "Install the app". See `R1-lite.md` (updated). |
| R2–R6 | Unchanged, except that the extension popup links "Open in web app" for drafts (same storage only within one browser profile; the extension and web app don't share storage, so say "export/import" in Settings). |
| **R7** | PWA and share target moved out; R7 is batch + optional tab recording in the web app. |

## Files updated
`docs/PRD.md` F12 · `docs/ARCHITECTURE.md` §18 · `docs/DESIGN.md` §2 · `docs/LANDING.md` §3, §3.2 · `docs/ROADMAP.md` · `docs/QA.md` · `docs/DECISIONS.md` · `handover/R1-lite.md` · `handover/R7-batch-mobile.md` · `handover/16-lite.md` · `design/figma.md` · new PNGs in `design/screens/` and `design/phone/`.

## Addendum (16:50) · Full web app and phone designs

The earlier `P9-web-app.png` was too thin to build from and is retired (`design/_superseded/`). The web app is the **whole product**, specified screen by screen in **`docs/APP.md`**:

- Desktop workspace: `design/webapp/W1-make-card.png` (sidebar, top bar, Add source, canvas + templates, inspector), `W2-make-video.png` (timeline), `W3-library-gifs.png`, `W4-drafts.png`.
- Phone: `design/phone/A1`–`A8` (install, home, shared‑into, video editor, card editor, grid, Library · GIFs, drafts).
- `docs/APP.md` §1 maps every extension feature to its web‑app screen; §4 has the responsive breakpoints.

Impact: **R0 none.** R1 builds the Card‑mode workspace on desktop and Home / Shared / Card editor / Drafts on the phone (the R1 prompt is updated). R3 adds Grid; R6 adds Video and Library · GIFs.
