interface SummaryCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: number
}

export default function SummaryCard({ title, value, subtitle, trend }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {(subtitle || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span className={`font-medium ${trend >= 0 ? 'text-success' : 'text-error'}`}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
          {subtitle && <span className="text-muted">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
