import * as subsidyRepo from '../repositories/subsidyRepository.js';
import { SubsidyApplicationListFilters } from '../repositories/subsidyRepository.js';
import * as registrationRepo from '../repositories/registrationRepository.js';
import { ApplySubsidyDto } from '../schemas/applySubsidy.schema.js';
import { CreateSubsidyProgramDto } from '../schemas/createSubsidyProgram.schema.js';
import { UpdateSubsidyApplicationStatusDto } from '../schemas/updateSubsidyApplicationStatus.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

const OFFICER_ROLES = ['govt_officer', 'admin'];

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

export async function listApplications(
  userId: string,
  role: string,
  pagination: PaginationParams,
  filters: SubsidyApplicationListFilters = {},
) {
  // Officers/admins review the queue across all farmers, scoped only by the optional
  // county/status query filters. Farmers only ever see their own applications.
  if (OFFICER_ROLES.includes(role)) {
    const [applications, total] = await Promise.all([
      subsidyRepo.findAllApplications(filters, pagination),
      subsidyRepo.countAllApplications(filters),
    ]);
    return { applications, total };
  }

  const [applications, total] = await Promise.all([
    subsidyRepo.findApplicationsByFarmer(userId, pagination),
    subsidyRepo.countApplicationsByFarmer(userId),
  ]);
  return { applications, total };
}

export async function updateApplicationStatus(
  applicationId: string,
  officerId: string,
  dto: UpdateSubsidyApplicationStatusDto,
) {
  const application = await subsidyRepo.findApplicationById(applicationId);
  if (!application) {
    throw createError(
      'Subsidy application not found',
      404,
      'APPLICATION_NOT_FOUND',
      'error.subsidy.application_not_found',
    );
  }

  // Best-effort county lookup (same service/DB — not a cross-service call) so we can format
  // the KE/{county}/{year}/{sequence} certificate number. Falls back to 'NA' if the farm was
  // never registered through this service's registration flow.
  const registration = await registrationRepo.findRegistrationByFarmId(application.farmId);
  const county = registration?.county ?? 'NA';

  let certNumber: string | undefined;
  if (dto.status === 'approved') {
    const year = new Date().getFullYear();
    const seq = await subsidyRepo.nextCertSequence(county, year);
    certNumber = `KE/${county}/${year}/${seq}`;
  }

  return subsidyRepo.updateApplicationStatus(applicationId, officerId, {
    status: dto.status,
    approvedItems: dto.approved_items,
    deliveryDate: dto.delivery_date,
    collectionPoint: dto.collection_point,
    transportProvided: dto.transport_provided,
    officerNotes: dto.officer_notes,
    certNumber,
    county,
  });
}

export async function createProgram(dto: CreateSubsidyProgramDto) {
  return subsidyRepo.createProgram(dto);
}

function deriveProgramStatus(program: {
  isActive: boolean;
  applicationOpenDate: Date | null;
  deadline: Date | null;
}): 'draft' | 'upcoming' | 'open' | 'closed' {
  if (!program.isActive) return 'draft';
  const now = new Date();
  if (program.applicationOpenDate && program.applicationOpenDate > now) return 'upcoming';
  if (program.deadline && program.deadline < now) return 'closed';
  return 'open';
}

type AdminProgramRow = Awaited<ReturnType<typeof subsidyRepo.findAllProgramsAdmin>>[number];
type StatusCountRow = Awaited<ReturnType<typeof subsidyRepo.countApplicationsByProgramGroupedByStatus>>[number];

export interface ListProgramsAdminFilters {
  ministry?: string;
  status?: 'draft' | 'upcoming' | 'open' | 'closed';
}

export async function listMinistries() {
  return subsidyRepo.findDistinctMinistries();
}

export async function listProgramsAdmin(pagination: PaginationParams, filters: ListProgramsAdminFilters = {}) {
  const allPrograms = await subsidyRepo.findAllProgramsAdmin({ ministry: filters.ministry });

  const withStatus = allPrograms.map((p: AdminProgramRow) => ({ ...p, status: deriveProgramStatus(p) }));
  type ProgramWithStatus = (typeof withStatus)[number];
  const filtered = filters.status
    ? withStatus.filter((p: ProgramWithStatus) => p.status === filters.status)
    : withStatus;

  const total = filtered.length;
  const page = filtered.slice(pagination.skip, pagination.skip + pagination.take);

  const counts = await subsidyRepo.countApplicationsByProgramGroupedByStatus(
    page.map((p: ProgramWithStatus) => p.id),
  );

  const data = page.map((p: ProgramWithStatus) => {
    const pending = counts
      .filter((c: StatusCountRow) => c.programId === p.id && ['submitted', 'under_review'].includes(c.status))
      .reduce((sum: number, c: StatusCountRow) => sum + c._count.id, 0);
    const approved = counts
      .filter((c: StatusCountRow) => c.programId === p.id && ['approved', 'disbursed'].includes(c.status))
      .reduce((sum: number, c: StatusCountRow) => sum + c._count.id, 0);
    const rejected = counts
      .filter((c: StatusCountRow) => c.programId === p.id && c.status === 'rejected')
      .reduce((sum: number, c: StatusCountRow) => sum + c._count.id, 0);
    const budgetAllocatedPct = p.maxBeneficiaries
      ? Math.round((approved / p.maxBeneficiaries) * 100)
      : null;

    return {
      ...p,
      pending_count: pending,
      approved_count: approved,
      rejected_count: rejected,
      budget_allocated_pct: budgetAllocatedPct,
    };
  });

  return { programs: data, total };
}

export interface BulkApproveDto {
  ids: string[];
  collectionPoint?: string;
  deliveryDate?: Date;
  approvedItems?: string;
}

export async function bulkApproveApplications(dto: BulkApproveDto, officerId: string) {
  const year = new Date().getFullYear();
  const updates = [];
  for (const id of dto.ids) {
    const application = await subsidyRepo.findApplicationById(id);
    if (!application) continue;
    const registration = await registrationRepo.findRegistrationByFarmId(application.farmId);
    const county = registration?.county ?? 'NA';
    const seq = await subsidyRepo.nextCertSequence(county, year);
    updates.push({
      id,
      status: 'approved' as const,
      officerId,
      approvedItems: dto.approvedItems,
      deliveryDate: dto.deliveryDate,
      collectionPoint: dto.collectionPoint,
      certNumber: `KE/${county}/${year}/${seq}`,
      county,
    });
  }
  return subsidyRepo.bulkUpdateApplicationsStatus(updates);
}
