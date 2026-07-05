import { prisma } from '@agroconnect/db/govt';
import { CreateRegistrationDto } from '../schemas/createRegistration.schema.js';
import { UpdateRegistrationStatusDto } from '../schemas/updateRegistrationStatus.schema.js';
import { ListRegistrationsQuery } from '../schemas/listRegistrations.schema.js';
import { PaginationParams } from '../types/index.js';

export interface RegistrationListFilters {
  county?: ListRegistrationsQuery['county'];
  status?: ListRegistrationsQuery['status'];
}

export async function createRegistration(
  farmerId: string,
  dto: CreateRegistrationDto,
  registrationRef: string,
) {
  return prisma.farmRegistration.create({
    data: { ...dto, farmerId, registrationRef, status: 'submitted' },
  });
}

export async function findRegistrationsByFarmer(
  farmerId: string,
  pagination: PaginationParams,
) {
  return prisma.farmRegistration.findMany({
    where: { farmerId },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countRegistrationsByFarmer(farmerId: string) {
  return prisma.farmRegistration.count({ where: { farmerId } });
}

// Officer/admin queue — lists across all farmers, filterable by county/status, always paginated.
export async function findAllRegistrations(
  filters: RegistrationListFilters,
  pagination: PaginationParams,
) {
  return prisma.farmRegistration.findMany({
    where: {
      county: filters.county,
      status: filters.status,
    },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countAllRegistrations(filters: RegistrationListFilters) {
  return prisma.farmRegistration.count({
    where: {
      county: filters.county,
      status: filters.status,
    },
  });
}

export async function findRegistrationById(id: string) {
  return prisma.farmRegistration.findUnique({
    where: { id },
    include: { documents: true },
  });
}

// Best-effort lookup used to derive a farm's county for other govt-service records (e.g.
// subsidy applications) that only carry a farmId. Same service/DB — not a cross-service call.
export async function findRegistrationByFarmId(farmId: string) {
  return prisma.farmRegistration.findFirst({ where: { farmId } });
}

export async function updateRegistrationStatus(
  id: string,
  officerId: string,
  dto: UpdateRegistrationStatusDto,
) {
  return prisma.farmRegistration.update({
    where: { id },
    data: { status: dto.status, notes: dto.notes, officerId },
  });
}
