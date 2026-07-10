import { prisma } from '@agroconnect/db/market';
import { PaginationParams } from '../types/index.js';
import { CreateListingDto } from '../schemas/createListing.schema.js';
import { UpdateListingDto } from '../schemas/updateListing.schema.js';
import { ListListingsQuery } from '../schemas/listListings.query.schema.js';

export async function createListing(farmerId: string, dto: CreateListingDto) {
  return prisma.produceListing.create({
    data: {
      farmerId,
      farmId: dto.farmId,
      harvestId: dto.harvestId ?? null,
      crop: dto.crop,
      variety: dto.variety ?? null,
      quantityKg: dto.quantityKg,
      askingPriceKes: dto.askingPriceKes,
      qualityGrade: dto.qualityGrade,
      availableFrom: new Date(dto.availableFrom),
      availableUntil: new Date(dto.availableUntil),
      locationCounty: dto.locationCounty,
      locationDescription: dto.locationDescription ?? null,
      photos: dto.photos ?? [],
    },
  });
}

function buildListingsWhere(query: ListListingsQuery) {
  // A farmer viewing their own listings sees every status (sold/expired/withdrawn
  // included); public browse only ever shows active listings.
  const where: Record<string, unknown> = query.farmerId
    ? { farmerId: query.farmerId }
    : { status: 'active' };
  if (query.crop) where['crop'] = { contains: query.crop, mode: 'insensitive' };
  if (query.county) where['locationCounty'] = { contains: query.county, mode: 'insensitive' };
  if (query.quality_grade) where['qualityGrade'] = query.quality_grade;
  if (query.available_from) where['availableUntil'] = { gte: new Date(query.available_from) };
  if (query.available_until) where['availableFrom'] = { lte: new Date(query.available_until) };
  return where;
}

export async function findListings(query: ListListingsQuery, pagination: PaginationParams) {
  return prisma.produceListing.findMany({
    where: buildListingsWhere(query),
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { createdAt: 'desc' },
  });
}

export async function countListings(query: ListListingsQuery) {
  return prisma.produceListing.count({ where: buildListingsWhere(query) });
}

export async function findListingById(listingId: string) {
  return prisma.produceListing.findUnique({ where: { id: listingId } });
}

export async function updateListing(listingId: string, dto: UpdateListingDto) {
  return prisma.produceListing.update({
    where: { id: listingId },
    data: {
      ...dto,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
      availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : undefined,
    },
  });
}

export async function withdrawListing(listingId: string) {
  return prisma.produceListing.update({
    where: { id: listingId },
    data: { status: 'withdrawn' },
  });
}

export async function incrementViews(listingId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE produce_listings SET views = views + 1 WHERE id = ${listingId}
  `;
}
