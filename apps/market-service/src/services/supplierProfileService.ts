import { getRegionCounties } from '@agroconnect/shared/constants/counties';
import * as supplierProfileRepo from '../repositories/supplierProfileRepository.js';
import { CreateSupplierProfileDto } from '../schemas/createSupplierProfile.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function createOrUpdateSupplierProfile(dto: CreateSupplierProfileDto) {
  return supplierProfileRepo.upsertSupplierProfile(dto);
}

export async function getSupplierProfile(id: string) {
  const profile = await supplierProfileRepo.findSupplierProfileById(id);
  if (!profile)
    throw createError('Supplier not found', 404, 'SUPPLIER_PROFILE_NOT_FOUND', 'error.supplier_profile.not_found');
  return profile;
}

export interface ListSupplierProfilesFilter {
  county?: string;
  subCounty?: string;
  category?: string;
  userId?: string;
}

export type LocationMatchTier = 'subCounty' | 'county' | 'region' | null;

/**
 * Searches nearest-first: sub-county match, then county, then region — each
 * tier only runs if the previous one came back empty, so a farmer sees the
 * closest available supplier rather than an empty list.
 */
export async function listSupplierProfiles(
  filter: ListSupplierProfilesFilter,
  pagination: PaginationParams,
) {
  const { county, subCounty, category, userId } = filter;

  async function run(f: supplierProfileRepo.SupplierProfileFilter) {
    const [profiles, total] = await Promise.all([
      supplierProfileRepo.findSupplierProfiles(f, pagination),
      supplierProfileRepo.countSupplierProfiles(f),
    ]);
    return { profiles, total };
  }

  if (subCounty && county) {
    const bySubCounty = await run({ county, subCounty, category, userId });
    if (bySubCounty.total > 0) return { ...bySubCounty, matchedOn: 'subCounty' as LocationMatchTier };
  }

  if (county) {
    const byCounty = await run({ county, category, userId });
    if (byCounty.total > 0) return { ...byCounty, matchedOn: 'county' as LocationMatchTier };

    const regionCounties = getRegionCounties(county);
    if (regionCounties.length > 0) {
      const byRegion = await run({ counties: [...regionCounties], category, userId });
      return { ...byRegion, matchedOn: 'region' as LocationMatchTier };
    }
  }

  const unfiltered = await run({ category, userId });
  return { ...unfiltered, matchedOn: null as LocationMatchTier };
}
