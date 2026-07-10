import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import * as partnerRepo from '../repositories/loanPartnerRepository.js';
import { createError } from '../middleware/errorHandler.js';

function serializePartner(p: Awaited<ReturnType<typeof partnerRepo.findPartnerById>>) {
  if (!p) return null;
  return {
    id:                  p.id,
    name:                p.name,
    type:                p.type,
    description:         p.description ?? null,
    licenceNo:           p.licenceNo ?? null,
    paybill:             p.paybill ?? null,
    headOfficeCounty:    p.headOfficeCounty ?? null,
    headOfficeSubCounty: p.headOfficeSubCounty ?? null,
    minLoanKes:          Number(p.minLoanKes),
    maxLoanKes:          Number(p.maxLoanKes),
    processingDays:      p.processingDays,
    activeFarmers:       p.activeFarmers,
    repaymentRatePct:    Number(p.repaymentRatePct),
    interestRateAnnual:  Number(p.interestRateAnnual),
  };
}

export async function listPartners(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const partners = await partnerRepo.findAllPartners();
    res.json({ data: partners.map((p: (typeof partners)[number]) => serializePartner(p)) });
  } catch (err) {
    next(err);
  }
}

export async function getPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const partner = await partnerRepo.findPartnerById(req.params['id'] as string);
    if (!partner) throw createError('Partner not found', 404, 'PARTNER_NOT_FOUND', 'error.finance.partner_not_found');
    res.json({ data: serializePartner(partner) });
  } catch (err) {
    next(err);
  }
}

export async function createPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const partner = await partnerRepo.createPartner(randomUUID(), req.body);
    res.status(201).json({ data: serializePartner(partner) });
  } catch (err) {
    next(err);
  }
}

export async function updatePartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const partner = await partnerRepo.updatePartner(req.params['id'] as string, req.body);
    res.json({ data: serializePartner(partner) });
  } catch (err) {
    next(err);
  }
}
