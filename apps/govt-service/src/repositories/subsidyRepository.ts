import { prisma } from '@agroconnect/db/govt';
import { ApplySubsidyDto } from '../schemas/applySubsidy.schema.js';
import { CreateSubsidyProgramDto } from '../schemas/createSubsidyProgram.schema.js';
import { UpdateSubsidyApplicationStatusDto } from '../schemas/updateSubsidyApplicationStatus.schema.js';
import { PaginationParams } from '../types/index.js';
import { ListSubsidyApplicationsQuery } from '../schemas/listSubsidyApplications.schema.js';

export interface SubsidyApplicationListFilters {
  programId?: ListSubsidyApplicationsQuery['programId'];
  county?: ListSubsidyApplicationsQuery['county'];
  status?: ListSubsidyApplicationsQuery['status'];
}

export async function findAllActivePrograms(pagination: PaginationParams) {
  return prisma.subsidyProgram.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countActivePrograms() {
  return prisma.subsidyProgram.count({ where: { isActive: true } });
}

// Admin/officer view — includes inactive/draft programs, no isActive restriction.
// Fetches the full matching set (unpaginated) because program "status" (open/upcoming/closed/draft)
// is derived from dates in the service layer, not a DB column — pagination happens after that filter.
export async function findAllProgramsAdmin(filters: { ministry?: string } = {}) {
  return prisma.subsidyProgram.findMany({
    where: {
      ...(filters.ministry ? { providerAgency: filters.ministry } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findDistinctMinistries(): Promise<string[]> {
  const rows = await prisma.subsidyProgram.findMany({
    select: { providerAgency: true },
    distinct: ['providerAgency'],
    orderBy: { providerAgency: 'asc' },
  });
  return rows.map((r: { providerAgency: string }) => r.providerAgency);
}

export async function countApplicationsByProgramGroupedByStatus(programIds: string[]) {
  if (programIds.length === 0) return [] as Awaited<ReturnType<typeof groupByStatus>>;
  return groupByStatus(programIds);
}

function groupByStatus(programIds: string[]) {
  return prisma.subsidyApplication.groupBy({
    by: ['programId', 'status'],
    where: { programId: { in: programIds } },
    _count: { id: true },
  });
}

export async function findProgramById(programId: string) {
  return prisma.subsidyProgram.findUnique({ where: { id: programId } });
}

export async function createApplication(
  farmerId: string,
  programId: string,
  dto: ApplySubsidyDto,
) {
  return prisma.subsidyApplication.create({
    data: { farmerId, programId, farmId: dto.farmId, notes: dto.notes },
    include: { program: true },
  });
}

export async function findApplicationsByFarmer(
  farmerId: string,
  pagination: PaginationParams,
) {
  return prisma.subsidyApplication.findMany({
    where: { farmerId },
    include: { program: true },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countApplicationsByFarmer(farmerId: string) {
  return prisma.subsidyApplication.count({ where: { farmerId } });
}

// Officer/admin queue — lists across all farmers, filterable by county/status, always paginated.
export async function findAllApplications(
  filters: SubsidyApplicationListFilters,
  pagination: PaginationParams,
) {
  return prisma.subsidyApplication.findMany({
    where: {
      programId: filters.programId,
      county: filters.county,
      status: filters.status,
    },
    include: { program: true },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countAllApplications(filters: SubsidyApplicationListFilters) {
  return prisma.subsidyApplication.count({
    where: {
      programId: filters.programId,
      county: filters.county,
      status: filters.status,
    },
  });
}

export async function findExistingApplication(farmerId: string, programId: string) {
  return prisma.subsidyApplication.findUnique({
    where: { farmerId_programId: { farmerId, programId } },
  });
}

export async function findApplicationById(applicationId: string) {
  return prisma.subsidyApplication.findUnique({
    where: { id: applicationId },
    include: { program: true },
  });
}

export async function updateApplicationStatus(
  applicationId: string,
  officerId: string,
  data: {
    status: UpdateSubsidyApplicationStatusDto['status'];
    approvedItems?: string;
    deliveryDate?: Date;
    collectionPoint?: string;
    transportProvided?: boolean;
    officerNotes?: string;
    certNumber?: string;
    county?: string;
  },
) {
  return prisma.subsidyApplication.update({
    where: { id: applicationId },
    data: {
      officerId,
      status: data.status,
      approvedItems: data.approvedItems,
      deliveryDate: data.deliveryDate,
      collectionPoint: data.collectionPoint,
      transportProvided: data.transportProvided,
      officerNotes: data.officerNotes,
      certNumber: data.certNumber,
      county: data.county,
    },
    include: { program: true },
  });
}

// Atomically increments and returns the next certificate sequence number for a county+year,
// replacing the previous non-atomic count-and-increment approach (which could produce
// duplicate sequence numbers under concurrent approvals for the same county+year).
export async function nextCertSequence(county: string, year: number): Promise<number> {
  const rows = await prisma.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "certificate_sequences" ("id", "county", "year", "lastSeq")
    VALUES (gen_random_uuid()::text, ${county}, ${year}, 1)
    ON CONFLICT ("county", "year")
    DO UPDATE SET "lastSeq" = "certificate_sequences"."lastSeq" + 1
    RETURNING "lastSeq"
  `;
  return rows[0]?.lastSeq ?? 1;
}

export async function bulkUpdateApplicationsStatus(
  updates: Array<{
    id: string;
    status: 'approved' | 'rejected';
    officerId: string;
    approvedItems?: string;
    deliveryDate?: Date;
    collectionPoint?: string;
    officerNotes?: string;
    certNumber?: string;
    county?: string;
  }>,
) {
  return prisma.$transaction(
    updates.map((u) =>
      prisma.subsidyApplication.update({
        where: { id: u.id },
        data: {
          officerId: u.officerId,
          status: u.status,
          approvedItems: u.approvedItems,
          deliveryDate: u.deliveryDate,
          collectionPoint: u.collectionPoint,
          officerNotes: u.officerNotes,
          certNumber: u.certNumber,
          county: u.county,
        },
        include: { program: true },
      }),
    ),
  );
}

export async function createProgram(dto: CreateSubsidyProgramDto) {
  return prisma.subsidyProgram.create({
    data: {
      name: dto.name,
      type: dto.type,
      providerAgency: dto.administering_body,
      description: dto.description,
      eligibility: dto.distribution_method,
      benefitType: dto.type,
      benefitValue: dto.item_distributed ?? '',
      countyEligible: dto.eligible_counties,
      deadline: dto.application_close_date,
      applicationOpenDate: dto.application_open_date,
      totalBudgetKes: dto.total_budget_kes,
      maxBeneficiaries: dto.max_beneficiaries,
      itemDistributed: dto.item_distributed,
      maxFarmSizeAcres: dto.max_farm_size_acres,
      minFarmSizeAcres: dto.min_farm_size_acres,
      requireActiveCrop: dto.require_active_crop,
      onePerFarmer: dto.one_per_farmer,
      idVerificationRequired: dto.id_verification_required,
      farmRegistrationRequired: dto.farm_registration_required,
      eligibleFarmerSubtypes: dto.eligible_farmer_subtypes,
      distributionMethod: dto.distribution_method,
      collectionPoints: dto.collection_points,
    },
  });
}
