import sharp from 'sharp';

const MAX_DIMENSION = 1920;

export async function resizeIfNeeded(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const image = sharp(buffer);
  const { width, height } = await image.metadata();

  if (!width || !height || (width <= MAX_DIMENSION && height <= MAX_DIMENSION)) {
    return buffer;
  }

  const resized = image.resize(MAX_DIMENSION, MAX_DIMENSION, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  return mimeType === 'image/png' ? resized.png().toBuffer() : resized.jpeg().toBuffer();
}
