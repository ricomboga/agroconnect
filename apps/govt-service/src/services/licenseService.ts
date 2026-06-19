import * as licenseRepo from '../repositories/licenseRepository.js';
import { CreateLicenseDto } from '../schemas/createLicense.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function applyForLicense(farmerId: string, dto: CreateLicenseDto) {
  return licenseRepo.createLicense(farmerId, dto);
}

export async function listLicenses(farmerId: string, pagination: PaginationParams) {
  const [licenses, total] = await Promise.all([
    licenseRepo.findLicensesByFarmer(farmerId, pagination),
    licenseRepo.countLicensesByFarmer(farmerId),
  ]);
  return { licenses, total };
}

export async function getLicense(id: string, farmerId: string, role: string) {
  const license = await licenseRepo.findLicenseById(id);
  if (!license) {
    throw createError('License not found', 404, 'LICENSE_NOT_FOUND', 'error.license.not_found');
  }
  if (role !== 'admin' && role !== 'govt_officer' && license.farmerId !== farmerId) {
    throw createError('License not found', 404, 'LICENSE_NOT_FOUND', 'error.license.not_found');
  }
  return license;
}
