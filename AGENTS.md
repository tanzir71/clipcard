# AGENTS.md — Clipcard

You are implementing **Clipcard**: find things on the web (links, quotes, images, charts, video moments) and Clipcard turns them into a sourced **card, grid or video** automatically, with a QR back to every original. It ships as a browser extension, a **no‑install bookmark version (Lite)** and a landing page. Everything you need is in this repo. Read this file fully, then `docs/TASKS.md`. Work comes one milestone at a time as a prompt in `handover/` (order in `handover/README.md`).

Store title: **Clipcard – Link to Photo Card & Video Clip Maker with QR Code**

## Non‑negotiables (from the product owner)

1. **Find, then share.** Finding is the user's only required step. Output type, template, key phrase, colors, format, captions and scene timing are automatic (`docs/PRD.md` §5). The only question is the optional "Add a reaction?" GIF at the end of a video. Manual overrides sit behind one **Auto chip**.
2. **One popup for every workflow** (Card · Grid · Video), floating at the **top right** under the toolbar icon, never centered, no scrim. Edge‑to‑edge preview with no chrome until hover. Close is always visible. Everything found is auto‑saved to a **draft**, so work can be finished later.
3. **Minimal text, small text.** Cards: mark, kicker, headline, meta line (date · source), QR. The headline block takes ≤ 32% of the card height.
4. **Texture, never flat; no harsh transitions.** Grain on every dark area plus one quiet pattern (photo echo, halftone, hairlines, oversized mark) at ≤ 6%. Every gradient uses the smootherstep curve over ≥ 35% of the photo (`docs/DESIGN.md` §4.1).
5. **Newspaper typography.** Libre Caslon Text (serif), Geist (panels), Schibsted Grotesk (caps), Geist Mono (kicker and meta). **No italics anywhere.** Fonts are designed for each script (`docs/I18N.md`); Urdu uses **Lateef**, never Nastaliq by default.
6. **Calm color.** Monochrome ink UI. Theme: Ink, Midnight (default), Oxblood, Forest, Petrol, Plum or a custom pick clamped deep. Text colors are light, quiet tones with a contrast guard (`docs/DESIGN.md` §4.5). Square geometry.
7. **Verifiable.** Every QR points to the cleaned canonical URL (text fragments for excerpts, timestamps for video). Articles older than a year show their year. Edited headlines are tracked.
8. **Store‑safe video.** Record what is playing in the tab. **Never download or intercept video files or streams**, and never say "download" about YouTube anywhere.
9. **Local‑only.** No server, no account, no analytics. Drafts and the library live in the browser (IndexedDB + OPFS). The only third‑party calls are GIF searches the user starts (GIPHY or KLIPY; Tenor's API is gone).

## Repo layout (create it — the folders below `apps/` and `packages/` do not exist yet)

```
apps/
  lite/          # no-install version: bookmarklet + /lite window (PWA)
  extension/        WXT + React + TypeScript (MV3; Chrome/Edge first, Firefox later)
  landing/          Astro static site, i18n routes, SEO
packages/
  cards/            Card templates (React, DOM at export size) + renderer → PNG Blob
  core/             URL unwrap/clean, metadata extraction, script detection, types
  i18n/             UI messages per locale (seeds in packages/i18n/locales), font map, numerals
design/             Figma exports — the visual source of truth (cards/, screens/, photos/, tokens.json, figma.md)
docs/               PRD, DESIGN, ARCHITECTURE, I18N, LANDING, TASKS, QA (+ DECISIONS.md you create)
handover/           One Codex prompt per milestone (00–09) + review.md
fixtures/           HTML pages + expected JSON for metadata tests; urls.json for URL cleaning tests
```

## Stack

- pnpm workspaces, TypeScript `strict`, Node 20+. ESLint + Prettier.
- Extension: **WXT** (Vite) + React. Tailwind only for extension UI (not for cards). Zustand for quick‑sheet state.
- Cards: React components rendered to DOM at true export size, exported with **modern-screenshot** (`domToBlob`). QR with a small encoder (e.g. `uqr` or `qrcode-generator`) rendered as SVG. No canvas text layout, no Satori (it breaks Bangla/Devanagari shaping).
- Landing: **Astro** (static output), islands only where needed (live card demo, mobile share CTA).
- Tests: **Vitest** (unit), **Playwright** (extension e2e via `--load-extension`, landing smoke), visual snapshots of cards vs `design/cards/*.png`.
- Use latest stable versions; verify package names (e.g. Fontsource font packages) before adding.

## Commands (wire these up in M0)

```
pnpm i
pnpm dev:ext        # WXT dev, loads unpacked extension
pnpm dev:landing    # Astro dev server
pnpm test           # vitest across packages
pnpm e2e            # playwright
pnpm build          # all packages + apps; extension zip in apps/extension/.output
pnpm typecheck && pnpm lint
```

## Where the truth is

Work arrives as **release prompts** (`handover/R*.md`, plan in `docs/ROADMAP.md`). Build only the scope of the current release; keep unfinished work behind `packages/core/flags.ts`. Every release ends with `handover/ship.md`.


| Need | Look at |
|---|---|
| What to build, acceptance criteria | `docs/PRD.md`, `docs/TASKS.md` |
| Exact visuals | `design/cards/*.png` (true export size), `design/screens/*.png`, Figma (node IDs in `design/figma.md`) |
| Tokens | `design/tokens.json` (UI + card) |
| Card geometry per template/format | `docs/DESIGN.md` §Cards |
| Extension internals, permissions, clipboard path | `docs/ARCHITECTURE.md` |
| Languages, fonts, RTL, store titles | `docs/I18N.md` |
| Landing page + SEO | `docs/LANDING.md` |
| Test matrix | `docs/QA.md` |

If the docs and the PNGs disagree on visuals, the PNG wins. If they disagree on behaviour, `docs/PRD.md` wins. If something is unspecified, choose the option with **less text and fewer clicks**, and note it in `docs/DECISIONS.md` (create it).

## Definition of done (every task)

- Typecheck, lint and tests pass. New logic has unit tests; fixtures are used where they exist.
- Card changes: visual snapshot within tolerance of the matching `design/cards/*.png` (≤ 2% pixel diff; fonts must be the specified families — assert computed `font-family`).
- UI strings come from `packages/i18n` (no hard‑coded copy). RTL checked for `ur` and `ar`.
- No new permissions beyond `docs/ARCHITECTURE.md` without a note in `docs/DECISIONS.md`.
- Update `docs/TASKS.md` checkboxes.
- Don't edit `design/**`, `handover/**` or the spec docs (PRD, DESIGN, ARCHITECTURE, I18N, LANDING, QA). If the spec is wrong or unclear, say so in the PR and in `docs/DECISIONS.md`.

## Conventions

- Small pure functions in `packages/core` (no DOM globals except where noted; `DOMParser` is injected so it runs in offscreen docs, content scripts and tests via `linkedom`/`happy-dom`).
- Card templates are pure: `(model: CardModel, format: Format, theme: Theme) => JSX`. No network or storage inside templates.
- Everything user‑visible is keyboard accessible; icon buttons have `aria-label` + tooltip.
- Commit messages: `feat(cards): …`, `fix(core): …`.
