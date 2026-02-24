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
  commentCount: number          // total IG reports (top-level + replies)
  topLevelCommentCount: number  // top-level only (0 = unknown)
  likeCount: number
  isVideo: boolean
}

export interface ScrapedComment {
  id: string
  username: string
  text: string
  timestamp: string
  parentId: string | null       // null = top-level, string = reply
  childCommentCount: number     // replies this comment has (0 for replies themselves)
}

export interface ReplySummary {
  previewRepliesIncluded: number  // replies that came free in preview
  childCommentCountSum: number    // sum of child_comment_count across all top-level
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
  extra?: Record<string, string>,
  sessionIndex?: number,
): Record<string, string> {
  // Use fingerprint for the session if available
  let fp: import("./fingerprint").BrowserFingerprint | null = null
  if (sessionIndex !== undefined) {
    try {
      const { getFingerprint } = require("./fingerprint") as typeof import("./fingerprint") // eslint-disable-line @typescript-eslint/no-require-imports
      fp = getFingerprint(sessionIndex)
    } catch { /* fingerprint module not available */ }
  }

  return {
    "User-Agent": fp?.userAgent ?? USER_AGENT,
    Accept: "*/*",
    "Accept-Language": fp?.acceptLanguage ?? "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
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
    ...(fp?.secChUa && { "Sec-CH-UA": fp.secChUa }),
    ...(fp?.secChUaPlatform && { "Sec-CH-UA-Platform": fp.secChUaPlatform }),
    ...(fp?.secChUaMobile && { "Sec-CH-UA-Mobile": fp.secChUaMobile }),
    ...extra,
  }
}

function buildPageHeaders(cookieStr: string, sessionIndex?: number): Record<string, string> {
  let fp: import("./fingerprint").BrowserFingerprint | null = null
  if (sessionIndex !== undefined) {
    try {
      const { getFingerprint } = require("./fingerprint") as typeof import("./fingerprint") // eslint-disable-line @typescript-eslint/no-require-imports
      fp = getFingerprint(sessionIndex)
    } catch { /* fingerprint module not available */ }
  }

  return {
    "User-Agent": fp?.userAgent ?? USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": fp?.acceptLanguage ?? "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
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
  csrfToken: string,
  sessionIndex?: number
): Promise<PostInfo | null> {
  try {
    const headers = buildHeaders(cookieStr, csrfToken, {
      "Content-Type": "application/x-www-form-urlencoded",
    }, sessionIndex)

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

    const { proxyFetch } = await import("./proxy-fetch")
    const res = await proxyFetch("https://www.instagram.com/graphql/query", {
      method: "POST",
      headers,
      body: body.toString(),
      sessionIndex,
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
        topLevelCommentCount: altMedia.edge_media_to_parent_comment?.count || 0,
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
      topLevelCommentCount: media.edge_media_to_parent_comment?.count || 0,
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
  cookieStr: string,
  sessionIndex?: number
): Promise<PostInfo | null> {
  try {
    const headers = buildPageHeaders(cookieStr, sessionIndex)
    const { proxyFetch } = await import("./proxy-fetch")

    // Try both /p/ and /reel/ URLs
    for (const pathType of ["reel", "p"]) {
      const res = await proxyFetch(
        `https://www.instagram.com/${pathType}/${shortcode}/`,
        { headers, redirect: "follow", sessionIndex }
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
              topLevelCommentCount: 0,
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
            topLevelCommentCount: 0,
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
        // Try to extract top-level count from edge_media_to_parent_comment
        const topLevelMatch = html.match(/"edge_media_to_parent_comment":\{"count":(\d+)/)
        return {
          shortcode,
          mediaId: mediaIdMatch?.[1] || shortcodeToMediaId(shortcode),
          ownerUsername: usernameMatch?.[1] || "unknown",
          caption: captionMatch?.[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"') || "",
          displayUrl: displayUrlMatch?.[1]?.replace(/\\u0026/g, "&") || "",
          commentCount: parseInt(commentCountMatch?.[1] || "0"),
          topLevelCommentCount: topLevelMatch ? parseInt(topLevelMatch[1]) : 0,
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
  csrfToken: string,
  sessionIndex?: number
): Promise<PostInfo | null> {
  try {
    const mediaId = shortcodeToMediaId(shortcode)
    const headers = buildHeaders(cookieStr, csrfToken, undefined, sessionIndex)
    const { proxyFetch } = await import("./proxy-fetch")

    // Try both i.instagram.com (mobile API) and www.instagram.com
    for (const host of ["i.instagram.com", "www.instagram.com"]) {
      const res = await proxyFetch(
        `https://${host}/api/v1/media/${mediaId}/info/`,
        { headers, sessionIndex }
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
          topLevelCommentCount: 0, // V1 API doesn't distinguish
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
  shortcode: string,
  sessionIndex?: number
): Promise<PostInfo | null> {
  try {
    const { proxyFetch } = await import("./proxy-fetch")
    const res = await proxyFetch(
      `https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${shortcode}/`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        sessionIndex,
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
      commentCount: 0,          // oEmbed doesn't provide this
      topLevelCommentCount: 0,  // oEmbed doesn't provide this
      likeCount: 0,
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
export async function scrapePostInfo(shortcode: string, sessionIndex?: number): Promise<PostInfo> {
  // Use session manager if available, else fallback to getCookies
  let cookieStr: string, csrfToken: string, sIdx: number | undefined
  try {
    const { getSession } = await import("./session-manager")
    const session = getSession()
    cookieStr = session.cookieStr
    csrfToken = session.csrfToken
    sIdx = sessionIndex ?? session.index
  } catch {
    const c = getCookies()
    cookieStr = c.cookieStr
    csrfToken = c.csrfToken
    sIdx = undefined
  }
  const { proxyFetch } = await import("./proxy-fetch")

  // Strategy 1: Web info endpoint (shortcode-based, most reliable)
  try {
    const webInfoHeaders = buildHeaders(cookieStr, csrfToken, undefined, sIdx)
    const webInfoRes = await proxyFetch(
      `https://www.instagram.com/api/v1/media/shortcode/${shortcode}/web_info/`,
      { headers: webInfoHeaders, sessionIndex: sIdx }
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
            topLevelCommentCount: 0, // V1 web_info doesn't provide this
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
  const gqlResult = await scrapeWithGraphQLPost(shortcode, cookieStr, csrfToken, sIdx)
  if (gqlResult) return gqlResult

  // Strategy 3: V1 media info API
  const v1Result = await scrapeWithV1API(shortcode, cookieStr, csrfToken, sIdx)
  if (v1Result) return v1Result

  // Strategy 4: Scrape page HTML (limited data)
  const htmlResult = await scrapeWithPageHTML(shortcode, cookieStr, sIdx)
  if (htmlResult) return htmlResult

  // Strategy 5: oEmbed (public fallback, very limited data)
  const oembedResult = await scrapeWithOEmbed(shortcode, sIdx)
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
 *   3. can_support_threading=false: flat chronological list, up to 100/page, deeper pagination
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

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseCommentsResponse(data: {
  comments?: any[]
  has_more_comments?: boolean
  has_more_headload_comments?: boolean
  next_min_id?: string
  comment_count?: number
}): {
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
  replySummary: ReplySummary
} {
  const comments: ScrapedComment[] = []
  let previewRepliesIncluded = 0
  let childCommentCountSum = 0

  for (const c of data.comments || []) {
    // With threading=false, all comments are flat.
    // Replies may have parent_comment_id (not guaranteed for all posts).
    const parentId = c.parent_comment_id ? String(c.parent_comment_id) : null
    const childCount = typeof c.child_comment_count === "number" ? c.child_comment_count : 0
    if (parentId === null) childCommentCountSum += childCount

    comments.push({
      id: String(c.pk),
      username: c.user?.username || "unknown",
      text: c.text || "",
      timestamp: new Date((c.created_at || 0) * 1000).toISOString(),
      parentId,
      childCommentCount: childCount,
    })

    if (parentId !== null) previewRepliesIncluded++

    // Also extract preview_child_comments if present (threading=true compat)
    const previews = c.preview_child_comments || []
    for (const r of previews) {
      previewRepliesIncluded++
      comments.push({
        id: String(r.pk),
        username: r.user?.username || "unknown",
        text: r.text || "",
        timestamp: new Date((r.created_at || 0) * 1000).toISOString(),
        parentId: String(c.pk),
        childCommentCount: 0,
      })
    }
  }

  const hasMore = data.has_more_comments || data.has_more_headload_comments || false
  const cursor = data.next_min_id || undefined

  // Cursor anomaly detection: hasMore=true but no cursor → prevent infinite loop
  if (hasMore && !cursor?.trim()) {
    console.error(`[scraper] ANOMALY: has_more=true but no cursor returned`)
    return {
      comments,
      hasMore: false,
      cursor: undefined,
      total: data.comment_count || undefined,
      replySummary: { previewRepliesIncluded, childCommentCountSum },
    }
  }

  return {
    comments,
    hasMore,
    cursor,
    total: data.comment_count || undefined,
    replySummary: { previewRepliesIncluded, childCommentCountSum },
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchCommentsFromHost(
  host: string,
  mediaId: string,
  cursor: string | undefined,
  headers: Record<string, string>,
  sessionIndex?: number,
): Promise<
  | { ok: true; data: ReturnType<typeof parseCommentsResponse> }
  | { ok: false; error: Error; retryable: boolean }
> {
  try {
    const url = buildCommentsUrl(host, mediaId, cursor)
    const { proxyFetch } = await import("./proxy-fetch")
    const res = await proxyFetch(url, { headers, sessionIndex })

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
  cursor?: string,
  cookieIndex?: number,
): Promise<{
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
  replySummary: ReplySummary
  cookieIndex: number
}> {
  // Use session manager for rotation support
  const { getSession, reportSuccess, reportFailure } = await import("./session-manager")
  const { ReasonCode } = await import("./scrape-types")
  const cookie = cookieIndex !== undefined
    ? (() => { const c = getSession(); return { ...c, index: cookieIndex }; })()
    : getSession()
  const mediaId = shortcodeToMediaId(shortcode)
  const headers = buildHeaders(cookie.cookieStr, cookie.csrfToken, undefined, cookie.index)

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

    const result = await fetchCommentsFromHost(primary, mediaId, cursor, headers, cookie.index)
    if (result.ok) {
      reportSuccess(cookie.index)
      return { ...result.data, cookieIndex: cookie.index }
    }
    if (!result.retryable) {
      reportFailure(cookie.index, ReasonCode.UNKNOWN, result.error.message)
      throw result.error
    }

    // Primary failed with retryable error → try fallback host immediately
    console.log(`${primary} failed (${result.error.message}), trying ${fallback}`)
    const fallbackResult = await fetchCommentsFromHost(fallback, mediaId, cursor, headers, cookie.index)
    if (fallbackResult.ok) {
      reportSuccess(cookie.index)
      return { ...fallbackResult.data, cookieIndex: cookie.index }
    }
    if (!fallbackResult.retryable) {
      reportFailure(cookie.index, ReasonCode.UNKNOWN, fallbackResult.error.message)
      throw fallbackResult.error
    }

    // Both hosts failed → mark transient failure, will retry with backoff
    reportFailure(cookie.index, ReasonCode.RATE_LIMIT, fallbackResult.error.message)
    lastError = fallbackResult.error
  }

  throw lastError || new InstagramTransientError("Error tras reintentos agotados")
}

/**
 * Scrape one page of comments with threading=true (for verification pass).
 * Returns top-level comments with child_comment_count and preview_child_comments.
 * Used after main flat pagination to audit reply structure.
 */
export async function scrapeCommentsThreaded(
  shortcode: string,
  cursor?: string,
  sessionIndex?: number,
): Promise<{
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
  total?: number
  replySummary: ReplySummary
}> {
  // Use session manager if sessionIndex provided, else fallback to getCookies
  let cookieStr: string, csrfToken: string, sIdx: number | undefined
  if (sessionIndex !== undefined) {
    const { getSession } = await import("./session-manager")
    const session = getSession()
    cookieStr = session.cookieStr
    csrfToken = session.csrfToken
    sIdx = session.index
  } else {
    const c = getCookies()
    cookieStr = c.cookieStr
    csrfToken = c.csrfToken
    sIdx = undefined
  }
  const mediaId = shortcodeToMediaId(shortcode)
  const headers = buildHeaders(cookieStr, csrfToken, undefined, sIdx)

  let url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false&count=100`
  if (cursor) url += `&min_id=${encodeURIComponent(cursor)}`

  const { proxyFetch } = await import("./proxy-fetch")
  const res = await proxyFetch(url, { headers, sessionIndex: sIdx })
  if (!res.ok) throw new InstagramTransientError(`HTTP ${res.status}`, res.status)

  const text = await res.text()
  if (!text.startsWith("{")) throw new InstagramTransientError("Non-JSON response")

  const data = JSON.parse(text)
  checkAuthError(data)
  if (data.status === "fail") throw new InstagramTransientError(data.message || "fail")

  return parseCommentsResponse(data)
}

/**
 * Fetch child comments (replies) for a specific parent comment.
 * Uses /api/v1/media/{mediaId}/comments/{parentPk}/child_comments/
 */
export async function scrapeChildComments(
  shortcode: string,
  parentCommentPk: string,
  cursor?: string,
  sessionIndex?: number,
): Promise<{
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
}> {
  // Use session manager if sessionIndex provided, else fallback to getCookies
  let cookieStr: string, csrfToken: string, sIdx: number | undefined
  if (sessionIndex !== undefined) {
    const { getSession } = await import("./session-manager")
    const session = getSession()
    cookieStr = session.cookieStr
    csrfToken = session.csrfToken
    sIdx = session.index
  } else {
    const c = getCookies()
    cookieStr = c.cookieStr
    csrfToken = c.csrfToken
    sIdx = undefined
  }
  const mediaId = shortcodeToMediaId(shortcode)
  const headers = buildHeaders(cookieStr, csrfToken, undefined, sIdx)

  let url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/${parentCommentPk}/child_comments/?count=50`
  if (cursor) url += `&max_id=${encodeURIComponent(cursor)}`

  const { proxyFetch } = await import("./proxy-fetch")
  const res = await proxyFetch(url, { headers, sessionIndex: sIdx })
  if (!res.ok) throw new InstagramTransientError(`HTTP ${res.status}`, res.status)

  const text = await res.text()
  if (!text.startsWith("{")) throw new InstagramTransientError("Non-JSON response")

  const data = JSON.parse(text)
  checkAuthError(data)
  if (data.status === "fail") throw new InstagramTransientError(data.message || "fail")

  const comments: ScrapedComment[] = []
  for (const c of data.child_comments || []) {
    comments.push({
      id: String(c.pk),
      username: c.user?.username || "unknown",
      text: c.text || "",
      timestamp: new Date((c.created_at || 0) * 1000).toISOString(),
      parentId: parentCommentPk,
      childCommentCount: 0,
    })
  }

  return {
    comments,
    hasMore: data.has_more_tail_child_comments || false,
    cursor: data.next_max_child_cursor || undefined,
  }
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
    let cookieStr: string, csrfToken: string, sIdx: number | undefined
    try {
      const { getSession } = await import("./session-manager")
      const session = getSession()
      cookieStr = session.cookieStr
      csrfToken = session.csrfToken
      sIdx = session.index
    } catch {
      const c = getCookies()
      cookieStr = c.cookieStr
      csrfToken = c.csrfToken
      sIdx = undefined
    }
    const headers = buildHeaders(cookieStr, csrfToken, undefined, sIdx)
    const { proxyFetch } = await import("./proxy-fetch")

    const res = await proxyFetch(
      "https://www.instagram.com/api/v1/users/80838088763/info/",
      { headers, sessionIndex: sIdx }
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
