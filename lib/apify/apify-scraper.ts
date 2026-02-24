/**
 * Apify scraper orchestrator.
 *
 * Replaces the custom scrape-job-runner for comment fetching.
 * Uses louisdeconinck/instagram-comments-scraper actor.
 *
 * Flow:
 *   1. Start actor run with post URL
 *   2. Poll run status until terminal
 *   3. Fetch dataset items (comments)
 *   4. Map to our Comment format
 *   5. Update job store with results
 */

import { ApifyClient } from "apify-client"
import { APIFY_CONFIG, validateApifyConfig } from "./apify-config"
import {
  JobStatus,
  JobPhase,
  ReasonCode,
  type Comment,
} from "../scrape-types"
import { updateJob, getJob, isCancelRequested } from "../scrape-job-store"
import { MOCK_ENABLED, generateMockComments } from "../mock/mock-data"

// ── Singleton client ─────────────────────────────────────────

let _client: ApifyClient | null = null

function getClient(): ApifyClient {
  if (!_client) {
    const validation = validateApifyConfig()
    if (!validation.valid) throw new Error(validation.error)
    _client = new ApifyClient({ token: APIFY_CONFIG.token })
  }
  return _client
}

// ── Types from the actor dataset ─────────────────────────────
// The actor returns raw Instagram API objects. Key fields:

interface ApifyCommentItem {
  pk?: string | number
  id?: string
  text?: string
  created_at?: number           // unix timestamp (seconds)
  created_at_utc?: number       // same, UTC
  user?: {
    username?: string
    pk?: string | number
    [key: string]: unknown
  }
  // Legacy/cleaned fields (some actors normalize these)
  ownerUsername?: string
  username?: string
  timestamp?: string
  // Threading
  parent_comment_id?: string | number | null
  parentId?: string | null
  // Counts
  child_comment_count?: number
  repliesCount?: number
  comment_like_count?: number
  // Catch-all
  [key: string]: unknown
}

// ── Main orchestrator ────────────────────────────────────────

/**
 * Run the Apify scraper for a job. Updates job store in real-time.
 * Fire-and-forget: caller doesn't await this.
 */
export async function runApifyScrapeJob(jobId: string): Promise<void> {
  const job = getJob(jobId)
  if (!job) return

  const shortcode = job.shortcode

  // ── Mock mode: generate fake data without Apify ────────────
  if (MOCK_ENABLED) {
    return runMockScrapeJob(jobId, shortcode, job.expectedTotal || 500)
  }

  const postUrl = `https://www.instagram.com/p/${shortcode}/`

  try {
    updateJob(jobId, {
      phase: JobPhase.PAGINATION,
      source: "apify",
    })

    const client = getClient()

    // Start the actor run
    // maxComments: use actual post total + 20% buffer (actor stops when reached)
    // Using 100000 makes the actor search forever even after finding all comments
    const maxComments = Math.max(100, Math.ceil((job.expectedTotal || 500) * 1.2))
    const run = await client.actor(APIFY_CONFIG.actorId).start(
      {
        urls: [postUrl],
        maxComments,
        resultsLimit: maxComments,
      },
      {
        memory: APIFY_CONFIG.memoryMbytes,
        timeout: APIFY_CONFIG.timeoutSecs,
      },
    )

    const runId = run.id
    updateJob(jobId, { apifyRunId: runId })

    // Use waitForFinish — much faster than manual polling
    // Also check for cancellation in parallel
    const cancelChecker = setInterval(async () => {
      if (isCancelRequested(jobId)) {
        try { await client.run(runId).abort() } catch { /* best-effort */ }
        updateJob(jobId, {
          status: JobStatus.CANCELLED,
          reasonCode: ReasonCode.CANCELLED,
          completionReason: "Cancelado por el usuario",
        })
      }
    }, 3000)

    let runInfo: Awaited<ReturnType<ReturnType<typeof client.run>["waitForFinish"]>>
    try {
      runInfo = await client.run(runId).waitForFinish({
        waitSecs: APIFY_CONFIG.timeoutSecs,
      })
    } finally {
      clearInterval(cancelChecker)
    }

    // Check if cancelled during wait
    if (isCancelRequested(jobId)) return

    if (!runInfo) {
      updateJob(jobId, {
        status: JobStatus.ERROR,
        reasonCode: ReasonCode.UNKNOWN,
        errorMessage: "No se pudo obtener el estado del run de Apify",
        errorType: "transient",
      })
      return
    }

    const status = runInfo.status

    // Terminal status
    if (status === "FAILED" || status === "TIMED-OUT" || status === "ABORTED") {
      updateJob(jobId, {
        status: JobStatus.ERROR,
        reasonCode:
          status === "TIMED-OUT"
            ? ReasonCode.TIMEOUT
            : status === "ABORTED"
              ? ReasonCode.CANCELLED
              : ReasonCode.UNKNOWN,
        errorMessage: `Apify run terminó con estado: ${status}`,
        errorType: status === "TIMED-OUT" ? "transient" : "permanent",
      })
      return
    }
    if (!runInfo?.defaultDatasetId) {
      updateJob(jobId, {
        status: JobStatus.ERROR,
        reasonCode: ReasonCode.UNKNOWN,
        errorMessage: "Apify run sin dataset",
        errorType: "permanent",
      })
      return
    }

    const dataset = client.dataset(runInfo.defaultDatasetId)
    const { items } = await dataset.listItems()

    if (!items || items.length === 0) {
      updateJob(jobId, {
        status: JobStatus.COMPLETE,
        fetched: 0,
        reasonCode: ReasonCode.NO_COMMENTS_FETCHED,
        completionReason: "El post no tiene comentarios o Apify no pudo extraerlos",
      })
      return
    }

    // Map Apify items to our Comment format
    const comments = mapApifyComments(items as ApifyCommentItem[])

    // Count top-level and replies
    const topLevel = comments.filter((c) => !c.parentId)
    const replies = comments.filter((c) => c.parentId)
    const uniqueUsers = new Set(comments.map((c) => c.username))

    updateJob(jobId, {
      status: JobStatus.COMPLETE,
      phase: JobPhase.AUDIT,
      fetched: comments.length,
      total: comments.length,
      expectedTotal: job.expectedTotal,
      uniqueParticipants: uniqueUsers.size,
      fetchedReplies: replies.length,
      reasonCode: ReasonCode.PAGINATION_COMPLETE,
      completionReason: `Apify: ${comments.length} comentarios descargados`,
    })

    // Store comments in the global cache for retrieval by status endpoint
    storeApifyComments(jobId, shortcode, comments, topLevel.length, replies.length)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[apify-scraper] Job ${jobId} error:`, message)
    updateJob(jobId, {
      status: JobStatus.ERROR,
      reasonCode: ReasonCode.UNKNOWN,
      errorMessage: message,
      errorType: "transient",
    })
  }
}

// ── Mock scraper (dev mode) ──────────────────────────────────

async function runMockScrapeJob(jobId: string, shortcode: string, expectedTotal: number): Promise<void> {
  try {
    updateJob(jobId, {
      phase: JobPhase.PAGINATION,
      source: "apify",
    })

    // Simulate Apify processing delay (2-4 seconds)
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000))

    if (isCancelRequested(jobId)) {
      updateJob(jobId, {
        status: JobStatus.CANCELLED,
        reasonCode: ReasonCode.CANCELLED,
        completionReason: "Cancelado por el usuario",
      })
      return
    }

    const comments = generateMockComments(expectedTotal)
    const topLevel = comments.filter((c) => !c.parentId)
    const replies = comments.filter((c) => c.parentId)
    const uniqueUsers = new Set(comments.map((c) => c.username))

    updateJob(jobId, {
      status: JobStatus.COMPLETE,
      phase: JobPhase.AUDIT,
      fetched: comments.length,
      total: comments.length,
      expectedTotal,
      uniqueParticipants: uniqueUsers.size,
      fetchedReplies: replies.length,
      reasonCode: ReasonCode.PAGINATION_COMPLETE,
      completionReason: `Mock: ${comments.length} comentarios generados`,
    })

    storeApifyComments(jobId, shortcode, comments, topLevel.length, replies.length)
    console.log(`[mock-scraper] Job ${jobId}: ${comments.length} mock comments (${topLevel.length} top-level + ${replies.length} replies)`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updateJob(jobId, {
      status: JobStatus.ERROR,
      reasonCode: ReasonCode.UNKNOWN,
      errorMessage: message,
      errorType: "transient",
    })
  }
}

// ── Map Apify output to our Comment format ───────────────────

function mapApifyComments(items: ApifyCommentItem[]): Comment[] {
  const comments: Comment[] = []
  const seen = new Set<string>()

  for (const item of items) {
    // ID: prefer pk (raw IG), fallback to id
    const commentId = String(item.pk || item.id || "")
    if (!commentId || seen.has(commentId)) continue
    seen.add(commentId)

    // Username: raw IG nests under user.username
    const username = item.user?.username || item.ownerUsername || item.username || "unknown"

    const text = item.text || ""

    // Timestamp: raw IG uses created_at (unix seconds)
    const rawTs = item.created_at_utc || item.created_at
    const timestamp = item.timestamp
      || (rawTs ? new Date(rawTs * 1000).toISOString() : new Date().toISOString())

    // Parent: raw IG uses parent_comment_id (number or string)
    // parent_comment_id = 0 or "0" means top-level (no parent) — don't treat as reply
    const parentRaw = item.parent_comment_id ?? item.parentId ?? null
    const parentId = (parentRaw != null && parentRaw !== 0 && String(parentRaw) !== "0")
      ? String(parentRaw)
      : null

    // Child count: raw IG uses child_comment_count
    const childCommentCount = typeof item.child_comment_count === "number"
      ? item.child_comment_count
      : typeof item.repliesCount === "number"
        ? item.repliesCount
        : 0

    // User ID from raw IG
    const userId = item.user?.pk ? String(item.user.pk) : ""

    comments.push({
      commentId,
      userId,
      username,
      text,
      createdAt: timestamp,
      parentId,
      childCommentCount,
    })
  }

  return comments
}

// ── Store comments for retrieval ─────────────────────────────

// Global cache keyed by jobId (survives HMR via globalThis)
const g = globalThis as unknown as {
  __apifyCommentCache?: Map<string, {
    comments: Comment[]
    topLevelCount: number
    repliesCount: number
    shortcode: string
  }>
}
if (!g.__apifyCommentCache) g.__apifyCommentCache = new Map()
const commentCache = g.__apifyCommentCache

function storeApifyComments(
  jobId: string,
  shortcode: string,
  comments: Comment[],
  topLevelCount: number,
  repliesCount: number,
) {
  commentCache.set(jobId, { comments, topLevelCount, repliesCount, shortcode })
  // Also store by shortcode for lookup
  commentCache.set(`sc:${shortcode}`, { comments, topLevelCount, repliesCount, shortcode })
}

/**
 * Retrieve stored Apify comments for a job or shortcode.
 */
export function getApifyComments(jobIdOrShortcode: string): {
  comments: Comment[]
  topLevelCount: number
  repliesCount: number
} | null {
  return commentCache.get(jobIdOrShortcode)
    || commentCache.get(`sc:${jobIdOrShortcode}`)
    || null
}

/**
 * Cancel an active Apify run for a job.
 */
export async function cancelApifyRun(jobId: string): Promise<boolean> {
  const job = getJob(jobId)
  if (!job?.apifyRunId) return false

  try {
    const client = getClient()
    await client.run(job.apifyRunId).abort()
    return true
  } catch {
    return false
  }
}
