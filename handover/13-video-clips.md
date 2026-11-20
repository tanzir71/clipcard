# Codex task · M13 · Video clips (YouTube and any page video)

**Branch:** `feat/m13-video-clips` · **Needs:** M11, M15 (storage part) · **Parallel with:** M12

## Read first
- `docs/PRD.md` F6 · `docs/DESIGN.md` §2 row Video clip · `docs/ARCHITECTURE.md` §13
- **Visual truth:** `design/screens/Y1-video-clip.png`

## Policy (hard rule)
Never fetch, intercept or save video streams or files (no `googlevideo` requests, no `ytInitialPlayerResponse` stream URLs). Only record the visible tab while it plays. The UI, store listing and landing page never say "download".

## Build
1. Inject the **Clip** button into YouTube's right controls (`.ytp-right-controls`, resilient to class changes with a MutationObserver and a fallback hover button). Add a hover button on any other `<video>` ≥ 320×180.
2. Range UI on the progress bar (Mist range, white handles) + capsule (`01:23 – 01:41 · 18s · Card · + Add clip`). The default range is 20 s around the playhead, snapped to caption cue boundaries.
3. Moment card: frame from `captureVisibleTab` cropped to the video, the cue text as a caption line, QR to `youtu.be/ID?t=S` (or the page URL + `#t=S` elsewhere).
4. Recording per ARCH §13: tabCapture stream id → offscreen `getUserMedia` → clean‑capture style → seek, play, stop → crop + WebCodecs → MP4 into OPFS; save the transcript cues for the range.
5. DRM detection and refusal; limits (60 s per clip, 3 min per video); a recording pill with Stop.
6. Check the `tabCapture` install warning; record the decision in `docs/DECISIONS.md`.

## Done when
- [ ] Manual test on 3 public YouTube news videos + 1 news‑site `<video>`: the clip plays back with audio, is cropped to the video, and keeps the transcript cues.
- [ ] A DRM test page shows the refusal and the moment‑card fallback.
- [ ] `docs/TASKS.md` M13 ticked.
