/**
 * GET /api/scrape/diagnostics
 *
 * Auth-protected endpoint for monitoring session/proxy health.
 * Requires: Authorization: Bearer {DIAGNOSTICS_TOKEN}
 *
 * Returns:
 *   - sessions: pool health, scores, cooldown timers
 *   - proxies: configured proxy hosts
 *   - alerts: actionable warnings (dead sessions, near-expiry, high 429 rate)
 */

import { NextResponse } from "next/server"
import { getPoolDiagnostics } from "@/lib/session-manager"
import { getProxyDiagnostics } from "@/lib/proxy-config"
import { SessionHealth } from "@/lib/scrape-types"

export async function GET(request: Request): Promise<NextResponse> {
  // Auth check
  const token = process.env.DIAGNOSTICS_TOKEN
  if (token) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const sessions = getPoolDiagnostics()
  const proxies = getProxyDiagnostics()

  // Build alerts
  const alerts: string[] = []

  const deadCount = sessions.entries.filter(
    (e) => e.health === SessionHealth.DEAD
  ).length
  if (deadCount > 0) {
    alerts.push(`${deadCount} session(s) DEAD`)
  }

  if (sessions.healthy === 0 && sessions.degraded === 0) {
    alerts.push("NO healthy sessions available")
  }

  for (const e of sessions.entries) {
    if (e.nearingExpiry) {
      const daysLeft = e.estimatedExpiryAt
        ? Math.round((e.estimatedExpiryAt - Date.now()) / (24 * 60 * 60 * 1000))
        : 0
      alerts.push(`Session ${e.index} nearing expiry (${daysLeft} days left)`)
    }
    if (e.rateLimit429Count >= 5) {
      alerts.push(
        `Session ${e.index} high 429 rate: ${e.rateLimit429Count}`
      )
    }
  }

  return NextResponse.json({
    sessions,
    proxies,
    alerts,
  })
}
