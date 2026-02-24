/**
 * Scrape engine v6 — Job Runner.
 *
 * 4-phase pipeline:
 *   PAGINATION    → flat comments (threading=false), bifilter-hole tolerant
 *   VERIFICATION  → threading=true sample to detect child_comment_count
 *   CHILD_COMMENTS→ fetch replies for parents with children
 *   AUDIT         → build final report, determine reasonCode
 *
 * Cancel-aware: checks isCancelRequested() every iteration.
 * Logs via scrape-logger.ts. Sessions via session-manager.ts.
 */

import {
  JobStatus,
  JobPhase,
  CountingMode,
  ReasonCode,
  type ScrapeAudit,
} from "./scrape-types"
import {
  getJob,
  updateJob,
  isCancelRequested,
} from "./scrape-job-store"
import {
  scrapeComments,
  scrapeCommentsThreaded,
  scrapeChildComments,
  InstagramPermanentError,
  InstagramTransientError,
} from "./scraper"
import type { ScrapedComment } from "./scraper"
import { scrapeCommentsBrowser } from "./browser-scraper"
import { isPlaywrightAvailable } from "./browser-manager"
import {
  isCacheComplete,
  getCachedComments,
  getResumePoint,
  appendToCache,
} from "./comment-cache"
import {
  getSession,
  reportFailure,
  reportSuccess,
} from "./session-manager"
import { logInfo, logWarn, logError } from "./scrape-logger"
import { getPacingDelay } from "./fingerprint"

// ── Constants ────────────────────────────────────────────────

const MAX_PAGE_RETRIES = 5
const COOLDOWN_BASE_MS = 5_000
const COOLDOWN_MAX_MS = 60_000
const TIMEOUT_MS = 30 * 60 * 1000
const MAX_CONSECUTIVE_DUP_PAGES = 50
const MAX_DUP_HOLES = 5
const VERIFICATION_PAGES = 10
const MAX_CHILD_PAGES_PER_PARENT = 20

// ── Runner context ───────────────────────────────────────────

interface RunnerContext {
  jobId: string
  shortcode: string
  mediaId: string
  expectedTotal: number
  countingMode: CountingMode
  startTime: number
  browserAvailable: boolean
  // Accumulated state
  seenIds: Set<string>
  seenTopLevelIds: Set<string>
  seenReplyIds: Set<string>
  uniqueUsernames: Set<string>
  inferredRepliesTotal: number
  cursor: string | undefined
  page: number
  totalRequests: number
  totalRetries: number
  totalDuplicatesDetected: number
  dupHoleCount: number
  activeCookieIndex: number | undefined
  lastSource: "browser" | "http" | null
  // Phase results
  paginationExhausted: boolean
  hasNextPageFinal: boolean
  stoppedByError: boolean
  parentsWithReplies: { pk: string; childCount: number }[]
  verificationDone: boolean
  verifiedChildCommentSum: number
  verifiedTopLevelSampled: number
}

// ── Error → ReasonCode mapping ───────────────────────────────

function mapError(error: Error): ReasonCode {
  if (error instanceof InstagramPermanentError) {
    const msg = error.message.toLowerCase()
    if (msg.includes("login_required") || msg.includes("sesion")) return ReasonCode.LOGIN_REQUIRED
    if (msg.includes("checkpoint")) return ReasonCode.CHECKPOINT
    if (msg.includes("feedback")) return ReasonCode.CHECKPOINT
    if (msg.includes("consent")) return ReasonCode.CHECKPOINT
    if (msg.includes("private") || msg.includes("not_authorized")) return ReasonCode.PRIVATE_POST
    return ReasonCode.LOGIN_REQUIRED
  }
  if (error instanceof InstagramTransientError) {
    if (error.statusCode === 429) return ReasonCode.RATE_LIMIT
    if (error.message.includes("timeout")) return ReasonCode.TIMEOUT
    if (error.message.includes("JSON") || error.message.includes("parse")) return ReasonCode.PARSE_ERROR
    return ReasonCode.RATE_LIMIT
  }
  return ReasonCode.UNKNOWN
}

// ── Cancel check ─────────────────────────────────────────────

function checkCancel(ctx: RunnerContext, phase: JobPhase): boolean {
  if (isCancelRequested(ctx.jobId)) {
    updateJob(ctx.jobId, {
      status: JobStatus.CANCELLED,
      phase,
      reasonCode: ReasonCode.CANCELLED,
      completionReason: `CANCELLED at ${phase}`,
      fetched: ctx.seenIds.size,
      pages: ctx.page,
      uniqueParticipants: ctx.uniqueUsernames.size,
      fetchedReplies: ctx.seenReplyIds.size,
      totalRequests: ctx.totalRequests,
      totalRetries: ctx.totalRetries,
    })
    logInfo(ctx.jobId, "job_cancelled", { phase, fetched: ctx.seenIds.size }, ctx.shortcode)
    return true
  }
  return false
}

// ── Race scrapers ────────────────────────────────────────────

type ScraperResult = {
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
  source?: string
  cookieIndex?: number
}

async function raceScrapers(
  shortcode: string,
  cursor: string | undefined,
  browserAvailable: boolean,
  cookieIndex?: number,
): Promise<ScraperResult & { source: "browser" | "http" }> {
  const httpPromise = scrapeComments(shortcode, cursor, cookieIndex)
    .then((r) => ({ ...r, source: "http" as const }))

  if (browserAvailable) {
    const browserPromise = scrapeCommentsBrowser(shortcode, cursor)
      .then((r) => ({ ...r, source: "browser" as const }))

    try {
      return await Promise.any([httpPromise, browserPromise])
    } catch (aggErr) {
      const errors = (aggErr as AggregateError).errors as Error[]
      const permanent = errors.find((e) => e instanceof InstagramPermanentError)
      if (permanent) throw permanent
      throw errors[0]
    }
  }

  return httpPromise
}

// ════════════════════════════════════════════════════════════
// PHASE 1: Pagination
// ════════════════════════════════════════════════════════════

async function runPagination(ctx: RunnerContext): Promise<boolean> {
  updateJob(ctx.jobId, { phase: JobPhase.PAGINATION })

  let hasMore = true
  let consecutiveDupPages = 0
  const seenPageHashes = new Set<string>()

  while (hasMore) {
    // Cancel check
    if (checkCancel(ctx, JobPhase.PAGINATION)) return false

    // Timeout check
    if (Date.now() - ctx.startTime > TIMEOUT_MS) {
      updateJob(ctx.jobId, {
        status: JobStatus.PARTIAL,
        reasonCode: ReasonCode.TIMEOUT,
        completionReason: `TIMEOUT: ${ctx.seenIds.size}/${ctx.expectedTotal}`,
        fetched: ctx.seenIds.size,
        pages: ctx.page,
        uniqueParticipants: ctx.uniqueUsernames.size,
        fetchedReplies: ctx.seenReplyIds.size,
        inferredRepliesTotal: ctx.inferredRepliesTotal,
        source: ctx.lastSource,
        errorMessage: `Tiempo límite excedido (${Math.round(TIMEOUT_MS / 60000)} min).`,
        errorType: "transient",
        lastCursor: ctx.cursor || null,
        totalRequests: ctx.totalRequests,
        totalRetries: ctx.totalRetries,
      })
      logWarn(ctx.jobId, "timeout", { page: ctx.page, fetched: ctx.seenIds.size }, ctx.shortcode)
      return false
    }

    ctx.page++
    const pageStart = Date.now()

    // Progress update
    updateJob(ctx.jobId, {
      fetched: ctx.seenIds.size,
      total: ctx.expectedTotal,
      pages: ctx.page,
      uniqueParticipants: ctx.uniqueUsernames.size,
      fetchedReplies: ctx.seenReplyIds.size,
      inferredRepliesTotal: ctx.inferredRepliesTotal,
      source: ctx.lastSource,
      lastCursor: ctx.cursor || null,
      totalRequests: ctx.totalRequests,
      totalRetries: ctx.totalRetries,
    })

    let pageSuccess = false
    for (let attempt = 0; attempt < MAX_PAGE_RETRIES; attempt++) {
      try {
        const result = await raceScrapers(ctx.shortcode, ctx.cursor, ctx.browserAvailable, ctx.activeCookieIndex)
        ctx.lastSource = result.source
        if (result.cookieIndex !== undefined) ctx.activeCookieIndex = result.cookieIndex
        ctx.totalRequests++

        // Report success to session manager
        if (ctx.activeCookieIndex !== undefined) reportSuccess(ctx.activeCookieIndex)

        // Duplicate page detection
        const pageHash = result.comments.map((c) => c.id).sort().join(",")
        if (pageHash && seenPageHashes.has(pageHash)) {
          consecutiveDupPages++

          if (consecutiveDupPages <= 3 || consecutiveDupPages % 10 === 0) {
            logInfo(ctx.jobId, "dup_page", {
              page: ctx.page, consecutive: consecutiveDupPages, max: MAX_CONSECUTIVE_DUP_PAGES,
            }, ctx.shortcode)
          }

          if (consecutiveDupPages >= MAX_CONSECUTIVE_DUP_PAGES) {
            logWarn(ctx.jobId, "dup_hole_exhausted", {
              page: ctx.page, consecutive: consecutiveDupPages, fetched: ctx.seenIds.size,
            }, ctx.shortcode)
            hasMore = false
            ctx.paginationExhausted = true
            ctx.hasNextPageFinal = result.hasMore
            pageSuccess = true
            break
          }

          const dupDelay = 500 + Math.min(consecutiveDupPages * 200, 3000)
          await new Promise((r) => setTimeout(r, dupDelay))
          hasMore = result.hasMore
          ctx.cursor = result.cursor
          ctx.hasNextPageFinal = result.hasMore
          pageSuccess = true
          break
        }

        if (pageHash) seenPageHashes.add(pageHash)

        // Exited a dup hole
        if (consecutiveDupPages > 0) {
          ctx.dupHoleCount++
          logInfo(ctx.jobId, "dup_hole_exit", {
            page: ctx.page, holeLength: consecutiveDupPages, holes: ctx.dupHoleCount,
          }, ctx.shortcode)
          if (ctx.dupHoleCount >= MAX_DUP_HOLES) {
            hasMore = false
            ctx.paginationExhausted = true
            ctx.hasNextPageFinal = result.hasMore
            pageSuccess = true
            break
          }
        }
        consecutiveDupPages = 0

        // Process comments
        let newCount = 0
        let dupsDetected = 0
        for (const c of result.comments) {
          if (!ctx.seenIds.has(c.id)) {
            ctx.seenIds.add(c.id)
            newCount++
            if (c.parentId === null) {
              ctx.seenTopLevelIds.add(c.id)
              ctx.inferredRepliesTotal += c.childCommentCount
            } else {
              ctx.seenReplyIds.add(c.id)
            }
          } else {
            dupsDetected++
          }
          ctx.uniqueUsernames.add(c.username)
        }
        ctx.totalDuplicatesDetected += dupsDetected

        // Cache
        try {
          appendToCache(ctx.shortcode, ctx.mediaId, {
            comments: result.comments,
            cursor: result.cursor || null,
            complete: !result.hasMore,
          })
        } catch { /* best-effort */ }

        hasMore = result.hasMore
        ctx.cursor = result.cursor
        ctx.hasNextPageFinal = result.hasMore
        if (!hasMore) ctx.paginationExhausted = true

        // Log page
        logInfo(ctx.jobId, "page_ok", {
          page: ctx.page, source: ctx.lastSource,
          items: result.comments.length, newCount, dupsDetected,
          hasMore, fetched: ctx.seenIds.size,
          ms: Date.now() - pageStart,
        }, ctx.shortcode)

        pageSuccess = true
        break
      } catch (error) {
        const err = error as Error
        const reason = mapError(err)

        if (err instanceof InstagramPermanentError) {
          // Try rotating session
          if (ctx.activeCookieIndex !== undefined) {
            reportFailure(ctx.activeCookieIndex, reason, err.message)
          }
          try {
            const newSession = getSession()
            if (newSession.index !== ctx.activeCookieIndex) {
              logInfo(ctx.jobId, "session_rotate", {
                from: ctx.activeCookieIndex, to: newSession.index, reason,
              }, ctx.shortcode)
              ctx.activeCookieIndex = newSession.index
              ctx.totalRetries++
              if (attempt < MAX_PAGE_RETRIES - 1) continue
            }
          } catch (sessionErr) {
            // No sessions available — fail immediately with helpful message
            logError(ctx.jobId, "no_sessions_available", {
              error: sessionErr instanceof Error ? sessionErr.message : "unknown",
            }, ctx.shortcode)
          }

          logError(ctx.jobId, "permanent_error", { page: ctx.page, reason, error: err.message }, ctx.shortcode)
          updateJob(ctx.jobId, {
            status: JobStatus.BLOCKED,
            reasonCode: reason,
            completionReason: `BLOCKED: ${reason}`,
            fetched: ctx.seenIds.size,
            pages: ctx.page,
            uniqueParticipants: ctx.uniqueUsernames.size,
            source: ctx.lastSource,
            errorMessage: err.message,
            errorType: "permanent",
            lastCursor: ctx.cursor || null,
            totalRequests: ctx.totalRequests,
            totalRetries: ctx.totalRetries,
          })
          return false
        }

        // Transient error
        if (ctx.activeCookieIndex !== undefined) {
          reportFailure(ctx.activeCookieIndex, reason, err.message)
        }
        const backoff = Math.min(COOLDOWN_BASE_MS * Math.pow(2, attempt), COOLDOWN_MAX_MS)
        logWarn(ctx.jobId, "page_error", {
          page: ctx.page, attempt, reason, error: err.message, backoffMs: backoff,
        }, ctx.shortcode)
        ctx.totalRetries++

        if (attempt < MAX_PAGE_RETRIES - 1) {
          // Try rotating session
          try {
            const newSession = getSession()
            if (newSession.index !== ctx.activeCookieIndex) {
              ctx.activeCookieIndex = newSession.index
            }
          } catch { /* single session */ }

          updateJob(ctx.jobId, {
            errorMessage: `Reintentando en ${Math.round(backoff / 1000)}s... (${attempt + 2}/${MAX_PAGE_RETRIES})`,
            totalRetries: ctx.totalRetries,
          })
          await new Promise((r) => setTimeout(r, backoff))
          continue
        }

        // All retries exhausted
        ctx.stoppedByError = true
        updateJob(ctx.jobId, {
          status: ctx.seenIds.size > 0 ? JobStatus.PARTIAL : JobStatus.ERROR,
          reasonCode: reason,
          completionReason: `${reason}: ${err.message}`,
          fetched: ctx.seenIds.size,
          pages: ctx.page,
          uniqueParticipants: ctx.uniqueUsernames.size,
          source: ctx.lastSource,
          errorMessage: `${err.message} (${ctx.seenIds.size}/${ctx.expectedTotal} descargados)`,
          errorType: "transient",
          lastCursor: ctx.cursor || null,
          totalRequests: ctx.totalRequests,
          totalRetries: ctx.totalRetries,
        })
        return false
      }
    }

    if (!pageSuccess) break

    // Pacing — conservative delays to avoid detection
    // Instagram expects human-like browsing: 2-5 seconds between pages
    if (hasMore) {
      let baseDelay: number
      if (ctx.page <= 5) baseDelay = 2_000
      else if (ctx.page <= 20) baseDelay = 3_000
      else baseDelay = 4_000
      const delay = ctx.activeCookieIndex !== undefined
        ? getPacingDelay(baseDelay, ctx.activeCookieIndex)
        : baseDelay + Math.floor(Math.random() * (baseDelay * 0.4))
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  return true // continue to next phase
}

// ════════════════════════════════════════════════════════════
// PHASE 2: Verification
// ════════════════════════════════════════════════════════════

async function runVerification(ctx: RunnerContext): Promise<boolean> {
  const fetched = ctx.seenIds.size

  // Only verify if there's a gap and pagination wasn't stopped by error
  if (ctx.stoppedByError || ctx.expectedTotal <= 0 || fetched >= ctx.expectedTotal) {
    return true
  }

  if (checkCancel(ctx, JobPhase.VERIFICATION)) return false

  updateJob(ctx.jobId, {
    phase: JobPhase.VERIFICATION,
    errorMessage: "Verificando estructura de respuestas...",
  })

  logInfo(ctx.jobId, "verification_start", {
    fetched, expectedTotal: ctx.expectedTotal,
    gap: ctx.expectedTotal - fetched,
    gapPct: Math.round((1 - fetched / ctx.expectedTotal) * 100),
  }, ctx.shortcode)

  const seenParents = new Set<string>()

  try {
    let vCursor: string | undefined
    for (let vPage = 0; vPage < VERIFICATION_PAGES; vPage++) {
      if (checkCancel(ctx, JobPhase.VERIFICATION)) return false

      ctx.totalRequests++
      const vResult = await scrapeCommentsThreaded(ctx.shortcode, vCursor, ctx.activeCookieIndex)

      for (const c of vResult.comments) {
        if (c.parentId === null && !seenParents.has(c.id)) {
          seenParents.add(c.id)
          ctx.verifiedTopLevelSampled++
          if (c.childCommentCount > 0) {
            ctx.verifiedChildCommentSum += c.childCommentCount
            ctx.parentsWithReplies.push({ pk: c.id, childCount: c.childCommentCount })
          }
        }
      }

      if (!vResult.hasMore || !vResult.cursor) break
      vCursor = vResult.cursor
      const vDelay = ctx.activeCookieIndex !== undefined
        ? getPacingDelay(3_000, ctx.activeCookieIndex)
        : 3_000
      await new Promise((r) => setTimeout(r, vDelay))
    }

    ctx.verificationDone = true
    logInfo(ctx.jobId, "verification_done", {
      sampled: ctx.verifiedTopLevelSampled,
      uniqueParents: seenParents.size,
      childCommentSum: ctx.verifiedChildCommentSum,
      parentsWithReplies: ctx.parentsWithReplies.length,
    }, ctx.shortcode)
  } catch (err) {
    logError(ctx.jobId, "verification_error", {
      error: err instanceof Error ? err.message : "unknown",
    }, ctx.shortcode)
  }

  return true
}

// ════════════════════════════════════════════════════════════
// PHASE 3: Child Comments
// ════════════════════════════════════════════════════════════

async function runChildComments(ctx: RunnerContext): Promise<boolean> {
  if (ctx.parentsWithReplies.length === 0) return true
  if (checkCancel(ctx, JobPhase.CHILD_COMMENTS)) return false

  updateJob(ctx.jobId, {
    phase: JobPhase.CHILD_COMMENTS,
    errorMessage: `Descargando respuestas: 0/${ctx.parentsWithReplies.length} padres...`,
  })

  logInfo(ctx.jobId, "child_fetch_start", {
    parents: ctx.parentsWithReplies.length,
    estimatedReplies: ctx.verifiedChildCommentSum,
  }, ctx.shortcode)

  let childFetchedTotal = 0
  let parentsFetched = 0

  for (const parent of ctx.parentsWithReplies) {
    if (checkCancel(ctx, JobPhase.CHILD_COMMENTS)) return false

    try {
      let childCursor: string | undefined
      let childPage = 0
      const batchComments: ScrapedComment[] = []

      while (childPage < MAX_CHILD_PAGES_PER_PARENT) {
        childPage++
        ctx.totalRequests++
        const childResult = await scrapeChildComments(ctx.shortcode, parent.pk, childCursor, ctx.activeCookieIndex)

        for (const c of childResult.comments) {
          if (!ctx.seenIds.has(c.id)) {
            ctx.seenIds.add(c.id)
            ctx.seenReplyIds.add(c.id)
            ctx.uniqueUsernames.add(c.username)
            childFetchedTotal++
            batchComments.push(c)
          }
        }

        if (!childResult.hasMore || !childResult.cursor) break
        childCursor = childResult.cursor
        const cDelay = ctx.activeCookieIndex !== undefined
          ? getPacingDelay(300, ctx.activeCookieIndex)
          : 300
        await new Promise((r) => setTimeout(r, cDelay))
      }

      parentsFetched++

      // Save to cache
      if (batchComments.length > 0) {
        try {
          appendToCache(ctx.shortcode, ctx.mediaId, {
            comments: batchComments,
            cursor: null,
            complete: false,
          })
        } catch { /* best-effort */ }
      }

      if (parentsFetched % 5 === 0 || parentsFetched === ctx.parentsWithReplies.length) {
        updateJob(ctx.jobId, {
          fetched: ctx.seenIds.size,
          fetchedReplies: ctx.seenReplyIds.size,
          uniqueParticipants: ctx.uniqueUsernames.size,
          totalRequests: ctx.totalRequests,
          errorMessage: `Descargando respuestas: ${parentsFetched}/${ctx.parentsWithReplies.length} padres (${childFetchedTotal} nuevas)...`,
        })
      }

      const parentDelay = ctx.activeCookieIndex !== undefined
        ? getPacingDelay(2_500, ctx.activeCookieIndex)
        : 2_500
      await new Promise((r) => setTimeout(r, parentDelay))
    } catch (err) {
      logError(ctx.jobId, "child_fetch_error", {
        parentPk: parent.pk, error: err instanceof Error ? err.message : "unknown",
      }, ctx.shortcode)
    }
  }

  logInfo(ctx.jobId, "child_fetch_done", {
    parentsFetched, childFetchedTotal,
    totalNow: ctx.seenIds.size, repliesNow: ctx.seenReplyIds.size,
  }, ctx.shortcode)

  return true
}

// ════════════════════════════════════════════════════════════
// PHASE 4: Audit
// ════════════════════════════════════════════════════════════

function runAudit(ctx: RunnerContext): void {
  updateJob(ctx.jobId, { phase: JobPhase.AUDIT })

  const finalFetched = ctx.seenIds.size
  const finalTopLevel = ctx.seenTopLevelIds.size
  const finalReplies = ctx.seenReplyIds.size

  // Determine status and reason code
  let completionStatus: JobStatus
  let reasonCode: ReasonCode
  let gapExplanation: string | null = null

  if (finalFetched === 0) {
    completionStatus = JobStatus.PARTIAL
    reasonCode = ReasonCode.NO_COMMENTS_FETCHED
    gapExplanation = "La API no retornó comentarios. Posible sesión expirada o post sin comentarios."
  } else if (ctx.stoppedByError) {
    completionStatus = JobStatus.PARTIAL
    reasonCode = ReasonCode.STOPPED_BY_ERROR
    gapExplanation = `Descarga interrumpida por error. ${finalFetched}/${ctx.expectedTotal} descargados.`
  } else if (ctx.paginationExhausted) {
    completionStatus = JobStatus.COMPLETE

    const gap = ctx.expectedTotal - finalFetched
    const gapPct = ctx.expectedTotal > 0 ? Math.round((gap / ctx.expectedTotal) * 100) : 0

    if (gap <= 0) {
      reasonCode = ReasonCode.EXACT_MATCH
    } else if (gapPct <= 2) {
      reasonCode = ReasonCode.NEAR_EXACT
      gapExplanation = `${gap} comentarios (${gapPct}%) no accesibles — probablemente eliminados o spam.`
    } else {
      reasonCode = ReasonCode.PAGINATION_EXHAUSTED_WITH_GAP
      if (ctx.verificationDone && ctx.verifiedChildCommentSum === 0) {
        gapExplanation = `${gap} comentarios (${gapPct}%) no accesibles vía API. ` +
          `Verificación confirmó child_comment_count=0. ` +
          `Los faltantes son comentarios eliminados/spam/restringidos. ` +
          `El comment_count de IG (${ctx.expectedTotal}) es un contador histórico que no se decrementa.`
      } else if (ctx.verificationDone && ctx.verifiedChildCommentSum > 0) {
        gapExplanation = `${gap} comentarios (${gapPct}%) de diferencia. ` +
          `Verificación encontró ${ctx.verifiedChildCommentSum} replies en ${ctx.parentsWithReplies.length} padres.`
      } else {
        gapExplanation = `${gap} comentarios (${gapPct}%) no accesibles. ` +
          `Paginación agotada (has_next_page=false tras ${ctx.dupHoleCount} holes).`
      }
    }
  } else {
    completionStatus = JobStatus.COMPLETE
    reasonCode = ReasonCode.PAGINATION_COMPLETE
  }

  const durationMs = Date.now() - ctx.startTime

  const audit: ScrapeAudit = {
    expectedTotalSource: "v1_web_info",
    igCommentCount: ctx.expectedTotal,
    topLevelCount: finalTopLevel,
    repliesCount: finalReplies,
    totalCount: finalFetched,
    uniqueParticipants: ctx.uniqueUsernames.size,
    duplicatesDetected: ctx.totalDuplicatesDetected,
    pagesProcessed: ctx.page,
    requestsTotal: ctx.totalRequests,
    retriesTotal: ctx.totalRetries,
    dupHolesTraversed: ctx.dupHoleCount,
    hasNextPageFinal: ctx.hasNextPageFinal,
    paginationExhausted: ctx.paginationExhausted,
    verificationDone: ctx.verificationDone,
    verifiedChildCommentSum: ctx.verifiedChildCommentSum,
    verifiedTopLevelSampled: ctx.verifiedTopLevelSampled,
    reasonCode,
    countingMode: ctx.countingMode,
    gapExplanation,
    durationMs,
  }

  const completionReason = `${reasonCode}: ${finalFetched}/${ctx.expectedTotal} (${ctx.expectedTotal > 0 ? Math.round((finalFetched / ctx.expectedTotal) * 100) : 100}%)`

  // Final cache write
  try {
    appendToCache(ctx.shortcode, ctx.mediaId, {
      comments: [],
      cursor: null,
      complete: completionStatus === JobStatus.COMPLETE,
      completionReason,
    })
  } catch { /* best-effort */ }

  updateJob(ctx.jobId, {
    status: completionStatus,
    phase: JobPhase.AUDIT,
    fetched: finalFetched,
    total: ctx.expectedTotal,
    pages: ctx.page,
    uniqueParticipants: ctx.uniqueUsernames.size,
    fetchedReplies: finalReplies,
    inferredRepliesTotal: ctx.inferredRepliesTotal,
    completionReason,
    reasonCode,
    source: ctx.lastSource,
    errorMessage: null,
    errorType: null,
    lastCursor: ctx.cursor || null,
    totalRequests: ctx.totalRequests,
    totalRetries: ctx.totalRetries,
    audit,
  })

  logInfo(ctx.jobId, "job_complete", {
    status: completionStatus,
    reasonCode,
    fetched: finalFetched,
    topLevel: finalTopLevel,
    replies: finalReplies,
    expectedTotal: ctx.expectedTotal,
    ratio: ctx.expectedTotal > 0 ? Math.round((finalFetched / ctx.expectedTotal) * 100) : 100,
    participants: ctx.uniqueUsernames.size,
    pages: ctx.page,
    requests: ctx.totalRequests,
    retries: ctx.totalRetries,
    dups: ctx.totalDuplicatesDetected,
    dupHoles: ctx.dupHoleCount,
    durationMs,
    gapExplanation,
  }, ctx.shortcode)
}

// ════════════════════════════════════════════════════════════
// Main entry point
// ════════════════════════════════════════════════════════════

export async function runScrapeJob(jobId: string): Promise<void> {
  const job = getJob(jobId)
  if (!job) return

  // Pre-acquire session for consistent proxy/fingerprint throughout job
  let initialCookieIndex: number | undefined
  try {
    const session = getSession()
    initialCookieIndex = session.index
  } catch (err) {
    // No sessions available — fail the job immediately
    const msg = err instanceof Error ? err.message : "No hay sesiones disponibles"
    updateJob(jobId, {
      status: JobStatus.BLOCKED,
      reasonCode: ReasonCode.LOGIN_REQUIRED,
      completionReason: `BLOCKED: ${msg}`,
      errorMessage: msg,
      errorType: "permanent",
    })
    logError(jobId, "no_sessions_at_start", { error: msg })
    return
  }

  const ctx: RunnerContext = {
    jobId,
    shortcode: job.shortcode,
    mediaId: job.mediaId,
    expectedTotal: job.expectedTotal,
    countingMode: job.countingMode,
    startTime: Date.now(),
    browserAvailable: await isPlaywrightAvailable(),
    seenIds: new Set(),
    seenTopLevelIds: new Set(),
    seenReplyIds: new Set(),
    uniqueUsernames: new Set(),
    inferredRepliesTotal: 0,
    cursor: undefined,
    page: 0,
    totalRequests: 0,
    totalRetries: 0,
    totalDuplicatesDetected: 0,
    dupHoleCount: 0,
    activeCookieIndex: initialCookieIndex,
    lastSource: null,
    paginationExhausted: false,
    hasNextPageFinal: false,
    stoppedByError: false,
    parentsWithReplies: [],
    verificationDone: false,
    verifiedChildCommentSum: 0,
    verifiedTopLevelSampled: 0,
  }

  // ── Check cache ────────────────────────────────────────

  if (isCacheComplete(ctx.shortcode)) {
    const cached = getCachedComments(ctx.shortcode)
    if (cached) {
      const totalDownloaded = cached.comments.length
      const uniqueUsers = new Set(cached.comments.map((c) => c.username))
      const topLevel = cached.comments.filter((c) => c.parentId === null).length
      const replies = cached.comments.filter((c) => c.parentId !== null).length
      updateJob(jobId, {
        status: JobStatus.COMPLETE,
        phase: JobPhase.AUDIT,
        fetched: totalDownloaded,
        total: ctx.expectedTotal,
        pages: cached.pages,
        uniqueParticipants: uniqueUsers.size,
        fetchedReplies: replies,
        inferredRepliesTotal: cached.inferredRepliesTotal,
        completionReason: "CACHE_HIT",
        reasonCode: ReasonCode.CACHE_HIT,
        source: "cache",
      })
      logInfo(jobId, "cache_hit", { totalDownloaded, topLevel, replies }, ctx.shortcode)
      return
    }
  }

  // ── Resume from partial cache ──────────────────────────

  const resume = getResumePoint(ctx.shortcode)
  if (resume) {
    ctx.cursor = resume.cursor
    ctx.page = resume.pages
    for (const c of resume.comments) {
      ctx.seenIds.add(c.id)
      if (c.parentId === null) {
        ctx.seenTopLevelIds.add(c.id)
        ctx.inferredRepliesTotal += c.childCommentCount || 0
      } else {
        ctx.seenReplyIds.add(c.id)
      }
      ctx.uniqueUsernames.add(c.username)
    }
    logInfo(jobId, "resume", {
      page: ctx.page, cached: ctx.seenIds.size,
      topLevel: ctx.seenTopLevelIds.size, replies: ctx.seenReplyIds.size,
    }, ctx.shortcode)
  }

  // ── Run phases ─────────────────────────────────────────

  const ok1 = await runPagination(ctx)
  if (!ok1) return

  const ok2 = await runVerification(ctx)
  if (!ok2) return

  const ok3 = await runChildComments(ctx)
  if (!ok3) return

  runAudit(ctx)
}
