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
}

export async function listSupplierProfiles(
  filter: ListSupplierProfilesFilter,
  pagination: PaginationParams,
) {
  const [profiles, total] = await Promise.all([
    supplierProfileRepo.findSupplierProfiles(filter, pagination),
    supplierProfileRepo.countSupplierProfiles(filter),
  ]);
  return { profiles, total };
}
