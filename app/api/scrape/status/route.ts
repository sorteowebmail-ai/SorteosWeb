import { NextRequest, NextResponse } from "next/server"
import { getJob } from "@/lib/scrape-job-store"
import { getCachedComments } from "@/lib/comment-cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json(
      { error: "jobId es requerido" },
      { status: 400 },
    )
  }

  const job = getJob(jobId)
  if (!job) {
    return NextResponse.json(
      { error: "Job no encontrado" },
      { status: 404 },
    )
  }

  const response: Record<string, unknown> = {
    status: job.status,
    fetched: job.fetched,
    total: job.total,
    pages: job.pages,
    uniqueParticipants: job.uniqueParticipants,
    source: job.source,
    errorMessage: job.errorMessage,
    errorType: job.errorType,
  }

  // Only send full comments when job is done (avoid huge payloads during polling)
  if (job.status === "COMPLETE") {
    const cached = getCachedComments(job.shortcode)
    response.comments = cached?.comments || []
  }

  return NextResponse.json(response)
}
