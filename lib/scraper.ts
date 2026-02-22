// Instagram scraper using full browser cookies
// Scrapes the Instagram page HTML + uses internal endpoints for comments

const IG_APP_ID = "936619743392459"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

// ============================================================
// Types
// ============================================================

export interface PostInfo {
  shortcode: string
  mediaId: string
  ownerUsername: string
  caption: string
  displayUrl: string
  commentCount: number
  likeCount: number
  isVideo: boolean
}

export interface ScrapedComment {
  id: string
  username: string
  text: string
  timestamp: string
}

// ============================================================
// Error classes
// ============================================================

export class InstagramPermanentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InstagramPermanentError"
  }
}

export class InstagramTransientError extends Error {
  public readonly statusCode?: number
  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = "InstagramTransientError"
    this.statusCode = statusCode
  }
}

// ============================================================
// Helpers
// ============================================================

export function extractShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function shortcodeToMediaId(shortcode: string): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
  let id = BigInt(0)
  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(alphabet.indexOf(char))
  }
  return id.toString()
}

export function getCookies(): { cookieStr: string; csrfToken: string } {
  const fullCookies = process.env.INSTAGRAM_COOKIES
  if (fullCookies) {
    const csrfMatch = fullCookies.match(/csrftoken=([^;]+)/)
    return {
      cookieStr: fullCookies,
      csrfToken: csrfMatch ? csrfMatch[1].trim() : "",
    }
  }

  const sessionId = process.env.INSTAGRAM_SESSION_ID
  if (sessionId) {
    return {
      cookieStr: `sessionid=${sessionId}`,
      csrfToken: "",
    }
  }

  throw new Error(
    "Cookies de Instagram no configuradas.\n" +
      "Configura INSTAGRAM_COOKIES en .env.local:\n" +
      "1. Abri Instagram.com en Chrome (logueado)\n" +
      "2. F12 > Application > Cookies > instagram.com\n" +
      "3. Copia el valor de 'sessionid' y pegalo en .env.local"
  )
}

function buildHeaders(
  cookieStr: string,
  csrfToken: string,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "X-IG-App-ID": IG_APP_ID,
    "X-IG-WWW-Claim": "0",
    "X-Requested-With": "XMLHttpRequest",
    "X-CSRFToken": csrfToken,
    Referer: "https://www.instagram.com/",
    Origin: "https://www.instagram.com",
    Cookie: cookieStr,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    ...extra,
  }
}

function buildPageHeaders(cookieStr: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Cookie: cookieStr,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  }
}

export function checkAuthError(data: { message?: string; status?: string }): void {
  const msg = data.message || ""

  // Permanent — no retry will help
  if (
    msg === "login_required" ||
    msg === "checkpoint_required" ||
    msg === "feedback_required" ||
    msg === "consent_required"
  ) {
    throw new InstagramPermanentError(
      "Sesi\u00F3n de Instagram expirada o bloqueada.\n" +
        "Actualiza INSTAGRAM_COOKIES en .env.local:\n" +
        "1. Abr\u00ED Instagram.com en Chrome (logueado)\n" +
        "2. F12 > Application > Cookies > instagram.com\n" +
        "3. Copi\u00E1 el valor de 'sessionid' y actualiza .env.local"
    )
  }

  // Transient — worth retrying with backoff
  if (msg === "Please wait a few minutes before you try again.") {
    throw new InstagramTransientError("Instagram pide esperar. Reintentando...", 429)
  }
}

// ============================================================
// Scraping strategies
// ============================================================

/**
 * Strategy 1: Use the GraphQL POST endpoint (doc_id based)
 * This is the modern approach Instagram's frontend uses
 */
async function scrapeWithGraphQLPost(
  shortcode: string,
  cookieStr: string,
  csrfToken: string
): Promise<PostInfo | null> {
  try {
    const headers = buildHeaders(cookieStr, csrfToken, {
      "Content-Type": "application/x-www-form-urlencoded",
    })

    const body = new URLSearchParams({
      av: "17841400577710658",
      __d: "www",
      __user: "0",
      __a: "1",
      __req: "1",
      __hs: "20186.HYP:instagram_web_pkg.2.1..0.1",
      dpr: "1",
      __ccg: "UNKNOWN",
      __rev: "1020580884",
      __comet_req: "7",
      lsd: "AVpJyFJJXXk",
      jazoest: "2951",
      __spin_r: "1020580884",
      __spin_b: "trunk",
      __spin_t: "1738280000",
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
      variables: JSON.stringify({
        shortcode,
        fetch_comment_count: 40,
        fetch_related_profile_media_count: 0,
        parent_comment_count: 0,
        child_comment_count: 0,
        fetch_like_count: 0,
        fetch_tagged_user_count: null,
        fetch_preview_comment_count: 0,
        has_threaded_comments: true,
        hoisted_comment_id: null,
        hoisted_reply_id: null,
      }),
      server_timestamps: "true",
      doc_id: "8845758582119845",
    })

    const res = await fetch("https://www.instagram.com/graphql/query", {
      method: "POST",
      headers,
      body: body.toString(),
    })

    if (!res.ok) return null

    const text = await res.text()
    if (!text.startsWith("{")) return null

    const json = JSON.parse(text)
    const media = json.data?.xdt_shortcode_media
    if (!media) {
      // Try alternative response structures
      const altMedia = json.data?.shortcode_media || json.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0]
      if (!altMedia) return null
      // Use altMedia
      return {
        shortcode,
        mediaId: altMedia.id || altMedia.pk?.toString() || shortcodeToMediaId(shortcode),
        ownerUsername: altMedia.owner?.username || altMedia.user?.username || "unknown",
        caption: altMedia.edge_media_to_caption?.edges?.[0]?.node?.text || altMedia.caption?.text || "",
        displayUrl: altMedia.display_url || altMedia.image_versions2?.candidates?.[0]?.url || "",
        commentCount: altMedia.edge_media_to_parent_comment?.count || altMedia.edge_media_to_comment?.count || altMedia.comment_count || 0,
        likeCount: altMedia.edge_media_preview_like?.count || altMedia.like_count || 0,
        isVideo: altMedia.is_video || altMedia.media_type === 2 || false,
      }
    }

    return {
      shortcode,
      mediaId: media.id || shortcodeToMediaId(shortcode),
      ownerUsername: media.owner?.username || "unknown",
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      displayUrl: media.display_url || media.thumbnail_src || "",
      commentCount: media.edge_media_to_parent_comment?.count || media.edge_media_to_comment?.count || 0,
      likeCount: media.edge_media_preview_like?.count || 0,
      isVideo: media.is_video || false,
    }
  } catch {
    return null
  }
}

/**
 * Strategy 2: Scrape the HTML page and extract embedded JSON data
 */
async function scrapeWithPageHTML(
  shortcode: string,
  cookieStr: string
): Promise<PostInfo | null> {
  try {
    const headers = buildPageHeaders(cookieStr)

    // Try both /p/ and /reel/ URLs
    for (const pathType of ["reel", "p"]) {
      const res = await fetch(
        `https://www.instagram.com/${pathType}/${shortcode}/`,
        { headers, redirect: "follow" }
      )

      if (!res.ok) continue

      const html = await res.text()

      // Detect Instagram error pages (SPA renders 200 even for non-existent posts)
      if (
        html.includes('"pageID":"httpErrorPage"') ||
        html.includes("PolarisErrorRoot.entrypoint") ||
        html.includes("Page Not Found") ||
        html.includes("page isn't available") ||
        html.includes("Sorry, this page")
      ) {
        continue // This post doesn't exist
      }

      // Try to find embedded JSON data in script tags
      // Instagram embeds media data in various formats

      // Method A: Look for require("ScheduledServerJS").handle calls with media data
      const scheduledMatch = html.match(/"xdt_api__v1__media__shortcode__web_info":\{"items":\[([\s\S]*?)\]\}/)
      if (scheduledMatch) {
        try {
          const item = JSON.parse(`{${scheduledMatch[0]}}`).xdt_api__v1__media__shortcode__web_info.items[0]
          if (item) {
            return {
              shortcode,
              mediaId: item.pk?.toString() || shortcodeToMediaId(shortcode),
              ownerUsername: item.user?.username || "unknown",
              caption: item.caption?.text || "",
              displayUrl: item.image_versions2?.candidates?.[0]?.url || "",
              commentCount: item.comment_count || 0,
              likeCount: item.like_count || 0,
              isVideo: item.media_type === 2,
            }
          }
        } catch { /* continue to regex fallback */ }
      }

      // Method B: Look for __additionalData or preloaded data
      const preloadMatch = html.match(/"items":\[(\{"taken_at".*?\})\]/)
      if (preloadMatch) {
        try {
          const item = JSON.parse(preloadMatch[1])
          return {
            shortcode,
            mediaId: item.pk?.toString() || shortcodeToMediaId(shortcode),
            ownerUsername: item.user?.username || "unknown",
            caption: item.caption?.text || "",
            displayUrl: item.image_versions2?.candidates?.[0]?.url || "",
            commentCount: item.comment_count || 0,
            likeCount: item.like_count || 0,
            isVideo: item.media_type === 2,
          }
        } catch { /* continue to regex fallback */ }
      }

      // Method C: Regex extraction (less reliable but broad)
      const mediaIdMatch = html.match(/"pk":"(\d+)"/) || html.match(/"media_id":"(\d+)"/)
      const usernameMatch = html.match(/"username":"([^"]+)"/)
      const captionMatch = html.match(/"text":"((?:[^"\\]|\\.)*)","created_at"/)
      const displayUrlMatch = html.match(/"display_url":"([^"]+)"/) || html.match(/"thumbnail_src":"([^"]+)"/) || html.match(/"url":"(https:\/\/[^"]*?cdninstagram[^"]*)"/)
      const commentCountMatch = html.match(/"comment_count":(\d+)/) || html.match(/"edge_media_to_comment":\{"count":(\d+)/) || html.match(/"edge_media_to_parent_comment":\{"count":(\d+)/)
      const likeCountMatch = html.match(/"like_count":(\d+)/) || html.match(/"edge_media_preview_like":\{"count":(\d+)/)
      const isVideoMatch = html.match(/"is_video":(true|false)/) || html.match(/"media_type":(\d)/)

      if (mediaIdMatch || usernameMatch) {
        return {
          shortcode,
          mediaId: mediaIdMatch?.[1] || shortcodeToMediaId(shortcode),
          ownerUsername: usernameMatch?.[1] || "unknown",
          caption: captionMatch?.[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"') || "",
          displayUrl: displayUrlMatch?.[1]?.replace(/\\u0026/g, "&") || "",
          commentCount: parseInt(commentCountMatch?.[1] || "0"),
          likeCount: parseInt(likeCountMatch?.[1] || "0"),
          isVideo: isVideoMatch?.[1] === "true" || isVideoMatch?.[1] === "2",
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Strategy 3: Use V1 media info endpoint
 */
async function scrapeWithV1API(
  shortcode: string,
  cookieStr: string,
  csrfToken: string
): Promise<PostInfo | null> {
  try {
    const mediaId = shortcodeToMediaId(shortcode)
    const headers = buildHeaders(cookieStr, csrfToken)

    // Try both i.instagram.com (mobile API) and www.instagram.com
    for (const host of ["i.instagram.com", "www.instagram.com"]) {
      const res = await fetch(
        `https://${host}/api/v1/media/${mediaId}/info/`,
        { headers }
      )

      if (!res.ok) {
        const text = await res.text()
        if (text.startsWith("{")) {
          const data = JSON.parse(text)
          checkAuthError(data)
        }
        continue
      }

      const text = await res.text()
      if (!text.startsWith("{")) continue

      const data = JSON.parse(text)
      checkAuthError(data)

      const item = data.items?.[0]
      if (item) {
        return {
          shortcode,
          mediaId,
          ownerUsername: item.user?.username || "unknown",
          caption: item.caption?.text || "",
          displayUrl:
            item.image_versions2?.candidates?.[0]?.url ||
            item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
            "",
          commentCount: item.comment_count || 0,
          likeCount: item.like_count || 0,
          isVideo: item.media_type === 2,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Strategy 4: Use oEmbed for basic info (public, no auth needed)
 */
async function scrapeWithOEmbed(
  shortcode: string
): Promise<PostInfo | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${shortcode}/`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      }
    )

    if (!res.ok) return null

    const text = await res.text()
    if (!text.startsWith("{")) return null

    const data = JSON.parse(text)
    if (!data.author_name) return null

    return {
      shortcode,
      mediaId: data.media_id?.toString() || shortcodeToMediaId(shortcode),
      ownerUsername: data.author_name || "unknown",
      caption: data.title || "",
      displayUrl: data.thumbnail_url || "",
      commentCount: 0, // oEmbed doesn't provide this
      likeCount: 0,    // oEmbed doesn't provide this
      isVideo: false,
    }
  } catch {
    return null
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Scrape post information — tries multiple strategies for reliability
 */
export async function scrapePostInfo(shortcode: string): Promise<PostInfo> {
  const { cookieStr, csrfToken } = getCookies()

  // Strategy 1: Web info endpoint (shortcode-based, most reliable)
  try {
    const webInfoHeaders = buildHeaders(cookieStr, csrfToken)
    const webInfoRes = await fetch(
      `https://www.instagram.com/api/v1/media/shortcode/${shortcode}/web_info/`,
      { headers: webInfoHeaders }
    )
    if (webInfoRes.ok) {
      const webInfoText = await webInfoRes.text()
      if (webInfoText.startsWith("{")) {
        const webInfoData = JSON.parse(webInfoText)
        const item = webInfoData.items?.[0]
        if (item) {
          return {
            shortcode,
            mediaId: item.pk?.toString() || shortcodeToMediaId(shortcode),
            ownerUsername: item.user?.username || "unknown",
            caption: item.caption?.text || "",
            displayUrl:
              item.image_versions2?.candidates?.[0]?.url ||
              item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
              "",
            commentCount: item.comment_count || 0,
            likeCount: item.like_count || 0,
            isVideo: item.media_type === 2,
          }
        }
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: GraphQL POST
  const gqlResult = await scrapeWithGraphQLPost(shortcode, cookieStr, csrfToken)
  if (gqlResult) return gqlResult

  // Strategy 3: V1 media info API
  const v1Result = await scrapeWithV1API(shortcode, cookieStr, csrfToken)
  if (v1Result) return v1Result

  // Strategy 4: Scrape page HTML (limited data)
  const htmlResult = await scrapeWithPageHTML(shortcode, cookieStr)
  if (htmlResult) return htmlResult

  // Strategy 5: oEmbed (public fallback, very limited data)
  const oembedResult = await scrapeWithOEmbed(shortcode)
  if (oembedResult) return oembedResult

  throw new Error(
    "Post no encontrado. Verifica que la URL sea correcta y que el post no haya sido eliminado."
  )
}

/**
 * Scrape comments from a post (paginated).
 *
 * Speed strategy:
 *   1. Dual-host: alternate between www.instagram.com and i.instagram.com
 *      — they have SEPARATE rate-limit buckets, effectively doubling capacity
 *   2. count=100: request 100 comments/page instead of the default ~20
 *   3. can_support_threading=false: flat chronological list, more per page
 *   4. Cross-host fallback: if one host returns 429, try the other immediately
 *   5. Exponential backoff only when BOTH hosts fail
 */
const HOSTS = ["www.instagram.com", "i.instagram.com"] as const
const RETRY_MAX = 3
const RETRY_BASE_MS = 2000 // 2s → 4s → 8s

// Track which host to use next (alternates per call for even distribution)
let hostIndex = 0

function buildCommentsUrl(host: string, mediaId: string, cursor?: string): string {
  let url = `https://${host}/api/v1/media/${mediaId}/comments/?can_support_threading=false&permalink_enabled=false&count=100`
  if (cursor) {
    url += `&min_id=${encodeURIComponent(cursor)}`
  }
  return url
}

export function parseCommentsResponse(data: {
  comments?: { pk: string; user: { username: string }; text: string; created_at: number }[]
  has_more_comments?: boolean
  has_more_headload_comments?: boolean
  next_min_id?: string
  comment_count?: number
}): {
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
} {
  const comments: ScrapedComment[] = (data.comments || []).map(
    (c) => ({
      id: String(c.pk),
      username: c.user?.username || "unknown",
      text: c.text || "",
      timestamp: new Date((c.created_at || 0) * 1000).toISOString(),
    })
  )
  return {
    comments,
    hasMore: data.has_more_comments || data.has_more_headload_comments || false,
    cursor: data.next_min_id || undefined,
    total: data.comment_count || undefined,
  }
}

async function fetchCommentsFromHost(
  host: string,
  mediaId: string,
  cursor: string | undefined,
  headers: Record<string, string>,
): Promise<
  | { ok: true; data: ReturnType<typeof parseCommentsResponse> }
  | { ok: false; error: Error; retryable: boolean }
> {
  try {
    const url = buildCommentsUrl(host, mediaId, cursor)
    const res = await fetch(url, { headers })

    if (res.status === 302) {
      return {
        ok: false,
        error: new InstagramPermanentError(
          "Sesión de Instagram no válida. Actualiza INSTAGRAM_COOKIES en .env.local"
        ),
        retryable: false,
      }
    }

    if (res.status === 429 || res.status >= 500) {
      return {
        ok: false,
        error: new InstagramTransientError(`Instagram respondió con status ${res.status}`, res.status),
        retryable: true,
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        error: new InstagramPermanentError(`Instagram respondió con status ${res.status}`),
        retryable: false,
      }
    }

    const text = await res.text()

    if (!text.startsWith("{")) {
      if (text.includes("login") || text.includes("LoginAndSignupPage") || text.includes("checkpoint")) {
        return {
          ok: false,
          error: new InstagramPermanentError("Instagram redirigió a login. Sesión expirada."),
          retryable: false,
        }
      }
      return {
        ok: false,
        error: new InstagramTransientError("Respuesta inesperada de Instagram (HTML en vez de JSON)."),
        retryable: true,
      }
    }

    const data = JSON.parse(text)
    checkAuthError(data)

    if (data.status === "fail") {
      const msg = data.message || "Error desconocido"
      // These are auth/permanent errors — no retry
      const permanentMessages = ["login_required", "checkpoint_required", "feedback_required", "consent_required", "not_authorized"]
      if (permanentMessages.includes(msg)) {
        return {
          ok: false,
          error: new InstagramPermanentError(`Instagram error: ${msg}`),
          retryable: false,
        }
      }
      // Everything else (generic errors, "try again", etc.) is transient — retry
      return {
        ok: false,
        error: new InstagramTransientError(`Instagram error: ${msg}`),
        retryable: true,
      }
    }

    return { ok: true, data: parseCommentsResponse(data) }
  } catch (error) {
    if (error instanceof InstagramPermanentError) {
      return { ok: false, error, retryable: false }
    }
    if (error instanceof InstagramTransientError) {
      return { ok: false, error, retryable: true }
    }
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      retryable: true,
    }
  }
}

export async function scrapeComments(
  shortcode: string,
  cursor?: string
): Promise<{
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
}> {
  const { cookieStr, csrfToken } = getCookies()
  const mediaId = shortcodeToMediaId(shortcode)
  const headers = buildHeaders(cookieStr, csrfToken)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    // Backoff delay on retries (only after both hosts failed)
    if (attempt > 0) {
      const delay = Math.min(RETRY_BASE_MS * Math.pow(2, attempt - 1), 15000)
      console.log(`scrapeComments retry ${attempt}/${RETRY_MAX} after ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }

    // Try primary host, then fallback host if rate-limited
    const primary = HOSTS[hostIndex % HOSTS.length]
    const fallback = HOSTS[(hostIndex + 1) % HOSTS.length]
    hostIndex++ // alternate for next call

    const result = await fetchCommentsFromHost(primary, mediaId, cursor, headers)
    if (result.ok) return result.data
    if (!result.retryable) throw result.error

    // Primary failed with retryable error → try fallback host immediately
    console.log(`${primary} failed (${result.error.message}), trying ${fallback}`)
    const fallbackResult = await fetchCommentsFromHost(fallback, mediaId, cursor, headers)
    if (fallbackResult.ok) return fallbackResult.data
    if (!fallbackResult.retryable) throw fallbackResult.error

    // Both hosts failed → will retry with backoff
    lastError = fallbackResult.error
  }

  throw lastError || new InstagramTransientError("Error tras reintentos agotados")
}

/**
 * Verify that the Instagram session is valid
 */
export async function verifySession(): Promise<{
  valid: boolean
  username?: string
  error?: string
}> {
  try {
    const { cookieStr, csrfToken } = getCookies()
    const headers = buildHeaders(cookieStr, csrfToken)

    const res = await fetch(
      "https://www.instagram.com/api/v1/users/80838088763/info/",
      { headers }
    )

    const text = await res.text()
    if (!text.startsWith("{")) {
      return { valid: false, error: "Respuesta no JSON" }
    }

    const data = JSON.parse(text)
    if (data.user?.username) {
      return { valid: true, username: data.user.username }
    }
    return {
      valid: false,
      error: data.message || "No se pudo verificar",
    }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    }
  }
}
