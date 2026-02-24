import { NextRequest, NextResponse } from "next/server"
import { extractShortcode, scrapePostInfo } from "@/lib/scraper"
import { createJob, getJobByShortcode } from "@/lib/scrape-job-store"
import { runApifyScrapeJob } from "@/lib/apify/apify-scraper"
import { validateApifyConfig } from "@/lib/apify/apify-config"
import { MOCK_ENABLED, generateMockPostInfo } from "@/lib/mock/mock-data"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = body.url as string

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL es requerida" }, { status: 400 })
    }

    if (url.length > 500) {
      return NextResponse.json({ error: "URL demasiado larga" }, { status: 400 })
    }

    if (!url.includes("instagram.com/")) {
      return NextResponse.json(
        { error: "Solo se aceptan URLs de Instagram" },
        { status: 400 },
      )
    }

    // Strip query params before extracting shortcode (handles ?igsh=, &utm_source=, etc.)
    const cleanUrl = url.split("?")[0]
    const shortcode = extractShortcode(cleanUrl)
    if (!shortcode) {
      return NextResponse.json(
        { error: "URL de Instagram invalida. Usa una URL de post, reel o carrusel." },
        { status: 400 }
      )
    }

    // Mock mode: skip real IG API + Apify validation
    if (MOCK_ENABLED) {
      const postInfo = generateMockPostInfo(shortcode)

      let jobId: string | null = null
      const existing = getJobByShortcode(shortcode)
      if (existing) {
        jobId = existing.jobId
      } else {
        jobId = createJob(shortcode, postInfo.mediaId, postInfo.commentCount)
        runApifyScrapeJob(jobId).catch(console.error)
      }

      return NextResponse.json({ post: postInfo, jobId })
    }

    // Real mode: validate Apify + fetch real post info
    const apifyValidation = validateApifyConfig()
    if (!apifyValidation.valid) {
      return NextResponse.json(
        { error: apifyValidation.error },
        { status: 500 },
      )
    }

    const postInfo = await scrapePostInfo(shortcode)

    // Auto-start Apify scraping job in background
    let jobId: string | null = null
    try {
      const existing = getJobByShortcode(shortcode)
      if (existing) {
        jobId = existing.jobId
      } else {
        jobId = createJob(shortcode, postInfo.mediaId, postInfo.commentCount)
        runApifyScrapeJob(jobId).catch(console.error) // fire-and-forget
      }
    } catch {
      // Best-effort — don't fail the verify because of job creation
    }

    return NextResponse.json({ post: postInfo, jobId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("Scrape error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
