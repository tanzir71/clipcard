# DECISIONS

Newest first. Codex appends here when a spec is unclear or wrong (see AGENTS.md).

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
