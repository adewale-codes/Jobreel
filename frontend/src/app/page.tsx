'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { INDIGO_SHADES, interpolateColor } from '@/lib/colors'
import SummaryCard from '@/components/SummaryCard'
import CategoryFilter from '@/components/CategoryFilter'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

const TOOLTIP_PROPS = {
  contentStyle: {
    backgroundColor: '#13131a',
    border: '1px solid #1e1e2e',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
  },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
}

interface Overview {
  total_jobs: number
  total_unique_skills: number
  avg_salary: number | null
  jobs_with_salary: number
  last_pipeline_run: string | null
  last_pipeline_status: string | null
}

interface SkillCount {
  skill: string
  count: number
}

interface CategoryCount {
  category: string
  label: string
  count: number
  avg_salary: number | null
}

interface SalaryBand {
  label: string
  count: number
}

interface VolumePoint {
  date: string
  count: number
}

export default function DashboardPage() {
  const [category, setCategory] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [jobsByCategory, setJobsByCategory] = useState<CategoryCount[] | null>(null)
  const [topSkills, setTopSkills] = useState<SkillCount[] | null>(null)
  const [salaryBands, setSalaryBands] = useState<SalaryBand[] | null>(null)
  const [volume, setVolume] = useState<VolumePoint[] | null>(null)

  useEffect(() => {
    api.analytics.overview().then(setOverview)
    api.analytics.jobsByCategory().then((d) => setJobsByCategory(d.categories ?? []))
  }, [])

  useEffect(() => {
    setTopSkills(null)
    setSalaryBands(null)
    setVolume(null)
    api.analytics.topSkills(category || undefined, 15).then((d) => setTopSkills(d.skills ?? []))
    api.analytics.salaryBands(category || undefined).then((d) => setSalaryBands(d.bands ?? []))
    api.analytics.volumeOverTime(30, category || undefined).then((d) => setVolume(d.volume ?? []))
  }, [category])

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      {/* Row 1: summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview ? (
          <>
            <SummaryCard title="Total Jobs" value={overview.total_jobs.toLocaleString('en-GB')} />
            <SummaryCard title="Unique Skills" value={overview.total_unique_skills.toLocaleString('en-GB')} />
            <SummaryCard title="Avg Salary" value={formatCurrency(overview.avg_salary)} />
            <SummaryCard
              title="Jobs with Salary Data"
              value={overview.jobs_with_salary.toLocaleString('en-GB')}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-24" />)
        )}
      </div>

      {/* Row 2: top skills + jobs by category */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Top 15 Skills</h2>
          {topSkills === null ? (
            <LoadingSkeleton className="h-[300px]" />
          ) : topSkills.length === 0 ? (
            <EmptyState message="No skill data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSkills} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="skill" type="category" stroke="#64748b" fontSize={12} width={100} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Jobs by Category</h2>
          {jobsByCategory === null ? (
            <LoadingSkeleton className="h-[300px]" />
          ) : jobsByCategory.length === 0 ? (
            <EmptyState message="No category data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobsByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {jobsByCategory.map((_, i) => (
                    <Cell key={i} fill={INDIGO_SHADES[i % INDIGO_SHADES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: salary bands + volume over time */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Salary Bands</h2>
          {salaryBands === null ? (
            <LoadingSkeleton className="h-[300px]" />
          ) : salaryBands.length === 0 ? (
            <EmptyState message="No salary data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salaryBands}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {salaryBands.map((_, i) => (
                    <Cell
                      key={i}
                      fill={interpolateColor(
                        '#22c55e',
                        '#f59e0b',
                        salaryBands.length > 1 ? i / (salaryBands.length - 1) : 0
                      )}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Volume Over Time</h2>
          {volume === null ? (
            <LoadingSkeleton className="h-[300px]" />
          ) : volume.length === 0 ? (
            <EmptyState message="No volume data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip {...TOOLTIP_PROPS} labelFormatter={(d) => formatDate(d as string)} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  )
}
