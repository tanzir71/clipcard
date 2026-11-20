# Codex task · Review a milestone PR (run in a fresh task)

You did **not** write this code. Review the PR for milestone **<M#>** against the spec. Do not fix anything; report.

## Steps
1. Read `AGENTS.md` and the milestone's prompt in `handover/`, then every doc and PNG it lists.
2. Check out the branch. Run `pnpm i && pnpm typecheck && pnpm lint && pnpm test && pnpm build`, and `pnpm e2e` if the milestone has e2e tests. Paste the summaries.
3. Check every **Done when** box with evidence (test name, screenshot or command output). Unchecked or weakly evidenced boxes count as failures.
4. Check the non‑negotiables in `AGENTS.md`, especially:
   - one click; minimal text (no extra labels or copy); photo first;
   - premium deep colors only, monochrome UI, square geometry;
   - script‑designed fonts; QR = clean canonical URL;
   - no new permissions, network calls or telemetry.
5. Visual check: open the relevant surfaces and compare them with the PNGs in `design/`. List every visible difference (spacing, size, color, font, extra or missing elements).
6. Code check: dead code, missing tests for new logic, hard‑coded strings, accessibility (labels, focus, contrast), and performance traps (sync work on the page's main thread, unbounded caches).

## Report format
```
Verdict: merge | merge after fixes | rework
Blocking:
  - [area] problem → evidence → suggested fix
Non‑blocking:
  - …
Spec gaps found (docs ambiguous or contradictory):
  - …
```
