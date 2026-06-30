interface WebStatCardProps {
  value: string | number
  label: string
  color?: string
  borderColor?: string
}

export function WebStatCard({
  value,
  label,
  color = '#1A6B3C',
  borderColor,
}: WebStatCardProps) {
  return (
    <div
      className="w-stat-card"
      style={borderColor ? { borderColor, borderWidth: 1 } : undefined}
    >
      <div className="w-stat-val" style={{ color }}>
        {value}
      </div>
      <div className="w-stat-lbl">{label}</div>
    </div>
  )
}
