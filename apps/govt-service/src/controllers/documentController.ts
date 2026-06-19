import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as documentService from '../services/documentService.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { createError } from '../middleware/errorHandler.js';

/**
 * @openapi
 * /api/v1/govt/documents:
 *   post:
 *     summary: Upload a government document
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, documentType]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [national_id, title_deed, kra_pin, business_permit, other]
 *               registrationId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Document uploaded
 *       400:
 *         description: Validation error or missing file
 *       401:
 *         description: Missing or invalid JWT
 */
export async function uploadDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      return next(createError('File is required', 400, 'FILE_REQUIRED', 'error.document.file_required'));
    }
    const document = await documentService.uploadDocument(req.user.id, req.file, req.body);
    res.status(201).json({ data: document });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/documents:
 *   get:
 *     summary: List uploaded documents
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of documents
 *       401:
 *         description: Missing or invalid JWT
 */
export async function listDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { documents, total } = await documentService.listDocuments(req.user.id, pagination);
    res.json({
      data: documents,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}
