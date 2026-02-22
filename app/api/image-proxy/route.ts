import { NextRequest, NextResponse } from "next/server"

/**
 * Image proxy for Instagram CDN URLs.
 *
 * Instagram image URLs contain signed tokens that expire quickly.
 * This proxy fetches the image server-side (with proper headers/referer)
 * and returns it with a long cache header so the browser keeps it.
 */

const ALLOWED_HOSTS = [
  "cdninstagram.com",
  "instagram.com",
  "fbcdn.net",
]

// In-memory cache: url → { data, contentType, cachedAt }
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; cachedAt: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const MAX_CACHE_SIZE = 50

function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of imageCache) {
    if (now - entry.cachedAt > CACHE_TTL) {
      imageCache.delete(key)
    }
  }
  // Evict oldest if still too large
  if (imageCache.size > MAX_CACHE_SIZE) {
    const oldest = [...imageCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)
    for (let i = 0; i < oldest.length - MAX_CACHE_SIZE; i++) {
      imageCache.delete(oldest[i][0])
    }
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 })
  }

  // Validate the URL is from an allowed Instagram domain
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 })
  }

  const isAllowed = ALLOWED_HOSTS.some((host) => parsedUrl.hostname.endsWith(host))
  if (!isAllowed) {
    return NextResponse.json({ error: "domain not allowed" }, { status: 403 })
  }

  // Check in-memory cache
  const cached = imageCache.get(url)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return new Response(cached.data, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 })
    }

    const data = await res.arrayBuffer()
    const contentType = res.headers.get("content-type") || "image/jpeg"

    // Store in memory cache
    cleanupCache()
    imageCache.set(url, { data, contentType, cachedAt: Date.now() })

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "failed to fetch image" }, { status: 502 })
  }
}
