import * as farmClient from '../clients/farmServiceClient.js';
import * as financeClient from '../clients/financeServiceClient.js';

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
  type: 'farmers-by-county' | 'livestock' | 'loans-by-institution',
  filters: { county?: string; animalType?: string },
): Promise<string> {
  switch (type) {
    case 'farmers-by-county':
      return toCsv(await getFarmersByCounty(filters.county));
    case 'livestock':
      return toCsv(await getLivestockStats(filters));
    case 'loans-by-institution':
      return toCsv(await getLoansByInstitution());
  }
}
