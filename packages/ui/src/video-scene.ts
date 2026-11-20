import { prepareCardAssets } from '@clipcard/cards/assets';
import { qrGeometry } from '@clipcard/cards/qr';
import { typefaceFor } from '@clipcard/cards/typefaces';
import { detectLang, dirFor, videoClock } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import type { DraftClip, ClipVideo } from './collection-types.ts';

export const sceneWidth = 1080;
export const sceneHeight = 1920;
const ink = '#0b0b0c';
const mist = '#a9bcdf';

function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  value: string,
  width: number,
  max: number,
  lang?: string,
) {
  const parts = Array.from(
    new Intl.Segmenter(lang, { granularity: 'word' }).segment(value),
    ({ segment }) => segment,
  );
  const lines: string[] = [];
  let line = '';
  for (const part of parts) {
    if (line && ctx.measureText(line + part).width > width) {
      lines.push(line.trim());
      if (lines.length === max) {
        lines[max - 1] += '…';
        return lines;
      }
      line = part.trimStart();
    } else {
      line += part;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function fontFor(text: string, size: number, lang?: string) {
  const face = typefaceFor(text, lang);
  return face
    ? `${face.strong} ${size}px "${face.family}", "Geist", sans-serif`
    : `600 ${size}px "Geist", sans-serif`;
}

export async function clipScene(
  ctx: CanvasRenderingContext2D,
  clip: DraftClip,
  video: ClipVideo,
) {
  const outlet =
    clip.outlet || (clip.sourceUrl && new URL(clip.sourceUrl).hostname) || '';
  const texts = [
    clip.title,
    outlet,
    strings['video.watch'],
    strings['video.originals'],
    strings['video.source'],
    ...video.cues.map((cue) => cue.text),
  ];
  const { grain, converted } = await prepareCardAssets(
    'grid',
    texts.map((text) => typefaceFor(text, clip.lang)),
    texts,
  );
  const grainImage = new Image();
  grainImage.src = grain;
  await grainImage.decode();
  const texture = ctx.createPattern(grainImage, 'repeat');
  const cleanText = (text: string) => converted.get(text) ?? text;
  const title = cleanText(clip.title);
  const source = cleanText(outlet);
  const lang = detectLang(title, clip.lang);
  const rtl = dirFor(lang) === 'rtl';
  const edge = rtl ? 1020 : 60;
  const timeRange = videoClock(video.start) + ' – ' + videoClock(video.end);
  const brand = strings['ext.shortName'];

  function texturedBackground(markX: number, markY: number) {
    if (texture) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = texture;
      ctx.fillRect(0, 0, sceneWidth, sceneHeight);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.font = '750 500px "Geist", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillText(brand, markX, markY);
  }

  const layout = document.createElement('canvas');
  layout.width = sceneWidth;
  layout.height = sceneHeight;
  const still = layout.getContext('2d', { alpha: false })!;
  const poster = new Image();
  if (video.poster) {
    poster.src = video.poster;
    await poster.decode().catch(() => undefined);
  }

  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  if (poster.naturalWidth) {
    const factor =
      Math.max(
        sceneWidth / poster.naturalWidth,
        sceneHeight / poster.naturalHeight,
      ) * 1.22;
    const width = poster.naturalWidth * factor;
    const height = poster.naturalHeight * factor;
    ctx.filter = 'blur(110px)';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      poster,
      (sceneWidth - width) / 2,
      (sceneHeight - height) / 2,
      width,
      height,
    );
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    const shade = ctx.createLinearGradient(0, 0, 0, sceneHeight);
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const progress = t * t * t * (t * (t * 6 - 15) + 10);
      shade.addColorStop(t, `rgba(11,11,12,${0.75 - progress * 0.45})`);
    }
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  }
  texturedBackground(480, 620);

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.font = fontFor(source || brand, 24, lang);
  ctx.fillText(source || brand, edge, 286, 710);
  ctx.font = fontFor(title, 52, lang);
  const lines = wrap(ctx, title, 906, 3, lang);
  lines.forEach((line, index) => {
    const width = Math.min(946, ctx.measureText(line).width + 20);
    const x = rtl ? edge - width : edge;
    const y = 316 + index * 70;
    ctx.fillStyle = mist;
    ctx.fillRect(x, y, width, 64);
    ctx.fillStyle = ink;
    ctx.fillText(line, rtl ? edge - 10 : edge + 10, y + 49, width - 20);
  });
  ctx.fillStyle = '#ededf0';
  ctx.font = fontFor(source, 22, lang);
  ctx.fillText(
    (source ? strings['video.source'] + ' · ' + source + '  |  ' : '') +
      timeRange,
    edge,
    350 + lines.length * 70,
    960,
  );
  still.drawImage(ctx.canvas, 0, 0);

  const output = document.createElement('canvas');
  output.width = sceneWidth;
  output.height = sceneHeight;
  const end = output.getContext('2d', { alpha: false })!;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  texturedBackground(250, 1690);
  const sourcesRtl = dirFor(detectLang(strings['video.watch'])) === 'rtl';
  ctx.direction = sourcesRtl ? 'rtl' : 'ltr';
  ctx.textAlign = sourcesRtl ? 'right' : 'left';
  const sourceEdge = sourcesRtl ? 1020 : 60;
  ctx.fillStyle = '#fff';
  ctx.font = '700 36px "Geist", sans-serif';
  ctx.fillText(brand, sourceEdge, 290);
  ctx.font = fontFor(strings['video.watch'], 56);
  ctx.fillText(strings['video.watch'], sourceEdge, 574, 960);
  ctx.font = fontFor(strings['video.originals'], 56);
  ctx.fillText(strings['video.originals'], sourceEdge, 640, 960);
  let labelX = sourceEdge;
  if (clip.sourceUrl) {
    const qr = qrGeometry(clip.sourceUrl, 220);
    const x = sourcesRtl ? sourceEdge - qr.size : sourceEdge;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, 760, qr.size, qr.size);
    ctx.save();
    ctx.translate(x, 760);
    ctx.fillStyle = ink;
    ctx.fill(new Path2D(qr.path));
    ctx.restore();
    labelX += (qr.size + 36) * (sourcesRtl ? -1 : 1);
  }
  ctx.fillStyle = '#fff';
  ctx.font = fontFor(source || title, 40, lang);
  ctx.fillText(source || title, labelX, 860, 650);
  ctx.fillStyle = mist;
  ctx.font = '500 22px "Geist Mono", monospace';
  ctx.fillText(timeRange, labelX, 909, 650);
  end.drawImage(ctx.canvas, 0, 0);

  return {
    frame(input: HTMLCanvasElement | OffscreenCanvas, at: number) {
      ctx.drawImage(layout, 0, 0);
      const top = 680;
      const band = 608;
      ctx.save();
      ctx.translate(0, top);
      ctx.beginPath();
      ctx.rect(0, 0, sceneWidth, band);
      ctx.clip();
      ctx.filter = 'blur(52px) brightness(0.55)';
      cover(ctx, input, sceneWidth, band);
      ctx.filter = 'none';
      ctx.drawImage(input, 0, 0, sceneWidth, band);
      ctx.restore();
      const clock = videoClock(video.start + at);
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.font = '500 19px "Geist Mono", monospace';
      ctx.fillStyle = 'rgba(11,11,12,0.72)';
      ctx.fillRect(24, top + 24, ctx.measureText(clock).width + 20, 34);
      ctx.fillStyle = '#fff';
      ctx.fillText(clock, 34, top + 48);

      const cue = video.cues.find((item) => item.start <= at && item.end > at);
      if (!cue) return;
      const caption = cleanText(cue.text);
      const captionLang = detectLang(caption, clip.lang);
      ctx.direction = dirFor(captionLang);
      ctx.textAlign = 'center';
      ctx.font = fontFor(caption, 38, captionLang);
      const rows = wrap(ctx, caption, 930, 3, captionLang);
      const width = Math.min(
        960,
        Math.max(0, ...rows.map((row) => ctx.measureText(row).width)) + 32,
      );
      ctx.fillStyle = '#fff';
      ctx.fillRect(
        (sceneWidth - width) / 2,
        1328,
        width,
        rows.length * 48 + 20,
      );
      ctx.fillStyle = ink;
      rows.forEach((row, index) =>
        ctx.fillText(row, sceneWidth / 2, 1372 + index * 48, width - 20),
      );
    },
    sources(alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(output, 0, 0);
      ctx.globalAlpha = 1;
    },
  };
}
