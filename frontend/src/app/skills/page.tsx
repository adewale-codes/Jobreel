'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import CategoryFilter from '@/components/CategoryFilter'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

interface SkillCount {
  skill: string
  count: number
}

interface CompanyCount {
  company: string
  count: number
}

function RankedList<T extends { count: number }>({
  items,
  getKey,
  getLabel,
}: {
  items: T[]
  getKey: (item: T) => string
  getLabel: (item: T) => string
}) {
  const max = items[0]?.count ?? 1
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={getKey(item)}
          className="relative overflow-hidden rounded-lg border-l-4 border-accent bg-[#1a1a24] px-4 py-3"
        >
          <div
            className="absolute inset-y-0 left-0 bg-accent/10"
            style={{ width: `${(item.count / max) * 100}%` }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 text-sm font-semibold text-muted">{i + 1}</span>
              <span className="text-sm font-medium text-foreground">{getLabel(item)}</span>
            </div>
            <span className="text-sm text-muted">{item.count}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-11" />
      ))}
    </div>
  )
}

export default function SkillsPage() {
  const [category, setCategory] = useState('')
  const [skills, setSkills] = useState<SkillCount[] | null>(null)
  const [companies, setCompanies] = useState<CompanyCount[] | null>(null)

  useEffect(() => {
    setSkills(null)
    api.analytics.topSkills(category || undefined, 20).then((d) => setSkills(d.skills ?? []))
  }, [category])

  useEffect(() => {
    setCompanies(null)
    api.analytics.topCompanies(category || undefined).then((d) => setCompanies(d.companies ?? []))
  }, [category])

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Skills</h1>
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <section className="mb-10 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Top Skills</h2>
        {skills === null ? (
          <SectionSkeleton />
        ) : skills.length === 0 ? (
          <EmptyState message="No skill data available" />
        ) : (
          <RankedList items={skills} getKey={(s) => s.skill} getLabel={(s) => s.skill} />
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Top Hiring Companies</h2>
        {companies === null ? (
          <SectionSkeleton />
        ) : companies.length === 0 ? (
          <EmptyState message="No company data available" />
        ) : (
          <RankedList items={companies} getKey={(c) => c.company} getLabel={(c) => c.company} />
        )}
      </section>
    </main>
  )
}
