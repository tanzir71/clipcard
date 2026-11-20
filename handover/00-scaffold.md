# Codex task · M0 · Scaffold the monorepo

**Branch:** `feat/m0-scaffold` · **Needs:** nothing · **Next:** M1, M2, M8 can start in parallel after this merges.

## Read first
- `AGENTS.md` (all), `README.md`
- `docs/ARCHITECTURE.md` §1, §2, §3
- `design/tokens.json`, `design/brand/mark.svg`

## Build
1. **pnpm workspace** (Node 20+, TypeScript strict) with:
   - `apps/extension`: WXT + React + TS, MV3, Chrome target. Manifest name/description via `__MSG_ext_name__` / `__MSG_ext_description__` placeholders, `default_locale: "en"`. Install‑time permissions **exactly** `contextMenus, storage, offscreen, clipboardWrite, activeTab, scripting`; `optional_host_permissions: ["<all_urls>"]`. Empty entrypoints: background, offscreen, `sheet.html`, `welcome.html`, `options.html`, `popup-fallback.html`.
   - `apps/landing`: Astro, `output: 'static'`, one placeholder page.
   - `packages/core`, `packages/cards`, `packages/i18n`: TS libraries with project references.
2. **Tooling**: ESLint (flat config), Prettier, Vitest workspace across packages, Playwright with an **extension fixture** (persistent Chromium context launched with `--load-extension` pointing at the built extension), plus a tiny static server for `fixtures/pages`.
3. **Tokens**: `scripts/tokens.ts` generates `packages/cards/src/tokens.ts` and `packages/cards/src/tokens.css` (`--pc-*` custom properties for UI light/dark + card values) from `design/tokens.json`. Run it in `prebuild`.
4. **Icons**: generate 16/32/48/128 PNGs from `design/brand/mark.svg` into `apps/extension/public/icon/` (script, e.g. `sharp` or `resvg-js`).
5. **i18n bootstrap**: `packages/i18n/scripts/gen-locales.ts` turns `packages/i18n/locales/<lang>.json` into `apps/extension/public/_locales/<lang>/messages.json` (convert `ext.name` → `ext_name`; Chrome keys allow only `[A-Za-z0-9_]`). Run it for `en` and `bn`.
5b. **Release scaffolding**: an empty `apps/lite` (Vite + React, builds to `apps/landing/dist/lite`), an empty `packages/ui` (shared popup components), `packages/core/flags.ts` (`FLAGS` read from `import.meta.env`, all off in release builds), and `CHANGELOG.md` with an "Unreleased" heading.
6. **Root scripts**: `dev:ext`, `dev:landing`, `dev:gallery` (stub that later serves the cards gallery), `test`, `e2e`, `build`, `typecheck`, `lint`.
7. **CI**: `.github/workflows/ci.yml` runs install → typecheck → lint → test → build on push/PR (pnpm cache).
8. Create `docs/DECISIONS.md` with a header and the first entries (versions chosen and anything else you decided).

If the repo owner differs from `tanziro/share-card`, ask once at the start, then use that value everywhere you write it.

## Don't
- Implement features, templates or UI beyond empty shells.
- Add any permission not listed above.

## Done when
- [ ] `pnpm i && pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass locally and in CI.
- [ ] `apps/extension/.output/chrome-mv3` loads unpacked in Chrome with no errors; the toolbar shows the mark icon; the extension name comes from `_locales`.
- [ ] A Playwright smoke test launches Chrome with the extension and asserts the service worker is running.
- [ ] `apps/landing/dist/index.html` exists.
- [ ] `docs/TASKS.md` M0 boxes are ticked.

## Report back
What you set up (versions), the commands you ran, decisions and open questions.
