import * as documentRepo from '../repositories/documentRepository.js';
import * as mediaClient from '../clients/mediaClient.js';
import { UploadDocumentDto } from '../schemas/uploadDocument.schema.js';
import { PaginationParams } from '../types/index.js';

export async function uploadDocument(
  userId: string,
  file: Express.Multer.File,
  dto: UploadDocumentDto,
) {
  const { url } = await mediaClient.uploadDocument(
    file.buffer,
    file.originalname,
    file.mimetype,
    userId,
  );

  return documentRepo.createDocument({
    userId,
    documentType: dto.documentType,
    fileName: file.originalname,
    mediaUrl: url,
    registrationId: dto.registrationId,
  });
}

export async function listDocuments(userId: string, pagination: PaginationParams) {
  const [documents, total] = await Promise.all([
    documentRepo.findDocumentsByUser(userId, pagination),
    documentRepo.countDocumentsByUser(userId),
  ]);
  return { documents, total };
}
