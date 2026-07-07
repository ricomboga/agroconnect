import * as adminStatsRepo from '../../../src/repositories/adminStatsRepository';

const mockFarmGroupBy = jest.fn();
const mockAnimalGroupFindMany = jest.fn();

jest.mock('@agroconnect/db/farm', () => ({
  prisma: {
    farm: {
      groupBy: (...args: unknown[]) => mockFarmGroupBy(...args),
    },
    animalGroup: {
      findMany: (...args: unknown[]) => mockAnimalGroupFindMany(...args),
    },
    activity: {
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('../../../src/logger.js', () => ({ logger: { warn: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

describe('adminStatsRepository.countFarmersByCounty', () => {
  it('dedupes multiple farms owned by the same farmer within a county', async () => {
    mockFarmGroupBy.mockResolvedValue([
      { county: 'Kitui', ownerId: 'owner-1' },
      { county: 'Kitui', ownerId: 'owner-1' },
      { county: 'Kitui', ownerId: 'owner-2' },
      { county: 'Nairobi', ownerId: 'owner-3' },
    ]);

    const result = await adminStatsRepo.countFarmersByCounty();

    expect(result).toEqual(
      expect.arrayContaining([
        { county: 'Kitui', farmerCount: 2 },
        { county: 'Nairobi', farmerCount: 1 },
      ]),
    );
  });

  it('excludes soft-deleted farms', async () => {
    mockFarmGroupBy.mockResolvedValue([]);

    await adminStatsRepo.countFarmersByCounty();

    expect(mockFarmGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
  });

  it('returns an empty array when there are no farms', async () => {
    mockFarmGroupBy.mockResolvedValue([]);

    expect(await adminStatsRepo.countFarmersByCounty()).toEqual([]);
  });
});

describe('adminStatsRepository.sumLivestockByCounty', () => {
  it('sums animal counts per county and animal type', async () => {
    mockAnimalGroupFindMany.mockResolvedValue([
      { count: 5, animalType: 'pig', farm: { county: 'Kitui' } },
      { count: 3, animalType: 'pig', farm: { county: 'Kitui' } },
      { count: 10, animalType: 'cow', farm: { county: 'Kitui' } },
    ]);

    const result = await adminStatsRepo.sumLivestockByCounty({});

    expect(result).toEqual(
      expect.arrayContaining([
        { county: 'Kitui', animalType: 'pig', totalCount: 8 },
        { county: 'Kitui', animalType: 'cow', totalCount: 10 },
      ]),
    );
  });

  it('forwards optional county and animalType filters to the where clause', async () => {
    mockAnimalGroupFindMany.mockResolvedValue([]);

    await adminStatsRepo.sumLivestockByCounty({ county: 'Kitui', animalType: 'pig' });

    expect(mockAnimalGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          animalType: 'pig',
          farm: expect.objectContaining({ county: 'Kitui', deletedAt: null }),
        }),
      }),
    );
  });

  it('returns an empty array when there is no matching livestock', async () => {
    mockAnimalGroupFindMany.mockResolvedValue([]);

    expect(await adminStatsRepo.sumLivestockByCounty({})).toEqual([]);
  });
});
