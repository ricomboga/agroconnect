import * as listingRepo from '../repositories/listingRepository.js';
import { publishListingCreated } from '../events/producers/listingCreatedProducer.js';
import { publishListingInquiry } from '../events/producers/listingInquiryProducer.js';
import { createError } from '../middleware/errorHandler.js';
import { parsePaginationParams, buildMeta } from '../utils/pagination.js';
import { getFarmCrops } from '../clients/farmServiceClient.js';
import { CreateListingDto } from '../schemas/createListing.schema.js';
import { UpdateListingDto } from '../schemas/updateListing.schema.js';
import { ListListingsQuery } from '../schemas/listListings.query.schema.js';
import { CreateInquiryDto } from '../schemas/createInquiry.schema.js';

export async function browseListings(query: ListListingsQuery) {
  const pagination = parsePaginationParams(query as Record<string, unknown>);
  const [listings, total] = await Promise.all([
    listingRepo.findListings(query, pagination),
    listingRepo.countListings(query),
  ]);
  return { listings, meta: buildMeta(query as Record<string, unknown>, pagination, total) };
}

export async function createListing(farmerId: string, dto: CreateListingDto, accessToken: string) {
  const farmCrops = await getFarmCrops(dto.farmId, accessToken);
  const isGrown = farmCrops.some((c) => c.toLowerCase() === dto.crop.trim().toLowerCase());
  if (!isGrown) {
    throw createError(
      'You can only list a crop that is recorded on this farm',
      422,
      'CROP_NOT_GROWN_ON_FARM',
      'error.market.crop_not_grown_on_farm',
    );
  }

  const listing = await listingRepo.createListing(farmerId, dto);
  await publishListingCreated(listing.id, farmerId, listing.crop, listing.locationCounty);
  return listing;
}

export async function getListing(listingId: string) {
  const listing = await listingRepo.findListingById(listingId);
  if (!listing) throw createError('Listing not found', 404, 'LISTING_NOT_FOUND');
  listingRepo.incrementViews(listingId).catch(() => undefined);
  return listing;
}

export async function updateListing(listingId: string, farmerId: string, dto: UpdateListingDto) {
  const listing = await listingRepo.findListingById(listingId);
  if (!listing) throw createError('Listing not found', 404, 'LISTING_NOT_FOUND');
  if (listing.farmerId !== farmerId) throw createError('Forbidden', 403, 'FORBIDDEN');
  if (listing.status === 'withdrawn') throw createError('Cannot update a withdrawn listing', 422, 'LISTING_WITHDRAWN');
  return listingRepo.updateListing(listingId, dto);
}

export async function withdrawListing(listingId: string, farmerId: string) {
  const listing = await listingRepo.findListingById(listingId);
  if (!listing) throw createError('Listing not found', 404, 'LISTING_NOT_FOUND');
  if (listing.farmerId !== farmerId) throw createError('Forbidden', 403, 'FORBIDDEN');
  if (listing.status === 'withdrawn') throw createError('Listing already withdrawn', 422, 'LISTING_WITHDRAWN');
  return listingRepo.withdrawListing(listingId);
}

export async function inquireListing(listingId: string, buyerId: string, dto: CreateInquiryDto) {
  const listing = await listingRepo.findListingById(listingId);
  if (!listing) throw createError('Listing not found', 404, 'LISTING_NOT_FOUND');
  if (listing.status !== 'active') throw createError('Listing is not available', 422, 'LISTING_UNAVAILABLE');
  await publishListingInquiry(listingId, listing.farmerId, buyerId, dto.message);
}
