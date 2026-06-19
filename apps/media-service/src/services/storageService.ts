import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { UploadResult } from '../types/index.js';

function getS3Client(): S3Client {
  return new S3Client({ region: process.env['AWS_REGION'] ?? 'af-south-1' });
}

function bucket(): string {
  const b = process.env['S3_BUCKET_NAME'];
  if (!b) throw new Error('S3_BUCKET_NAME env var is not set');
  return b;
}

function cdnBase(): string {
  return (process.env['CDN_BASE_URL'] ?? '').replace(/\/$/, '');
}

export async function uploadToS3(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const s3 = getS3Client();
  const b = bucket();

  await s3.send(
    new PutObjectCommand({
      Bucket: b,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const region = process.env['AWS_REGION'] ?? 'af-south-1';
  const url = `https://${b}.s3.${region}.amazonaws.com/${key}`;
  const cdn_url = `${cdnBase()}/${key}`;

  return { url, cdn_url, key, size_bytes: buffer.length, mime_type: mimeType };
}

export async function deleteFromS3(key: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function getPresignedUrl(key: string, expiresIn: number): Promise<string> {
  const s3 = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}
