import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import type { FarmerFinancialReport } from '../api/finance';
import { productLabel } from '../constants/animalProducts';

type T = (key: string, opts?: Record<string, unknown>) => string;

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function csvRow(values: Array<string | number>): string {
  return values.map(csvEscape).join(',') + '\n';
}

export function buildReportCsv(report: FarmerFinancialReport, t: T, periodLabel: string): string {
  let csv = '';

  csv += csvRow([t('finance.home.title'), t('finance.home.tabs.reports')]);
  csv += csvRow([periodLabel]);
  csv += '\n';

  csv += csvRow([t('finance.home.reports.breakdown')]);
  csv += csvRow(['Category', t('finance.home.reports.income'), t('finance.home.reports.expenses')]);
  for (const c of report.transactions.byCategory) {
    csv += csvRow([t(`finance.transaction.category.${c.category}`), c.incomeKes, c.expenseKes]);
  }
  csv += csvRow([
    t('finance.home.reports.netProfit'),
    report.transactions.totalIncomeKes,
    report.transactions.totalExpenseKes,
  ]);
  csv += '\n';

  if (report.production.cropHarvests.byCrop.length > 0) {
    csv += csvRow([t('finance.home.reports.production.crops')]);
    csv += csvRow(['Crop', t('finance.home.reports.production.harvested') + ' (kg)', t('finance.home.reports.production.sold') + ' (kg)', t('finance.home.reports.production.revenue') + ' (KES)']);
    for (const c of report.production.cropHarvests.byCrop) {
      csv += csvRow([c.cropName, c.harvestedKg, c.soldKg, c.revenueKes]);
    }
    csv += '\n';
  }

  if (report.production.animalProducts.byType.length > 0) {
    csv += csvRow([t('finance.home.reports.production.animalProducts')]);
    csv += csvRow(['Product', 'Quantity', 'Unit', t('finance.home.reports.production.revenue') + ' (KES)']);
    for (const p of report.production.animalProducts.byType) {
      csv += csvRow([productLabel(p.productType, t), p.totalQty, p.unit, p.revenueKes]);
    }
    csv += '\n';
  }

  if (report.production.collections.byProductType.length > 0) {
    csv += csvRow([t('finance.home.reports.production.collections')]);
    csv += csvRow(['Product', 'Quantity', 'Unit', 'Amount (KES)']);
    for (const c of report.production.collections.byProductType) {
      csv += csvRow([productLabel(c.productType, t), c.totalQty, c.unit, c.totalAmountKes]);
    }
    csv += csvRow([
      t('finance.home.reports.production.totalSales'),
      '', '',
      report.production.collections.totalSalesKes,
    ]);
    csv += '\n';
  }

  if (report.creditScore) {
    csv += csvRow([t('finance.score.title')]);
    csv += csvRow(['Score', 'Band', 'Max Loan (KES)']);
    csv += csvRow([report.creditScore.score, report.creditScore.band, report.creditScore.maxLoanKes]);
  }

  return csv;
}

function esc(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildReportHtml(report: FarmerFinancialReport, t: T, periodLabel: string): string {
  const cropRows = report.production.cropHarvests.byCrop
    .map((c) => `<tr><td>${esc(c.cropName)}</td><td>${c.harvestedKg}</td><td>${c.soldKg}</td><td>KES ${c.revenueKes.toLocaleString()}</td></tr>`)
    .join('');

  const animalRows = report.production.animalProducts.byType
    .map((p) => `<tr><td>${esc(productLabel(p.productType, t))}</td><td>${p.totalQty} ${esc(p.unit)}</td><td>KES ${p.revenueKes.toLocaleString()}</td></tr>`)
    .join('');

  const collectionRows = report.production.collections.byProductType
    .map((c) => `<tr><td>${esc(productLabel(c.productType, t))}</td><td>${c.totalQty} ${esc(c.unit)}</td><td>KES ${c.totalAmountKes.toLocaleString()}</td></tr>`)
    .join('');

  const categoryRows = report.transactions.byCategory
    .map((c) => `<tr><td>${esc(t(`finance.transaction.category.${c.category}`))}</td><td>KES ${c.incomeKes.toLocaleString()}</td><td>KES ${c.expenseKes.toLocaleString()}</td></tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; padding: 24px; }
  h1 { font-size: 20px; color: #1A6B3C; margin-bottom: 2px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; color: #1A6B3C; margin-top: 24px; margin-bottom: 8px; }
  .period { font-size: 12px; color: #6B7280; margin-bottom: 16px; }
  .summary { display: flex; gap: 16px; margin-bottom: 8px; }
  .stat { flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; }
  .stat .label { font-size: 10px; color: #6B7280; }
  .stat .value { font-size: 16px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E5E7EB; }
  th { color: #6B7280; font-weight: 600; }
  .score-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; background: #EAF4EE; color: #1A6B3C; font-weight: 700; font-size: 14px; }
  .footer { margin-top: 24px; font-size: 9px; color: #9CA3AF; }
</style>
</head>
<body>
  <h1>${esc(t('finance.home.title'))} — ${esc(t('finance.home.tabs.reports'))}</h1>
  <div class="period">${esc(periodLabel)}</div>

  <div class="summary">
    <div class="stat">
      <div class="label">${esc(t('finance.home.reports.income'))}</div>
      <div class="value" style="color:#1A6B3C">KES ${report.transactions.totalIncomeKes.toLocaleString()}</div>
    </div>
    <div class="stat">
      <div class="label">${esc(t('finance.home.reports.expenses'))}</div>
      <div class="value" style="color:#DC2626">KES ${report.transactions.totalExpenseKes.toLocaleString()}</div>
    </div>
    <div class="stat">
      <div class="label">${esc(t('finance.home.reports.netProfit'))}</div>
      <div class="value">KES ${report.transactions.netKes.toLocaleString()}</div>
    </div>
  </div>

  ${categoryRows ? `<h2>${esc(t('finance.home.reports.breakdown'))}</h2><table><tr><th>Category</th><th>${esc(t('finance.home.reports.income'))}</th><th>${esc(t('finance.home.reports.expenses'))}</th></tr>${categoryRows}</table>` : ''}

  ${cropRows ? `<h2>${esc(t('finance.home.reports.production.crops'))}</h2><table><tr><th>Crop</th><th>${esc(t('finance.home.reports.production.harvested'))} (kg)</th><th>${esc(t('finance.home.reports.production.sold'))} (kg)</th><th>${esc(t('finance.home.reports.production.revenue'))}</th></tr>${cropRows}</table>` : ''}

  ${animalRows ? `<h2>${esc(t('finance.home.reports.production.animalProducts'))}</h2><table><tr><th>Product</th><th>Qty</th><th>${esc(t('finance.home.reports.production.revenue'))}</th></tr>${animalRows}</table>` : ''}

  ${collectionRows ? `<h2>${esc(t('finance.home.reports.production.collections'))}</h2><table><tr><th>Product</th><th>Qty</th><th>Amount</th></tr>${collectionRows}</table>` : ''}

  ${report.creditScore ? `<h2>${esc(t('finance.score.title'))}</h2><span class="score-badge">${report.creditScore.score} / 100 — ${esc(report.creditScore.band)}</span><p style="font-size:11px;color:#6B7280;margin-top:8px;">${esc(t('finance.score.maxLoan', { amount: report.creditScore.maxLoanKes.toLocaleString() }))}</p>` : ''}

  <div class="footer">${esc(t('finance.home.title'))} · ${new Date(report.generatedAt).toLocaleString()}</div>
</body>
</html>`;
}

async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

export async function exportReportAsCsv(report: FarmerFinancialReport, t: T, periodLabel: string): Promise<void> {
  const csv = buildReportCsv(report, t, periodLabel);
  const uri = `${FileSystem.cacheDirectory}agroconnect-finance-report-${report.farmerId}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(uri, 'text/csv', t('finance.home.reports.export'));
}

export async function exportReportAsPdf(report: FarmerFinancialReport, t: T, periodLabel: string): Promise<void> {
  const html = buildReportHtml(report, t, periodLabel);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await shareFile(uri, 'application/pdf', t('finance.home.reports.export'));
}
