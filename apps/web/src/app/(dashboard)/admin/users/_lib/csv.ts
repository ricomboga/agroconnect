/**
 * Splits a CSV/text file into rows of trimmed cells. Auto-detects comma vs
 * semicolon delimiter (Excel exports semicolon-delimited "CSV" files on
 * machines whose regional settings use comma as the decimal separator),
 * so a template re-saved by Excel still parses correctly either way.
 */
export function parseCsvRows(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const sample = lines[0] ?? ''
  const delimiter = (sample.match(/;/g)?.length ?? 0) > (sample.match(/,/g)?.length ?? 0) ? ';' : ','
  return lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^"(.*)"$/, '$1')),
  )
}

/** True if the first row looks like a header rather than data. */
export function looksLikeHeader(firstCell: string, knownHeaders: string[]): boolean {
  return knownHeaders.includes(firstCell.trim().toLowerCase())
}

/**
 * Builds an Excel-safe CSV Blob: UTF-8 BOM (without it, Excel on Windows can
 * misdetect the encoding and show mangled or seemingly blank cells) and CRLF
 * line endings (Excel's preferred row terminator).
 */
const UTF8_BOM = '﻿'

export function toCsvBlob(headers: string[], rows: (string | number)[][]): Blob {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))]
  return new Blob([UTF8_BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const blob = toCsvBlob(headers, rows)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
