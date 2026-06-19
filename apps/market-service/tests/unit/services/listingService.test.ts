jest.mock('../../../src/repositories/listingRepository');
jest.mock('../../../src/events/producers/listingCreatedProducer');
jest.mock('../../../src/events/producers/listingInquiryProducer');

import * as listingRepo from '../../../src/repositories/listingRepository';
import * as listingService from '../../../src/services/listingService';

const mockRepo = listingRepo as jest.Mocked<typeof listingRepo>;

const FARMER_ID = 'farmer-001';
const OTHER_FARMER_ID = 'farmer-002';

const BASE_LISTING = {
  id: 'listing-001',
  farmerId: FARMER_ID,
  farmId: 'farm-001',
  harvestId: null,
  crop: 'maize',
  variety: null,
  quantityKg: '500',
  askingPriceKes: '42',
  qualityGrade: 'A' as const,
  availableFrom: new Date('2026-07-01'),
  availableUntil: new Date('2026-07-31'),
  locationCounty: 'Nakuru',
  locationDescription: null,
  photos: null,
  status: 'active' as const,
  views: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('listingService.updateListing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 403 when farmerId does not match', async () => {
    mockRepo.findListingById.mockResolvedValue(BASE_LISTING);
    await expect(
      listingService.updateListing('listing-001', OTHER_FARMER_ID, { crop: 'beans' }),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('throws 404 when listing does not exist', async () => {
    mockRepo.findListingById.mockResolvedValue(null);
    await expect(
      listingService.updateListing('missing', FARMER_ID, { crop: 'beans' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'LISTING_NOT_FOUND' });
  });

  it('throws 422 when listing is already withdrawn', async () => {
    mockRepo.findListingById.mockResolvedValue({ ...BASE_LISTING, status: 'withdrawn' as const });
    await expect(
      listingService.updateListing('listing-001', FARMER_ID, { crop: 'beans' }),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'LISTING_WITHDRAWN' });
  });
});

describe('listingService.withdrawListing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 403 when farmerId does not match', async () => {
    mockRepo.findListingById.mockResolvedValue(BASE_LISTING);
    await expect(
      listingService.withdrawListing('listing-001', OTHER_FARMER_ID),
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('throws 404 when listing does not exist', async () => {
    mockRepo.findListingById.mockResolvedValue(null);
    await expect(
      listingService.withdrawListing('missing', FARMER_ID),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'LISTING_NOT_FOUND' });
  });

  it('throws 422 when listing already withdrawn', async () => {
    mockRepo.findListingById.mockResolvedValue({ ...BASE_LISTING, status: 'withdrawn' as const });
    await expect(
      listingService.withdrawListing('listing-001', FARMER_ID),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'LISTING_WITHDRAWN' });
  });
});
