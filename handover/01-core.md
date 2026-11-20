# Codex task · M1 · Core: URLs, metadata, script detection

**Branch:** `feat/m1-core` · **Needs:** M0 · **Parallel with:** M2, M8

## Read first
- `AGENTS.md`
- `docs/ARCHITECTURE.md` §5 (metadata) and §6 (URL handling), word for word
- `docs/I18N.md` §1–§3 (script detection, langs)
- `fixtures/urls.json`, `fixtures/pages/*.html`, `fixtures/expected/*.json`, `fixtures/headlines.json`

## Build (`packages/core`, no UI)
```ts
export type Script = 'latin'|'bengali'|'devanagari'|'arabic'|'tamil'|'telugu'|'malayalam'|'kannada'|'gujarati'|'gurmukhi'|'odia'|'sinhala'|'myanmar'|'ethiopic'|'cyrillic'|'thai';
export interface CardSource {
  canonicalUrl: string; title: string; image: string | null; siteName: string; favicon: string;
  lang: string; script: Script; dir: 'ltr' | 'rtl'; description: string | null;
  publishedAt: string | null; themeColor: string | null; isArticle: boolean;
}
export function unwrapUrl(url: string): string;                                    // no network
export function cleanUrl(url: string): { url: string; removed: string[] };         // tracker params removed
export function resolveUrl(input: string, opts?: { fetch?: typeof fetch; timeoutMs?: number }):
  Promise<{ url: string; removed: string[]; unwrapped: boolean }>;                 // unwrap → follow redirects → clean
export function textFragment(url: string, selection: string): string;
export function cleanTitle(title: string, siteName: string | null, host: string): string;
export function extract(doc: Document, finalUrl: string): CardSource;             // DOMParser injected by caller
export function detectScript(text: string): Script;
export function detectLang(text: string, htmlLang?: string | null): string;       // ur vs ar vs fa; hi vs ne vs mr
export function dirFor(lang: string): 'ltr' | 'rtl';
```
- `fixtures/expected/*.json`: the input final URL is in `_finalUrl`; ignore keys starting with `_` when comparing.
- `resolveUrl` network cases: tests inject a mock `fetch` that returns the `redirectsTo` value. Never hit the real network in tests.
- Tracker list, wrapper list, AMP handling and title suffix/prefix stripping exactly as in §5/§6. Keep the lists in one exported config (`trackers.ts`, `wrappers.ts`) so they're easy to extend.
- Use `linkedom` or `happy-dom` to give tests a `DOMParser`.

## Don't
- Touch extension or UI code.
- Add network calls outside `resolveUrl`.

## Done when
- [ ] Every case in `fixtures/urls.json` passes (`resolve` and `textFragment`), including the `error: "unsupported-url"` case.
- [ ] All 4 page fixtures match their expected JSON exactly.
- [ ] `detectScript`/`detectLang` return the right values for every sample in `fixtures/headlines.json` (add the expected `script` to the test table, not the fixture).
- [ ] Unit tests for `cleanTitle` (≥ 8 cases: `|`, `-`, `–`, `—`, prefix `X: `, no match, Bangla site name, very long title).
- [ ] 100% branch coverage on `url.ts`; ≥ 90% on `extract.ts`.
- [ ] `docs/TASKS.md` M1 ticked.

## Report back
The API as built, coverage numbers, and any spec ambiguities you resolved (also in `docs/DECISIONS.md`).
