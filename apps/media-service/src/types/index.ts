import type { AuthRequest } from '@agroconnect/shared';

export type AuthenticatedRequest = AuthRequest;

export interface UploadResult {
  url: string;
  cdn_url: string;
  key: string;
  size_bytes: number;
  mime_type: string;
}

export interface DetectedFile {
  mime: 'image/jpeg' | 'image/png' | 'application/pdf';
  ext: 'jpg' | 'png' | 'pdf';
}
