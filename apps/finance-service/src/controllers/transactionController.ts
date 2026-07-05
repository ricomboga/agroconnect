import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import type { CreateTransactionDto } from '../schemas/createTransaction.schema.js';
import * as txRepo from '../repositories/transactionRepository.js';

export async function listTransactions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await txRepo.findTransactionsByFarmer(req.user.id);
    const data = rows.map((r) => ({
      id:            r.id,
      farmerId:      r.farmerId,
      type:          r.type,
      amountKes:     Number(r.amountKes),
      category:      r.category,
      linkedTo:      r.linkedTo,
      buyerSupplier: r.buyerSupplier,
      date:          r.date,
      notes:         r.notes,
      createdAt:     r.createdAt.toISOString(),
    }));
    res.json({ data });
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
    const r = await txRepo.createTransaction(req.user.id, dto);
    res.status(201).json({
      data: {
        id:            r.id,
        farmerId:      r.farmerId,
        type:          r.type,
        amountKes:     Number(r.amountKes),
        category:      r.category,
        linkedTo:      r.linkedTo,
        buyerSupplier: r.buyerSupplier,
        date:          r.date,
        notes:         r.notes,
        createdAt:     r.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
