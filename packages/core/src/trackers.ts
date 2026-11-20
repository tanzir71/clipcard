export const TRACKERS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'twclid',
  'ttclid',
  'igshid',
  'igsh',
  'mc_cid',
  'mc_eid',
  'ref_src',
  'ref_url',
  '_ga',
  '_gl',
  'mkt_tok',
  'li_fat_id',
  'oly_anon_id',
  'oly_enc_id',
  'vero_id',
  'rb_clickid',
  's_cid',
  'cmpid',
  'ocid',
]);

const YOUTUBE = /(^|\.)youtube\.com$/;
const X_STATUS = /(^|\.)(x|twitter)\.com$/;

export const isYouTubeHost = (host: string) => YOUTUBE.test(host);

export function isTracker(
  host: string,
  path: string,
  name: string,
  value: string,
) {
  const key = name.toLowerCase();
  if (key.startsWith('utm_') || TRACKERS.has(key)) return true;
  if (
    key === 'si' &&
    (isYouTubeHost(host) || host === 'youtu.be' || host === 'open.spotify.com')
  )
    return true;
  if (
    key === 'feature' &&
    value.toLowerCase() === 'share' &&
    isYouTubeHost(host)
  )
    return true;
  return (
    X_STATUS.test(host) &&
    /\/status\/\d+(?:\/|$)/.test(path) &&
    (key === 's' || key === 't')
  );
}
