import { logger } from '../logger.js';

const MEDIA_SERVICE_URL = () => process.env['MEDIA_SERVICE_URL'] ?? 'http://localhost:3009';

export interface MediaUploadResult {
  url: string;
  key: string;
}

export async function uploadDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string,
): Promise<MediaUploadResult> {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, fileName);
  formData.append('folder', `govt-documents/${userId}`);

  const response = await fetch(`${MEDIA_SERVICE_URL()}/api/v1/media/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    logger.error({ status: response.status, body: text }, 'media-service upload failed');
    throw new Error(`media-service upload failed with status ${response.status}`);
  }

  const result = (await response.json()) as { url: string; key: string };
  return { url: result.url, key: result.key };
}
