import { NextRequest, NextResponse } from "next/server"
import { createJob, getJobByShortcode, CountingMode } from "@/lib/scrape-job-store"
import { runApifyScrapeJob } from "@/lib/apify/apify-scraper"
import { validateApifyConfig } from "@/lib/apify/apify-config"
import { MOCK_ENABLED } from "@/lib/mock/mock-data"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shortcode, mediaId, estimatedTotal, force, countingMode } = body as {
      shortcode?: string
      mediaId?: string
      estimatedTotal?: number
      force?: boolean
      countingMode?: string
    }

    if (!shortcode || !mediaId) {
      return NextResponse.json(
        { error: "shortcode y mediaId son requeridos" },
        { status: 400 },
      )
    }

    // Sanitize shortcode
    if (!/^[\w-]{1,50}$/.test(shortcode)) {
      return NextResponse.json(
        { error: "shortcode invalido" },
        { status: 400 },
      )
    }

    // Validate Apify config (skip in mock mode)
    if (!MOCK_ENABLED) {
      const apifyValidation = validateApifyConfig()
      if (!apifyValidation.valid) {
        return NextResponse.json(
          { error: apifyValidation.error },
          { status: 500 },
        )
      }
    }

    // Parse counting mode (accept string, map to enum)
    const mode = countingMode === "TOP_LEVEL_PLUS_REPLIES"
      ? CountingMode.TOP_LEVEL_PLUS_REPLIES
      : CountingMode.TOP_LEVEL_ONLY

    // Dedup: if already scraping this shortcode, return existing job (unless force)
    if (!force) {
      const existing = getJobByShortcode(shortcode)
      if (existing) {
        return NextResponse.json({ jobId: existing.jobId })
      }
    }

    // Create and start Apify job (fire-and-forget)
    const jobId = createJob(shortcode, mediaId, estimatedTotal || 0, mode)
    runApifyScrapeJob(jobId).catch(console.error)

    return NextResponse.json({ jobId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("Scrape start error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
