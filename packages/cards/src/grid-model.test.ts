import { describe, expect, it } from 'vitest';
import { excerptText, gridModel } from './grid-model.ts';
import type { GridClip } from './grid-model.ts';

const clip: GridClip = {
  kind: 'text',
  id: 'a',
  title: 'An article',
  text: 'First, a quote.',
  sourceUrl: 'https://example.org/a?utm_source=feed&edition=2',
};

describe('grid layouts', () => {
  it('merges text directives for the same cleaned source in clip order', () => {
    const model = gridModel([
      {
        ...clip,
        id: 'b',
        text: 'Second quote',
        sourceUrl: 'https://example.org/a?edition=2#section',
      },
      clip,
      { ...clip, id: 'c', text: 'Third quote' },
      { ...clip, id: 'd', text: 'Fourth quote' },
    ]);
    expect(model.layout).toBe('excerpts');
    expect(model.clips.map(({ id }) => id)).toEqual(['b', 'a', 'c']);
    expect(model.sources).toHaveLength(1);
    expect(model.sources[0]?.qrUrl).toBe(
      'https://example.org/a?edition=2#:~:text=Second%20quote&text=First%2C%20a%20quote.&text=Third%20quote',
    );
  });

  it('groups separate articles into different cells and omits QRs for local clips', () => {
    const model = gridModel([
      { ...clip, kind: 'image' },
      {
        ...clip,
        id: 'b',
        sourceUrl: 'https://example.org/b',
        text: 'Independent excerpt',
      },
      { ...clip, id: 'c', kind: 'section', sourceUrl: null },
      { ...clip, id: 'd', text: 'Shares the photo URL' },
    ]);
    expect(model.layout).toBe('board');
    expect(
      model.sources.map(({ clips, qrUrl }) => ({
        ids: clips.map(({ id }) => id),
        qrUrl,
      })),
    ).toEqual([
      {
        ids: ['a', 'd'],
        qrUrl:
          'https://example.org/a?edition=2#:~:text=Shares%20the%20photo%20URL',
      },
      {
        ids: ['b'],
        qrUrl: 'https://example.org/b#:~:text=Independent%20excerpt',
      },
      { ids: ['c'], qrUrl: null },
    ]);
  });

  it('auto-selects Grid 3 or 4 and supports an explicit compatible layout', () => {
    const images = Array.from({ length: 7 }, (_, index): GridClip => ({
      ...clip,
      id: String(index),
      kind: 'image',
    }));
    expect(gridModel(images.slice(0, 3)).layout).toBe('grid3');
    expect(gridModel(images).layout).toBe('grid4');
    expect(gridModel(images).clips).toHaveLength(6);
    expect(gridModel(images, { layout: 'grid3' }).clips).toHaveLength(3);
    expect(gridModel(images, { layout: 'excerpts' }).layout).toBe('grid4');
  });

  it('caps excerpts at 280 grapheme clusters without breaking complex characters', () => {
    const unit = '👨‍👦';
    expect(excerptText(' ' + unit.repeat(281) + ' ')).toBe(unit.repeat(280));
  });

  it.each(['ar', 'ur'])(
    'keeps the %s source language and RTL direction',
    (lang) => {
      const model = gridModel([
        { ...clip, title: 'شہر کی خبر', text: 'ایک اقتباس', lang },
      ]);
      expect(model).toMatchObject({ lang, dir: 'rtl' });
    },
  );
});
