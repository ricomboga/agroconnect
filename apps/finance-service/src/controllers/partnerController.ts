import { Request, Response } from 'express';

const MOCK_PARTNERS = [
  {
    id: 'partner-eq-001',
    name: 'Equity Bank Kenya',
    type: 'bank',
    minLoanKes: 5_000,
    maxLoanKes: 500_000,
    interestRatePct: 13.0,
    processingDays: 3,
  },
  {
    id: 'partner-kcb-002',
    name: 'KCB Bank',
    type: 'bank',
    minLoanKes: 10_000,
    maxLoanKes: 500_000,
    interestRatePct: 12.5,
    processingDays: 5,
  },
  {
    id: 'partner-fa-003',
    name: 'Faulu Kenya',
    type: 'microfinance',
    minLoanKes: 2_000,
    maxLoanKes: 200_000,
    interestRatePct: 18.0,
    processingDays: 2,
  },
];

export function listPartners(_req: Request, res: Response): void {
  res.json({ data: MOCK_PARTNERS });
}
