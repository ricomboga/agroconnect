import { useAuthStore } from '../stores/authStore';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export type MediaCategory =
  | 'farm-photos'
  | 'diagnosis-images'
  | 'govt-documents'
  | 'product-photos'
  | 'profile-photos';

export interface UploadedMedia {
  url: string;
  cdn_url: string;
  key: string;
  size_bytes: number;
  mime_type: string;
}

export interface UploadFileInput {
  uri: string;
  name: string;
  mimeType: string;
}

export async function uploadMedia(
  file: UploadFileInput,
  category: MediaCategory,
  entityId: string,
): Promise<UploadedMedia> {
  const token = useAuthStore.getState().token;

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
  formData.append('category', category);
  formData.append('entity_id', entityId);

  const res = await fetch(`${BASE_URL}/media/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json() as { error?: { message?: string }; error_code?: string };
    throw new Error(body.error?.message ?? body.error_code ?? 'Upload failed');
  }

  const json = await res.json() as { data: UploadedMedia };
  return json.data;
}
