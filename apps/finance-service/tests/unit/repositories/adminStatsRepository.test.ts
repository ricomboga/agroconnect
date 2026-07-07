import * as adminStatsRepo from '../../../src/repositories/adminStatsRepository';

const mockLoanApplicationAggregate = jest.fn();
const mockLoanApplicationGroupBy = jest.fn();
const mockLoanPartnerFindMany = jest.fn();

jest.mock('@agroconnect/db/finance', () => ({
  prisma: {
    loanApplication: {
      aggregate: (...args: unknown[]) => mockLoanApplicationAggregate(...args),
      groupBy: (...args: unknown[]) => mockLoanApplicationGroupBy(...args),
    },
    loanPartner: {
      findMany: (...args: unknown[]) => mockLoanPartnerFindMany(...args),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('adminStatsRepository.sumDisbursedLoansByInstitution', () => {
  it('joins grouped totals with partner names', async () => {
    mockLoanApplicationGroupBy.mockResolvedValue([
      { partnerBankId: 'partner-1', _sum: { approvedAmountKes: 500000 } },
      { partnerBankId: 'partner-2', _sum: { approvedAmountKes: 250000 } },
    ]);
    mockLoanPartnerFindMany.mockResolvedValue([
      { id: 'partner-1', name: 'Equity Bank' },
      { id: 'partner-2', name: 'KCB' },
    ]);

    const result = await adminStatsRepo.sumDisbursedLoansByInstitution();

    expect(result).toEqual([
      { institutionId: 'partner-1', institutionName: 'Equity Bank', totalDisbursedKes: 500000 },
      { institutionId: 'partner-2', institutionName: 'KCB', totalDisbursedKes: 250000 },
    ]);
  });

  it('only aggregates disbursed loans with a partner assigned', async () => {
    mockLoanApplicationGroupBy.mockResolvedValue([]);
    mockLoanPartnerFindMany.mockResolvedValue([]);

    await adminStatsRepo.sumDisbursedLoansByInstitution();

    expect(mockLoanApplicationGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'disbursed', partnerBankId: { not: null } },
      }),
    );
  });

  it('falls back to the raw institution id when no matching partner is found', async () => {
    mockLoanApplicationGroupBy.mockResolvedValue([
      { partnerBankId: 'partner-unknown', _sum: { approvedAmountKes: 100 } },
    ]);
    mockLoanPartnerFindMany.mockResolvedValue([]);

    const result = await adminStatsRepo.sumDisbursedLoansByInstitution();

    expect(result[0].institutionName).toBe('partner-unknown');
  });

  it('returns an empty array when there are no disbursed loans', async () => {
    mockLoanApplicationGroupBy.mockResolvedValue([]);
    mockLoanPartnerFindMany.mockResolvedValue([]);

    expect(await adminStatsRepo.sumDisbursedLoansByInstitution()).toEqual([]);
  });
});
