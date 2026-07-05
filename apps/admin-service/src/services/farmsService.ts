import * as farmClient from '../clients/farmServiceClient.js';
import * as authClient from '../clients/authServiceClient.js';
import type { ListFarmsQuery } from '../schemas/listFarmsQuery.schema.js';

export async function listFarms(query: ListFarmsQuery, token: string) {
  const page = await farmClient.listFarms({
    search: query.search,
    county: query.county,
    page: query.page,
    page_size: query.page_size,
    token,
  });

  const ownerIds = [...new Set(page.data.map((f) => f.ownerId))];
  const owners = await authClient.batchGetUsers(ownerIds);

  const data = page.data.map((f) => ({
    id: f.id,
    name: f.name,
    farmer_name: owners[f.ownerId]?.fullName ?? f.ownerId,
    county: f.county,
    area_acres: Number(f.areaAcres),
    plots_count: f.plots.length,
    workers_count: f.workerCount,
    health_score: f.healthScore,
    registered_at: f.createdAt,
  }));

  return { data, meta: page.meta };
}
