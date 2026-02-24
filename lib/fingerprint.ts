/**
 * Browser fingerprint pool for anti-detection.
 *
 * Each session gets a sticky fingerprint assigned at initialization.
 * The fingerprint includes User-Agent, Accept-Language, Client Hints,
 * and a pacing multiplier to simulate different browsing speeds.
 */

// ── Types ─────────────────────────────────────────────────────

export interface BrowserFingerprint {
  userAgent: string
  acceptLanguage: string
  secChUa: string
  secChUaPlatform: string
  secChUaMobile: string
  /** Pacing multiplier: 1.0 = normal speed, 1.3 = slow */
  pacingMultiplier: number
}

// ── Fingerprint Pool ──────────────────────────────────────────

const FINGERPRINT_POOL: BrowserFingerprint[] = [
  // Chrome 131 — Windows 10
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    acceptLanguage: "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
    secChUa: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: "?0",
    pacingMultiplier: 1.0,
  },
  // Chrome 131 — macOS
  {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    acceptLanguage: "es-ES,es;q=0.9,en;q=0.8",
    secChUa: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"macOS"',
    secChUaMobile: "?0",
    pacingMultiplier: 1.1,
  },
  // Chrome 130 — Windows 11
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    acceptLanguage: "en-US,en;q=0.9,es;q=0.8",
    secChUa: '"Chromium";v="130", "Google Chrome";v="130", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: "?0",
    pacingMultiplier: 0.9,
  },
  // Edge 131 — Windows
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    acceptLanguage: "es-MX,es;q=0.9,en;q=0.8",
    secChUa: '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: "?0",
    pacingMultiplier: 1.05,
  },
  // Chrome 131 — Linux
  {
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    acceptLanguage: "en-US,en;q=0.9",
    secChUa: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Linux"',
    secChUaMobile: "?0",
    pacingMultiplier: 0.85,
  },
  // Chrome 129 — macOS (slightly older)
  {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    acceptLanguage: "es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7",
    secChUa: '"Chromium";v="129", "Google Chrome";v="129", "Not_A Brand";v="24"',
    secChUaPlatform: '"macOS"',
    secChUaMobile: "?0",
    pacingMultiplier: 1.2,
  },
  // Edge 130 — Windows
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
    acceptLanguage: "es-CO,es;q=0.9,en;q=0.8",
    secChUa: '"Microsoft Edge";v="130", "Chromium";v="130", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: "?0",
    pacingMultiplier: 1.15,
  },
  // Chrome 131 — Windows (Portuguese locale)
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    acceptLanguage: "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    secChUa: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: "?0",
    pacingMultiplier: 0.95,
  },
]

// ── Global state (survives HMR) ───────────────────────────────

const g = globalThis as unknown as {
  __fingerprintAssignment?: Map<number, number> // sessionIndex → pool index
}

// ── Public API ────────────────────────────────────────────────

/**
 * Get the fingerprint for a session index.
 * Assignment is sticky: same index always returns the same fingerprint.
 */
export function getFingerprint(sessionIndex: number): BrowserFingerprint {
  if (!g.__fingerprintAssignment) g.__fingerprintAssignment = new Map()

  let poolIdx = g.__fingerprintAssignment.get(sessionIndex)
  if (poolIdx === undefined) {
    poolIdx = sessionIndex % FINGERPRINT_POOL.length
    g.__fingerprintAssignment.set(sessionIndex, poolIdx)
  }

  return FINGERPRINT_POOL[poolIdx]
}

/**
 * Calculate a human-like pacing delay with jitter.
 * Uses the session's fingerprint pacing multiplier.
 */
export function getPacingDelay(baseDelayMs: number, sessionIndex: number): number {
  const fp = getFingerprint(sessionIndex)
  const jitter = 0.8 + Math.random() * 0.4 // ±20%
  return Math.round(baseDelayMs * fp.pacingMultiplier * jitter)
}
