import { prepareCardAssets } from '@clipcard/cards/assets';
import { qrGeometry } from '@clipcard/cards/qr';
import { typefaceFor } from '@clipcard/cards/typefaces';
import { detectLang, dirFor, videoClock } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { renderPng } from './actions.ts';
import { cardFromCollection } from './collection-card.ts';
import type { DraftCollection } from './collection-types.ts';
import { modelForDraft, optionsForDraft } from './draft.ts';
import { sceneHeight, sceneWidth } from './video-scene.ts';
import type { VideoScene } from './video-project.ts';

const ink = '#0b0b0c';
const mist = '#a9bcdf';

type DrawnImage =
  ImageBitmap | VideoFrame | HTMLCanvasElement | OffscreenCanvas;

export async function videoArt(collection: DraftCollection) {
  const titles = [
    strings['video.watch'],
    strings['video.originals'],
    strings['video.localFiles'],
  ];
  const texts: Array<{ text: string; lang?: string }> = titles.map((text) => ({
    text,
  }));
  for (const clip of collection.clips) {
    texts.push({ text: clip.title, lang: clip.lang });
    if (clip.text) texts.push({ text: clip.text, lang: clip.lang });
    if (clip.outlet) texts.push({ text: clip.outlet, lang: clip.lang });
  }
  const { grain, converted } = await prepareCardAssets(
    'grid',
    texts.map(({ text, lang }) => typefaceFor(text, lang)),
    texts.map(({ text }) => text),
  );
  const noise = new Image();
  noise.src = grain;
  await noise.decode();
  return { noise, converted };
}

function font(text: string, size: number, lang?: string, weight = 600) {
  const face = typefaceFor(text, lang);
  return face
    ? `${weight >= 600 ? face.strong : face.weight} ${size}px "${face.family}", sans-serif`
    : `${weight} ${size}px "Geist", sans-serif`;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  count: number,
  lang?: string,
) {
  const words = new Intl.Segmenter(lang, { granularity: 'word' }).segment(text);
  const lines: string[] = [];
  let line = '';
  for (const { segment } of words) {
    if (line && ctx.measureText(line + segment).width > width) {
      lines.push(line.trim());
      if (lines.length >= count) {
        lines[count - 1] += '…';
        return lines;
      }
      line = segment.trimStart();
    } else line += segment;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export function coverVideoArt(
  ctx: CanvasRenderingContext2D,
  image: DrawnImage,
  width: number,
  height: number,
  push = 1,
) {
  const w = 'displayWidth' in image ? image.displayWidth : image.width;
  const h = 'displayHeight' in image ? image.displayHeight : image.height;
  const scale = Math.max(width / w, height / h) * push;
  ctx.drawImage(
    image,
    (width - w * scale) / 2,
    (height - h * scale) / 2,
    w * scale,
    h * scale,
  );
}

export function drawVideoStill(
  ctx: CanvasRenderingContext2D,
  scene:
    | Extract<VideoScene, { kind: 'sources' }>
    | Extract<VideoScene, { kind: 'image' | 'excerpt' | 'reaction' }>,
  assets: Awaited<ReturnType<typeof videoArt>>,
  image?: DrawnImage,
  time = 0,
) {
  const { noise, converted } = assets;
  const text = (value: string) => converted.get(value) ?? value;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  if (image) {
    const isExcerpt = scene.kind === 'excerpt';
    ctx.filter = isExcerpt ? 'blur(95px) brightness(0.38)' : 'brightness(0.83)';
    coverVideoArt(
      ctx,
      image,
      sceneWidth,
      sceneHeight,
      1.02 + (scene.kind === 'image' ? (time / scene.seconds) * 0.06 : 0),
    );
    ctx.filter = 'none';
  }
  ctx.globalAlpha = 0.12;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = ctx.createPattern(noise, 'repeat') ?? ink;
  ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  if (!image || scene.kind === 'excerpt') {
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.font = '750 500px "Geist", sans-serif';
    ctx.fillText(strings['ext.shortName'], 280, 1690);
  }

  if (scene.kind === 'sources') {
    const heading = text(strings['video.watch']);
    const originals = text(strings['video.originals']);
    const rtl = dirFor(detectLang(heading)) === 'rtl';
    const edge = rtl ? 1020 : 60;
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '700 34px "Geist", sans-serif';
    ctx.fillText(strings['ext.shortName'], edge, 285);
    ctx.font = font(heading, 54, undefined, 400);
    ctx.fillText(heading, edge, 455, 960);
    ctx.font = font(originals, 54);
    ctx.fillText(originals, edge, 518, 960);
    if (!scene.sources.length) {
      const local = text(strings['video.localFiles']);
      ctx.font = font(local, 34);
      ctx.fillText(local, edge, 690, 960);
    }

    scene.sources.forEach((source, index) => {
      const label = text(source.outlet || source.title);
      const y = 612 + index * 268;
      const qr = qrGeometry(source.url, 220);
      const x = rtl ? edge - qr.size : edge;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, qr.size, qr.size);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = ink;
      ctx.fill(new Path2D(qr.path));
      ctx.restore();
      const labelX = edge + (qr.size + 36) * (rtl ? -1 : 1);
      ctx.font = font(label, 38, source.language);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, labelX, y + 91, 650);
      ctx.font = '500 22px "Geist Mono", monospace';
      ctx.fillStyle = mist;
      const line = source.range
        ? videoClock(source.range.start) + ' – ' + videoClock(source.range.end)
        : (source.date?.slice(0, 10) ?? new URL(source.url).hostname);
      ctx.fillText(line, labelX, y + 129, 650);
    });
    return;
  }

  const { clip } = scene;
  const label = text(
    clip.outlet || (clip.sourceUrl ? new URL(clip.sourceUrl).hostname : ''),
  );
  const quote = text(clip.text || clip.title);
  const lang = detectLang(quote, clip.lang);
  ctx.direction = dirFor(lang);
  ctx.textAlign = 'center';
  if (scene.kind === 'excerpt' || !image) {
    const family = typefaceFor(quote, lang);
    ctx.font = family
      ? font(quote, 48, lang)
      : '400 46px "Libre Caslon Text", serif';
    const lines = wrap(ctx, quote, 820, 7, lang);
    const top = (sceneHeight - lines.length * 65) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(60, top - 58, 960, lines.length * 65 + 106);
    ctx.fillStyle = ink;
    lines.forEach((line, index) =>
      ctx.fillText(line, sceneWidth / 2, top + 29 + index * 65, 820),
    );
  }
  if (label) {
    ctx.font = font(label, 25, lang, 500);
    const width = Math.min(1020, ctx.measureText(label).width + 56);
    const y = scene.kind === 'excerpt' ? 1375 : 1645;
    ctx.fillStyle = 'rgba(11,11,12,0.83)';
    ctx.fillRect((sceneWidth - width) / 2, y - 34, width, 48);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, sceneWidth / 2, y, width - 36);
  }
}

export async function videoTitleBitmap(
  collection: DraftCollection,
  clip: Extract<VideoScene, { kind: 'title' }>['clip'],
) {
  const draft = await cardFromCollection(collection, clip);
  if (!draft) return;
  const address = draft.photo && URL.createObjectURL(draft.photo.blob);
  try {
    const model = modelForDraft(
      { ...draft, headline: collection.draft.title },
      address,
      Date.now(),
    );
    const options = optionsForDraft(draft, model);
    return await createImageBitmap(
      await renderPng(model, {
        ...options,
        format: '9:16',
        template: model.image ? 'header' : 'solid',
      }),
    );
  } finally {
    if (address) URL.revokeObjectURL(address);
  }
}
