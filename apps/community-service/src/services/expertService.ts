import { getRegionCounties } from '@agroconnect/shared/constants/counties';
import * as expertRepo from '../repositories/expertRepository.js';
import { CreateExpertDto } from '../schemas/createExpert.schema.js';
import { UpdateExpertDto } from '../schemas/updateExpert.schema.js';
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

export async function updateExpert(id: string, dto: UpdateExpertDto) {
  await getExpert(id);
  return expertRepo.updateExpert(id, dto);
}

export async function getExpertByUserId(userId: string) {
  const expert = await expertRepo.findExpertByUserId(userId);
  if (!expert) throw createError('Expert not found', 404, 'EXPERT_NOT_FOUND', 'error.expert.not_found');
  return expert;
}

export type LocationMatchTier = 'subCounty' | 'county' | 'region' | null;

/**
 * Searches nearest-first: sub-county match, then county, then region — each
 * tier only runs if the previous one came back empty, so a farmer sees the
 * closest available provider rather than an empty list.
 */
export async function listExperts(query: ListExpertsQuery, pagination: PaginationParams) {
  const providerType = query.providerType;

  async function run(filter: expertRepo.ExpertFilter) {
    const [experts, total] = await Promise.all([
      expertRepo.findExperts(filter, pagination),
      expertRepo.countExperts(filter),
    ]);
    return { experts, total };
  }

  if (query.subCounty) {
    const bySubCounty = await run({ providerType, subCounty: query.subCounty });
    if (bySubCounty.total > 0) return { ...bySubCounty, matchedOn: 'subCounty' as LocationMatchTier };
  }

  if (query.county) {
    const byCounty = await run({ providerType, counties: [query.county] });
    if (byCounty.total > 0) return { ...byCounty, matchedOn: 'county' as LocationMatchTier };

    const regionCounties = getRegionCounties(query.county);
    if (regionCounties.length > 0) {
      const byRegion = await run({ providerType, counties: [...regionCounties] });
      return { ...byRegion, matchedOn: 'region' as LocationMatchTier };
    }
  }

  const unfiltered = await run({ providerType });
  return { ...unfiltered, matchedOn: null as LocationMatchTier };
}
