import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportKpi {
  label: string
  value: string | number
}

interface ExportLoanRow {
  id: string
  farmerId: string
  type: string
  amountRequestedKes: string
  creditScore: string | null
  creditBand: string | null
  status: string
  submittedAt: string | null
}

function fileTimestamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const LOAN_COLUMNS = ['Loan ID', 'Farmer ID', 'Type', 'Amount Requested (KES)', 'Credit Score', 'Band', 'Status', 'Applied']

function loanToRow(row: ExportLoanRow): (string | number)[] {
  return [
    row.id,
    row.farmerId,
    row.type,
    row.amountRequestedKes,
    row.creditScore ?? '—',
    row.creditBand ?? '—',
    row.status,
    row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('en-KE') : '—',
  ]
}

export function exportPipelineCsv(institutionName: string, kpis: ExportKpi[], rows: ExportLoanRow[]): void {
  const lines: string[] = []
  lines.push(`"${institutionName} — Loan Pipeline"`)
  lines.push(`"Generated: ${new Date().toLocaleString('en-KE')}"`)
  lines.push('')
  lines.push('Summary')
  for (const kpi of kpis) {
    lines.push(`"${kpi.label}","${kpi.value}"`)
  }
  lines.push('')
  lines.push(LOAN_COLUMNS.map((c) => `"${c}"`).join(','))
  for (const row of rows) {
    lines.push(loanToRow(row).map((v) => `"${v}"`).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `lender-pipeline-${fileTimestamp()}.csv`)
}

export async function exportPipelineExcel(institutionName: string, kpis: ExportKpi[], rows: ExportLoanRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AgroConnect'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.addRow([institutionName])
  summarySheet.addRow([`Generated: ${new Date().toLocaleString('en-KE')}`])
  summarySheet.addRow([])
  summarySheet.addRow(['Metric', 'Value'])
  for (const kpi of kpis) {
    summarySheet.addRow([kpi.label, kpi.value])
  }
  summarySheet.getColumn(1).width = 28
  summarySheet.getColumn(2).width = 20

  const appsSheet = workbook.addWorksheet('Applications')
  appsSheet.addRow(LOAN_COLUMNS)
  for (const row of rows) {
    appsSheet.addRow(loanToRow(row))
  }
  appsSheet.columns.forEach((col) => {
    col.width = 18
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  triggerDownload(blob, `lender-pipeline-${fileTimestamp()}.xlsx`)
}

export function exportPipelinePdf(institutionName: string, kpis: ExportKpi[], rows: ExportLoanRow[]): void {
  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.text(`${institutionName} — Loan Pipeline`, 14, 16)
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [['Metric', 'Value']],
    body: kpis.map((k) => [k.label, String(k.value)]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 107, 60] },
  })

  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  autoTable(doc, {
    startY: afterSummaryY,
    head: [LOAN_COLUMNS],
    body: rows.map(loanToRow),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [26, 107, 60] },
  })

  doc.save(`lender-pipeline-${fileTimestamp()}.pdf`)
}
