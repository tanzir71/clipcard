# Clipcard on the Chrome Web Store

These materials accompany the 1.0 developer release. The repository owner submits the Store package from their developer account. Use the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). The submission pull request records the package version, checksum and verification.

## Package

From the repository root, run `pnpm build:store 1.0.0`. The command prints the SHA-256 for `apps/extension/.output/clipcard-store-1.0.0.zip`. Upload the verified archive with `manifest.json` at its root. The store build uses Chrome’s update mechanism. [Chrome package requirements](https://developer.chrome.com/docs/webstore/prepare)

## Store listing

- Use [the English listing](listings/en.md) as the default. Wave-one translations are available in the listing files. Use the Urdu and Burmese drafts as reference copy for Clipcard and its website. Submit the localized listings for the languages Chrome supports. [Chrome locale support](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)
- Upload the 128 px icon, the 440 × 280 promo tile and the five 1280 × 800 screenshots. The screenshots show Clipcard running against an editorial demo fixture. [Store image requirements](https://developer.chrome.com/docs/webstore/images)
- Use [the Clipcard landing page](https://tanzir71.github.io/clipcard/) as the homepage and [the GitHub issues page](https://github.com/tanzir71/clipcard/issues) for support.

## Privacy practices

### Single purpose

Turn user-selected links, excerpts, images, charts, and tab video into shareable cards, grids or videos with references to the original sources.

### Permission justifications

| Dashboard field | Text to paste |
| --- | --- |
| `contextMenus` | Adds Clipcard actions to selected links, page content, images and text so the user can create a card or clip from the chosen content. |
| `storage` | Saves local settings and per-site card preferences. Drafts and card media stay in browser storage on the device. |
| `offscreen` | Creates a local browser document to read selected article metadata and render and copy the card image without opening a visible browser tab. |
| `clipboardWrite` | Writes the generated image or cleaned source link to the clipboard when the user invokes a copy action. |
| `activeTab` | Gives Clipcard temporary access to the active page when the user invokes the toolbar, keyboard shortcut or context-menu action. |
| `scripting` | Runs page-reading and clip controls only where the user has invoked Clipcard or granted site access. |
| Optional host access | The user can allow Clipcard to read linked sources and original photos across websites and show in-page shortcuts. Open-tab collection uses the same optional access. The toolbar and context-menu workflows remain available with temporary access alone. |
| Privacy policy URL | [Clipcard privacy policy](https://tanzir71.github.io/clipcard/privacy/) |

Clipcard performs rendering and keeps its working data on the device. It may request a linked page or photo directly from the original publisher. It has no account, analytics or Clipcard data server. Use these statements and the public policy when completing the data-use certification. [Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

## Review instructions

1. Open a regular news article in Chrome and invoke Clipcard from the toolbar or right-click a link and choose **Copy as clipcard**.
2. Open the editor and scan the card’s QR code to check that it resolves to the original publisher. Select a quotation and use **Clip** to add it to a draft.
3. Select a few headlines to make a Roundup. To record a playing tab, select a range and choose Add clip. Chrome asks the user to select a tab for every capture. Clipcard exports only browser-approved recording frames and audio.
4. Try Settings in the extension profile. No login or test credentials are required.

Submit for review from the owner’s account. Set the repository’s `STORE_URL` to the public listing URL after approval. [Chrome submission steps](https://developer.chrome.com/docs/webstore/publish)

## GIF search disclosure

A GIF search sends the submitted terms and the configured key directly to the selected provider, GIPHY or KLIPY. Library items, clips and video exports are stored in the browser. The extension asks for provider host access when the user starts a search.
