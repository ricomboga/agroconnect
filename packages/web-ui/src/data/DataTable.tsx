import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface DataTableColumn<T> {
  key: string
  header: string
  width?: string
  render?: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  isFlagged?: (row: T) => boolean
  onRowClick?: (row: T, index: number) => void
}

export function DataTable<T>({
  columns,
  data,
  isFlagged,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
              className="border-b border-border py-1.5 pr-3 text-sm font-semibold uppercase tracking-wide text-muted"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => {
          const flagged = isFlagged?.(row) ?? false

          return (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              className={cn(
                'border-b border-border hover:bg-surface2',
                onRowClick && 'cursor-pointer',
                flagged && 'bg-ac-red-light',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-1.5 pr-3 text-base text-ink">
                  {col.render
                    ? col.render(row)
                    : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
