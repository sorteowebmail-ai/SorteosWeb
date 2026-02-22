import { NextResponse, type NextRequest } from "next/server"

// ── Simple in-memory rate limiter ────────────────
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 30 // 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Lazy cleanup (~1% of requests)
  if (Math.random() < 0.01) {
    for (const [key, entry] of rateLimits) {
      if (now > entry.resetAt) rateLimits.delete(key)
    }
  }

  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// ── Middleware ────────────────────────────────────

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  // B5: Security headers (all routes)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  const { pathname } = request.nextUrl

  // Only apply API protections to /api/ routes
  if (!pathname.startsWith("/api/")) return response

  // B1: Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 },
    )
  }

  // B3: CSRF — check Origin for mutating requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    // Webhook is called by MercadoPago — skip origin check
    if (!pathname.startsWith("/api/payment/webhook")) {
      const origin = request.headers.get("origin")
      const host = request.headers.get("host")

      if (origin && host) {
        const originHost = new URL(origin).hostname
        const requestHost = host.split(":")[0]
        if (originHost !== requestHost) {
          return NextResponse.json(
            { error: "Solicitud no autorizada" },
            { status: 403 },
          )
        }
      } else if (!origin) {
        // Missing Origin on mutating request — block
        return NextResponse.json(
          { error: "Solicitud no autorizada" },
          { status: 403 },
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
