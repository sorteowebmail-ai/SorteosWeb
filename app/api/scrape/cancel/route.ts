import { NextRequest, NextResponse } from "next/server"
import { cancelJob, getJob } from "@/lib/scrape-job-store"
import { cancelApifyRun } from "@/lib/apify/apify-scraper"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { jobId } = body as { jobId?: string }

  if (!jobId) {
    return NextResponse.json({ error: "jobId es requerido" }, { status: 400 })
  }

  const job = getJob(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 })
  }

  // Cancel in job store (sets cancelRequested flag)
  const success = cancelJob(jobId)

  // Also abort Apify run if active
  if (job.apifyRunId) {
    cancelApifyRun(jobId).catch(console.error)
  }

  return NextResponse.json({ success, status: job.status })
}
