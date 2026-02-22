// Comment scraping through Playwright browser context
// Makes API calls from inside Chromium for authentic TLS fingerprint

import { acquirePage, isPlaywrightAvailable } from "./browser-manager"
import {
  shortcodeToMediaId,
  parseCommentsResponse,
  checkAuthError,
  InstagramPermanentError,
  InstagramTransientError,
} from "./scraper"
import type { ScrapedComment } from "./scraper"

const IG_APP_ID = "936619743392459"

/**
 * Scrape one page of comments using the Playwright browser context.
 * The fetch() call runs INSIDE Chromium, giving us:
 * - Real TLS fingerprint (not Node.js)
 * - Authentic browser headers (Sec-Fetch-*, etc.)
 * - Same-origin cookie handling
 *
 * Same return shape as HTTP scrapeComments() for drop-in compatibility.
 */
export async function scrapeCommentsBrowser(
  shortcode: string,
  cursor?: string,
): Promise<{
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
  source: "browser"
}> {
  if (!(await isPlaywrightAvailable())) {
    throw new Error("Playwright not available")
  }

  const mediaId = shortcodeToMediaId(shortcode)
  const { page, release } = await acquirePage()

  try {
    // Execute fetch inside the browser context
    const result = await page.evaluate(
      async ({ mediaId, cursor, appId }) => {
        const url =
          `/api/v1/media/${mediaId}/comments/?can_support_threading=false&permalink_enabled=false&count=100` +
          (cursor ? `&min_id=${encodeURIComponent(cursor)}` : "")

        try {
          const res = await fetch(`https://www.instagram.com${url}`, {
            credentials: "include",
            headers: {
              "X-IG-App-ID": appId,
              "X-Requested-With": "XMLHttpRequest",
              Accept: "*/*",
            },
          })

          return {
            ok: res.ok,
            status: res.status,
            body: await res.text(),
          }
        } catch (error) {
          return {
            ok: false,
            status: 0,
            body: error instanceof Error ? error.message : "Network error",
          }
        }
      },
      { mediaId, cursor, appId: IG_APP_ID },
    )

    // Handle network errors from inside browser
    if (result.status === 0) {
      throw new InstagramTransientError(
        `Browser network error: ${result.body}`,
      )
    }

    // Handle HTTP redirects (302 = login redirect)
    if (result.status === 302) {
      throw new InstagramPermanentError(
        "Sesion de Instagram no valida. Actualiza INSTAGRAM_COOKIES en .env.local",
      )
    }

    // Handle rate limit
    if (result.status === 429 || result.status >= 500) {
      throw new InstagramTransientError(
        `Instagram respondio con status ${result.status}`,
        result.status,
      )
    }

    // Handle non-JSON responses
    if (!result.body.startsWith("{")) {
      if (
        result.body.includes("login") ||
        result.body.includes("LoginAndSignupPage") ||
        result.body.includes("checkpoint")
      ) {
        throw new InstagramPermanentError(
          "Instagram redirigió a login. Sesion expirada.",
        )
      }
      throw new InstagramTransientError(
        "Respuesta inesperada de Instagram (HTML en vez de JSON).",
      )
    }

    // Parse JSON response
    const data = JSON.parse(result.body)

    // Check for auth errors
    checkAuthError(data)

    // Handle status: fail
    if (data.status === "fail") {
      const msg = data.message || "Error desconocido"
      const permanentMessages = [
        "login_required",
        "checkpoint_required",
        "feedback_required",
        "consent_required",
        "not_authorized",
      ]
      if (permanentMessages.includes(msg)) {
        throw new InstagramPermanentError(`Instagram error: ${msg}`)
      }
      throw new InstagramTransientError(`Instagram error: ${msg}`)
    }

    // Parse comments using shared parser
    const parsed = parseCommentsResponse(data)

    return {
      ...parsed,
      source: "browser" as const,
    }
  } finally {
    release()
  }
}
