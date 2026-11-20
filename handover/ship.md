# Codex task · Ship a release (run at the end of every R*)

**Branch:** `release/vX.Y` · **Needs:** every PR listed in the release prompt merged

## Steps
1. **Version**: bump `apps/extension` (from R2) and `apps/lite` to `X.Y.0`. Write `CHANGELOG.md`: user‑facing, 3–6 lines, newest first, one line per thing a user can now do. No internal jargon.
2. **Landing truth**: set `RELEASED` in `apps/landing/src/config.ts` for this release (LANDING.md §3.2). Update the hero CTA if the release prompt says so. Regenerate `/changelog/` from `CHANGELOG.md`.
3. **Screens**: replace any landing image that shows unreleased UI with a capture of the real build (Playwright script `pnpm capture:landing`).
4. **Smoke QA**: run the sections tagged for this release and every earlier one in `docs/QA.md` (see its release tags). Paste ✓/✗ in the PR. A ✗ blocks the release unless the owner accepts it in writing in the PR.
5. **Tag** `vX.Y.0` on `main` → the release workflow builds and tests, attaches `clipcard-chrome.zip` + checksums (from R2), and deploys the landing page + `/lite` together.
6. **Verify live**: the landing page loads; "Download .zip" fetches the new asset; the bookmarklet from the live page works on 2 news sites; a fresh zip install shows the new version; the dev‑mode update dot appears for the previous version.
7. **Store** (from R4): upload the zip in the developer dashboard, with updated screenshots and "What's new" text from the changelog.
8. **Report back**: live URLs, the release link, the QA table, and a 20‑second GIF of the headline feature.
