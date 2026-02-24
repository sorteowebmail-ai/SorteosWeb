/**
 * Scrape engine v6 — In-memory job store.
 *
 * Map on globalThis to survive HMR. Data lost on server restart.
 * All types imported from scrape-types.ts (single source of truth).
 */

import {
  JobStatus,
  JobPhase,
  CountingMode,
  ReasonCode,
  type ScrapeJob,
  type ScrapeAudit,
} from "./scrape-types"

// Re-export for convenience
export { JobStatus, JobPhase, CountingMode, ReasonCode }
export type { ScrapeJob, ScrapeAudit }

// ── Global state ─────────────────────────────────────────────

const g = globalThis as unknown as {
  __scrapeJobs?: Map<string, ScrapeJob>
}
if (!g.__scrapeJobs) g.__scrapeJobs = new Map()
const jobs = g.__scrapeJobs

// TTL: 1 hour
const JOB_TTL = 60 * 60 * 1000

function cleanupExpired() {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.startedAt > JOB_TTL) jobs.delete(id)
  }
}

// ── Public API ───────────────────────────────────────────────

export function createJob(
  shortcode: string,
  mediaId: string,
  estimatedTotal: number,
  countingMode: CountingMode = CountingMode.TOP_LEVEL_ONLY,
): string {
  cleanupExpired()
  const jobId = crypto.randomUUID()
  jobs.set(jobId, {
    jobId,
    shortcode,
    mediaId,
    status: JobStatus.RUNNING,
    phase: JobPhase.PAGINATION,
    fetched: 0,
    total: estimatedTotal,
    expectedTotal: estimatedTotal,
    pages: 0,
    uniqueParticipants: 0,
    fetchedReplies: 0,
    inferredRepliesTotal: 0,
    completionReason: null,
    reasonCode: null,
    source: null,
    apifyRunId: null,
    errorMessage: null,
    errorType: null,
    lastCursor: null,
    totalRequests: 0,
    totalRetries: 0,
    countingMode,
    audit: null,
    cancelRequested: false,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
  return jobId
}

export function getJob(jobId: string): ScrapeJob | null {
  return jobs.get(jobId) || null
}

/** Find an active (RUNNING) job for a shortcode. */
export function getJobByShortcode(shortcode: string): ScrapeJob | null {
  for (const job of jobs.values()) {
    if (job.shortcode === shortcode && job.status === JobStatus.RUNNING) {
      return job
    }
  }
  return null
}

/** Find the most recent job for a shortcode (any status). */
export function getLatestJobByShortcode(shortcode: string): ScrapeJob | null {
  let latest: ScrapeJob | null = null
  for (const job of jobs.values()) {
    if (job.shortcode === shortcode) {
      if (!latest || job.updatedAt > latest.updatedAt) latest = job
    }
  }
  return latest
}

export function updateJob(
  jobId: string,
  partial: Partial<Omit<ScrapeJob, "jobId" | "shortcode" | "mediaId" | "startedAt">>,
): void {
  const job = jobs.get(jobId)
  if (!job) return
  Object.assign(job, partial, { updatedAt: Date.now() })
}

/** Request cancellation. Runner checks this flag each iteration. */
export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId)
  if (!job || job.status !== JobStatus.RUNNING) return false
  job.cancelRequested = true
  return true
}

/** Check if cancel was requested. */
export function isCancelRequested(jobId: string): boolean {
  const job = jobs.get(jobId)
  return job?.cancelRequested ?? false
}
