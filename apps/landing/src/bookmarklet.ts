import source from '../../lite/bookmarklet.ts?raw';
import { buildBookmarklet } from '../../../scripts/bookmarklet.ts';

export function landingBookmarklet(appUrl: URL) {
  return buildBookmarklet(appUrl.href, source);
}
