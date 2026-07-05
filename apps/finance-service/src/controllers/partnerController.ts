import { Request, Response, NextFunction } from 'express';
import * as partnerRepo from '../repositories/loanPartnerRepository.js';

export async function listPartners(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const partners = await partnerRepo.findAllPartners();
    res.json({
      data: partners.map((p) => ({
        id:                 p.id,
        name:               p.name,
        type:               p.type,
        description:        p.description ?? null,
        minLoanKes:         Number(p.minLoanKes),
        maxLoanKes:         Number(p.maxLoanKes),
        processingDays:     p.processingDays,
        activeFarmers:      p.activeFarmers,
        repaymentRatePct:   Number(p.repaymentRatePct),
        interestRateAnnual: Number(p.interestRateAnnual),
      })),
    });
  } catch (err) {
    next(err);
  }
}
