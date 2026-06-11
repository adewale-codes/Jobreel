'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import CategoryFilter from '@/components/CategoryFilter'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  category: string | null
  salary_min: number | null
  salary_max: number | null
  contract_type: string | null
  created: string | null
  redirecturl: string | null
}

interface JobDetail extends Job {
  description: string | null
  skills: string[]
}

interface JobsResponse {
  jobs: Job[]
  total: number
  page: number
  pages: number
}

const DESCRIPTION_LIMIT = 500

export default function JobsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<JobsResponse | null>(null)
  const [selected, setSelected] = useState<JobDetail | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocation(location), 300)
    return () => clearTimeout(timer)
  }, [location])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category, debouncedLocation])

  useEffect(() => {
    setData(null)
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (debouncedSearch) params.search = debouncedSearch
    if (category) params.category = category
    if (debouncedLocation) params.location = debouncedLocation
    api.jobs.list(params).then(setData)
  }, [debouncedSearch, category, debouncedLocation, page])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function openJob(id: string) {
    setShowFullDescription(false)
    const job = await api.jobs.get(id)
    setSelected(job)
  }

  function salaryRange(job: Pick<Job, 'salary_min' | 'salary_max'>) {
    if (job.salary_min == null || job.salary_max == null) return '—'
    return `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Jobs</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <CategoryFilter value={category} onChange={setCategory} />
        <input
          type="text"
          placeholder="Location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="min-w-[180px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {data === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data.jobs.length === 0 ? (
          <EmptyState message="No jobs match your filters" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Salary</th>
                <th className="px-4 py-3 font-medium">Posted</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => openJob(job.id)}
                  className="cursor-pointer border-b border-border text-foreground last:border-0 hover:bg-[#1a1a24]"
                >
                  <td className="px-4 py-3">{job.title}</td>
                  <td className="px-4 py-3 text-muted">{job.company ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{job.location ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{job.category ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{salaryRange(job)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(job.created)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pages > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {data.page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-[480px] max-w-full overflow-y-auto border-l border-border bg-surface p-6">
            <button
              onClick={() => setSelected(null)}
              className="mb-4 text-sm text-muted hover:text-foreground"
            >
              ✕ Close
            </button>

            <h2 className="text-xl font-bold text-foreground">{selected.title}</h2>
            <p className="mt-1 text-muted">{selected.company ?? 'Unknown company'}</p>

            <div className="mt-4 space-y-1.5 text-sm text-muted">
              <p>
                Location: <span className="text-foreground">{selected.location ?? '—'}</span>
              </p>
              <p>
                Category: <span className="text-foreground">{selected.category ?? '—'}</span>
              </p>
              <p>
                Contract: <span className="text-foreground">{selected.contract_type ?? '—'}</span>
              </p>
              <p>
                Salary: <span className="text-foreground">{salaryRange(selected)}</span>
              </p>
            </div>

            {selected.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 text-sm leading-relaxed text-foreground">
              {selected.description ? (
                <>
                  {showFullDescription || selected.description.length <= DESCRIPTION_LIMIT
                    ? selected.description
                    : `${selected.description.slice(0, DESCRIPTION_LIMIT)}...`}
                  {selected.description.length > DESCRIPTION_LIMIT && (
                    <button
                      onClick={() => setShowFullDescription((s) => !s)}
                      className="ml-2 font-medium text-accent hover:underline"
                    >
                      {showFullDescription ? 'show less' : 'show more'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-muted">No description available.</p>
              )}
            </div>

            {selected.redirecturl && (
              <a
                href={selected.redirecturl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                View original
              </a>
            )}
          </div>
        </>
      )}
    </main>
  )
}
