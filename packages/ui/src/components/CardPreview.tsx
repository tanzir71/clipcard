import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Card } from '@clipcard/cards/view';
import type { CardModel, CardOptions } from '@clipcard/cards';
import { tokens } from '@clipcard/cards';
import { prepareCardAssets } from '@clipcard/cards/assets';
import type { CardAssets } from '@clipcard/cards/assets';
import { typefaceFor } from '@clipcard/cards/typefaces';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { modelForDraft, optionsForDraft } from '../draft.ts';
import type { CardDraft } from '../draft.ts';
import '../ui.css';

export function useDraftArt(draft: CardDraft) {
  const blob = draft.photo?.blob;
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setImage({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return useMemo(() => {
    const model = modelForDraft(
      draft,
      image?.blob === blob ? (image?.url ?? null) : null,
      Date.now(),
    );
    return { model, options: optionsForDraft(draft, model) };
  }, [draft, image, blob]);
}

interface PreviewProps {
  model: CardModel;
  options: CardOptions;
  maxWidth?: number;
  onHeadline?: () => void;
}

export function CardPreview({
  model,
  options,
  maxWidth,
  onHeadline,
}: PreviewProps) {
  const [naturalWidth, naturalHeight] = tokens.card.formats[options.format];
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState<{
    key: string;
    assets: CardAssets;
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const template = options.template;
  const typeface = typefaceFor(model.headline, model.lang, model.script);
  const convertText =
    typeface && model.script === 'myanmar' ? model.headline : '';
  const assetKey =
    template + ':' + (typeface?.family ?? '') + ':' + convertText;

  useEffect(() => {
    let live = true;
    prepareCardAssets(template, [typeface], [convertText])
      .then((assets) => {
        if (live) {
          setReady({ key: assetKey, assets });
          setFailure(null);
        }
      })
      .catch(() => {
        if (live) setFailure(assetKey);
      });
    return () => {
      live = false;
    };
  }, [template, typeface, assetKey, convertText]);

  useEffect(() => {
    const div = viewport.current;
    if (!div) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(div);
    return () => observer.disconnect();
  }, []);

  function click(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('.cc-headline'))
      onHeadline?.();
  }

  return (
    <div
      className="clip-preview"
      ref={viewport}
      onClick={onHeadline ? click : undefined}
      style={{ maxWidth, aspectRatio: naturalWidth + ' / ' + naturalHeight }}
    >
      {ready?.key === assetKey && width > 0 ? (
        <div
          className="clip-preview-scale"
          style={{ transform: 'scale(' + width / naturalWidth + ')' }}
        >
          <Card model={model} options={options} assets={ready.assets} />
        </div>
      ) : failure === assetKey ? (
        <p role="alert">{strings['card.renderFailed']}</p>
      ) : null}
    </div>
  );
}

export function DraftPreview({
  draft,
  className,
  maxWidth,
}: {
  draft: CardDraft;
  className?: string;
  maxWidth?: number;
}) {
  const art = useDraftArt(draft);
  return (
    <div className={className}>
      <CardPreview {...art} maxWidth={maxWidth} />
    </div>
  );
}
