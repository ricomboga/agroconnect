import * as officerProfileRepo from '../repositories/officerProfileRepository.js';
import { CreateOfficerProfileDto } from '../schemas/createOfficerProfile.schema.js';
import { UpdateOfficerProfileDto } from '../schemas/updateOfficerProfile.schema.js';
import { createError } from '../middleware/errorHandler.js';

export async function createOfficerProfile(dto: CreateOfficerProfileDto) {
  return officerProfileRepo.createOfficerProfile(dto);
}

export async function getOfficerProfile(id: string) {
  const profile = await officerProfileRepo.findOfficerProfileById(id);
  if (!profile) {
    throw createError('Officer profile not found', 404, 'OFFICER_PROFILE_NOT_FOUND', 'error.officer_profile.not_found');
  }
  return profile;
}

export async function updateOfficerProfile(id: string, dto: UpdateOfficerProfileDto) {
  await getOfficerProfile(id);
  return officerProfileRepo.updateOfficerProfile(id, dto);
}

export async function getOfficerProfileByUserId(userId: string) {
  const profile = await officerProfileRepo.findOfficerProfileByUserId(userId);
  if (!profile) {
    throw createError('Officer profile not found', 404, 'OFFICER_PROFILE_NOT_FOUND', 'error.officer_profile.not_found');
  }
  return profile;
}

export async function listOfficerProfiles() {
  return officerProfileRepo.findOfficerProfiles();
}
