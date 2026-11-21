# Clipcard

Clipcard turns links, excerpts, photos and video moments into shareable cards, grids and videos in your browser. Sourced exports include QR codes back to the originals. [Open the web app](https://tanzir71.github.io/clipcard/app/).

## Install an unsigned release

- Chrome, Edge and Brave. Download and extract the Chromium ZIP, then open your browser's Extensions page. Turn on Developer mode and choose **Load unpacked**. Select the folder containing the manifest. [Chromium ZIP](https://github.com/tanzir71/clipcard/releases/latest/download/clipcard-chrome.zip)
- Firefox. Open about:debugging, select **This Firefox**, choose **Load Temporary Add-on**, and select the ZIP. The Firefox build includes sourced cards, page clippings and moment cards. Firefox removes temporary add-ons on restart. Open the web app for video editing, GIFs and batch tools. [Firefox ZIP](https://github.com/tanzir71/clipcard/releases/latest/download/clipcard-firefox.zip)

[Store submission materials](store/README.md) are available for the owner's Chrome Web Store submission.

Follow development in the [release roadmap](docs/ROADMAP.md) or visit the [project site](https://tanzir71.github.io/clipcard/).

## Develop locally

With Node 24.16 or newer and pnpm 10 installed:

```sh
pnpm install
pnpm dev:landing
```

Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` to check all workspaces. Run `pnpm exec playwright install chromium` before `pnpm e2e`.

Start with [AGENTS.md](AGENTS.md) and the [release handovers](handover/README.md).

Made by [tanziro.com](https://tanziro.com) · Inspired by [Zibon](https://frame.zibon.design/).
