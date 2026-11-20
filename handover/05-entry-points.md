# Codex task · M5 · Entry points: toolbar, hover button, selection toolbar, paste

**Branch:** `feat/m5-entry-points` · **Needs:** M4 · **Parallel with:** M6, M7, M8

## Read first
- `AGENTS.md`
- `docs/PRD.md` §4 F3
- `docs/DESIGN.md` §2 rows: Hover button, Selection toolbar, Toolbar action, Empty sheet
- `design/screens/E2-hover-button.png`, `E3-selection-quote.png`, `E4-toolbar-shortcut.png`, `E5-paste-link.png`

## Build
1. **Toolbar action**: opens the quick sheet for the current page. Badge: a small green dot when `isArticle` (computed by a lightweight check on tab update when permitted; otherwise only after the first use on that tab). Tooltip: "Make a card of this page · Alt+Shift+S".
2. **Context‑aware shortcut**: a hovered link → that link; selected text → quote card; otherwise → the current page.
3. **Hover button (E2)**: registered dynamically (`chrome.scripting.registerContentScripts`) only after `<all_urls>` is granted. A 32×32 dark square icon button, top‑right of `a[href]` boxes ≥ 160×90 px, after 400 ms hover; Alt reveals it on text links. A click does the one‑click copy. Respect the setting Off / Previews (default) / All. Shadow DOM, no layout shift, no effect on page scripts. Don't show it on our own pages or on inputs and editable areas.
4. **Selection toolbar (E3)**: on article pages, for selections of 20–400 characters, 10 px above the selection: Quote card · Copy with link (quote text + clean link with a text fragment). Hide it on scroll, typing or Esc.
5. **Empty sheet + paste (E5)**: when the page isn't an article, or in the popup fallback, show a focused link field ("Paste any link…") + recent cards. Pasting anywhere in the sheet starts a card.
6. **Popup fallback**: on restricted pages (Chrome Web Store, `chrome://`, the PDF viewer), open `popup-fallback.html` in a small window with the same sheet.

## Don't
- Inject anything into pages without the optional permission (except via `activeTab` after a user action).
- Run site‑specific selectors. Use the generic size heuristic only.

## Done when
- [ ] e2e: the hover button appears on the preview in `feed.html` and not on a small text link (it does appear with Alt held).
- [ ] e2e: the selection toolbar appears for a 50‑character selection on `news-og.html` and not for 5 characters; Copy with link puts the quote + a `#:~:text=` URL on the clipboard.
- [ ] e2e: the shortcut in all three contexts.
- [ ] Manual check written in the PR: the hover button on Facebook, X, LinkedIn and Google News doesn't break clicks or scrolling.
- [ ] Visuals match E2–E5.
- [ ] `docs/TASKS.md` M5 ticked.
