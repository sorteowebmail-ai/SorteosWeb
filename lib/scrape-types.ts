/**
 * Scrape engine v6 — Central type system.
 *
 * Every module in the scrape pipeline imports from here.
 * NO freeform strings for status, phases, or reason codes.
 */

import type { ScrapedComment } from "./scraper"

// ════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════

/** Why a job ended (success or failure). */
export enum ReasonCode {
  // ── Completion ──
  EXACT_MATCH = "EXACT_MATCH",
  NEAR_EXACT = "NEAR_EXACT",
  PAGINATION_COMPLETE = "PAGINATION_COMPLETE",
  PAGINATION_EXHAUSTED_WITH_GAP = "PAGINATION_EXHAUSTED_WITH_GAP",
  CACHE_HIT = "CACHE_HIT",

  // ── Failure (permanent) ──
  LOGIN_REQUIRED = "LOGIN_REQUIRED",
  CHECKPOINT = "CHECKPOINT",
  PRIVATE_POST = "PRIVATE_POST",
  ENDPOINT_CHANGED = "ENDPOINT_CHANGED",

  // ── Failure (transient) ──
  RATE_LIMIT = "RATE_LIMIT",
  CURSOR_INVALID = "CURSOR_INVALID",
  TIMEOUT = "TIMEOUT",
  PARSE_ERROR = "PARSE_ERROR",
  UNKNOWN = "UNKNOWN",

  // ── Partial ──
  STOPPED_BY_ERROR = "STOPPED_BY_ERROR",
  NO_COMMENTS_FETCHED = "NO_COMMENTS_FETCHED",
  CANCELLED = "CANCELLED",
}

/** Job lifecycle status. */
export enum JobStatus {
  RUNNING = "RUNNING",
  COMPLETE = "COMPLETE",
  PARTIAL = "PARTIAL",
  BLOCKED = "BLOCKED",
  ERROR = "ERROR",
  CANCELLED = "CANCELLED",
}

/** Which phase the runner is executing. */
export enum JobPhase {
  PAGINATION = "PAGINATION",
  VERIFICATION = "VERIFICATION",
  CHILD_COMMENTS = "CHILD_COMMENTS",
  AUDIT = "AUDIT",
}

/** What counts toward the total. */
export enum CountingMode {
  TOP_LEVEL_ONLY = "TOP_LEVEL_ONLY",
  TOP_LEVEL_PLUS_REPLIES = "TOP_LEVEL_PLUS_REPLIES",
}

/** Session health state. */
export enum SessionHealth {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  COOLDOWN = "COOLDOWN",
  DEAD = "DEAD",
}

// ════════════════════════════════════════════════════════════
// Interfaces
// ════════════════════════════════════════════════════════════

/** Canonical comment format for API responses and cache. */
export interface Comment {
  commentId: string
  userId: string
  username: string
  text: string
  createdAt: string // ISO 8601
  parentId: string | null
  childCommentCount: number
}

/** Convert internal ScrapedComment → canonical Comment. */
export function toComment(sc: ScrapedComment): Comment {
  return {
    commentId: sc.id,
    userId: "",
    username: sc.username,
    text: sc.text,
    createdAt: sc.timestamp,
    parentId: sc.parentId,
    childCommentCount: sc.childCommentCount,
  }
}

/** Convert canonical Comment → internal ScrapedComment (for cache compat). */
export function fromComment(c: Comment): ScrapedComment {
  return {
    id: c.commentId,
    username: c.username,
    text: c.text,
    timestamp: c.createdAt,
    parentId: c.parentId,
    childCommentCount: c.childCommentCount,
  }
}

/** Full audit report produced at end of job. */
export interface ScrapeAudit {
  expectedTotalSource: string
  igCommentCount: number
  topLevelCount: number
  repliesCount: number
  totalCount: number
  uniqueParticipants: number
  duplicatesDetected: number
  pagesProcessed: number
  requestsTotal: number
  retriesTotal: number
  dupHolesTraversed: number
  hasNextPageFinal: boolean
  paginationExhausted: boolean
  verificationDone: boolean
  verifiedChildCommentSum: number
  verifiedTopLevelSampled: number
  reasonCode: ReasonCode
  countingMode: CountingMode
  gapExplanation: string | null
  durationMs: number
}

/** In-memory job state. */
export interface ScrapeJob {
  jobId: string
  shortcode: string
  mediaId: string
  status: JobStatus
  phase: JobPhase
  fetched: number
  total: number
  expectedTotal: number
  pages: number
  uniqueParticipants: number
  fetchedReplies: number
  inferredRepliesTotal: number
  completionReason: string | null
  reasonCode: ReasonCode | null
  source: "browser" | "http" | "cache" | "apify" | null
  apifyRunId: string | null
  errorMessage: string | null
  errorType: "permanent" | "transient" | null
  lastCursor: string | null
  totalRequests: number
  totalRetries: number
  countingMode: CountingMode
  audit: ScrapeAudit | null
  cancelRequested: boolean
  startedAt: number
  updatedAt: number
}

/** Session pool entry. */
export interface SessionEntry {
  cookieStr: string
  csrfToken: string
  health: SessionHealth
  healthScore: number
  cooldownUntil: number
  failCount: number
  successCount: number
  totalRequests: number
  rateLimit429Count: number
  lastError: string | null
  lastErrorCode: ReasonCode | null
  lastUsed: number
  // Proxy and fingerprint
  proxyUrl: string | null
  fingerprintId: number
  // Expiry tracking
  firstUsedAt: number
  lastSuccessAt: number
  consecutiveSuccesses: number
  estimatedExpiryAt: number | null
  // Daily budget
  dailyRequestCount: number
  dailyResetAt: number // midnight UTC of next day
  // Consecutive 429 tracking for exponential backoff
  consecutive429Count: number
}

// ════════════════════════════════════════════════════════════
// API response types
// ════════════════════════════════════════════════════════════

export interface JobStatusResponse {
  status: JobStatus
  phase: JobPhase
  fetched: number
  total: number
  expectedTotal: number
  pages: number
  uniqueParticipants: number
  fetchedReplies: number
  inferredRepliesTotal: number
  completionReason: string | null
  reasonCode: ReasonCode | null
  countingMode: CountingMode
  source: string | null
  errorMessage: string | null
  errorType: string | null
  totalRequests: number
  totalRetries: number
  cancelRequested: boolean
  audit: ScrapeAudit | null
  comments?: Comment[]
}
