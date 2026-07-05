import { prisma } from '@agroconnect/db/finance';
import type { CreateTransactionDto } from '../schemas/createTransaction.schema.js';

export async function createTransaction(farmerId: string, dto: CreateTransactionDto) {
  return prisma.transaction.create({
    data: {
      farmerId,
      type:          dto.type as 'income' | 'expense',
      amountKes:     dto.amountKes,
      category:      dto.category,
      linkedTo:      dto.linkedTo ?? null,
      buyerSupplier: dto.buyerSupplier ?? null,
      date:          dto.date,
      notes:         dto.notes ?? null,
    },
  });
}

export async function findTransactionsByFarmer(farmerId: string) {
  return prisma.transaction.findMany({
    where:   { farmerId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findTransactionsByFarmerInRange(
  farmerId: string,
  range: { fromDate?: string; toDate?: string } = {},
) {
  return prisma.transaction.findMany({
    where: {
      farmerId,
      ...(range.fromDate || range.toDate
        ? { date: { ...(range.fromDate ? { gte: range.fromDate } : {}), ...(range.toDate ? { lte: range.toDate } : {}) } }
        : {}),
    },
    orderBy: { date: 'desc' },
  });
}
