export async function prepareMark(file: File): Promise<string> {
  if (
    !['image/png', 'image/svg+xml'].includes(file.type) ||
    file.size > 2_000_000
  )
    throw new Error('Unsupported mark file');

  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
    if (maxSide === 0 || maxSide > 4096)
      throw new Error('Unsupported mark dimensions');
    const scale = Math.min(1, 256 / maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG rendering unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(source);
  }
}
