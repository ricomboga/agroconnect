import * as subsidyRepo from '../repositories/subsidyRepository.js';
import { ApplySubsidyDto } from '../schemas/applySubsidy.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function listPrograms(pagination: PaginationParams) {
  const [programs, total] = await Promise.all([
    subsidyRepo.findAllActivePrograms(pagination),
    subsidyRepo.countActivePrograms(),
  ]);
  return { programs, total };
}

export async function applyForSubsidy(
  farmerId: string,
  programId: string,
  dto: ApplySubsidyDto,
) {
  const program = await subsidyRepo.findProgramById(programId);
  if (!program || !program.isActive) {
    throw createError('Subsidy program not found', 404, 'PROGRAM_NOT_FOUND', 'error.subsidy.program_not_found');
  }

  const existing = await subsidyRepo.findExistingApplication(farmerId, programId);
  if (existing) {
    throw createError(
      'Already applied for this program',
      409,
      'DUPLICATE_APPLICATION',
      'error.subsidy.duplicate_application',
    );
  }

  return subsidyRepo.createApplication(farmerId, programId, dto);
}

export async function listApplications(farmerId: string, pagination: PaginationParams) {
  const [applications, total] = await Promise.all([
    subsidyRepo.findApplicationsByFarmer(farmerId, pagination),
    subsidyRepo.countApplicationsByFarmer(farmerId),
  ]);
  return { applications, total };
}
