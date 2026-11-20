# Codex task · M8 · Landing page (`apps/landing`)

**Branch:** `feat/m8-landing` · **Needs:** M0 (the CardDemo island needs M2; build the static sections first) · **Parallel with:** everything

## Read first
- `AGENTS.md`
- `docs/LANDING.md` (all), especially §3 sections, **§3.1 pre‑store mode**, §4 SEO
- `docs/I18N.md` §1 (wave‑1 routes) and §6 (store titles and keywords for meta)
- **Visual truth:** `design/screens/L1-landing-desktop.png` (1440), `L2-landing-mobile.png` (390)

## Build
1. **Astro static site**, plain CSS using the `--pc-*` tokens; self‑hosted fonts (preload Geist + the route's hero script font only).
2. **Sections** in order, per §3: Nav · Hero (with the bleeding card row) · How it works · **Install** (`#install`) · Verifiable · Templates · Languages (word cloud with uniform optical sizing per §3 row 7 + 3 cards) · FAQ (details/summary, first open) · CTA band (Midnight) · Footer with **tanziro.com** ("© 2026 Clipcard · Made by tanziro.com", link to https://tanziro.com).
3. **Pre‑store mode** per §3.1 via `src/config.ts` (`STORE_URL`, `REPO_URL`, `ZIP_URL`):
   - CTAs: "Download for Chrome" → `ZIP_URL`; "Install guide" → `#install`.
   - Install section: Download .zip + View on GitHub; "or build" code bar with a Copy button; the 4 steps with their small visuals; footnote for Edge and Brave.
   - Hero beta note.
   - With `STORE_URL` set, everything switches to "Add to Chrome" and the install section hides.
4. **Mobile**: the hero CTA is "Send to my computer" (`navigator.share`, falling back to copying the link); a scroll‑snap card carousel; compact install rows.
5. **i18n routes** for wave 1 (`/`, `/bn/`, `/hi/`, `/ur/` rtl, `/id/`, `/fil/`, `/ar/` rtl, `/es/`, `/pt-br/`, `/sw/`, `/am/`, `/my/`). Copy in `src/i18n/<lang>.json`: write `en` (from the PNG) and `bn`; generate the others from `en` with `_status: "needs-review"`. Language switcher in the nav.
6. **SEO** per §4: title/description per locale, hreflang + x‑default, canonical, JSON‑LD (SoftwareApplication, FAQPage, Organization), sitemap with alternates, robots.txt, OG images per locale **generated at build with `packages/cards`** (Split 1.91:1) through a headless render script.
7. **CardDemo island** (after M10): renders the six templates (Header, Split, Caps, Overlay, Duotone, Quote) live with the sample data. It must use the same package as the extension.
8. `/privacy/`: short, plain language (no account, no analytics, the optional permission and why, the daily update check for developer‑mode builds, GIF search going to GIPHY/KLIPY, drafts and library stored only in this browser).
9. **Features** section and the **No‑install** block per LANDING.md §3 (rows 3b and 4); footer credit "Inspired by Zibon".

## Don't
- Add trackers, analytics or third‑party fonts or CDNs.
- Add copy that isn't in the PNGs, beyond what the docs require.

## Done when
- [ ] Visual match vs L1/L2 (Playwright full‑page, ≤ 3% diff for the en route).
- [ ] RTL routes mirror correctly (screenshot `/ur/`).
- [ ] Pre‑store ↔ store mode toggles correctly (test both values of `STORE_URL`).
- [ ] Lighthouse ≥ 95 in all four categories (mobile + desktop), total JS < 40 KB gz, LCP < 2.0 s on simulated 4G. Put the report in the PR.
- [ ] HTML validates; axe has no violations.
- [ ] `docs/TASKS.md` M8 ticked.
