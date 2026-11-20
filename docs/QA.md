# QA — test matrix

**Release tags (cumulative):** run every section introduced up to the current release. **[R1]** Sources, Output (cards), web app + bookmark + phone app rows below · **[R2]** Behaviour, Performance, Popup · **[R3]** Clips, Drafts · **[R4]** languages (30‑language smoke), store package · **[R5]** Video clips · **[R6]** Video join, GIFs · **[R7]** Batch, Lite PWA · **[R8]** everything.

## Sources (manual + recorded fixtures)
| Where the link is | Check |
|---|---|
| Facebook feed link preview, comment link, Messenger web | `l.facebook.com` unwrapping; preview hints used instantly |
| X/Twitter (`t.co`) | redirect follow; `s`/`t` params stripped |
| LinkedIn (`lnkd.in`), Reddit (`out.reddit.com`), YouTube description links | unwrap/follow |
| Google search result, Google News | `google.com/url`, `news.google.com/rss/articles` |
| News sites in each wave‑1 market (Bangladesh, India, Pakistan, Indonesia, Philippines, Nigeria, Kenya, Ethiopia, Myanmar, Brazil, Latin America, Arab world; ≥ 3 each) | metadata, script detection, fonts, numerals, Zawgyi |
| AMP page | canonical used |
| Paywalled / bot‑protected page | hints fallback, no crash |
| Page without og:image | Solid template |
| YouTube video | maxres thumbnail, title clean |
| PDF viewer, Chrome Web Store, `chrome://` | popup fallback |

## Output
- [ ] Every template × format × every sample in `fixtures/headlines.json` (30 languages) renders without clipping or missing glyphs (headline within its box, no overlap with QR or tag).
- [ ] Every template × 6 color presets + one custom color matches `design/screens/C1-colors.png` behaviour (Ink special cases, Duotone luminosity tint, light tint on the Quote mark).
- [ ] QR decodes from: the PNG, a 1080 PNG viewed full‑screen on a laptop and scanned with a phone at 40 cm, and a Facebook‑compressed upload (download it back and scan).
- [ ] Paste works in the Facebook, WhatsApp Web, X, LinkedIn and Threads composers and in Google Docs.
- [ ] Download file name format is correct; PNG is ≤ 3 MB.
- [ ] RTL: tag, QR and text are mirrored; URLs read LTR.

## Behaviour
- [ ] First run without the optional permission: current‑page cards work; link cards fall back gracefully with "Allow photos".
- [ ] Clipboard failure path (switch tabs during render): the toast shows Copy and works.
- [ ] Per‑site template/format memory; history keeps 30 items; Clear works.
- [ ] Keyboard only: open the sheet, cycle templates, copy, close.
- [ ] Screen reader: the toast announces "Copied"; buttons have labels.
- [ ] Dark mode UI; 125% / 150% OS scaling; 1280×720 viewport (the sheet fits; the preview scales down).

## Performance
- [ ] Click → copied: p50 ≤ 1.2 s, p95 ≤ 2.5 s (20 runs, recorded).
- [ ] Extension idle memory: offscreen doc closes after 60 s.

## v2 additions
- Cards: every template × 4:5/1:1/9:16/16:9 × Latin/Bangla/Hindi/Urdu. Zoom 400% on gradients: no visible edge or banding (grain on). No italic glyphs (CI font check).
- Key phrase: 40 headlines across wire styles (fixtures), including quotes, "X says Y", and colon headlines.
- Contrast guard: very bright photos (snow, white walls) under Overlay/Header text.
- Old news: an article dated 2019 shows the year chip.
- Popup: top‑right placement at 1280, 1440 and 1920 widths and at 200% zoom; close always visible; keyboard path.
- Clips: news sites with lazy images, paywalled pages (clip the visible part only), RTL pages.
- Video: YouTube (captions on/off), a news‑site player, Facebook video, a DRM test page (refusal). Audio sync within ±40 ms after export.
- Drafts: survive a browser restart and an extension update; retention sweep.
- GIFs: offline (graceful), rate‑limited (429 → friendly message), attribution visible.
- Batch: a news homepage marquee (nav/footer links ignored), 10 tabs, a pasted list with duplicates.
- Lite: strict‑CSP sites, popup blockers (the click is the gesture), Safari/Firefox bookmarklets, Android share target.
- Web app: paste a bare URL (slug headline), copied article HTML (headline + image), a screenshot; reopen offline; drafts survive reload. Landing hero paste → card in place.
- Phone app: Android install prompt; share a link and an image from Facebook, YouTube and Chrome into Clipcard; native Share sends PNG/MP4; iPhone Add to Home Screen + Share sheet.
