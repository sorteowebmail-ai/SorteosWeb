/**
 * Scrape engine v6 — Session Manager.
 *
 * Health-scored cookie pool with cooldown timers, round-robin rotation,
 * automatic recovery, daily request budgets, and aggressive 429 backoff.
 *
 * Key protections against Instagram detection:
 *   1. Daily request budget per session (default 150/day)
 *   2. Aggressive 429 backoff (5 min base, up to 6 hours)
 *   3. DEAD sessions stay dead — never auto-reset (prevents burning cookies)
 *   4. Keep-alive pings every 4h to prevent cookie natural expiry
 *   5. Minimum inter-request gap (2s) to look human
 *
 * Env vars:
 *   INSTAGRAM_COOKIES_POOL  — "sess1;;;sess2;;;sess3"
 *   INSTAGRAM_COOKIES       — single full cookie string
 *   INSTAGRAM_SESSION_ID    — fallback sessionid value
 *   SESSION_DAILY_BUDGET    — max requests per session per day (default 150)
 */

import {
  SessionHealth,
  ReasonCode,
  type SessionEntry,
} from "./scrape-types"
import { logInfo, logWarn } from "./scrape-logger"

// ── Constants ────────────────────────────────────────────────

// 429 backoff: 5 min → 15 min → 45 min → 2h → 6h (stays at 6h)
const COOLDOWN_429_BASE_MS = 5 * 60_000          // 5 minutes base
const COOLDOWN_429_MAX_MS = 6 * 60 * 60_000      // 6 hours max
const COOLDOWN_429_MULTIPLIER = 3                 // triple each time

const COOLDOWN_TRANSIENT_MS = 60_000              // 1 min for transient errors

const RECOVERY_CHECK_MS = 60_000                  // check every 1 min
const DEGRADED_RECOVERY_MS = 10 * 60_000          // 10 min quiet → HEALTHY

const SCORE_HIT_429 = 30
const SCORE_HIT_TRANSIENT = 10

const DEFAULT_DAILY_BUDGET = 150                  // requests per session per day
const MIN_INTER_REQUEST_MS = 2_000                // minimum 2s between requests on same session

// Keep-alive: ping every 4 hours to prevent cookie natural expiry
const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 60_000   // 4 hours

// ── Global state (survives HMR) ─────────────────────────────

const g = globalThis as unknown as {
  __sessions?: SessionEntry[]
  __sessionIndex?: number
  __sessionRecoveryTimer?: ReturnType<typeof setInterval>
  __sessionKeepAliveTimer?: ReturnType<typeof setInterval>
}

// ── Helpers ─────────────────────────────────────────────────

function getDailyBudget(): number {
  const env = process.env.SESSION_DAILY_BUDGET
  if (env) {
    const n = parseInt(env, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return DEFAULT_DAILY_BUDGET
}

function getNextMidnightUTC(): number {
  const now = new Date()
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return tomorrow.getTime()
}

function resetDailyBudgetIfNeeded(entry: SessionEntry): void {
  const now = Date.now()
  if (now >= entry.dailyResetAt) {
    entry.dailyRequestCount = 0
    entry.dailyResetAt = getNextMidnightUTC()
  }
}

function isDailyBudgetExhausted(entry: SessionEntry): boolean {
  resetDailyBudgetIfNeeded(entry)
  return entry.dailyRequestCount >= getDailyBudget()
}

// ── Init ─────────────────────────────────────────────────────

function parseCookie(raw: string): { cookieStr: string; csrfToken: string } {
  const csrfMatch = raw.match(/csrftoken=([^;]+)/)
  return {
    cookieStr: raw.trim(),
    csrfToken: csrfMatch ? csrfMatch[1].trim() : "",
  }
}

function makeEntry(cookieStr: string, csrfToken: string, index: number): SessionEntry {
  return {
    cookieStr,
    csrfToken,
    health: SessionHealth.HEALTHY,
    healthScore: 100,
    cooldownUntil: 0,
    failCount: 0,
    successCount: 0,
    totalRequests: 0,
    rateLimit429Count: 0,
    lastError: null,
    lastErrorCode: null,
    lastUsed: 0,
    proxyUrl: null,
    fingerprintId: index,
    firstUsedAt: 0,
    lastSuccessAt: 0,
    consecutiveSuccesses: 0,
    estimatedExpiryAt: null,
    dailyRequestCount: 0,
    dailyResetAt: getNextMidnightUTC(),
    consecutive429Count: 0,
  }
}

function initSessions(): SessionEntry[] {
  if (g.__sessions && g.__sessions.length > 0) return g.__sessions

  const entries: SessionEntry[] = []

  // Pool (triple-semicolon separated)
  const poolRaw = process.env.INSTAGRAM_COOKIES_POOL
  if (poolRaw) {
    for (const raw of poolRaw.split(";;;").map((s) => s.trim()).filter(Boolean)) {
      const { cookieStr, csrfToken } = parseCookie(raw)
      entries.push(makeEntry(cookieStr, csrfToken, entries.length))
    }
  }

  // Single cookie
  const singleRaw = process.env.INSTAGRAM_COOKIES
  if (singleRaw) {
    const { cookieStr, csrfToken } = parseCookie(singleRaw)
    if (!entries.some((e) => e.cookieStr === cookieStr)) {
      entries.unshift(makeEntry(cookieStr, csrfToken, 0))
      // Re-index existing entries after unshift
      for (let i = 1; i < entries.length; i++) {
        entries[i].fingerprintId = i
      }
    }
  }

  // Session ID fallback
  if (entries.length === 0) {
    const sid = process.env.INSTAGRAM_SESSION_ID
    if (sid) {
      entries.push(makeEntry(`sessionid=${sid}`, "", 0))
    }
  }

  if (entries.length === 0) {
    throw new Error(
      "Cookies de Instagram no configuradas. Configura INSTAGRAM_COOKIES en .env.local",
    )
  }

  // Assign proxies (if configured)
  try {
    const { getProxyForSession } = require("./proxy-config") as typeof import("./proxy-config") // eslint-disable-line @typescript-eslint/no-require-imports
    for (let i = 0; i < entries.length; i++) {
      const proxy = getProxyForSession(i)
      entries[i].proxyUrl = proxy?.url ?? null
    }
  } catch {
    // Proxy module not available — all direct
  }

  g.__sessions = entries
  g.__sessionIndex = 0
  startRecoveryTimer()
  startKeepAliveTimer()
  console.log(`[session-mgr] Pool initialized: ${entries.length} session(s), budget: ${getDailyBudget()} req/day`)
  return entries
}

// ── Recovery timer ───────────────────────────────────────────

function startRecoveryTimer(): void {
  if (g.__sessionRecoveryTimer) return
  g.__sessionRecoveryTimer = setInterval(() => {
    const pool = g.__sessions
    if (!pool) return
    const now = Date.now()

    for (const entry of pool) {
      // Reset daily budget at midnight UTC
      resetDailyBudgetIfNeeded(entry)

      // COOLDOWN → DEGRADED when cooldown expires
      if (entry.health === SessionHealth.COOLDOWN && now >= entry.cooldownUntil) {
        entry.health = SessionHealth.DEGRADED
        entry.healthScore = Math.max(entry.healthScore, 30)
        logInfo("session", "cooldown_expired", {
          index: pool.indexOf(entry),
          consecutive429Count: entry.consecutive429Count,
        })
      }
      // DEGRADED → HEALTHY if quiet for a while
      if (
        entry.health === SessionHealth.DEGRADED &&
        entry.lastUsed > 0 &&
        now - entry.lastUsed > DEGRADED_RECOVERY_MS &&
        entry.failCount === 0
      ) {
        entry.health = SessionHealth.HEALTHY
        entry.healthScore = 100
      }
      // NOTE: DEAD sessions NEVER auto-recover. They require new cookies.
    }
  }, RECOVERY_CHECK_MS)
  if (g.__sessionRecoveryTimer && typeof g.__sessionRecoveryTimer === "object" && "unref" in g.__sessionRecoveryTimer) {
    g.__sessionRecoveryTimer.unref()
  }
}

// ── Keep-alive timer ─────────────────────────────────────────

function startKeepAliveTimer(): void {
  if (g.__sessionKeepAliveTimer) return

  const runKeepAlive = async () => {
    const pool = g.__sessions
    if (!pool) return

    for (let i = 0; i < pool.length; i++) {
      const entry = pool[i]
      // Only ping HEALTHY or DEGRADED sessions (not DEAD or COOLDOWN)
      if (entry.health === SessionHealth.DEAD || entry.health === SessionHealth.COOLDOWN) continue
      // Don't ping if used recently (within last hour)
      if (entry.lastUsed > 0 && Date.now() - entry.lastUsed < 60 * 60_000) continue

      try {
        // Lightweight request: fetch Instagram homepage with session cookie
        // This refreshes the session token on Instagram's side
        const res = await fetch("https://www.instagram.com/accounts/activity/?__a=1&__d=dis", {
          headers: {
            "Cookie": entry.cookieStr,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          redirect: "manual",
        })

        if (res.status === 200 || res.status === 302) {
          logInfo("session", "keep_alive_ok", { index: i, status: res.status })
        } else if (res.status === 401 || res.status === 403) {
          logWarn("session", "keep_alive_auth_fail", { index: i, status: res.status })
          // Don't mark dead immediately — let the scraper handle that
        } else {
          logInfo("session", "keep_alive_status", { index: i, status: res.status })
        }

        // Stagger pings: wait 30s between sessions
        await new Promise((r) => setTimeout(r, 30_000))
      } catch (err) {
        logWarn("session", "keep_alive_error", {
          index: i,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  // Run first keep-alive after 5 minutes (let server warm up)
  setTimeout(() => {
    runKeepAlive()
    g.__sessionKeepAliveTimer = setInterval(runKeepAlive, KEEP_ALIVE_INTERVAL_MS)
    if (g.__sessionKeepAliveTimer && typeof g.__sessionKeepAliveTimer === "object" && "unref" in g.__sessionKeepAliveTimer) {
      g.__sessionKeepAliveTimer.unref()
    }
  }, 5 * 60_000)
}

// ── Public API ───────────────────────────────────────────────

/**
 * Get the best available session.
 * Picks highest healthScore that is not in COOLDOWN/DEAD,
 * has budget remaining, and respects minimum inter-request gap.
 *
 * Throws if no session is available (all dead or exhausted).
 */
export function getSession(): { cookieStr: string; csrfToken: string; index: number } {
  const pool = initSessions()
  if (!g.__sessionIndex) g.__sessionIndex = 0
  const now = Date.now()

  // Pass 1: find available (HEALTHY or DEGRADED) with budget + inter-request gap
  let best: { entry: SessionEntry; idx: number } | null = null
  for (let i = 0; i < pool.length; i++) {
    const idx = (g.__sessionIndex + i) % pool.length
    const entry = pool[idx]

    if (entry.health !== SessionHealth.HEALTHY && entry.health !== SessionHealth.DEGRADED) continue
    if (isDailyBudgetExhausted(entry)) continue
    // Enforce minimum gap between requests on same session
    if (entry.lastUsed > 0 && now - entry.lastUsed < MIN_INTER_REQUEST_MS) continue

    if (!best || entry.healthScore > best.entry.healthScore) {
      best = { entry, idx }
    }
  }

  if (best) {
    g.__sessionIndex = (best.idx + 1) % pool.length
    best.entry.lastUsed = now
    best.entry.totalRequests++
    best.entry.dailyRequestCount++
    return { cookieStr: best.entry.cookieStr, csrfToken: best.entry.csrfToken, index: best.idx }
  }

  // Pass 2: check if all are budget-exhausted (wait until tomorrow)
  const allExhausted = pool.every(
    (e) => e.health !== SessionHealth.DEAD && e.health !== SessionHealth.COOLDOWN && isDailyBudgetExhausted(e),
  )
  if (allExhausted) {
    throw new Error(
      "Presupuesto diario agotado en todas las sesiones. Se resetea a medianoche UTC.",
    )
  }

  // Pass 3: all cooldown/dead — pick soonest cooldown exit (but DON'T force exit)
  const cooldownEntries = pool
    .map((e, i) => ({ entry: e, idx: i }))
    .filter((x) => x.entry.health === SessionHealth.COOLDOWN)
    .sort((a, b) => a.entry.cooldownUntil - b.entry.cooldownUntil)

  if (cooldownEntries.length > 0) {
    const pick = cooldownEntries[0]
    const waitMs = pick.entry.cooldownUntil - now
    if (waitMs <= 0) {
      // Cooldown already expired, promote to DEGRADED
      pick.entry.health = SessionHealth.DEGRADED
      pick.entry.healthScore = Math.max(pick.entry.healthScore, 30)
      pick.entry.cooldownUntil = 0
      pick.entry.lastUsed = now
      pick.entry.totalRequests++
      pick.entry.dailyRequestCount++
      g.__sessionIndex = (pick.idx + 1) % pool.length
      return { cookieStr: pick.entry.cookieStr, csrfToken: pick.entry.csrfToken, index: pick.idx }
    }
    // Don't force out of cooldown — throw with wait info
    const waitMin = Math.ceil(waitMs / 60_000)
    throw new Error(
      `Todas las sesiones en cooldown. La más próxima se libera en ${waitMin} minuto${waitMin !== 1 ? "s" : ""}.`,
    )
  }

  // Pass 4: all dead — DON'T auto-reset. Require new cookies.
  throw new Error(
    "Todas las sesiones están muertas (LOGIN_REQUIRED). Necesitás renovar las cookies de Instagram en .env.local.",
  )
}

/** Report a successful request. */
export function reportSuccess(index: number): void {
  const pool = initSessions()
  if (index < 0 || index >= pool.length) return
  const entry = pool[index]
  entry.failCount = 0
  entry.successCount++
  entry.consecutiveSuccesses++
  entry.consecutive429Count = 0  // Reset 429 streak on success
  entry.lastError = null
  entry.lastErrorCode = null
  const now = Date.now()
  if (entry.firstUsedAt === 0) entry.firstUsedAt = now
  entry.lastSuccessAt = now
  // Estimate session expiry: first use + 30 days (conservative)
  if (!entry.estimatedExpiryAt && entry.firstUsedAt > 0) {
    entry.estimatedExpiryAt = entry.firstUsedAt + 30 * 24 * 60 * 60 * 1000
  }
  if (entry.health === SessionHealth.DEGRADED) {
    entry.healthScore = Math.min(entry.healthScore + 10, 100)
    if (entry.healthScore >= 80) entry.health = SessionHealth.HEALTHY
  }
  if (entry.health === SessionHealth.HEALTHY) {
    entry.healthScore = 100
  }
}

/** Report a failed request with typed reason. */
export function reportFailure(index: number, reason: ReasonCode, message: string): void {
  const pool = initSessions()
  if (index < 0 || index >= pool.length) return
  const entry = pool[index]

  entry.failCount++
  entry.lastError = message
  entry.lastErrorCode = reason

  switch (reason) {
    case ReasonCode.RATE_LIMIT: {
      entry.rateLimit429Count++
      entry.consecutive429Count++
      entry.healthScore = Math.max(entry.healthScore - SCORE_HIT_429, 0)

      // Aggressive exponential backoff: 5min * 3^(consecutive-1), max 6h
      const cooldownMs = Math.min(
        COOLDOWN_429_BASE_MS * Math.pow(COOLDOWN_429_MULTIPLIER, entry.consecutive429Count - 1),
        COOLDOWN_429_MAX_MS,
      )
      entry.cooldownUntil = Date.now() + cooldownMs
      entry.health = SessionHealth.COOLDOWN
      const cooldownMin = Math.round(cooldownMs / 60_000)
      logWarn("session", "cooldown_429", {
        index,
        cooldownMin,
        consecutive429: entry.consecutive429Count,
        healthScore: entry.healthScore,
        dailyUsed: entry.dailyRequestCount,
      })
      break
    }

    case ReasonCode.LOGIN_REQUIRED:
    case ReasonCode.CHECKPOINT:
      entry.healthScore = 0
      entry.health = SessionHealth.DEAD
      logWarn("session", "dead", { index, reason, message })
      break

    default:
      // Transient errors
      entry.healthScore = Math.max(entry.healthScore - SCORE_HIT_TRANSIENT, 0)
      entry.cooldownUntil = Date.now() + COOLDOWN_TRANSIENT_MS
      entry.health = SessionHealth.COOLDOWN
      if (entry.healthScore <= 0) {
        entry.health = SessionHealth.DEAD
      }
      break
  }
}

/** Check if any session is available (not all DEAD). */
export function isAnySessionAvailable(): boolean {
  const pool = initSessions()
  return pool.some((e) => e.health !== SessionHealth.DEAD)
}

/** Get remaining daily budget across all alive sessions. */
export function getRemainingBudget(): { total: number; perSession: { index: number; remaining: number }[] } {
  const pool = initSessions()
  const budget = getDailyBudget()
  const perSession = pool
    .filter((e) => e.health !== SessionHealth.DEAD)
    .map((e, i) => {
      resetDailyBudgetIfNeeded(e)
      return { index: i, remaining: Math.max(0, budget - e.dailyRequestCount) }
    })
  return {
    total: perSession.reduce((sum, s) => sum + s.remaining, 0),
    perSession,
  }
}

/** Diagnostics (no secrets). */
export function getPoolDiagnostics(): {
  total: number
  healthy: number
  degraded: number
  cooldown: number
  dead: number
  dailyBudget: number
  entries: {
    index: number
    health: SessionHealth
    healthScore: number
    cooldownUntil: number
    failCount: number
    successCount: number
    rateLimit429Count: number
    consecutive429Count: number
    lastErrorCode: ReasonCode | null
    proxyHost: string | null
    fingerprintId: number
    lastSuccessAt: number
    estimatedExpiryAt: number | null
    nearingExpiry: boolean
    dailyRequestCount: number
    dailyRemaining: number
  }[]
} {
  const pool = initSessions()
  const now = Date.now()
  const budget = getDailyBudget()
  const EXPIRY_WARNING_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

  return {
    total: pool.length,
    healthy: pool.filter((e) => e.health === SessionHealth.HEALTHY).length,
    degraded: pool.filter((e) => e.health === SessionHealth.DEGRADED).length,
    cooldown: pool.filter((e) => e.health === SessionHealth.COOLDOWN).length,
    dead: pool.filter((e) => e.health === SessionHealth.DEAD).length,
    dailyBudget: budget,
    entries: pool.map((e, i) => {
      resetDailyBudgetIfNeeded(e)
      let proxyHost: string | null = null
      if (e.proxyUrl) {
        try {
          const u = new URL(e.proxyUrl)
          proxyHost = `${u.hostname}:${u.port || "80"}`
        } catch {
          proxyHost = "[invalid]"
        }
      }
      return {
        index: i,
        health: e.health,
        healthScore: e.healthScore,
        cooldownUntil: e.cooldownUntil,
        failCount: e.failCount,
        successCount: e.successCount,
        rateLimit429Count: e.rateLimit429Count,
        consecutive429Count: e.consecutive429Count,
        lastErrorCode: e.lastErrorCode,
        proxyHost,
        fingerprintId: e.fingerprintId,
        lastSuccessAt: e.lastSuccessAt,
        estimatedExpiryAt: e.estimatedExpiryAt,
        nearingExpiry: e.estimatedExpiryAt !== null && (e.estimatedExpiryAt - now) < EXPIRY_WARNING_MS,
        dailyRequestCount: e.dailyRequestCount,
        dailyRemaining: Math.max(0, budget - e.dailyRequestCount),
      }
    }),
  }
}
