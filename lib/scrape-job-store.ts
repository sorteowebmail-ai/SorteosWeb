/**
 * In-memory scrape job store.
 *
 * Same pattern as payment-store.ts: Map on globalThis to survive HMR.
 * Data is lost on server restart — acceptable for soft launch.
 */

export type JobStatus = "RUNNING" | "COMPLETE" | "PARTIAL" | "BLOCKED" | "ERROR"

export interface ScrapeJob {
  jobId: string
  shortcode: string
  mediaId: string
  status: JobStatus
  fetched: number
  total: number
  pages: number
  uniqueParticipants: number
  source: "browser" | "http" | "cache" | null
  errorMessage: string | null
  errorType: "permanent" | "transient" | null
  startedAt: number
  updatedAt: number
}

// Survive Next.js HMR
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
    if (now - job.startedAt > JOB_TTL) {
      jobs.delete(id)
    }
  }
}

export function createJob(
  shortcode: string,
  mediaId: string,
  estimatedTotal: number,
): string {
  cleanupExpired()
  const jobId = crypto.randomUUID()
  jobs.set(jobId, {
    jobId,
    shortcode,
    mediaId,
    status: "RUNNING",
    fetched: 0,
    total: estimatedTotal,
    pages: 0,
    uniqueParticipants: 0,
    source: null,
    errorMessage: null,
    errorType: null,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
  return jobId
}

export function getJob(jobId: string): ScrapeJob | null {
  return jobs.get(jobId) || null
}

/**
 * Find an active (RUNNING) job for a shortcode.
 * Used to deduplicate — if already scraping, return existing job.
 */
export function getJobByShortcode(shortcode: string): ScrapeJob | null {
  for (const job of jobs.values()) {
    if (job.shortcode === shortcode && job.status === "RUNNING") {
      return job
    }
  }
  return null
}

export function updateJob(
  jobId: string,
  partial: Partial<Omit<ScrapeJob, "jobId" | "shortcode" | "mediaId" | "startedAt">>,
): void {
  const job = jobs.get(jobId)
  if (!job) return
  Object.assign(job, partial, { updatedAt: Date.now() })
}
