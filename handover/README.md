# Codex handovers — Clipcard

There is one self‑contained prompt per milestone. Codex reads `AGENTS.md` automatically. Each prompt says what to read, what to build, what not to touch, and how to prove it's done.

## 0. One‑time setup (you)

Codex works best on a git repo, and Codex cloud needs it on GitHub.

```bash
cd share-card
git init && git add -A && git commit -m "chore: design + handover"
gh repo create tanziro/share-card --private --source . --push   # or create it on github.com and push
```

If you choose a different owner or repo name, tell Codex in the M0 task. It will update `REPO_URL` everywhere.

## 1. How to run a task

- **Codex CLI** (in the repo root): `codex`, then say: *"Do handover/01-core.md"* (or paste the file's contents).
- **Codex cloud / IDE**: create one task per prompt on its own branch, paste the prompt and let it open a PR.
- After each PR, run **`handover/review.md`** in a *fresh* Codex task. It checks the work against the spec without having written it. Then merge.

> **Change note for work in progress:** `UPDATE-2026-11-20-web-app.md` (web app at `/app`, hero app shortcut, phone app moved to R1).

## 2. Order: ship in releases

Give Codex **one release prompt at a time**, in this order. Each one names the milestone prompts it uses, the scope cut, and the lanes that can run in parallel, and it ends with `ship.md`. Full plan, landing state per release and your own actions: `docs/ROADMAP.md`.

| # | Release prompt | You can use after it ships |
|---|---|---|
| R0 | `R0-landing-live.md` | Landing page live (features marked Soon) |
| R1 | `R1-lite.md` | **Web app at `/app`** + bookmark + **phone app** (PWA, share target) → cards with no install |
| R2 | `R2-extension-beta.md` | Extension zip: right‑click → card copied; popup |
| R3 | `R3-clips-drafts.md` | Clips → grid cards; drafts; Save for later |
| R4 | `R4-languages-store.md` | 30 languages, settings, **Chrome Web Store submission** |
| R5 | `R5-video-clips.md` | YouTube and page‑video clips; moment cards |
| R6 | `R6-video-gifs.md` | One video from many sources; Library and GIFs |
| R7 | `R7-batch-mobile.md` | Roundup / Carousel / Digest |
| R8 | `R8-v1.md` | 1.0: hardened, localized, Firefox |

To run one: open a fresh Codex task, paste "Read `handover/R1-lite.md` and do it", and let it open one PR per lane plus the ship PR. Review each PR with `review.md`.

The milestone prompts (`00`–`16`) stay as the detailed specs that the release prompts point to. `04-quick-sheet.md` is superseded. The milestone dependency table below is for reference.

| Prompt | Milestone | First used in |
|---|---|---|
| `00-scaffold.md` | M0 | R0 |
| `01-core.md` | M1 | R1 (page‑side), R2 (fetch) |
| `02-cards.md` + `10-cards-v2.md` | M2 + M10 | R1 (5 templates), R2 (Caps, Duotone, formats), R4 (scripts), R7 (Roundup) |
| `03-one-click.md` | M3 | R2 |
| `05-entry-points.md` | M5 | R2 (toolbar, shortcut, paste), R3 (hover, selection, image) |
| `06-languages.md` | M6 | R4 |
| `07-onboarding-settings.md` | M7 | R4 |
| `08-landing.md` | M8 | R0, then every release |
| `09-release.md` | M9 | R0 (deploy), R2 (zip + update check), R4 (store), R8 (QA, Firefox) |
| `11-popup.md` | M11 | R1 (Card mode in Lite), R2 (extension) |
| `12-clips.md` | M12 | R3 |
| `13-video-clips.md` | M13 | R5 |
| `14-video-join.md` | M14 | R6 |
| `15-library-drafts-batch.md` | M15 | R3 (storage, drafts), R6 (Library, GIFs), R7 (batch) |
| `16-lite.md` | M16 | R1 (bookmark, Card), R3 (drafts), R6 (video), R7 (PWA) |
| `ship.md` | — | end of every release |

## 3. What to check yourself before merging (5 minutes)

| After | Check |
|---|---|
| M2 | Open the cards gallery (`pnpm dev:gallery`): the 12 designed cards and the colors board look like `design/cards/*` and `design/screens/C1-colors.png`. Scan a QR with your phone. |
| M3 | Load the unpacked extension. On Facebook, right‑click a link preview → *Copy as clipcard* → paste into a post. The card appears in about a second. |
| M10 | Cards in `pnpm cards:preview` look like `design/cards/*` (grain visible up close, no gradient edges, no italics). |
| M11 | Click Edit on the toast: the top‑right popup looks like `P1`; click the headline → text bar like `P2`. |
| M12–M14 | Clip 2 paragraphs + 1 image → Board. Clip a YouTube range → Video → Export plays with captions and a Sources card. |
| M15 | Close the browser, reopen: the draft is still there; GIF search shows the attribution. |
| M16 | Drag the bookmark from the landing page; click it on a news site → the Lite window makes a card; the draft is shared across sites. |
| M6 | Try a Bangla, Hindi and Urdu news link. Check the fonts and that the Urdu layout is mirrored. |
| M8 | Open the landing page on desktop and phone. The Download .zip and Install steps work from a clean Chrome profile. |

## 4. Rules Codex follows on every task (already in `AGENTS.md`)

- Don't edit `design/**` or the spec docs. Only tick boxes in `docs/TASKS.md` and append to `docs/DECISIONS.md`.
- No new permissions, network calls or dependencies with telemetry.
- Every PR description includes: what changed, how it was verified (commands + screenshots), decisions, and open questions.
