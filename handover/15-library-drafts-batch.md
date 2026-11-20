# Codex task · M15 · Library, GIFs, drafts and batch

**Branch:** `feat/m15-library-drafts-batch` · **Needs:** M11 (UI parts); storage can start after M0 · **Parallel with:** M12, M13

## Read first
- `docs/PRD.md` F8, F9, F10 · `docs/DESIGN.md` §2 rows Library · GIFs, Drafts, Batch · `docs/ARCHITECTURE.md` §12, §15, §16
- **Visual truth:** `design/screens/P5-library-gifs.png`, `P6-drafts.png`, `P7-batch-links.png`, `design/cards/roundup-4x5.png`

## Build
1. Storage layer (IndexedDB + OPFS, persist(), retention sweep, export/import zip). This is the base for M12 and M13; land it first as its own PR.
2. Drafts: auto‑append from every find action, the 6 h rule, the list in the popup, restore exactly, Save for later naming.
3. Library: save from context menu, star in the tray, drag‑drop files; tags (auto‑suggested), search, favorites.
4. GIFs: GIPHY + KLIPY clients with keys from `.env`, a Settings key field, optional host permissions at first use, 24 h cache, `rating=pg-13`, the required attribution, Save to library. No Tenor.
5. Batch: link marquee, open tabs (with host permission), paste list → Roundup / Carousel (zip with `fflate`, "Copy next") / Digest video.
6. Privacy page + store data disclosure: GIF search terms go to the chosen provider.

## Done when
- [ ] Unit tests for the storage layer (create, append, restore, sweep, export/import).
- [ ] e2e: clip on page A, close the browser, reopen, add from page B, make a Video → both sources are present.
- [ ] e2e: GIF search with a mocked provider → Add 2 → both appear in the draft and the Library; the attribution is visible.
- [ ] e2e: a marquee over 4 links on a fixture homepage → a Roundup with 4 QRs that decode to the right URLs.
- [ ] `docs/TASKS.md` M15 ticked.
