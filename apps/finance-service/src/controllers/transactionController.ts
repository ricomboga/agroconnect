import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import type { CreateTransactionDto } from '../schemas/createTransaction.schema.js';
import { randomUUID } from 'crypto';

// In-memory store per process — persists for the session; good enough for Phase 1
const store = new Map<string, Record<string, unknown>[]>();

function getUserTransactions(userId: string): Record<string, unknown>[] {
  if (!store.has(userId)) store.set(userId, []);
  return store.get(userId)!;
}

export async function listTransactions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const transactions = getUserTransactions(req.user.id);
    res.json({ data: [...transactions].reverse() });
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateTransactionDto;
    const tx = {
      id:            randomUUID(),
      farmerId:      req.user.id,
      type:          dto.type,
      amountKes:     dto.amountKes,
      category:      dto.category,
      linkedTo:      dto.linkedTo ?? null,
      buyerSupplier: dto.buyerSupplier ?? null,
      date:          dto.date,
      notes:         dto.notes ?? null,
      createdAt:     new Date().toISOString(),
    };

    getUserTransactions(req.user.id).push(tx);
    res.status(201).json({ data: tx });
  } catch (err) {
    next(err);
  }
}
