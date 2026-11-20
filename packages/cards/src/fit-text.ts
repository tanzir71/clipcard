export function fitText(
  min: number,
  max: number,
  fits: (size: number) => boolean,
): number {
  let first = Math.ceil(min);
  let end = Math.floor(max);

  while (first <= end) {
    const size = Math.floor((first + end) / 2);
    if (fits(size)) first = size + 1;
    else end = size - 1;
  }

  return Math.max(min, end);
}
