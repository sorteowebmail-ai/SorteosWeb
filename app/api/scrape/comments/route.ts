import { NextRequest, NextResponse } from "next/server"
import { getCachedComments } from "@/lib/comment-cache"

/**
 * Simplified comments endpoint — reads from cache only.
 * The actual scraping is now handled by the job runner (lib/scrape-job-runner.ts).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shortcode = searchParams.get("shortcode")

  if (!shortcode) {
    return NextResponse.json(
      { error: "shortcode es requerido" },
      { status: 400 },
    )
  }

  if (!/^[\w-]{1,50}$/.test(shortcode)) {
    return NextResponse.json(
      { error: "shortcode invalido" },
      { status: 400 },
    )
  }

  const cached = getCachedComments(shortcode)
  if (!cached) {
    return NextResponse.json(
      { error: "No hay datos cacheados para este post" },
      { status: 404 },
    )
  }

  return NextResponse.json({
    comments: cached.comments,
    hasMore: !cached.complete,
    total: cached.comments.length,
    source: "cache",
  })
}
