'use client'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'it-jobs', label: 'IT Jobs' },
  { value: 'engineering-jobs', label: 'Engineering Jobs' },
  { value: 'graduate-jobs', label: 'Graduate Jobs' },
]

interface CategoryFilterProps {
  value: string
  onChange: (category: string) => void
}

export default function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
    >
      {CATEGORIES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  )
}
