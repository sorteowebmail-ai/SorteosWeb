/**
 * Cookie pool for Instagram session rotation.
 *
 * Supports multiple sessions to rotate when one gets blocked/rate-limited.
 * Reads from environment variables:
 *   - INSTAGRAM_COOKIES: single cookie string (backward compatible)
 *   - INSTAGRAM_COOKIES_POOL: semicolon-separated list of cookie strings
 *     e.g. "session1_cookies;;;session2_cookies;;;session3_cookies"
 *
 * Uses globalThis to survive HMR.
 */

interface CookieEntry {
  cookieStr: string
  csrfToken: string
  healthy: boolean
  lastError: string | null
  lastUsed: number
  failCount: number
}

const g = globalThis as unknown as {
  __cookiePool?: CookieEntry[]
  __cookiePoolIndex?: number
}

function parseSingleCookie(raw: string): { cookieStr: string; csrfToken: string } {
  const csrfMatch = raw.match(/csrftoken=([^;]+)/)
  return {
    cookieStr: raw.trim(),
    csrfToken: csrfMatch ? csrfMatch[1].trim() : "",
  }
}

function initPool(): CookieEntry[] {
  if (g.__cookiePool && g.__cookiePool.length > 0) return g.__cookiePool

  const entries: CookieEntry[] = []

  // Check for pool first (semicolon-triple separated for clarity)
  const poolRaw = process.env.INSTAGRAM_COOKIES_POOL
  if (poolRaw) {
    const sessions = poolRaw.split(";;;").map(s => s.trim()).filter(Boolean)
    for (const session of sessions) {
      const { cookieStr, csrfToken } = parseSingleCookie(session)
      entries.push({
        cookieStr,
        csrfToken,
        healthy: true,
        lastError: null,
        lastUsed: 0,
        failCount: 0,
      })
    }
  }

  // Add single cookie (INSTAGRAM_COOKIES) if not already in pool
  const singleRaw = process.env.INSTAGRAM_COOKIES
  if (singleRaw) {
    const { cookieStr, csrfToken } = parseSingleCookie(singleRaw)
    const alreadyInPool = entries.some(e => e.cookieStr === cookieStr)
    if (!alreadyInPool) {
      entries.unshift({
        cookieStr,
        csrfToken,
        healthy: true,
        lastError: null,
        lastUsed: 0,
        failCount: 0,
      })
    }
  }

  // Fallback: session ID
  if (entries.length === 0) {
    const sessionId = process.env.INSTAGRAM_SESSION_ID
    if (sessionId) {
      entries.push({
        cookieStr: `sessionid=${sessionId}`,
        csrfToken: "",
        healthy: true,
        lastError: null,
        lastUsed: 0,
        failCount: 0,
      })
    }
  }

  if (entries.length === 0) {
    throw new Error(
      "Cookies de Instagram no configuradas.\n" +
      "Configura INSTAGRAM_COOKIES en .env.local"
    )
  }

  g.__cookiePool = entries
  g.__cookiePoolIndex = 0
  console.log(`[cookie-pool] Initialized with ${entries.length} session(s)`)
  return entries
}

/**
 * Get the next healthy cookie from the pool.
 * Rotates round-robin, skipping unhealthy sessions.
 * If all sessions are unhealthy, resets the least-failed one and returns it.
 */
export function getNextCookie(): { cookieStr: string; csrfToken: string; index: number } {
  const pool = initPool()
  if (!g.__cookiePoolIndex) g.__cookiePoolIndex = 0

  // Try round-robin through healthy sessions
  for (let i = 0; i < pool.length; i++) {
    const idx = (g.__cookiePoolIndex + i) % pool.length
    const entry = pool[idx]
    if (entry.healthy) {
      g.__cookiePoolIndex = (idx + 1) % pool.length
      entry.lastUsed = Date.now()
      return { cookieStr: entry.cookieStr, csrfToken: entry.csrfToken, index: idx }
    }
  }

  // All unhealthy — reset the one with fewest failures
  const sorted = [...pool].sort((a, b) => a.failCount - b.failCount)
  const best = sorted[0]
  best.healthy = true
  best.failCount = 0
  best.lastError = null
  const idx = pool.indexOf(best)
  g.__cookiePoolIndex = (idx + 1) % pool.length
  best.lastUsed = Date.now()
  console.log(`[cookie-pool] All sessions unhealthy, resetting session ${idx}`)
  return { cookieStr: best.cookieStr, csrfToken: best.csrfToken, index: idx }
}

/**
 * Mark a cookie session as failed (blocked or rate-limited).
 * After 3 consecutive failures, marks as unhealthy.
 */
export function markCookieFailed(index: number, error: string, permanent: boolean): void {
  const pool = initPool()
  if (index < 0 || index >= pool.length) return

  const entry = pool[index]
  entry.failCount++
  entry.lastError = error

  if (permanent || entry.failCount >= 3) {
    entry.healthy = false
    console.log(`[cookie-pool] Session ${index} marked unhealthy: ${error} (fails: ${entry.failCount})`)
  }
}

/**
 * Mark a cookie session as successfully used (reset fail count).
 */
export function markCookieSuccess(index: number): void {
  const pool = initPool()
  if (index < 0 || index >= pool.length) return
  pool[index].failCount = 0
  pool[index].healthy = true
  pool[index].lastError = null
}

/**
 * Get pool status for diagnostics.
 */
export function getPoolStatus(): { total: number; healthy: number; entries: { index: number; healthy: boolean; failCount: number; lastError: string | null }[] } {
  const pool = initPool()
  return {
    total: pool.length,
    healthy: pool.filter(e => e.healthy).length,
    entries: pool.map((e, i) => ({
      index: i,
      healthy: e.healthy,
      failCount: e.failCount,
      lastError: e.lastError,
    })),
  }
}
