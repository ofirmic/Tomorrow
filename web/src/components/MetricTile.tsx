type Props = {
  label: string
  value: string | number
  unit?: string
  color?: string
}

export function MetricTile({ label, value, unit, color = '#10b981' }: Props) {
  return (
    <div className="tile" style={{ borderLeftColor: color }}>
      <div className="tile-label">{label}</div>
      <div className="tile-value" style={{ color }}>
        {value}
        {unit ? <span className="tile-unit">{unit}</span> : null}
      </div>
    </div>
  )
}


