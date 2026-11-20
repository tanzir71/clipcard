import { expect, it } from 'vitest';
import { cleanUrl } from './url.ts';
import {
  clipCaptionCues,
  initialVideoRange,
  moveVideoHandle,
  videoMomentUrl,
  videoSourceUrl,
} from './video.ts';

it('makes cleaned timestamp links for YouTube and other video pages', () => {
  const youtube = 'https://m.youtube.com/shorts/abcdefABC_0?si=tracker';
  expect(videoSourceUrl(youtube)).toBe('https://youtu.be/abcdefABC_0');
  expect(videoMomentUrl(youtube, 83.4)).toBe(
    'https://youtu.be/abcdefABC_0?t=83',
  );
  const publisher = 'https://news.example/show?utm_source=mail#player';
  expect(videoMomentUrl(publisher, 83)).toBe('https://news.example/show#t=83');
  expect(cleanUrl('https://news.example/show#t=83').url).toBe(
    'https://news.example/show#t=83',
  );
  expect(cleanUrl('https://news.example/show#t=anything').url).toBe(
    'https://news.example/show',
  );
  expect(videoMomentUrl('javascript:void(0)', 83)).toBeNull();
});

it('snaps to the loaded captions and keeps drag handles within a minute', () => {
  const cues = [{ start: 83, end: 101, text: '<c> First   boats </c>' }];
  expect(initialVideoRange(92, 130, cues)).toEqual({ start: 83, end: 101 });
  expect(initialVideoRange(99, 100)).toEqual({ start: 80, end: 100 });
  expect(initialVideoRange(10, Infinity)).toBeNull();
  expect(moveVideoHandle({ start: 30, end: 45 }, 'end', 110, 120).end).toBe(90);
  expect(moveVideoHandle({ start: 30, end: 45 }, 'start', 48, 120).start).toBe(
    44,
  );
  expect(clipCaptionCues(cues, { start: 84, end: 92 })).toEqual([
    { text: 'First boats', start: 0, end: 8 },
  ]);
});
