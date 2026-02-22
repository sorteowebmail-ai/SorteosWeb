/**
 * Server-side scrape job runner.
 *
 * Runs the full comment scraping loop as a fire-and-forget async function.
 * Updates the job store with progress so the client can poll via /api/scrape/status.
 *
 * Speed optimizations:
 * - Race browser + HTTP scrapers with Promise.any (first success wins)
 * - No fixed delay between pages (adaptive: only delay after rate-limit)
 * - Pipeline: cache writes are fire-and-forget (don't block next fetch)
 * - Reduced cooldown (15s instead of 35s)
 */

import { getJob, updateJob } from "./scrape-job-store"
import {
  scrapeComments,
  InstagramPermanentError,
} from "./scraper"
import { scrapeCommentsBrowser } from "./browser-scraper"
import { isPlaywrightAvailable } from "./browser-manager"
import {
  isCacheComplete,
  getCachedComments,
  getResumePoint,
  appendToCache,
} from "./comment-cache"

const MAX_PAGE_RETRIES = 3
const COOLDOWN_MS = 15_000
const TIMEOUT_MS = 20 * 60 * 1000

type ScraperResult = {
  comments: { id: string; username: string; text: string; timestamp: string }[]
  hasMore: boolean
  cursor?: string
  total?: number
  source?: string
}

/**
 * Race browser + HTTP scrapers. First success wins.
 * If browser isn't available, falls back to HTTP only.
 */
async function raceScrapers(
  shortcode: string,
  mediaId: string,
  cursor: string | undefined,
  browserAvailable: boolean,
): Promise<ScraperResult & { source: "browser" | "http" }> {
  const httpPromise = scrapeComments(shortcode, cursor)
    .then((r) => ({ ...r, source: "http" as const }))

  if (browserAvailable) {
    const browserPromise = scrapeCommentsBrowser(shortcode, cursor)
      .then((r) => ({ ...r, source: "browser" as const }))

    try {
      return await Promise.any([httpPromise, browserPromise])
    } catch (aggErr) {
      // Both failed — check for permanent errors
      const errors = (aggErr as AggregateError).errors as Error[]
      const permanent = errors.find((e) => e instanceof InstagramPermanentError)
      if (permanent) throw permanent
      // Throw the first error for retry logic
      throw errors[0]
    }
  }

  return httpPromise
}

/**
 * Run the scraping loop for a job. Call as fire-and-forget:
 *   runScrapeJob(jobId).catch(console.error)
 */
export async function runScrapeJob(jobId: string): Promise<void> {
  const job = getJob(jobId)
  if (!job) return

  const { shortcode, mediaId } = job
  const estimatedTotal = job.total
  const startTime = Date.now()

  // 1. Check if cache is already complete
  if (isCacheComplete(shortcode)) {
    const cached = getCachedComments(shortcode)
    if (cached) {
      const uniqueUsers = new Set(cached.comments.map((c) => c.username))
      updateJob(jobId, {
        status: "COMPLETE",
        fetched: cached.comments.length,
        total: cached.comments.length,
        pages: cached.pages,
        uniqueParticipants: uniqueUsers.size,
        source: "cache",
      })
      return
    }
  }

  // 2. Check for resume point from partial cache
  let cursor: string | undefined
  let fetchedCount = 0
  let page = 0
  const uniqueUsernames = new Set<string>()

  const resume = getResumePoint(shortcode)
  if (resume) {
    cursor = resume.cursor
    fetchedCount = resume.comments.length
    page = resume.pages
    for (const c of resume.comments) uniqueUsernames.add(c.username)
    console.log(`[job-runner] Resuming ${shortcode} from page ${page} (${fetchedCount} comments, ${uniqueUsernames.size} unique)`)
  }

  // 3. Check browser availability once (avoid repeated async check)
  const browserAvailable = await isPlaywrightAvailable()

  // 4. Scraping loop
  let hasMore = true
  let lastSource: "browser" | "http" | null = null
  let recentRateLimit = false // adaptive delay flag

  while (hasMore) {
    // Check global timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      updateJob(jobId, {
        status: "PARTIAL",
        fetched: fetchedCount,
        pages: page,
        uniqueParticipants: uniqueUsernames.size,
        source: lastSource,
        errorMessage: "Tiempo límite excedido (20 min).",
        errorType: "transient",
      })
      return
    }

    page++
    updateJob(jobId, {
      fetched: fetchedCount,
      total: estimatedTotal,
      pages: page,
      uniqueParticipants: uniqueUsernames.size,
      source: lastSource,
    })

    // Per-page retry loop
    let pageSuccess = false
    for (let attempt = 0; attempt < MAX_PAGE_RETRIES; attempt++) {
      try {
        // Race browser + HTTP — first success wins
        const result = await raceScrapers(shortcode, mediaId, cursor, browserAvailable)
        lastSource = result.source

        // Cache write (sync, best-effort)
        try {
          appendToCache(shortcode, mediaId, {
            comments: result.comments,
            cursor: result.cursor || null,
            complete: !result.hasMore,
          })
        } catch {
          // Cache is best-effort
        }

        fetchedCount += result.comments.length
        for (const c of result.comments) uniqueUsernames.add(c.username)
        hasMore = result.hasMore
        cursor = result.cursor

        // Clear rate-limit flag on success
        recentRateLimit = false

        // Update job progress
        updateJob(jobId, {
          fetched: fetchedCount,
          total: result.total || estimatedTotal,
          pages: page,
          uniqueParticipants: uniqueUsernames.size,
          source: lastSource,
          errorMessage: null,
        })

        pageSuccess = true
        break
      } catch (error) {
        // Permanent error — no retry will help
        if (error instanceof InstagramPermanentError) {
          updateJob(jobId, {
            status: "BLOCKED",
            fetched: fetchedCount,
            pages: page,
            uniqueParticipants: uniqueUsernames.size,
            source: lastSource,
            errorMessage: error.message,
            errorType: "permanent",
          })
          return
        }

        // Transient error — cooldown and retry
        recentRateLimit = true
        if (attempt < MAX_PAGE_RETRIES - 1) {
          console.log(`[job-runner] Transient error on page ${page}, attempt ${attempt + 1}/${MAX_PAGE_RETRIES}. Cooling down ${COOLDOWN_MS / 1000}s...`)
          updateJob(jobId, {
            errorMessage: `Instagram pide esperar. Reintentando en ${Math.round(COOLDOWN_MS / 1000)}s... (intento ${attempt + 2}/${MAX_PAGE_RETRIES})`,
          })
          await new Promise((r) => setTimeout(r, COOLDOWN_MS))
          continue
        }

        // All retries exhausted
        const message = error instanceof Error ? error.message : "Error desconocido"
        updateJob(jobId, {
          status: fetchedCount > 0 ? "PARTIAL" : "ERROR",
          fetched: fetchedCount,
          pages: page,
          uniqueParticipants: uniqueUsernames.size,
          source: lastSource,
          errorMessage: message,
          errorType: "transient",
        })
        return
      }
    }

    if (!pageSuccess) break

    // Adaptive delay: only add delay after recent rate-limit, otherwise zero delay
    if (hasMore && recentRateLimit) {
      const delay = 500 + Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay))
    }
    // No delay when things are going well — maximum throughput
  }

  // All pages fetched — mark complete
  updateJob(jobId, {
    status: "COMPLETE",
    fetched: fetchedCount,
    pages: page,
    uniqueParticipants: uniqueUsernames.size,
    source: lastSource,
    errorMessage: null,
    errorType: null,
  })
  console.log(`[job-runner] Job ${jobId} complete: ${fetchedCount} comments (${uniqueUsernames.size} unique) in ${page} pages`)
}
