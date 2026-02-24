"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Users,
  MessageCircle,
  UserX,
  Hash,
  FileText,
  Instagram,
  Link2,
  Heart,
  MessageSquare,
  CreditCard,
  AlertCircle,
  Search,
  Tag,
  UserPlus,
  Palette,
  ImageIcon,
  X,
  Clipboard,
  Shield,
  CheckCircle2,
  RotateCcw,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { GiveawaySettings } from "@/lib/types"
import { isFreeGiveaway, PRICING } from "@/lib/pricing"
import { isFreeTier } from "@/lib/pricing/pricing-config"

interface PostInfo {
  shortcode: string
  mediaId: string
  ownerUsername: string
  caption: string
  displayUrl: string
  commentCount: number
  topLevelCommentCount: number
  likeCount: number
  isVideo: boolean
}

const steps = [
  { id: 1, name: "Publicación", icon: Instagram },
  { id: 2, name: "Reglas", icon: Settings },
  { id: 3, name: "Ejecutar", icon: Play },
]

const ACCENT_PRESETS = ["#820AD1", "#4ECDC4", "#B76EF0", "#C792EA", "#45B7D1", "#D2248F"]

export function GiveawayWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [postUrl, setPostUrl] = useState("")
  const [postInfo, setPostInfo] = useState<PostInfo | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [settings, setSettings] = useState<GiveawaySettings>({
    postUrl: "",
    numberOfWinners: 1,
    filterDuplicates: false,
    requireMentions: 0,
    excludeAccounts: [],
    minCommentLength: 0,
    keywordFilter: [],
    backupWinners: 0,
    accentColor: "#820AD1",
    logoDataUrl: null,
  })
  const [excludeInput, setExcludeInput] = useState("")
  const [keywordInput, setKeywordInput] = useState("")
  const [loadingProgress, setLoadingProgress] = useState<{
    fetched: number          // total comments downloaded
    total: number            // IG expected total (comment_count)
    expectedTotal: number    // same as total, kept for clarity
    pages: number
    uniqueParticipants: number
    fetchedReplies: number
    inferredRepliesTotal: number
    completionReason?: string
    status: "loading" | "complete" | "incomplete" | "failed" | "cancelled"
    errorMessage?: string
    source?: "browser" | "http" | "cache"
    lastCursor?: string
    totalRequests?: number
    totalRetries?: number
    phase?: string
    reasonCode?: string
    cancelRequested?: boolean
  } | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  // Ref to hold comments from COMPLETE status — avoids storing huge array in state
  const completedCommentsRef = useRef<
    { id: string; username: string; text: string; timestamp: string; parentId: string | null; childCommentCount: number }[] | null
  >(null)

  // ARS pricing state
  const [arsEstimate, setArsEstimate] = useState<{
    priceArs: number; priceUsd: number; baseUsd: number; addOnsUsd: number; rate: number; isFree: boolean
  } | null>(null)

  // Fetch ARS price when comment count or add-ons change
  const hasLogo = !!settings.logoDataUrl
  const hasCustomColor = settings.accentColor !== "#820AD1"
  useEffect(() => {
    const count = postInfo?.commentCount ?? 0
    if (count <= 0) return
    let cancelled = false
    const params = new URLSearchParams({
      comments: String(count),
      ...(hasLogo ? { logo: "1" } : {}),
      ...(hasCustomColor ? { color: "1" } : {}),
    })
    fetch(`/api/pricing/estimate?${params}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setArsEstimate(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [postInfo?.commentCount, hasLogo, hasCustomColor])

  // Prefill URL from hero section and auto-verify — redirect to home if no URL
  const handleVerifyRef = useRef<((url: string) => void) | null>(null)
  useEffect(() => {
    const prefill = sessionStorage.getItem("prefillUrl")
    if (prefill) {
      setPostUrl(prefill)
      sessionStorage.removeItem("prefillUrl")
      // Auto-verify after a tick so state is settled
      setTimeout(() => {
        handleVerifyRef.current?.(prefill)
      }, 100)
    } else if (!postUrl && !postInfo) {
      // No URL pre-filled — redirect to landing page hero
      router.replace("/")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const proxyImage = (url: string) =>
    url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : ""

  const isValidInstagramUrl = (url: string) => {
    return (
      url.includes("instagram.com/p/") ||
      url.includes("instagram.com/reel/") ||
      url.includes("instagram.com/tv/")
    )
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setPostUrl(text)
      setVerifyError("")
      setPostInfo(null)
    } catch {
      // Clipboard access denied
    }
  }

  const handleVerifyPost = async (urlOverride?: string) => {
    const urlToVerify = urlOverride || postUrl
    if (!isValidInstagramUrl(urlToVerify)) return
    setVerifying(true)
    setVerifyError("")
    setPostInfo(null)

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToVerify }),
      })
      const data = await res.json()

      if (!res.ok) {
        setVerifyError(data.error || "Error al verificar la publicación")
        return
      }

      setPostInfo(data.post)
      setSettings((prev) => ({ ...prev, postUrl: urlToVerify }))

      // Server auto-started a scrape job — begin polling
      if (data.jobId) {
        setJobId(data.jobId)
        completedCommentsRef.current = null
        setLoadingProgress({
          fetched: 0,
          total: data.post.commentCount || 0,
          expectedTotal: data.post.commentCount || 0,
          pages: 0,
          uniqueParticipants: 0,
          fetchedReplies: 0,
          inferredRepliesTotal: 0,
          status: "loading",
        })
      }
    } catch {
      setVerifyError("Error de conexión. Intenta de nuevo.")
    } finally {
      setVerifying(false)
    }
  }

  // Wire up ref for auto-verify on prefill
  handleVerifyRef.current = handleVerifyPost

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Map server job status to UI status
  const mapJobStatus = useCallback(
    (s: string): "loading" | "complete" | "incomplete" | "failed" | "cancelled" => {
      switch (s) {
        case "RUNNING": return "loading"
        case "COMPLETE": return "complete"
        case "PARTIAL": return "incomplete"
        case "CANCELLED": return "cancelled"
        case "BLOCKED":
        case "ERROR":
        default: return "failed"
      }
    },
    [],
  )

  // Poll job status
  useEffect(() => {
    if (!jobId) return

    let stopped = false
    let interval: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      if (stopped) return
      try {
        const res = await fetch(`/api/scrape/status?jobId=${jobId}`)
        if (!res.ok) return
        const data = await res.json()

        const uiStatus = mapJobStatus(data.status)

        setLoadingProgress({
          fetched: data.fetched,
          total: data.total || data.expectedTotal || 0,
          expectedTotal: data.expectedTotal || data.total || 0,
          pages: data.pages,
          uniqueParticipants: data.uniqueParticipants || 0,
          fetchedReplies: data.fetchedReplies || 0,
          inferredRepliesTotal: data.inferredRepliesTotal || 0,
          completionReason: data.completionReason || undefined,
          status: uiStatus,
          source: data.source || undefined,
          errorMessage: data.errorMessage || undefined,
          lastCursor: data.lastCursor || undefined,
          totalRequests: data.totalRequests || 0,
          totalRetries: data.totalRetries || 0,
          phase: data.phase || undefined,
          reasonCode: data.reasonCode || undefined,
          cancelRequested: data.cancelRequested || false,
        })

        // When job finishes, store comments and stop polling
        const isTerminal = data.status !== "RUNNING"
        if (isTerminal) {
          if (data.comments) {
            completedCommentsRef.current = data.comments
          }
          stopped = true
          if (interval) clearInterval(interval)
        }
      } catch {
        // Network error — keep polling, it'll recover
      }
    }

    // Initial poll immediately, then every 3s (Apify runs take minutes)
    poll()
    interval = setInterval(poll, 3000)
    return () => { stopped = true; if (interval) clearInterval(interval) }
  }, [jobId, mapJobStatus])

  // Navigate to results when scraping is done and user is on step 3
  const handleExecuteGiveaway = useCallback(() => {
    if (!postInfo || !completedCommentsRef.current) return

    const allComments = completedCommentsRef.current
    // Only top-level comments participate (replies are informational)
    const topLevelComments = allComments.filter((c) => c.parentId === null)
    const comments = topLevelComments.map((c) => ({
      id: c.id,
      username: c.username,
      comment: c.text,
      timestamp: c.timestamp,
    }))

    const isFree = isFreeTier(comments.length)
    sessionStorage.setItem("giveawaySettings", JSON.stringify(settings))
    sessionStorage.setItem("giveawayParticipants", JSON.stringify(comments))
    sessionStorage.setItem("giveawayMedia", JSON.stringify(postInfo))
    sessionStorage.setItem("giveawayIsFree", JSON.stringify(isFree))
    // Store breakdown for results page transparency block
    sessionStorage.setItem("giveawayCommentBreakdown", JSON.stringify({
      totalDownloaded: allComments.length,
      topLevel: topLevelComments.length,
      replies: allComments.length - topLevelComments.length,
    }))

    router.push("/sorteo/resultado")
  }, [postInfo, settings, router])

  // Continue download — resumes from last cursor (uses cache)
  const handleContinueDownload = useCallback(async () => {
    if (!postInfo) return
    setLoadingProgress((prev) => prev ? {
      ...prev,
      status: "loading",
      errorMessage: undefined,
    } : null)
    completedCommentsRef.current = null
    try {
      const res = await fetch("/api/scrape/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortcode: postInfo.shortcode,
          mediaId: postInfo.mediaId,
          estimatedTotal: postInfo.commentCount,
        }),
      })
      const data = await res.json()
      if (data.jobId) setJobId(data.jobId)
    } catch {
      setLoadingProgress((prev) =>
        prev ? { ...prev, status: "failed", errorMessage: "Error de conexión al continuar." } : null,
      )
    }
  }, [postInfo])

  // Full restart — clears cache and starts from scratch
  const handleRetry = useCallback(async () => {
    if (!postInfo) return
    setLoadingProgress({
      fetched: 0,
      total: postInfo.commentCount || 0,
      expectedTotal: postInfo.commentCount || 0,
      pages: 0,
      uniqueParticipants: 0,
      fetchedReplies: 0,
      inferredRepliesTotal: 0,
      status: "loading",
    })
    completedCommentsRef.current = null
    try {
      const res = await fetch("/api/scrape/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortcode: postInfo.shortcode,
          mediaId: postInfo.mediaId,
          estimatedTotal: postInfo.commentCount,
          force: true,  // clear cache and restart
        }),
      })
      const data = await res.json()
      if (data.jobId) setJobId(data.jobId)
    } catch {
      setLoadingProgress((prev) =>
        prev ? { ...prev, status: "failed", errorMessage: "Error de conexión al reiniciar." } : null,
      )
    }
  }, [postInfo])

  // Cancel running job
  const handleCancel = useCallback(async () => {
    if (!jobId) return
    try {
      await fetch("/api/scrape/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })
    } catch {
      // best-effort
    }
  }, [jobId])

  const canProceed = () => {
    if (currentStep === 1) return postInfo !== null
    return true
  }

  const commentCount = postInfo?.commentCount ?? 0
  const estimatedFree = isFreeTier(commentCount)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-5 sm:py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-10"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Configurar sorteo
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Tres pasos para seleccionar ganadores de forma verificable
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-6 sm:mb-10">
          <div className="relative flex justify-between max-w-xs sm:max-w-md mx-auto">
            {/* Connector lines — behind circles, centered on icon row */}
            <div className="absolute top-[18px] sm:top-[21px] left-[18px] sm:left-[22px] right-[18px] sm:right-[22px] flex">
              <div
                className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
                  currentStep > 1 ? "bg-primary" : "bg-border"
                }`}
              />
              <div
                className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
                  currentStep > 2 ? "bg-primary" : "bg-border"
                }`}
              />
            </div>

            {/* Step icons + labels */}
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                <motion.div
                  initial={false}
                  animate={{
                    scale: currentStep === step.id ? 1.05 : 1,
                  }}
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl border-2 transition-all ${
                    currentStep >= step.id
                      ? "border-primary bg-primary"
                      : "border-border bg-card"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <step.icon
                      className={`h-4 w-4 ${
                        currentStep >= step.id
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                </motion.div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    currentStep >= step.id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-8 lg:p-10">
                {/* Step 1: Paste URL + Verify */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="max-w-lg mx-auto space-y-4">
                      {/* URL Input + Paste + Verify */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1 flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              placeholder="https://instagram.com/p/..."
                              value={postUrl}
                              onChange={(e) => {
                                setPostUrl(e.target.value)
                                setVerifyError("")
                                setPostInfo(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && isValidInstagramUrl(postUrl)) {
                                  handleVerifyPost()
                                }
                              }}
                              className="h-11 sm:h-12 pl-10 sm:pl-11 text-sm bg-secondary/30 border-border/50 rounded-lg"
                            />
                            <Link2 className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                          <Button
                            variant="outline"
                            onClick={handlePaste}
                            className="h-11 sm:h-12 px-3 rounded-lg border-border/50 shrink-0"
                            title="Pegar"
                          >
                            <Clipboard className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleVerifyPost()}
                          disabled={!isValidInstagramUrl(postUrl) || verifying}
                          className="h-11 sm:h-12 px-5 rounded-lg bg-primary hover:bg-primary/90 w-full sm:w-auto gap-2"
                        >
                          {verifying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              <span className="sm:hidden">Buscar publicación</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {/* URL validation message */}
                      {postUrl && !isValidInstagramUrl(postUrl) && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          URL de Instagram no válida
                        </motion.p>
                      )}

                      {/* Skeleton loader while verifying */}
                      {verifying && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden"
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary animate-pulse" />
                            <div className="space-y-2 flex-1">
                              <div className="h-3.5 w-24 bg-secondary animate-pulse rounded" />
                              <div className="h-2.5 w-16 bg-secondary animate-pulse rounded" />
                            </div>
                          </div>
                          <div className="aspect-square bg-secondary animate-pulse" />
                          <div className="p-4 space-y-3">
                            <div className="flex gap-5">
                              <div className="h-5 w-16 bg-secondary animate-pulse rounded" />
                              <div className="h-5 w-16 bg-secondary animate-pulse rounded" />
                            </div>
                            <div className="h-4 w-3/4 bg-secondary animate-pulse rounded" />
                          </div>
                        </motion.div>
                      )}

                      {/* Verify error */}
                      {verifyError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                        >
                          <div className="text-sm text-destructive flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              {verifyError.split("\n").map((line, i) => (
                                <p key={i}>{line}</p>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Post preview — Instagram-style card */}
                      {postInfo && (
                        <motion.div
                          initial={{ opacity: 0, y: 16, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 180, damping: 18 }}
                          className="relative"
                        >
                          {/* Purple glow behind card */}
                          <div className="absolute -inset-3 rounded-3xl bg-primary/[0.07] blur-2xl -z-10" />

                          <div className="rounded-xl sm:rounded-2xl border-2 border-primary/20 overflow-hidden bg-card shadow-xl"
                            style={{ boxShadow: "0 8px 40px -8px oklch(0.44 0.25 302 / 0.18)" }}
                          >
                            {/* IG-style header: avatar + username + verified */}
                            <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/40">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-primary shrink-0">
                                <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                                  <span className="text-xs sm:text-sm font-bold text-foreground">
                                    {postInfo.ownerUsername.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 truncate">
                                  @{postInfo.ownerUsername}
                                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary fill-primary/20 shrink-0" />
                                </p>
                                {postInfo.isVideo && (
                                  <p className="text-[11px] text-muted-foreground">Reel</p>
                                )}
                              </div>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold shrink-0"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Verificada
                              </motion.div>
                            </div>

                            {/* Post image — square like Instagram */}
                            {postInfo.displayUrl ? (
                              <div className="relative">
                                <img
                                  src={proxyImage(postInfo.displayUrl)}
                                  alt="Post preview"
                                  className="w-full aspect-square object-cover"
                                />
                                {/* Subtle gradient at bottom for stats readability */}
                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
                              </div>
                            ) : (
                              <div className="w-full aspect-video bg-secondary/50 flex items-center justify-center">
                                <Instagram className="w-12 h-12 text-muted-foreground/30" />
                              </div>
                            )}

                            {/* Stats + caption section */}
                            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                              {/* Like + comment row (IG-style) */}
                              <div className="flex items-center gap-5">
                                <motion.div
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.15 }}
                                  className="flex items-center gap-1.5"
                                >
                                  <Heart className="w-5 h-5 text-rose-500" />
                                  <span className="text-sm font-semibold text-foreground">{postInfo.likeCount.toLocaleString()}</span>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.25 }}
                                  className="flex items-center gap-1.5"
                                >
                                  <MessageSquare className="w-5 h-5 text-primary" />
                                  <span className="text-sm font-semibold text-foreground">{postInfo.commentCount.toLocaleString()}</span>
                                </motion.div>
                              </div>

                              {/* Caption */}
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                <span className="font-semibold text-foreground">@{postInfo.ownerUsername}</span>{" "}
                                {postInfo.caption?.slice(0, 150) || "Publicación de Instagram"}
                                {(postInfo.caption?.length || 0) > 150 ? "..." : ""}
                              </p>

                              {/* Comment count highlight */}
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
                                className="p-4 rounded-xl bg-gradient-to-r from-primary/[0.06] to-accent/[0.04] border border-primary/15"
                              >
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="w-4 h-4 text-primary shrink-0" />
                                  <p className="text-xs font-medium text-muted-foreground">Comentarios identificados</p>
                                </div>
                                <div className="flex items-baseline gap-1.5 mt-1 ml-6">
                                  <span className="text-2xl font-bold text-foreground tabular-nums">
                                    {postInfo.commentCount.toLocaleString()}
                                  </span>
                                  <span className="text-sm text-muted-foreground">comentarios</span>
                                </div>
                              </motion.div>

                              {/* Background scraping progress */}
                              {loadingProgress && (() => {
                                const phaseLabel = loadingProgress.phase === "PAGINATION" ? "Descargando comentarios"
                                  : loadingProgress.phase === "VERIFICATION" ? "Verificando"
                                  : loadingProgress.phase === "CHILD_COMMENTS" ? "Descargando respuestas"
                                  : loadingProgress.phase === "AUDIT" ? "Auditando"
                                  : "Procesando"

                                return (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {loadingProgress.status === "complete" ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                      ) : loadingProgress.status === "cancelled" ? (
                                        <X className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                      ) : loadingProgress.status === "loading" ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                                      ) : loadingProgress.status === "incomplete" ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                      ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                      )}
                                      <p className={`text-xs flex-1 ${
                                        loadingProgress.status === "incomplete" || loadingProgress.status === "cancelled" ? "text-amber-600 dark:text-amber-400 font-medium" :
                                        loadingProgress.status === "failed" ? "text-red-600 dark:text-red-400 font-medium" :
                                        loadingProgress.status === "complete" ? "text-emerald-600 dark:text-emerald-400 font-medium" :
                                        "text-muted-foreground"
                                      }`}>
                                        {loadingProgress.status === "complete"
                                          ? `${loadingProgress.fetched.toLocaleString()} comentarios listos`
                                          : loadingProgress.status === "cancelled"
                                            ? "Descarga cancelada"
                                            : loadingProgress.status === "loading"
                                              ? phaseLabel
                                              : loadingProgress.status === "incomplete"
                                                ? "Descarga interrumpida"
                                                : "Error en la descarga"}
                                      </p>
                                      {loadingProgress.status === "loading" && !loadingProgress.cancelRequested && (
                                        <button
                                          onClick={handleCancel}
                                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                          title="Cancelar descarga"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-border/50 rounded-full overflow-hidden mt-2">
                                      {loadingProgress.status === "complete" ? (
                                        <div className="h-full bg-emerald-500 rounded-full w-full" />
                                      ) : loadingProgress.status === "incomplete" || loadingProgress.status === "cancelled" ? (
                                        <div className="h-full bg-amber-500 rounded-full w-full" />
                                      ) : loadingProgress.status === "failed" ? (
                                        <div className="h-full bg-red-500 rounded-full w-1/3" />
                                      ) : loadingProgress.fetched > 0 ? (
                                        <motion.div
                                          className="h-full bg-primary rounded-full"
                                          animate={{ width: ["60%", "90%", "60%"] }}
                                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                      ) : (
                                        <motion.div
                                          className="h-full bg-primary rounded-full w-1/4"
                                          animate={{ x: ["-100%", "400%"] }}
                                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                  </div>
                )}

                {/* Step 2: Filters */}
                {currentStep === 2 && (
                  <div className="space-y-5 sm:space-y-6">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/8 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                        <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        Reglas del sorteo
                      </h2>
                      <p className="mt-1.5 sm:mt-2 text-muted-foreground text-xs sm:text-sm">
                        Configura los criterios de participaci&oacute;n
                      </p>
                    </div>

                    {/* ── Main settings row ── */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {/* Winners — stepper */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 card-hover">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Ganadores</Label>
                              <p className="text-[11px] text-muted-foreground">Principales del sorteo</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, numberOfWinners: Math.max(1, s.numberOfWinners - 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-lg font-semibold text-foreground tabular-nums">
                              {settings.numberOfWinners}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, numberOfWinners: Math.min(20, s.numberOfWinners + 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Backup winners — stepper */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 card-hover">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <UserPlus className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Suplentes</Label>
                              <p className="text-[11px] text-muted-foreground">Por si un ganador no reclama</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, backupWinners: Math.max(0, s.backupWinners - 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-lg font-semibold text-foreground tabular-nums">
                              {settings.backupWinners}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, backupWinners: Math.min(10, s.backupWinners + 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mentions — stepper */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 card-hover">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <MessageCircle className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Menciones</Label>
                              <p className="text-[11px] text-muted-foreground">
                                {settings.requireMentions === 0
                                  ? "No se requieren menciones"
                                  : `M\u00EDn. ${settings.requireMentions} @menci\u00F3n${settings.requireMentions > 1 ? "es" : ""}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, requireMentions: Math.max(0, s.requireMentions - 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-lg font-semibold text-foreground tabular-nums">
                              {settings.requireMentions}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, requireMentions: Math.min(10, s.requireMentions + 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Filter duplicates — toggle */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 card-hover">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <Hash className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Sin duplicados</Label>
                              <p className="text-[11px] text-muted-foreground">
                                {settings.filterDuplicates
                                  ? "1 usuario = 1 participaci\u00F3n"
                                  : "Un usuario puede ganar varias veces"}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={settings.filterDuplicates}
                            onCheckedChange={(checked) =>
                              setSettings(s => ({ ...s, filterDuplicates: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Advanced filters (collapsible feel) ── */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Filtros avanzados
                      </h3>

                      {/* Min comment length — stepper */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 card-hover">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Largo m&iacute;nimo</Label>
                              <p className="text-[11px] text-muted-foreground">
                                {settings.minCommentLength === 0
                                  ? "Cualquier comentario es v\u00E1lido"
                                  : `M\u00EDn. ${settings.minCommentLength} caracteres por comentario`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, minCommentLength: Math.max(0, s.minCommentLength - 5) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-lg font-semibold text-foreground tabular-nums">
                              {settings.minCommentLength}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, minCommentLength: Math.min(500, s.minCommentLength + 5) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Exclude accounts */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                            <UserX className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <Label className="font-medium text-foreground text-sm">Excluir cuentas</Label>
                            <p className="text-[11px] text-muted-foreground">
                              Organizadores u otras cuentas que no participan
                            </p>
                          </div>
                        </div>
                        <Textarea
                          placeholder="@cuenta1, @cuenta2, @cuenta3..."
                          value={excludeInput}
                          onChange={(e) => {
                            setExcludeInput(e.target.value)
                            const accounts = e.target.value
                              .split(",")
                              .map((a) => a.trim())
                              .filter((a) => a.length > 0)
                            setSettings(s => ({ ...s, excludeAccounts: accounts }))
                          }}
                          className="bg-card border-border/50 rounded-lg min-h-[72px] text-sm"
                        />
                        {settings.excludeAccounts.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {settings.excludeAccounts.length} cuenta{settings.excludeAccounts.length > 1 ? "s" : ""} excluida{settings.excludeAccounts.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>

                      {/* Keyword filter */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <Label className="font-medium text-foreground text-sm">Palabras clave</Label>
                            <p className="text-[11px] text-muted-foreground">
                              Solo participan comentarios que contengan alguna de estas palabras
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Escrib\u00ED una palabra y presion\u00E1 Enter..."
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && keywordInput.trim()) {
                                e.preventDefault()
                                const keyword = keywordInput.trim()
                                if (!settings.keywordFilter.includes(keyword)) {
                                  setSettings(prev => ({
                                    ...prev,
                                    keywordFilter: [...prev.keywordFilter, keyword],
                                  }))
                                }
                                setKeywordInput("")
                              }
                            }}
                            className="bg-card border-border/50 rounded-lg flex-1 text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-lg"
                            disabled={!keywordInput.trim()}
                            onClick={() => {
                              const keyword = keywordInput.trim()
                              if (keyword && !settings.keywordFilter.includes(keyword)) {
                                setSettings(prev => ({
                                  ...prev,
                                  keywordFilter: [...prev.keywordFilter, keyword],
                                }))
                              }
                              setKeywordInput("")
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {settings.keywordFilter.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {settings.keywordFilter.map((kw) => (
                              <Badge
                                key={kw}
                                variant="secondary"
                                className="gap-1 cursor-pointer hover:bg-destructive/20 transition-colors text-xs pl-2.5"
                                onClick={() =>
                                  setSettings(prev => ({
                                    ...prev,
                                    keywordFilter: prev.keywordFilter.filter(k => k !== kw),
                                  }))
                                }
                              >
                                {kw} <X className="w-3 h-3" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Personalization ── */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Personalizar resultados
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Logo upload */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Logo</Label>
                              <p className="text-[11px] text-muted-foreground">Visible en la imagen de resultados</p>
                            </div>
                          </div>
                          {settings.logoDataUrl ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={settings.logoDataUrl}
                                alt="Logo"
                                className="w-12 h-12 rounded-lg object-contain bg-card border border-border/50"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSettings(prev => ({ ...prev, logoDataUrl: null }))}
                                className="gap-1 rounded-lg text-xs"
                              >
                                <X className="w-3 h-3" /> Quitar
                              </Button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/30 hover:bg-primary/[0.03] transition-colors text-sm text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                              Subir imagen (max 500KB)
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  if (file.size > 500 * 1024) {
                                    alert("La imagen no puede superar 500KB")
                                    return
                                  }
                                  const reader = new FileReader()
                                  reader.onload = () => {
                                    setSettings(prev => ({ ...prev, logoDataUrl: reader.result as string }))
                                  }
                                  reader.readAsDataURL(file)
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Accent color — redesigned */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${settings.accentColor}15` }}
                            >
                              <Palette className="w-4 h-4" style={{ color: settings.accentColor }} />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">Color de acento</Label>
                              <p className="text-[11px] text-muted-foreground">Para la imagen de resultados</p>
                            </div>
                          </div>
                          {/* Presets */}
                          <div className="flex items-center gap-2">
                            {ACCENT_PRESETS.map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, accentColor: color }))}
                                className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0"
                                style={{
                                  backgroundColor: color,
                                  borderColor: settings.accentColor === color ? "white" : "transparent",
                                  boxShadow: settings.accentColor === color ? `0 0 0 2px ${color}` : "none",
                                }}
                              />
                            ))}
                            {/* Custom color — clearly labeled */}
                            <div className="relative ml-1">
                              <label
                                className="flex items-center gap-1.5 h-8 px-2.5 rounded-full border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors"
                                style={{
                                  borderStyle: !ACCENT_PRESETS.includes(settings.accentColor) ? "solid" : "dashed",
                                  borderColor: !ACCENT_PRESETS.includes(settings.accentColor) ? settings.accentColor : undefined,
                                  boxShadow: !ACCENT_PRESETS.includes(settings.accentColor) ? `0 0 0 1px ${settings.accentColor}40` : "none",
                                }}
                              >
                                <div
                                  className="w-4 h-4 rounded-full border border-border/50"
                                  style={{
                                    background: !ACCENT_PRESETS.includes(settings.accentColor)
                                      ? settings.accentColor
                                      : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                                  }}
                                />
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">Otro</span>
                                <input
                                  type="color"
                                  value={settings.accentColor}
                                  onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Price preview ── */}
                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-r from-primary/[0.04] to-transparent">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              Costo del sorteo
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {estimatedFree && !arsEstimate
                                ? `Gratis hasta ${PRICING.FREE_COMMENT_LIMIT} comentarios`
                                : arsEstimate && !arsEstimate.isFree
                                  ? `${commentCount.toLocaleString()} comentarios${arsEstimate.addOnsUsd > 0 ? " + personalización" : ""}`
                                  : arsEstimate?.isFree
                                    ? `Gratis hasta ${PRICING.FREE_COMMENT_LIMIT} comentarios`
                                    : `${commentCount.toLocaleString()} comentarios`}
                            </p>
                          </div>
                        </div>
                        <motion.div
                          key={arsEstimate?.isFree ? "free" : (arsEstimate?.priceArs ?? "pending")}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-right"
                        >
                          {arsEstimate?.isFree || (estimatedFree && !hasLogo && !hasCustomColor) ? (
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Gratis</span>
                          ) : arsEstimate && !arsEstimate.isFree ? (
                            <p className="text-xl font-bold text-foreground">
                              ${Math.round(arsEstimate.priceArs).toLocaleString("es-AR")} <span className="text-sm font-medium text-muted-foreground">ARS</span>
                            </p>
                          ) : (
                            <span className="text-sm text-muted-foreground">Calculando...</span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Summary & Run */}
                {currentStep === 3 && (
                  <div className="space-y-5 sm:space-y-8">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/8 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                        <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        Configuración validada
                      </h2>
                      <p className="mt-1.5 sm:mt-2 text-muted-foreground text-xs sm:text-sm">
                        Revisa los parámetros antes de ejecutar
                      </p>
                    </div>

                    {/* Summary */}
                    <div className="max-w-lg mx-auto space-y-2">
                      {/* Post preview */}
                      {postInfo && (
                        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 flex items-center gap-4">
                          {postInfo.displayUrl && (
                            <img
                              src={proxyImage(postInfo.displayUrl)}
                              alt="Post"
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              @{postInfo.ownerUsername}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Settings summary rows */}
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ganadores</span>
                        <Badge variant="secondary" className="text-xs">{settings.numberOfWinners}</Badge>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sin duplicados</span>
                        <Badge variant="secondary" className="text-xs">
                          {settings.filterDuplicates ? "Sí" : "No"}
                        </Badge>
                      </div>
                      {settings.requireMentions > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Menciones requeridas</span>
                          <Badge variant="secondary" className="text-xs">{settings.requireMentions}</Badge>
                        </div>
                      )}
                      {settings.excludeAccounts.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Cuentas excluidas</span>
                          <Badge variant="secondary" className="text-xs">{settings.excludeAccounts.length}</Badge>
                        </div>
                      )}
                      {settings.minCommentLength > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Caracteres mínimos</span>
                          <Badge variant="secondary" className="text-xs">{settings.minCommentLength}</Badge>
                        </div>
                      )}
                      {settings.keywordFilter.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Palabras clave</span>
                          <Badge variant="secondary" className="text-xs">{settings.keywordFilter.join(", ")}</Badge>
                        </div>
                      )}
                      {settings.backupWinners > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Suplentes</span>
                          <Badge variant="secondary" className="text-xs">{settings.backupWinners}</Badge>
                        </div>
                      )}
                    </div>

                    {/* Price summary */}
                    <div className="max-w-lg mx-auto p-5 rounded-xl bg-gradient-to-r from-primary/[0.04] to-transparent border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-foreground text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          {arsEstimate?.isFree || (estimatedFree && !hasLogo && !hasCustomColor) ? "Sin costo" : "Costo del sorteo"}
                        </p>
                        <div className="text-right">
                          {arsEstimate?.isFree || (estimatedFree && !hasLogo && !hasCustomColor) ? (
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Gratis</p>
                          ) : arsEstimate && !arsEstimate.isFree ? (
                            <p className="text-xl font-bold text-foreground">
                              ${Math.round(arsEstimate.priceArs).toLocaleString("es-AR")} <span className="text-sm font-medium text-muted-foreground">ARS</span>
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Calculando...</p>
                          )}
                        </div>
                      </div>
                      {arsEstimate && !arsEstimate.isFree && (
                        <p className="text-[11px] text-muted-foreground text-center mb-2">
                          {commentCount.toLocaleString()} comentarios{arsEstimate.addOnsUsd > 0 ? " + personalización" : ""} &middot; Dólar blue ${Math.round(arsEstimate.rate).toLocaleString("es-AR")} &middot; Mercado Pago
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        Se procesar&aacute;n los comentarios directos del post
                        y se seleccionar&aacute;n{" "}
                        <strong>{settings.numberOfWinners}</strong> ganador
                        {settings.numberOfWinners > 1 ? "es" : ""}{settings.backupWinners > 0 ? ` + ${settings.backupWinners} suplente${settings.backupWinners > 1 ? "s" : ""}` : ""} mediante
                        algoritmo criptogr&aacute;fico verificable.
                      </p>
                    </div>

                    {/* Scraping progress */}
                    {loadingProgress && (() => {
                      const phaseLabel = loadingProgress.phase === "PAGINATION" ? "Descargando comentarios"
                        : loadingProgress.phase === "VERIFICATION" ? "Verificando conteo"
                        : loadingProgress.phase === "CHILD_COMMENTS" ? "Descargando respuestas"
                        : loadingProgress.phase === "AUDIT" ? "Auditando integridad"
                        : "Procesando"

                      // Reason code badge — only show for error/warning states, not success
                      const reasonBadge = (() => {
                        const rc = loadingProgress.reasonCode
                        if (!rc || loadingProgress.status === "loading" || loadingProgress.status === "complete") return null
                        switch (rc) {
                          case "RATE_LIMIT": return { label: "Rate limit", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" }
                          case "LOGIN_REQUIRED": return { label: "Sesión expirada", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" }
                          case "CHECKPOINT": return { label: "Checkpoint IG", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" }
                          case "PRIVATE_POST": return { label: "Post privado", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" }
                          case "TIMEOUT": return { label: "Timeout", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" }
                          default: return null
                        }
                      })()

                      const isCancelledOrDone = loadingProgress.status === "cancelled"
                      const isFailed = loadingProgress.status === "failed"
                      const isIncomplete = loadingProgress.status === "incomplete"

                      return (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`max-w-lg mx-auto p-5 rounded-xl border ${
                            loadingProgress.status === "complete"
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : isCancelledOrDone || isIncomplete
                                ? "bg-amber-500/10 border-amber-500/30"
                                : isFailed
                                  ? "bg-red-500/10 border-red-500/30"
                                  : "bg-secondary/30 border-border/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {loadingProgress.status === "complete" ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            ) : isCancelledOrDone ? (
                              <X className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            ) : isFailed || isIncomplete ? (
                              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                                isFailed ? "text-red-500" : "text-amber-500"
                              }`} />
                            ) : (
                              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${
                                  loadingProgress.status === "complete" ? "text-emerald-700 dark:text-emerald-400"
                                  : isCancelledOrDone || isIncomplete ? "text-amber-700 dark:text-amber-400"
                                  : isFailed ? "text-red-700 dark:text-red-400"
                                  : "text-foreground"
                                }`}>
                                  {loadingProgress.status === "complete"
                                    ? `${loadingProgress.fetched} comentarios descargados`
                                    : isCancelledOrDone
                                      ? "Descarga cancelada por el usuario"
                                      : isFailed
                                        ? "Error al descargar comentarios"
                                        : isIncomplete
                                          ? "Descarga interrumpida"
                                          : `${phaseLabel}...`}
                                </p>
                                {reasonBadge && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${reasonBadge.color}`}>
                                    {reasonBadge.label}
                                  </span>
                                )}
                              </div>
                              {loadingProgress.status === "loading" && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Apify extrayendo comentarios del post...
                                </p>
                              )}
                              {loadingProgress.status === "complete" && loadingProgress.fetchedReplies > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {(loadingProgress.fetched - loadingProgress.fetchedReplies).toLocaleString()} directos + {loadingProgress.fetchedReplies.toLocaleString()} respuestas — solo los directos participan
                                </p>
                              )}
                              {loadingProgress.errorMessage && loadingProgress.status !== "loading" && (
                                <p className="text-xs text-muted-foreground/80 mt-1">
                                  {loadingProgress.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-2 bg-border/50 rounded-full overflow-hidden mt-3">
                            {loadingProgress.status === "complete" ? (
                              <motion.div
                                className="h-full bg-emerald-500 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                              />
                            ) : isFailed ? (
                              <div className="h-full bg-red-500 rounded-full w-1/3" />
                            ) : isIncomplete || isCancelledOrDone ? (
                              <div className="h-full bg-amber-500 rounded-full w-full" />
                            ) : loadingProgress.fetched > 0 ? (
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                animate={{ width: ["60%", "90%", "60%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              />
                            ) : (
                              <motion.div
                                className="h-full bg-primary rounded-full w-1/4"
                                animate={{ x: ["-100%", "400%"] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                              />
                            )}
                          </div>

                          {/* Cancel button during loading */}
                          {loadingProgress.status === "loading" && !loadingProgress.cancelRequested && (
                            <div className="flex justify-end mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={handleCancel}
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </Button>
                            </div>
                          )}

                          {/* Action buttons for failed/incomplete/cancelled */}
                          {(isFailed || isIncomplete || isCancelledOrDone) && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                className="gap-2 bg-primary hover:bg-primary/90"
                                onClick={handleContinueDownload}
                              >
                                <Play className="h-3.5 w-3.5" />
                                Continuar descarga
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={handleRetry}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reiniciar
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )
                    })()}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-6 sm:mt-10 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="gap-1.5 sm:gap-2 h-10 sm:h-11 px-4 sm:px-5 rounded-lg border-border/50 bg-transparent text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Atrás</span>
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="gap-1.5 sm:gap-2 h-10 sm:h-11 px-5 sm:px-6 rounded-lg bg-primary hover:bg-primary/90 text-sm"
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div>
                      <Button
                        onClick={handleExecuteGiveaway}
                        disabled={loadingProgress?.status !== "complete"}
                        className="gap-1.5 sm:gap-2 h-10 sm:h-11 px-5 sm:px-6 rounded-lg bg-primary hover:bg-primary/90 text-sm"
                      >
                        {loadingProgress?.status === "loading" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Descargando...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Ejecutar sorteo
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 max-w-[260px] ml-auto">
                        {loadingProgress?.status === "loading"
                          ? "Esperando descarga completa de comentarios..."
                          : loadingProgress?.status === "complete"
                            ? "Selección mediante algoritmo aleatorio verificable"
                            : loadingProgress?.status === "cancelled"
                              ? "Cancelado. Usa 'Continuar descarga' o 'Reiniciar' arriba."
                              : loadingProgress?.status === "incomplete"
                                ? "Descarga incompleta. Usa 'Continuar descarga' arriba."
                                : "Corrige el error y reintenta para poder ejecutar"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
