import * as expertRepo from '../repositories/expertRepository.js';
import { CreateExpertDto } from '../schemas/createExpert.schema.js';
import { ListExpertsQuery } from '../schemas/listExperts.query.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function createExpert(dto: CreateExpertDto) {
  return expertRepo.createExpert(dto);
}

export async function getExpert(id: string) {
  const expert = await expertRepo.findExpertById(id);
  if (!expert) throw createError('Expert not found', 404, 'EXPERT_NOT_FOUND', 'error.expert.not_found');
  return expert;
}

export async function listExperts(query: ListExpertsQuery, pagination: PaginationParams) {
  const filter: expertRepo.ExpertFilter = {
    county: query.county,
    providerType: query.providerType,
  };
  const [experts, total] = await Promise.all([
    expertRepo.findExperts(filter, pagination),
    expertRepo.countExperts(filter),
  ]);
  return { experts, total };
}
