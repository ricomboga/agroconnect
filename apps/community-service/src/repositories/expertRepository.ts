import { prisma } from '@agroconnect/db/community';
import { CreateExpertDto } from '../schemas/createExpert.schema.js';
import { UpdateExpertDto } from '../schemas/updateExpert.schema.js';
import { PaginationParams } from '../types/index.js';

export type ExpertFilter = {
  providerType?: string;
  /** Match experts whose subCountiesServed includes this exact sub-county. */
  subCounty?: string;
  /** Match experts whose countiesServed includes any of these counties. */
  counties?: string[];
};

function buildWhere(filter: ExpertFilter) {
  return {
    isActive: true,
    ...(filter.providerType && { providerType: filter.providerType as never }),
    ...(filter.subCounty && { subCountiesServed: { has: filter.subCounty } }),
    ...(filter.counties?.length && { countiesServed: { hasSome: filter.counties } }),
  };
}

export async function createExpert(dto: CreateExpertDto) {
  return prisma.expert.create({ data: dto });
}

export async function findExpertById(id: string) {
  return prisma.expert.findFirst({ where: { id, isActive: true } });
}

export async function findExpertByUserId(userId: string) {
  return prisma.expert.findFirst({ where: { userId, isActive: true } });
}

export async function updateExpert(id: string, dto: UpdateExpertDto) {
  return prisma.expert.update({ where: { id }, data: dto });
}

export async function findExperts(filter: ExpertFilter, pagination: PaginationParams) {
  return prisma.expert.findMany({
    where: buildWhere(filter),
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countExperts(filter: ExpertFilter) {
  return prisma.expert.count({ where: buildWhere(filter) });
}
