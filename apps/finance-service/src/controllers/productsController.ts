import { Request, Response, NextFunction } from 'express';
import * as productRepo from '../repositories/loanProductRepository.js';
import { createError } from '../middleware/errorHandler.js';

function mapProduct(p: Awaited<ReturnType<typeof productRepo.findProductById>>) {
  if (!p) return null;
  return {
    id:              p.id,
    partnerId:       p.partnerId,
    partnerName:     p.partner.name,
    partnerType:     p.partner.type,
    name:            p.name,
    category:        p.category,
    description:     p.description ?? null,
    interestRate:    Number(p.interestRate),
    minAmountKes:    Number(p.minAmountKes),
    maxAmountKes:    Number(p.maxAmountKes),
    repaymentMonths: p.repaymentMonths,
    eligibilityBand: p.eligibilityBand,
  };
}

export async function listProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await productRepo.findAllProducts();
    res.json({ data: products.map(mapProduct) });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productRepo.findProductById(req.params['productId'] as string);
    if (!product) {
      throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND', 'error.finance.product_not_found');
    }
    res.json({ data: mapProduct(product) });
  } catch (err) {
    next(err);
  }
}
