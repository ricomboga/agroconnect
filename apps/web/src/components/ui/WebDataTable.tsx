interface Column {
  key: string
  header: string
  width?: string | number
}

interface WebDataTableProps {
  columns: Column[]
  data: Record<string, React.ReactNode>[]
  onRowClick?: (row: Record<string, React.ReactNode>, index: number) => void
}

export function WebDataTable({ columns, data, onRowClick }: WebDataTableProps) {
  return (
    <table className="w-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={col.width ? { width: col.width } : undefined}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={i}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            className={onRowClick ? 'cursor-pointer' : undefined}
          >
            {columns.map((col) => (
              <td key={col.key}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
