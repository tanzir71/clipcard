import { FLAGS } from '@clipcard/core/flags';

const myanmar = /\p{Script=Myanmar}/u;

let tools:
  | Promise<{
      detector: import('myanmar-tools').ZawgyiDetector;
      converter: import('myanmar-tools').ZawgyiConverter;
    }>
  | undefined;

export async function prepareCardText(
  texts: Iterable<string>,
): Promise<ReadonlyMap<string, string>> {
  const converted = new Map<string, string>();
  if (!FLAGS.languages) return converted;
  const candidates = [...new Set(texts)].filter((text) => myanmar.test(text));
  if (candidates.length === 0) return converted;

  tools ??= import('myanmar-tools').then(
    ({ ZawgyiDetector, ZawgyiConverter }) => ({
      detector: new ZawgyiDetector(),
      converter: new ZawgyiConverter(),
    }),
  );
  const { detector, converter } = await tools;
  for (const text of candidates) {
    if (detector.getZawgyiProbability(text) > 0.95) {
      converted.set(text, converter.zawgyiToUnicode(text));
    }
  }
  return converted;
}
