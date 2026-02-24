/**
 * Scrape engine v6 — Structured JSON logger.
 *
 * Single-line JSON per event. Never leaks secrets.
 */

import type { JobPhase, ReasonCode } from "./scrape-types"

// Keys whose values must never appear in logs
const REDACTED_KEYS = ["cookie", "csrf", "session", "token", "password", "secret"]

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) {
      out[key] = "[REDACTED]"
    } else if (typeof value === "string" && value.length > 500) {
      out[key] = value.slice(0, 500) + "..."
    } else {
      out[key] = value
    }
  }
  return out
}

export interface LogEntry {
  level: "info" | "warn" | "error"
  event: string
  jobId: string
  shortcode?: string
  phase?: JobPhase
  durationMs?: number
  page?: number
  failReason?: ReasonCode
  sessionIndex?: number
  proxyHost?: string
  data?: Record<string, unknown>
}

export function scrapeLog(entry: LogEntry): void {
  const out = {
    ts: new Date().toISOString(),
    lvl: entry.level,
    evt: entry.event,
    job: entry.jobId.slice(0, 8),
    ...(entry.shortcode && { sc: entry.shortcode }),
    ...(entry.phase && { phase: entry.phase }),
    ...(entry.durationMs !== undefined && { ms: entry.durationMs }),
    ...(entry.page !== undefined && { pg: entry.page }),
    ...(entry.failReason && { reason: entry.failReason }),
    ...(entry.sessionIndex !== undefined && { sess: entry.sessionIndex }),
    ...(entry.proxyHost && { proxy: entry.proxyHost }),
    ...(entry.data && sanitize(entry.data)),
  }
  console.log(`[scrape] ${JSON.stringify(out)}`)
}

export function logInfo(
  jobId: string,
  event: string,
  data?: Record<string, unknown>,
  shortcode?: string,
): void {
  scrapeLog({ level: "info", event, jobId, shortcode, data })
}

export function logWarn(
  jobId: string,
  event: string,
  data?: Record<string, unknown>,
  shortcode?: string,
): void {
  scrapeLog({ level: "warn", event, jobId, shortcode, data })
}

export function logError(
  jobId: string,
  event: string,
  data?: Record<string, unknown>,
  shortcode?: string,
): void {
  scrapeLog({ level: "error", event, jobId, shortcode, data })
}
