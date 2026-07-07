jest.mock('../../../src/repositories/listingRepository');
jest.mock('../../../src/events/producers/listingCreatedProducer');
jest.mock('../../../src/events/producers/listingInquiryProducer');

import * as listingRepo from '../../../src/repositories/listingRepository';
import { publishListingCreated } from '../../../src/events/producers/listingCreatedProducer';
import { publishListingInquiry } from '../../../src/events/producers/listingInquiryProducer';
import * as listingService from '../../../src/services/listingService';

const mockRepo = listingRepo as jest.Mocked<typeof listingRepo>;
const mockPublishCreated = publishListingCreated as jest.MockedFunction<typeof publishListingCreated>;
const mockPublishInquiry = publishListingInquiry as jest.MockedFunction<typeof publishListingInquiry>;

const FARMER_ID = 'farmer-001';

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

beforeEach(() => jest.clearAllMocks());

describe('listingService.browseListings', () => {
  it('returns paginated listings with meta', async () => {
    mockRepo.findListings.mockResolvedValue([BASE_LISTING]);
    mockRepo.countListings.mockResolvedValue(1);
    const result = await listingService.browseListings({
      page: 1,
      page_size: 20,
    });
    expect(result.listings).toHaveLength(1);
    expect(result.meta).toMatchObject({ page: 1, page_size: 20, total: 1, total_pages: 1 });
  });

  it('handles empty result', async () => {
    mockRepo.findListings.mockResolvedValue([]);
    mockRepo.countListings.mockResolvedValue(0);
    const result = await listingService.browseListings({ page: 1, page_size: 20 });
    expect(result.listings).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

describe('listingService.createListing', () => {
  it('creates listing and publishes kafka event', async () => {
    mockRepo.createListing.mockResolvedValue(BASE_LISTING);
    mockPublishCreated.mockResolvedValue(undefined);
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
    const result = await listingService.createListing(FARMER_ID, dto);
    expect(result).toEqual(BASE_LISTING);
    expect(mockPublishCreated).toHaveBeenCalledWith(
      BASE_LISTING.id,
      FARMER_ID,
      BASE_LISTING.crop,
      BASE_LISTING.locationCounty,
    );
  });
});

describe('listingService.getListing', () => {
  it('returns listing and fires view increment', async () => {
    mockRepo.findListingById.mockResolvedValue(BASE_LISTING);
    mockRepo.incrementViews.mockResolvedValue(undefined);
    const result = await listingService.getListing('listing-001');
    expect(result).toEqual(BASE_LISTING);
    // fire-and-forget — give microtask queue a tick
    await Promise.resolve();
    expect(mockRepo.incrementViews).toHaveBeenCalledWith('listing-001');
  });

  it('throws 404 when listing does not exist', async () => {
    mockRepo.findListingById.mockResolvedValue(null);
    await expect(listingService.getListing('missing')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'LISTING_NOT_FOUND',
    });
  });
});

describe('listingService.inquireListing', () => {
  it('publishes inquiry event for active listing', async () => {
    mockRepo.findListingById.mockResolvedValue(BASE_LISTING);
    mockPublishInquiry.mockResolvedValue(undefined);
    await listingService.inquireListing('listing-001', 'buyer-001', { message: 'Is this still available?' });
    expect(mockPublishInquiry).toHaveBeenCalledWith(
      'listing-001',
      FARMER_ID,
      'buyer-001',
      'Is this still available?',
    );
  });

  it('throws 404 when listing does not exist', async () => {
    mockRepo.findListingById.mockResolvedValue(null);
    await expect(
      listingService.inquireListing('missing', 'buyer-001', { message: 'hello' }),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'LISTING_NOT_FOUND' });
  });

  it('throws 422 when listing is not active', async () => {
    mockRepo.findListingById.mockResolvedValue({ ...BASE_LISTING, status: 'sold' as const });
    await expect(
      listingService.inquireListing('listing-001', 'buyer-001', { message: 'hello' }),
    ).rejects.toMatchObject({ statusCode: 422, errorCode: 'LISTING_UNAVAILABLE' });
  });
});
