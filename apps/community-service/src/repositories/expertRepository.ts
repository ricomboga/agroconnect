import { prisma } from '@agroconnect/db/community';
import { CreateExpertDto } from '../schemas/createExpert.schema.js';
import { PaginationParams } from '../types/index.js';

export type ExpertFilter = {
  county?: string;
  providerType?: string;
};

export async function createExpert(dto: CreateExpertDto) {
  return prisma.expert.create({ data: dto });
}

export async function findExpertById(id: string) {
  return prisma.expert.findFirst({ where: { id, isActive: true } });
}

export async function findExperts(filter: ExpertFilter, pagination: PaginationParams) {
  return prisma.expert.findMany({
    where: {
      isActive: true,
      ...(filter.providerType && { providerType: filter.providerType as never }),
      ...(filter.county && { countiesServed: { has: filter.county } }),
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countExperts(filter: ExpertFilter) {
  return prisma.expert.count({
    where: {
      isActive: true,
      ...(filter.providerType && { providerType: filter.providerType as never }),
      ...(filter.county && { countiesServed: { has: filter.county } }),
    },
  });
}
