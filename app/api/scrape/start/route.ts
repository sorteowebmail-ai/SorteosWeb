import { NextRequest, NextResponse } from "next/server"
import { createJob, getJobByShortcode } from "@/lib/scrape-job-store"
import { runScrapeJob } from "@/lib/scrape-job-runner"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shortcode, mediaId, estimatedTotal } = body as {
      shortcode?: string
      mediaId?: string
      estimatedTotal?: number
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

    // Dedup: if already scraping this shortcode, return existing job
    const existing = getJobByShortcode(shortcode)
    if (existing) {
      return NextResponse.json({ jobId: existing.jobId })
    }

    // Create and start job
    const jobId = createJob(shortcode, mediaId, estimatedTotal || 0)
    runScrapeJob(jobId).catch(console.error) // fire-and-forget

    return NextResponse.json({ jobId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("Scrape start error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
