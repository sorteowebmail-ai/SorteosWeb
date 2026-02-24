import { NextRequest, NextResponse } from "next/server"
import { getJob, JobStatus } from "@/lib/scrape-job-store"
import { getApifyComments } from "@/lib/apify/apify-scraper"

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
    phase: job.phase,
    fetched: job.fetched,
    total: job.total,
    expectedTotal: job.expectedTotal,
    pages: job.pages,
    uniqueParticipants: job.uniqueParticipants,
    fetchedReplies: job.fetchedReplies,
    inferredRepliesTotal: job.inferredRepliesTotal,
    completionReason: job.completionReason,
    reasonCode: job.reasonCode,
    countingMode: job.countingMode,
    source: job.source,
    errorMessage: job.errorMessage,
    errorType: job.errorType,
    totalRequests: job.totalRequests,
    totalRetries: job.totalRetries,
    cancelRequested: job.cancelRequested,
    audit: job.audit,
  }

  // Only send full comments when job is done (avoid huge payloads during polling)
  if (job.status === JobStatus.COMPLETE || job.status === JobStatus.PARTIAL || job.status === JobStatus.CANCELLED) {
    // Try Apify cache first, then fall back to file-based cache
    const apifyData = getApifyComments(jobId) || getApifyComments(job.shortcode)
    if (apifyData) {
      response.comments = apifyData.comments.map((c) => ({
        id: c.commentId,
        username: c.username,
        text: c.text,
        timestamp: c.createdAt,
        parentId: c.parentId,
        childCommentCount: c.childCommentCount,
      }))
      response.topLevelCount = apifyData.topLevelCount
      response.inferredRepliesTotal = apifyData.repliesCount
    } else {
      // Fallback to old file-based cache (backward compat)
      try {
        const { getCachedComments } = await import("@/lib/comment-cache")
        const cached = getCachedComments(job.shortcode)
        if (cached) {
          response.comments = cached.comments
          response.topLevelCount = cached.topLevelCount
          response.inferredRepliesTotal = cached.inferredRepliesTotal
          response.previewRepliesCount = cached.previewRepliesCount
        }
      } catch {
        // comment-cache module not available
      }
    }
  }

  return NextResponse.json(response)
}
