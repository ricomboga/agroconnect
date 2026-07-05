import * as govtClient from '../clients/govtServiceClient.js';
import { record } from './auditService.js';
import type { BulkApproveApplicationsDto } from '../schemas/bulkApproveApplications.schema.js';

export async function listPrograms(
  filters: { status?: string; ministry?: string },
  page: number,
  pageSize: number,
  token: string,
) {
  return govtClient.listProgramsAdmin(filters, page, pageSize, token);
}

export async function listApplications(
  programId: string,
  filters: { county?: string; status?: string },
  page: number,
  pageSize: number,
  token: string,
) {
  return govtClient.listApplications(programId, filters, page, pageSize, token);
}

export async function bulkApprove(dto: BulkApproveApplicationsDto, token: string, actor: string) {
  const result = await govtClient.bulkApproveApplications(dto, token);
  await record({
    actor,
    action: 'program.applications.bulk_approved',
    category: 'program',
    note: `${dto.ids.length} application(s) approved`,
  });
  return result;
}
