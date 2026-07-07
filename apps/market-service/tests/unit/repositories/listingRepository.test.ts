const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockExecuteRaw = jest.fn();

jest.mock('@agroconnect/db/market', () => ({
  prisma: {
    produceListing: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    $executeRaw: mockExecuteRaw,
  },
}));

import * as repo from '../../../src/repositories/listingRepository';

const BASE = {
  id: 'listing-001',
  farmerId: 'farmer-001',
  farmId: 'farm-001',
  crop: 'maize',
  status: 'active',
  views: 0,
};

beforeEach(() => jest.clearAllMocks());

describe('listingRepository.createListing', () => {
  it('calls prisma.produceListing.create with correct data', async () => {
    mockCreate.mockResolvedValue(BASE);
    const dto = {
      farmId: 'farm-001',
      crop: 'maize',
      quantityKg: 500,
      askingPriceKes: 42,
      qualityGrade: 'A' as const,
      availableFrom: '2026-07-01',
      availableUntil: '2026-07-31',
      locationCounty: 'Nakuru' as const,
    };
    const result = await repo.createListing('farmer-001', dto);
    expect(result).toEqual(BASE);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ farmerId: 'farmer-001', crop: 'maize' }),
    });
  });
});

describe('listingRepository.findListings', () => {
  it('queries with status active and pagination', async () => {
    mockFindMany.mockResolvedValue([BASE]);
    const result = await repo.findListings({ page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(result).toEqual([BASE]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'active' }), take: 20, skip: 0 }),
    );
  });

  it('applies crop filter case-insensitively', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findListings({ crop: 'maize', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ crop: { contains: 'maize', mode: 'insensitive' } }),
      }),
    );
  });

  it('applies county filter', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findListings({ county: 'Nakuru', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationCounty: { contains: 'Nakuru', mode: 'insensitive' } }),
      }),
    );
  });

  it('applies quality_grade filter', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findListings({ quality_grade: 'A', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ qualityGrade: 'A' }) }),
    );
  });

  it('applies available_from filter (listing must still be available after date)', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findListings({ available_from: '2026-07-01', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    const call = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where['availableUntil']).toBeDefined();
  });

  it('applies available_until filter', async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findListings({ available_until: '2026-07-31', page: 1, page_size: 20 }, { take: 20, skip: 0 });
    const call = mockFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where['availableFrom']).toBeDefined();
  });
});

describe('listingRepository.countListings', () => {
  it('calls prisma.produceListing.count', async () => {
    mockCount.mockResolvedValue(5);
    const result = await repo.countListings({ page: 1, page_size: 20 });
    expect(result).toBe(5);
    expect(mockCount).toHaveBeenCalled();
  });
});

describe('listingRepository.findListingById', () => {
  it('calls findUnique with correct id', async () => {
    mockFindUnique.mockResolvedValue(BASE);
    const result = await repo.findListingById('listing-001');
    expect(result).toEqual(BASE);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'listing-001' } });
  });

  it('returns null when not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await repo.findListingById('missing');
    expect(result).toBeNull();
  });
});

describe('listingRepository.updateListing', () => {
  it('calls prisma.produceListing.update', async () => {
    mockUpdate.mockResolvedValue({ ...BASE, crop: 'beans' });
    const result = await repo.updateListing('listing-001', { crop: 'beans' });
    expect(result.crop).toBe('beans');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'listing-001' }, data: expect.objectContaining({ crop: 'beans' }) }),
    );
  });

  it('converts availableFrom string to Date', async () => {
    mockUpdate.mockResolvedValue(BASE);
    await repo.updateListing('listing-001', { availableFrom: '2026-08-01' });
    const call = mockUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data['availableFrom']).toBeInstanceOf(Date);
  });
});

describe('listingRepository.withdrawListing', () => {
  it('sets status to withdrawn', async () => {
    mockUpdate.mockResolvedValue({ ...BASE, status: 'withdrawn' });
    await repo.withdrawListing('listing-001');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'listing-001' },
      data: { status: 'withdrawn' },
    });
  });
});

describe('listingRepository.incrementViews', () => {
  it('calls $executeRaw for atomic increment', async () => {
    mockExecuteRaw.mockResolvedValue(1);
    await repo.incrementViews('listing-001');
    expect(mockExecuteRaw).toHaveBeenCalled();
  });
});
