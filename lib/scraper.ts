// Instagram scraper using full browser cookies
// Uses Instagram's V1 API (same endpoints the browser uses)

const IG_APP_ID = "936619743392459"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

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
      "2. F12 > Console > escribi: document.cookie\n" +
      "3. Copia el resultado y pegalo en .env.local"
  )
}

function buildHeaders(
  cookieStr: string,
  csrfToken: string,
  referer?: string
): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "X-IG-App-ID": IG_APP_ID,
    "X-IG-WWW-Claim": "0",
    "X-Requested-With": "XMLHttpRequest",
    "X-CSRFToken": csrfToken,
    Referer: referer || "https://www.instagram.com/",
    Origin: "https://www.instagram.com",
    Cookie: cookieStr,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Ch-Ua": '"Chromium";v="145", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
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
        "2. F12 > Console > escribi: document.cookie\n" +
        "3. Copia el resultado y actualiza .env.local"
    )
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Scrape post information using V1 API
 */
export async function scrapePostInfo(shortcode: string): Promise<PostInfo> {
  const { cookieStr, csrfToken } = getCookies()
  const mediaId = shortcodeToMediaId(shortcode)
  const headers = buildHeaders(
    cookieStr,
    csrfToken,
    `https://www.instagram.com/p/${shortcode}/`
  )

  const res = await fetch(
    `https://www.instagram.com/api/v1/media/${mediaId}/info/`,
    { headers }
  )

  if (!res.ok) {
    if (res.status === 302) {
      throw new Error(
        "Sesion de Instagram no valida.\n" +
          "Actualiza INSTAGRAM_COOKIES en .env.local"
      )
    }

    // Try to parse error body
    const text = await res.text()
    if (text.startsWith("{")) {
      const data = JSON.parse(text)
      checkAuthError(data)
      if (data.message === "Media not found or unavailable") {
        throw new Error(
          "Post no encontrado. Verifica que la URL sea correcta y que el post no haya sido eliminado."
        )
      }
      throw new Error(data.message || `Instagram respondio con status ${res.status}`)
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

  const item = data.items?.[0]
  if (!item) {
    throw new Error(
      "Post no encontrado. Verifica que la URL sea correcta."
    )
  }

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
  const headers = buildHeaders(
    cookieStr,
    csrfToken,
    `https://www.instagram.com/p/${shortcode}/`
  )

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
