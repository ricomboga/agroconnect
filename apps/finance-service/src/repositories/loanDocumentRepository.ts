import { prisma } from '@agroconnect/db/finance';

export interface CreateDocumentParams {
  loanId: string;
  name: string;
  documentType: 'national_id' | 'land_title' | 'farm_photo' | 'bank_statement' | 'payslip' | 'other';
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export async function createDocument(params: CreateDocumentParams) {
  return prisma.loanDocument.create({ data: params });
}

export async function findDocumentsByLoan(loanId: string) {
  return prisma.loanDocument.findMany({
    where: { loanId },
    orderBy: { uploadedAt: 'asc' },
  });
}

export async function deleteDocument(documentId: string, loanId: string) {
  return prisma.loanDocument.deleteMany({ where: { id: documentId, loanId } });
}
