export function chromeMessages(messages: Record<string, string>) {
  const converted: Record<string, { message: string }> = {};
  for (const [key, value] of Object.entries(messages)) {
    if (key.startsWith('_')) continue;

    const name = key.replace(/[^a-z\d_]/gi, '_');
    if (Object.hasOwn(converted, name)) {
      throw new Error(`Duplicate Chrome locale key: ${name}`);
    }
    converted[name] = { message: value.replaceAll('$', () => '$$') };
  }
  return converted;
}
