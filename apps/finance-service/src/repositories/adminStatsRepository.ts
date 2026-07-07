import { prisma } from '@agroconnect/db/finance';

export async function sumDisbursedLoans(): Promise<number> {
  const result = await prisma.loanApplication.aggregate({
    where: { status: 'disbursed' },
    _sum: { approvedAmountKes: true },
  });
  const raw = result._sum.approvedAmountKes;
  if (raw === null || raw === undefined) return 0;
  return typeof raw === 'number' ? raw : Number(raw);
}

export interface InstitutionLoanTotal {
  institutionId: string;
  institutionName: string;
  totalDisbursedKes: number;
}

export async function sumDisbursedLoansByInstitution(): Promise<InstitutionLoanTotal[]> {
  const groups = await prisma.loanApplication.groupBy({
    by: ['partnerBankId'],
    where: { status: 'disbursed', partnerBankId: { not: null } },
    _sum: { approvedAmountKes: true },
  });

  const partnerIds = groups.map((g) => g.partnerBankId).filter((id): id is string => id !== null);
  const partners = await prisma.loanPartner.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(partners.map((p) => [p.id, p.name]));

  return groups
    .filter((g) => g.partnerBankId !== null)
    .map((g) => {
      const raw = g._sum.approvedAmountKes;
      const totalDisbursedKes = raw === null || raw === undefined ? 0 : Number(raw);
      return {
        institutionId: g.partnerBankId as string,
        institutionName: nameById.get(g.partnerBankId as string) ?? 'Unknown',
        totalDisbursedKes,
      };
    });
}
