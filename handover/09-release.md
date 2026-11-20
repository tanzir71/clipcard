# Codex task · M9 · Release (developer‑mode first, then the Chrome Web Store)

> **Split across releases** (`docs/ROADMAP.md`): step 3 runs in R0, steps 1–2 in R2, step 4 in R4, steps 5–6 in R8. Per‑release shipping is `ship.md`.

**Branch:** `feat/m9-release` · **Needs:** everything else merged

## Read first
- `AGENTS.md`, `docs/TASKS.md` M9, `docs/LANDING.md` §3.1, `docs/QA.md`, `docs/I18N.md` §6

## Build
1. **Release workflow** `.github/workflows/release.yml`: on tag `v*` → install, test, build → zip `apps/extension/.output/chrome-mv3` as `clipcard-chrome.zip` (`manifest.json` at the zip root) → create a GitHub Release with the zip + checksums. The version in the manifest comes from the tag.
2. **Update check** (developer‑mode builds only, behind a build flag): once a day, `GET https://api.github.com/repos/<owner>/<repo>/releases/latest`; if it's newer, show a small dot on Settings → "Update available" linking to the release. No identifiers sent. Disabled in store builds.
3. **Landing deploy** workflow: build `apps/landing` → deploy to the chosen static host (ask which one; default GitHub Pages), with the custom domain if one is provided.
4. **Store assets** in `store/`: icons 128/48/16; 1280×800 screenshots captured from the **real** extension (one‑click toast on a feed, quick sheet, color variants, Bangla card, settings); 440×280 promo tile; localized name/summary/description for wave‑1 locales from `I18N.md` §6 (keep `needs-review` flags); permission justifications (contextMenus, storage, offscreen, clipboardWrite, activeTab, scripting, optional `<all_urls>`); single‑purpose statement; privacy policy URL.
5. Run the full `docs/QA.md` matrix; file issues for failures; fix the blockers.
6. **Firefox build** (stretch): `wxt build -b firefox`; note the gaps in DECISIONS.

## Done when
- [ ] Tagging `v0.1.0` produces a Release whose zip installs via Load unpacked on Chrome, Edge and Brave from a clean profile (record a GIF).
- [ ] The landing page's "Download .zip" fetches that asset (`/releases/latest/download/clipcard-chrome.zip`).
- [ ] The QA checklist is completed in the PR with ✓/✗ and links to issues.
- [ ] The `store/` folder is ready for submission. Tell the owner what to paste where.
