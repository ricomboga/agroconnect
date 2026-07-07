jest.mock('../../../src/repositories/supplierProfileRepository');

import * as supplierProfileRepo from '../../../src/repositories/supplierProfileRepository';
import * as supplierProfileService from '../../../src/services/supplierProfileService';

const mockRepo = supplierProfileRepo as jest.Mocked<typeof supplierProfileRepo>;

const BASE_PROFILE = {
  id: 'profile-001',
  userId: 'user-001',
  businessName: 'Nakuru Agrovet',
  description: null,
  county: 'Nakuru',
  subCounty: null,
  categories: ['fertiliser', 'seed'],
  phone: '+254712345678',
  address: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createDto = {
  userId: 'user-001',
  businessName: 'Nakuru Agrovet',
  county: 'Nakuru' as const,
  categories: ['fertiliser', 'seed'],
  phone: '+254712345678',
};

beforeEach(() => jest.clearAllMocks());

describe('supplierProfileService.createOrUpdateSupplierProfile', () => {
  it('upserts the profile via the repository', async () => {
    mockRepo.upsertSupplierProfile.mockResolvedValue(BASE_PROFILE as never);

    const result = await supplierProfileService.createOrUpdateSupplierProfile(createDto);

    expect(mockRepo.upsertSupplierProfile).toHaveBeenCalledWith(createDto);
    expect(result.id).toBe('profile-001');
  });
});

describe('supplierProfileService.listSupplierProfiles', () => {
  it('returns paginated profiles and total', async () => {
    mockRepo.findSupplierProfiles.mockResolvedValue([BASE_PROFILE] as never);
    mockRepo.countSupplierProfiles.mockResolvedValue(1);

    const result = await supplierProfileService.listSupplierProfiles(
      { county: 'Nakuru' },
      { take: 20, skip: 0 },
    );

    expect(result.profiles).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockRepo.findSupplierProfiles).toHaveBeenCalledWith({ county: 'Nakuru' }, { take: 20, skip: 0 });
  });
});
