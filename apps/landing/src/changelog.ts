export function releaseEntries(markdown: string) {
  const sections = markdown.split(/^## /m).slice(1);
  return sections.flatMap((section) => {
    const [header, ...lines] = section.split(/\r?\n/);
    const match = /^\[?(v?\d+\.\d+\.\d+)\]?\s+[-—]\s+(\d{4}-\d{2}-\d{2})$/.exec(
      header ?? '',
    );
    if (!match) return [];

    const [, version, date] = match;
    const changes = lines
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2));
    return [{ version, date, changes }];
  });
}
