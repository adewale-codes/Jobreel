'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

interface PipelineRun {
  id: string
  started_at: string
  completed_at: string | null
  status: string
  jobs_fetched: number
  jobs_inserted: number
  jobs_skipped: number
  error_message: string | null
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  failed: 'bg-error/10 text-error',
  running: 'bg-warning/10 text-warning',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted/10 text-muted'}`}>
      {status}
    </span>
  )
}

function formatDuration(started: string, completed: string | null): string {
  if (!completed) return '—'
  const seconds = (new Date(completed).getTime() - new Date(started).getTime()) / 1000
  return `${Math.round(seconds)}s`
}

const REFRESH_INTERVAL_MS = 30000

export default function PipelinePage() {
  const [runs, setRuns] = useState<PipelineRun[] | null>(null)
  const [running, setRunning] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const refresh = useCallback(() => {
    api.pipeline.status().then(setRuns)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  async function handleRunPipeline() {
    setRunning(true)
    try {
      const result = await api.pipeline.trigger()
      if (result.status === 'failed') {
        setToast({ type: 'error', message: result.error_message ?? 'Pipeline run failed' })
      } else {
        setToast({
          type: 'success',
          message: `Run complete — fetched ${result.jobs_fetched}, inserted ${result.jobs_inserted}, skipped ${result.jobs_skipped}`,
        })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to trigger pipeline' })
    } finally {
      setRunning(false)
      refresh()
    }
  }

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const result = await api.pipeline.backfill()
      setToast({
        type: 'success',
        message: `Backfill complete — processed ${result.jobs_processed} jobs, inserted ${result.skills_inserted} skills`,
      })
    } catch {
      setToast({ type: 'error', message: 'Failed to run backfill' })
    } finally {
      setBackfilling(false)
    }
  }

  const lastRun = runs?.[0]
  const busy = running || backfilling

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Pipeline</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Last Run</h2>
          {runs === null ? (
            <LoadingSkeleton className="h-28" />
          ) : !lastRun ? (
            <EmptyState message="No pipeline runs yet" />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">{formatDate(lastRun.started_at)}</span>
                <StatusBadge status={lastRun.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{lastRun.jobs_fetched}</p>
                  <p className="text-xs text-muted">Fetched</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{lastRun.jobs_inserted}</p>
                  <p className="text-xs text-muted">Inserted</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{lastRun.jobs_skipped}</p>
                  <p className="text-xs text-muted">Skipped</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Actions</h2>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRunPipeline}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {running && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {running ? 'Running...' : 'Run Pipeline'}
            </button>
            <button
              onClick={handleBackfill}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#1a1a24] disabled:opacity-50"
            >
              {backfilling && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              )}
              {backfilling ? 'Backfilling...' : 'Backfill Skills'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {runs === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-10" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <EmptyState message="No pipeline runs yet" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Fetched</th>
                <th className="px-4 py-3 font-medium">Inserted</th>
                <th className="px-4 py-3 font-medium">Skipped</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-border text-foreground last:border-0">
                  <td className="px-4 py-3">{formatDate(run.started_at)}</td>
                  <td className="px-4 py-3 text-muted">{formatDuration(run.started_at, run.completed_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{run.jobs_fetched}</td>
                  <td className="px-4 py-3 text-muted">{run.jobs_inserted}</td>
                  <td className="px-4 py-3 text-muted">{run.jobs_skipped}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">{run.error_message ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  )
}
