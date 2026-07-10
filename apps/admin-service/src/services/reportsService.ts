import * as farmClient from '../clients/farmServiceClient.js';
import * as financeClient from '../clients/financeServiceClient.js';
import * as communityClient from '../clients/communityServiceClient.js';
import * as marketClient from '../clients/marketServiceClient.js';
import * as govtClient from '../clients/govtServiceClient.js';

export async function getFarmersByCounty(county?: string) {
  const rows = await farmClient.getFarmersByCounty();
  return county ? rows.filter((row) => row.county === county) : rows;
}

export async function getLivestockStats(filters: { county?: string; animalType?: string }) {
  return farmClient.getLivestockStats(filters);
}

export async function getLoansByInstitution() {
  return financeClient.getLoansByInstitution();
}

export async function getExpertDirectory(county?: string) {
  const rows = await communityClient.getExperts();
  return county ? rows.filter((row) => row.countiesServed.includes(county)) : rows;
}

export async function getSupplierDirectory(county?: string) {
  const rows = await marketClient.getSupplierProfiles();
  return county ? rows.filter((row) => row.county === county) : rows;
}

export async function getLenderDirectory() {
  return financeClient.getLoanPartners();
}

export async function getOfficerDirectory(county?: string) {
  const rows = await govtClient.getOfficerProfiles();
  return county ? rows.filter((row) => row.assignedCounty === county) : rows;
}

function toCsv<T extends object>(rows: T[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]) as (keyof T)[];
  const escape = (value: unknown): string => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(','));
  }
  return lines.join('\n');
}

export async function exportReportCsv(
  type: 'farmers-by-county' | 'livestock' | 'loans-by-institution' | 'experts' | 'suppliers' | 'lenders' | 'govt-officers',
  filters: { county?: string; animalType?: string },
): Promise<string> {
  switch (type) {
    case 'farmers-by-county':
      return toCsv(await getFarmersByCounty(filters.county));
    case 'livestock':
      return toCsv(await getLivestockStats(filters));
    case 'loans-by-institution':
      return toCsv(await getLoansByInstitution());
    case 'experts':
      return toCsv(await getExpertDirectory(filters.county));
    case 'suppliers':
      return toCsv(await getSupplierDirectory(filters.county));
    case 'lenders':
      return toCsv(await getLenderDirectory());
    case 'govt-officers':
      return toCsv(await getOfficerDirectory(filters.county));
  }
}
