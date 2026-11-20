# Codex task · M14 · One video from many sources

**Branch:** `feat/m14-video-join` · **Needs:** M13, M10 · **Parallel with:** M15 (GIFs part)

## Read first
- `docs/PRD.md` F7, §5 · `docs/DESIGN.md` §2 row Video mode, §4.6 scenes · `docs/ARCHITECTURE.md` §14
- **Visual truth:** `design/screens/P4-video.png`, `design/scenes/{clip,excerpt,reaction,sources}-9x16.png`, `design/cards/header-9x16-story.png` (Title)

## Build
1. Scene model from the draft: Title (auto) → finds in order → Sources (auto). Auto durations, captions on when cues exist.
2. Video mode in the popup: playing preview, scenes strip (drag, trim on clip thumbs), "+" → Library · GIFs, Auto chip (format · captions · theme), **Add a reaction?** (3 suggestions + Skip), Export.
3. Renderer in the offscreen document (ARCH §14): canvas scenes, clip decode + fit + blurred echo, caption boxes, 200 ms crossfades, audio fades, H.264/AAC MP4 via `mp4-muxer`.
4. Formats 9:16 (default), 4:5, 16:9.

## Done when
- [ ] e2e with 2 recorded clips + 1 excerpt + 1 GIF: the export plays in Chrome and VLC; the Sources card lists both sources with decodable QRs.
- [ ] Frames at 1 s, 5 s and the last second match `design/scenes/*` (≤ 4% diff).
- [ ] 60 s export ≤ 20 MB and ≤ 30 s render on a mid laptop.
- [ ] `docs/TASKS.md` M14 ticked.
