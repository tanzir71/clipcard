# Codex release · R5 · Video clips · `v0.5`

**Needs released:** R4 · **Read first:** `AGENTS.md`, `docs/ROADMAP.md` (this row), then each prompt named below for detail. Build **only** the scope below; anything else stays behind `FLAGS` or waits for its release.

## Scope
- **M13 video clips** (`13-video-clips.md`): Clip button on YouTube and any `<video>`, range UI snapped to captions, moment card, recording per the R2/R4 decision (tabCapture, or getDisplayMedia), DRM refusal, limits. Clips land in the current draft.
- **Popup**: show the Video mode button only when the draft holds a clip; until R6 it offers the moment card and "Export clip" (a single scene with captions and a Sources card).
- **Lite**: moment cards (frame + timestamp QR) from the bookmark on a video page.
- **Landing**: "Video clips" tile live; FAQ entry about recording vs downloading; the store listing text never says "download".

## Done when
- [ ] Manual: 3 YouTube news videos + 1 news‑site player → clips play back with audio and captions; DRM test page refuses gracefully.
- [ ] Store update submitted (if listed).
- [ ] `ship.md` complete.

Finish with `handover/ship.md`.
