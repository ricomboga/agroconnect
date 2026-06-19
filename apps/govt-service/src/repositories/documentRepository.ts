import { prisma } from '@agroconnect/db/govt';
import { PaginationParams } from '../types/index.js';

export async function createDocument(data: {
  userId: string;
  documentType: 'national_id' | 'title_deed' | 'kra_pin' | 'business_permit' | 'other';
  fileName: string;
  mediaUrl: string;
  registrationId?: string;
}) {
  return prisma.govtDocument.create({ data });
}

export async function findDocumentsByUser(userId: string, pagination: PaginationParams) {
  return prisma.govtDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countDocumentsByUser(userId: string) {
  return prisma.govtDocument.count({ where: { userId } });
}
