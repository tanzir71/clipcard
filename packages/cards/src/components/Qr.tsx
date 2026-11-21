import { memo } from 'react';
import strings from '@clipcard/i18n/en';
import { qrGeometry } from '../qr.ts';
import { tokens } from '../tokens.ts';

type QrProps =
  | { url: string; size: number; minModulePx?: number }
  | { geometry: ReturnType<typeof qrGeometry> };

export const Qr = memo(function Qr(props: QrProps) {
  const geometry =
    'geometry' in props
      ? props.geometry
      : qrGeometry(props.url, props.size, props.minModulePx);
  return (
    <svg
      className="cc-qr"
      role="img"
      aria-label={strings['card.qr']}
      width={geometry.size}
      height={geometry.size}
      viewBox={'0 0 ' + geometry.size + ' ' + geometry.size}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path fill={tokens.card.qr.dark} d={geometry.path} />
    </svg>
  );
});
