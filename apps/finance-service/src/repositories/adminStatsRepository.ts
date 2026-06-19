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
