# ROADMAP — incremental releases

Every release ends with **something people can use today** and a **landing page that shows exactly that**. Nothing waits for the end. Each release has one Codex prompt (`handover/R*.md`) that names the milestone checklists (`docs/TASKS.md` M0–M16) and the **scope cut** for that release, and finishes with the shared ship checklist (`handover/ship.md`).

| Release | Version | What a user can do after it ships | Landing page after it ships | Prompt |
|---|---|---|---|---|
| **R0 · Landing live** | v0.0 | Read about Clipcard and follow the GitHub repo. | Live on the chosen host: hero, how it works, features (all **Soon**), verifiable, templates (static PNGs), languages, FAQ, footer. CTA "Follow on GitHub". | `R0-landing-live.md` |
| **R1 · Web app + phone app** | v0.1 | **No install:** open `/app` (or paste in the landing hero) → paste a link, copied article or image → copy a sourced card (Header, Split, Overlay, Solid, Quote). One‑click with the ✂ bookmark. **Install it on a phone**; share links from Facebook/YouTube into it (Android). | Hero becomes the **app shortcut** (paste bar + Make card working in place) with paths: bookmark · Open full app. Nav "Web app". Mobile: **Install the app**. Live CardDemo. "One‑click cards" tile live. | `R1-lite.md` |
| **R2 · Extension beta** | v0.2 | Install from the zip (developer mode): right‑click any link → card copied; top‑right popup with Auto chip and text bar; toolbar and shortcut; all templates and formats (Latin). | Install section live (Download .zip + steps). Hero CTA "Download for Chrome" + "No install? Use the bookmark". | `R2-extension-beta.md` |
| **R3 · Clips, grids, drafts** | v0.3 | Clip quotes, images and charts → grid card; everything auto‑saves to drafts; **Save for later**; hover button and selection toolbar. Lite gets drafts and excerpt grids. | "Clips and grids" and "Drafts" tiles live. | `R3-clips-drafts.md` |
| **R4 · Your language + store** | v0.4 | Cards in 30 languages, UI in wave‑1 languages, RTL; welcome and settings (Your mark). **Submitted to the Chrome Web Store.** | Wave‑1 language routes live. When the listing is approved, set `STORE_URL`: CTAs switch to "Add to Chrome". | `R4-languages-store.md` |
| **R5 · Video clips** | v0.5 | Clip a range on YouTube or any page video → moment card or recorded clip (extension); moment cards in Lite. | "Video clips" tile live; FAQ "Does it download videos? No, it records what's playing, with a link to the moment." | `R5-video-clips.md` |
| **R6 · One video + GIFs** | v0.6 | Join clips, excerpts and reactions into one video with captions and a sources card; Library and GIF search (GIPHY, KLIPY); "Add a reaction?". Lite exports video too. | "One video, many sources" and "Library and GIFs" tiles live; privacy page lists GIF search. | `R6-video-gifs.md` |
| **R7 · Batch** | v0.7 | Many links → Roundup, Carousel or Digest video; optional tab recording in the web app. | Roundup in templates. | `R7-batch-mobile.md` |
| **R8 · 1.0** | v1.0 | Everything, hardened: full QA matrix, performance budgets, localized store listing, Firefox build (cards + moment cards). | No **Soon** chips left; changelog page complete. | `R8-v1.md` |

## Rules for every release

- **Ship, don't stage.** The release isn't done until the ship checklist passes: the tag is cut, the zip is attached (from R2), Lite and the landing page are deployed, and the changelog is updated.
- **Landing tells the truth.** Feature tiles, hero copy, FAQ and screenshots come from `apps/landing/src/config.ts → RELEASED` (LANDING.md §3.2). An unreleased feature shows a quiet **Soon** chip and is never promised in the hero.
- **No dead ends.** Every shipped surface works on its own. Example: R2 ships without clips, so the popup's Grid and Video mode buttons are hidden, not disabled.
- **Feature flags, not branches.** Unfinished work merges behind `FLAGS` in `packages/core/flags.ts` (off in release builds), so `main` is always releasable.
- **Permissions only when used.** Don't add a manifest permission before the release that uses it. `tabCapture` arrives in R5 (see the risk below).

## Lanes inside a release

Run the listed prompts in parallel where the release prompt says so. Typical lanes: **engine** (packages), **extension**, **Lite**, **landing**. One PR per lane; the ship PR last.

## Owner actions (you, not Codex)

| When | Action |
|---|---|
| Before R0 | Create the GitHub repo (confirm the owner; `tanziro/share-card` is a placeholder). Pick the landing host and domain (default GitHub Pages). |
| R2 | Install the zip on a clean profile and try it on 5 news sites and Facebook. |
| R3 | **Apply for a GIPHY production key and a KLIPY key** (approval takes time; beta keys allow only 100 calls/hour). |
| R4 | Chrome Web Store developer account; paste the listing from `store/`; answer the review. Ask native speakers to review wave‑1 strings. |
| R5 | Decide on `tabCapture` with Codex's finding (below). |

## Risks to plan around

- **`tabCapture` after store launch (R5):** if it adds an install warning and can't be optional, adding it in an update disables the extension for existing users until they accept. Codex checks this during R2 (a throwaway build) and records the answer in `docs/DECISIONS.md`. If it would disable users, choose one of two paths before R4's store submission: (a) ship video recording through `getDisplayMedia` (the user picks the tab each time, no manifest permission), or (b) include `tabCapture` from the first store version, with recording behind a flag until R5.
- **Store review** can take days to weeks; R5–R8 keep shipping via the zip and Lite while a review is pending.
- **The web app can't read other sites** without the bookmark or extension (no server, by design). Paste flows fall back to the URL slug and a user photo; the hero and app say "made in your browser" rather than promising auto‑fetch.
- **GIF keys:** without a production key, R6 ships with "paste your own key" in Settings and KLIPY as the default.
