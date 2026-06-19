import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types/index.js';
import { uploadBodySchema } from '../schemas/upload.schema.js';
import { signUrlQuerySchema } from '../schemas/signUrl.schema.js';
import { detectFileType, isImage } from '../utils/magicBytes.js';
import { resizeIfNeeded } from '../utils/imageResize.js';
import * as storageService from '../services/storageService.js';
import { createError } from '../middleware/errorHandler.js';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * @openapi
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload an image or document
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, category, entity_id]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category:
 *                 type: string
 *                 enum: [farm-photos, diagnosis-images, govt-documents, product-photos, profile-photos]
 *               entity_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Missing file, unsupported type, or size exceeded
 *       401:
 *         description: Missing or invalid JWT
 */
export async function uploadMedia(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      next(createError('No file provided', 400, 'FILE_MISSING', 'error.media.file_missing'));
      return;
    }

    const bodyResult = uploadBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message_key: 'error.validation',
        details: bodyResult.error.flatten(),
        request_id: req.headers['x-request-id'] ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { category, entity_id } = bodyResult.data;
    const fileBuffer = req.file.buffer;

    const detected = detectFileType(fileBuffer);
    if (!detected) {
      next(
        createError(
          'Unsupported file type — only JPEG, PNG, and PDF are accepted',
          400,
          'UNSUPPORTED_FILE_TYPE',
          'error.media.unsupported_type',
        ),
      );
      return;
    }

    const maxBytes = isImage(detected) ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
    if (fileBuffer.length > maxBytes) {
      next(
        createError(
          `File exceeds the ${isImage(detected) ? '5 MB' : '10 MB'} size limit`,
          400,
          'FILE_TOO_LARGE',
          'error.media.file_too_large',
        ),
      );
      return;
    }

    const processedBuffer = isImage(detected)
      ? await resizeIfNeeded(fileBuffer, detected.mime)
      : fileBuffer;

    const key = `${category}/${entity_id}/${uuidv4()}.${detected.ext}`;
    const result = await storageService.uploadToS3(key, processedBuffer, detected.mime);

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/media/{key}:
 *   delete:
 *     summary: Delete a media object (admin only)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Full S3 key including path segments
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Admin role required
 */
export async function deleteMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const key = (req.params as Record<string, string>)['0'];
    if (!key) {
      next(createError('Key is required', 400, 'KEY_MISSING', 'error.media.key_missing'));
      return;
    }

    await storageService.deleteFromS3(key);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/media/sign/{key}:
 *   get:
 *     summary: Generate a pre-signed S3 URL for a private object
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: expires
 *         schema:
 *           type: integer
 *           default: 3600
 *           maximum: 86400
 *         description: TTL in seconds for the pre-signed URL
 *     responses:
 *       200:
 *         description: Pre-signed URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     signed_url:
 *                       type: string
 *                     expires_in:
 *                       type: integer
 *       400:
 *         description: Invalid expires parameter
 *       401:
 *         description: Missing or invalid JWT
 */
export async function signMedia(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const key = (req.params as Record<string, string>)['0'];
    if (!key) {
      next(createError('Key is required', 400, 'KEY_MISSING', 'error.media.key_missing'));
      return;
    }

    const queryResult = signUrlQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message_key: 'error.validation',
        details: queryResult.error.flatten(),
        request_id: req.headers['x-request-id'] ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { expires } = queryResult.data;
    const signed_url = await storageService.getPresignedUrl(key, expires);

    res.json({ data: { signed_url, expires_in: expires } });
  } catch (err) {
    next(err);
  }
}
