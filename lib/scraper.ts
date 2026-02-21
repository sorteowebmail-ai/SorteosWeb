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

function getCookies(): { cookieStr: string; csrfToken: string } {
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

function checkAuthError(data: { message?: string; status?: string }): void {
  if (
    data.message === "login_required" ||
    data.message === "checkpoint_required" ||
    data.message === "Please wait a few minutes before you try again."
  ) {
    throw new Error(
      "Sesion de Instagram expirada o bloqueada.\n" +
        "Actualiza INSTAGRAM_COOKIES en .env.local:\n" +
        "1. Abri Instagram.com en Chrome (logueado)\n" +
        "2. F12 > Application > Cookies > instagram.com\n" +
        "3. Copia el valor de 'sessionid' y actualiza .env.local"
    )
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
      const scheduledMatch = html.match(/"xdt_api__v1__media__shortcode__web_info":\{"items":\[(.*?)\]\}/s)
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
 * Scrape comments from a post (paginated)
 */
export async function scrapeComments(
  shortcode: string,
  cursor?: string
): Promise<{
  comments: ScrapedComment[]
  hasMore: boolean
  cursor?: string
}> {
  const { cookieStr, csrfToken } = getCookies()
  const mediaId = shortcodeToMediaId(shortcode)
  const headers = buildHeaders(cookieStr, csrfToken)

  let url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`
  if (cursor) {
    url += `&min_id=${cursor}`
  }

  const res = await fetch(url, { headers })

  if (!res.ok) {
    if (res.status === 302) {
      throw new Error(
        "Sesion de Instagram no valida. Actualiza INSTAGRAM_COOKIES en .env.local"
      )
    }
    throw new Error(`Instagram respondio con status ${res.status}`)
  }

  const text = await res.text()
  if (!text.startsWith("{")) {
    throw new Error(
      "Respuesta inesperada de Instagram. Tu sesion puede haber expirado."
    )
  }

  const data = JSON.parse(text)
  checkAuthError(data)

  if (data.status === "fail") {
    throw new Error(
      `Instagram error: ${data.message || "Error desconocido"}`
    )
  }

  const comments: ScrapedComment[] = (data.comments || []).map(
    (c: {
      pk: string
      user: { username: string }
      text: string
      created_at: number
    }) => ({
      id: String(c.pk),
      username: c.user?.username || "unknown",
      text: c.text || "",
      timestamp: new Date((c.created_at || 0) * 1000).toISOString(),
    })
  )

  return {
    comments,
    hasMore:
      data.has_more_comments ||
      data.has_more_headload_comments ||
      false,
    cursor: data.next_min_id || undefined,
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
