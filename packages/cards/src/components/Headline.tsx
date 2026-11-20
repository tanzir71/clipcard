import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { fitText } from '../fit-text.ts';
import type { EmphasisStyle } from '../model.ts';
import type { TextRange } from '@clipcard/core';

interface Props {
  title: string;
  wordBreakLocale?: 'th' | 'my';
  boxWidthRatio?: number;
  range?: TextRange | null;
  secondRange?: TextRange;
  emphasis: EmphasisStyle;
  color: string;
  keyColor: string;
  maxSize: number;
  minSize: number;
  lines: number;
  lineHeight: number;
  availableHeight: number;
  panel?: boolean;
  secondLine?: boolean;
}

const wordSegmenters = {
  my: new Intl.Segmenter('my', { granularity: 'word' }),
  th: new Intl.Segmenter('th', { granularity: 'word' }),
};

function withWordBreaks(text: string, locale?: Props['wordBreakLocale']) {
  if (!locale) return text;
  return Array.from(wordSegmenters[locale].segment(text), (part) => (
    <Fragment key={part.index}>
      {part.index > 0 && part.isWordLike ? <wbr /> : null}
      {part.segment}
    </Fragment>
  ));
}

export function Headline({
  title,
  wordBreakLocale,
  boxWidthRatio = 0.75,
  range,
  secondRange,
  emphasis,
  color,
  keyColor,
  maxSize,
  minSize,
  lines,
  lineHeight,
  availableHeight,
  panel = false,
  secondLine = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [breakAt, setBreakAt] = useState(0);
  const [start, end] = range ?? [0, 0];
  const validRange = start >= 0 && end > start && end <= title.length;
  const shapeBox = panel && emphasis === 'box' && validRange;
  useLayoutEffect(() => {
    const element = ref.current;
    const strong = element?.querySelector('strong');
    if (!shapeBox || !element || !strong) return;

    const measure = document.createElement('span');
    const defined = getComputedStyle(strong);
    measure.style.cssText =
      'position:fixed;visibility:hidden;white-space:nowrap;inline-size:max-content;pointer-events:none';
    measure.style.fontFamily = defined.fontFamily;
    measure.style.fontWeight = defined.fontWeight;
    measure.style.fontSize = maxSize + 'px';
    const card = element.closest('article');
    measure.lang = card?.lang ?? '';
    measure.dir = card?.dir ?? '';
    document.body.append(measure);
    try {
      const highlight = title.slice(start, end);
      const maxLine = Math.min(
        element.clientWidth * boxWidthRatio,
        maxSize * 14,
      );
      measure.textContent = highlight;
      if (measure.offsetWidth + 20 <= maxLine) {
        setBreakAt(0);
        return;
      }
      let index = 0;
      for (const boundary of highlight.matchAll(/\s+/gu)) {
        if (boundary.index <= 0) continue;
        measure.textContent = highlight.slice(0, boundary.index);
        if (measure.offsetWidth + 20 > maxLine) break;
        index = start + boundary.index;
      }
      setBreakAt(index);
    } finally {
      measure.remove();
    }
  }, [shapeBox, title, start, end, maxSize, boxWidthRatio]);

  const wrappedKey = shapeBox && breakAt > start && breakAt < end;
  const extra =
    secondRange &&
    secondRange[0] >= end &&
    secondRange[1] > secondRange[0] &&
    secondRange[1] <= title.length
      ? secondRange
      : undefined;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.display = 'block';
    element.style.maxHeight = 'none';
    element.style.textWrap = 'wrap';
    const size = fitText(minSize, maxSize, (value) => {
      element.style.fontSize = value + 'px';
      return (
        element.scrollHeight <=
          Math.min(lines * lineHeight * value, availableHeight) + 1 &&
        element.scrollWidth <= element.clientWidth + 1
      );
    });
    element.style.fontSize = size + 'px';
    element.style.maxHeight =
      Math.min(lines * lineHeight * size, availableHeight) + 'px';
    if (!panel && size < maxSize) element.style.textWrap = 'balance';
    element.style.display = '-webkit-box';
  }, [
    title,
    validRange,
    start,
    end,
    emphasis,
    minSize,
    maxSize,
    lines,
    lineHeight,
    availableHeight,
    panel,
    wrappedKey,
    breakAt,
  ]);

  const style = {
    color,
    fontSize: maxSize,
    lineHeight,
    WebkitLineClamp: lines,
    '--cc-key': keyColor,
  } as CSSProperties;
  const words = (text: string) => withWordBreaks(text, wordBreakLocale);

  return (
    <div
      ref={ref}
      className="cc-headline"
      data-emphasis={emphasis}
      style={style}
    >
      {validRange && secondLine && start > 0 ? (
        <>
          {words(title.slice(0, start).trimEnd())}
          <br />
          <span className="cc-duotone-key">
            <strong>{words(title.slice(start, end))}</strong>
            {words(title.slice(end))}
          </span>
        </>
      ) : validRange ? (
        <>
          {words(title.slice(0, start))}
          {wrappedKey ? (
            <>
              <strong>{words(title.slice(start, breakAt))}</strong>
              <br />
              <strong>{words(title.slice(breakAt, end).trimStart())}</strong>
            </>
          ) : (
            <strong>{words(title.slice(start, end))}</strong>
          )}
          {extra ? (
            <>
              {words(title.slice(end, extra[0]))}
              <strong>{words(title.slice(extra[0], extra[1]))}</strong>
              {words(title.slice(extra[1]))}
            </>
          ) : (
            words(title.slice(end))
          )}
        </>
      ) : (
        words(title)
      )}
    </div>
  );
}
