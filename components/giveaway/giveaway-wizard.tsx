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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { GiveawaySettings } from "@/lib/types"
import { calculateGiveawayPrice, isFreeGiveaway } from "@/lib/pricing"

interface PostInfo {
  shortcode: string
  mediaId: string
  ownerUsername: string
  caption: string
  displayUrl: string
  commentCount: number
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
    fetched: number
    total: number
    pages: number
    uniqueParticipants: number
    status: "loading" | "complete" | "incomplete" | "failed"
    errorMessage?: string
    source?: "browser" | "http" | "cache"
  } | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  // Ref to hold comments from COMPLETE status — avoids storing huge array in state
  const completedCommentsRef = useRef<
    { id: string; username: string; text: string; timestamp: string }[] | null
  >(null)

  // Prefill URL from hero section
  useEffect(() => {
    const prefill = sessionStorage.getItem("prefillUrl")
    if (prefill) {
      setPostUrl(prefill)
      sessionStorage.removeItem("prefillUrl")
    }
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

  const handleVerifyPost = async () => {
    if (!isValidInstagramUrl(postUrl)) return
    setVerifying(true)
    setVerifyError("")
    setPostInfo(null)

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: postUrl }),
      })
      const data = await res.json()

      if (!res.ok) {
        setVerifyError(data.error || "Error al verificar la publicación")
        return
      }

      setPostInfo(data.post)
      setSettings((prev) => ({ ...prev, postUrl }))

      // Server auto-started a scrape job — begin polling
      if (data.jobId) {
        setJobId(data.jobId)
        completedCommentsRef.current = null
        setLoadingProgress({
          fetched: 0,
          total: data.post.commentCount || 0,
          pages: 0,
          uniqueParticipants: 0,
          status: "loading",
        })
      }
    } catch {
      setVerifyError("Error de conexión. Intenta de nuevo.")
    } finally {
      setVerifying(false)
    }
  }

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
    (s: string): "loading" | "complete" | "incomplete" | "failed" => {
      switch (s) {
        case "RUNNING": return "loading"
        case "COMPLETE": return "complete"
        case "PARTIAL": return "incomplete"
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

    const poll = async () => {
      try {
        const res = await fetch(`/api/scrape/status?jobId=${jobId}`)
        if (!res.ok) return
        const data = await res.json()

        const uiStatus = mapJobStatus(data.status)

        setLoadingProgress({
          fetched: data.fetched,
          total: data.total,
          pages: data.pages,
          uniqueParticipants: data.uniqueParticipants || 0,
          status: uiStatus,
          source: data.source || undefined,
          errorMessage: data.errorMessage || undefined,
        })

        // When job finishes, store comments and stop polling
        if (data.status === "COMPLETE" && data.comments) {
          completedCommentsRef.current = data.comments
        }
      } catch {
        // Network error — keep polling, it'll recover
      }
    }

    // Initial poll immediately
    poll()
    const interval = setInterval(poll, 1000)
    return () => clearInterval(interval)
  }, [jobId, mapJobStatus])

  // Navigate to results when scraping is done and user is on step 3
  const handleExecuteGiveaway = useCallback(() => {
    if (!postInfo || !completedCommentsRef.current) return

    const comments = completedCommentsRef.current.map((c) => ({
      id: c.id,
      username: c.username,
      comment: c.text,
      timestamp: c.timestamp,
    }))

    const isFree = isFreeGiveaway(settings, comments.length)
    sessionStorage.setItem("giveawaySettings", JSON.stringify(settings))
    sessionStorage.setItem("giveawayParticipants", JSON.stringify(comments))
    sessionStorage.setItem("giveawayMedia", JSON.stringify(postInfo))
    sessionStorage.setItem("giveawayIsFree", JSON.stringify(isFree))

    router.push("/sorteo/resultado")
  }, [postInfo, settings, router])

  // Continue with partial data (fetch from cache)
  const handleContinuePartial = useCallback(async () => {
    if (!postInfo) return
    try {
      const res = await fetch(`/api/scrape/comments?shortcode=${postInfo.shortcode}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.comments) {
        completedCommentsRef.current = data.comments
        handleExecuteGiveaway()
      }
    } catch {
      // Fallback to whatever we have
    }
  }, [postInfo, handleExecuteGiveaway])

  // Restart scraping (e.g. after error)
  const handleRetry = useCallback(async () => {
    if (!postInfo) return
    setLoadingProgress({
      fetched: 0,
      total: postInfo.commentCount || 0,
      pages: 0,
      uniqueParticipants: 0,
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

  const canProceed = () => {
    if (currentStep === 1) return postInfo !== null
    return true
  }

  const price = calculateGiveawayPrice(settings)
  const estimatedFree = postInfo ? isFreeGiveaway(settings, postInfo.commentCount) : false

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Configurar sorteo
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tres pasos para seleccionar ganadores de forma verificable
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="relative flex justify-between max-w-md mx-auto">
            {/* Connector lines — behind circles, centered on icon row */}
            <div className="absolute top-[21px] left-[22px] right-[22px] flex">
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
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all ${
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
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 lg:p-10">
                {/* Step 1: Paste URL + Verify */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-xl bg-primary/8 mx-auto mb-4 flex items-center justify-center">
                        <Instagram className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        URL de la publicación
                      </h2>
                      <p className="mt-2 text-muted-foreground text-sm">
                        Posts, reels y carruseles de Instagram
                      </p>
                    </div>

                    <div className="max-w-lg mx-auto space-y-4">
                      {/* URL Input + Paste + Verify */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="https://www.instagram.com/p/ABC123..."
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
                            className="h-12 pl-11 text-sm bg-secondary/30 border-border/50 rounded-lg"
                          />
                          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                        <Button
                          variant="outline"
                          onClick={handlePaste}
                          className="h-12 px-3.5 rounded-lg border-border/50"
                          title="Pegar"
                        >
                          <Clipboard className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleVerifyPost}
                          disabled={!isValidInstagramUrl(postUrl) || verifying}
                          className="h-12 px-5 rounded-lg bg-primary hover:bg-primary/90"
                        >
                          {verifying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
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
                          className="p-5 rounded-xl bg-secondary/30 border border-border/50 space-y-4"
                        >
                          <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-lg bg-secondary animate-pulse" />
                            <div className="flex-1 space-y-3">
                              <div className="h-4 w-24 bg-secondary animate-pulse rounded" />
                              <div className="h-3 w-full bg-secondary animate-pulse rounded" />
                              <div className="h-3 w-3/4 bg-secondary animate-pulse rounded" />
                            </div>
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

                      {/* Post preview */}
                      {postInfo && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-5 rounded-xl bg-secondary/30 border border-primary/15 space-y-4"
                        >
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <Check className="w-4 h-4" />
                            Publicación verificada
                          </div>
                          <div className="flex gap-5">
                            {postInfo.displayUrl && (
                              <img
                                src={proxyImage(postInfo.displayUrl)}
                                alt="Post preview"
                                className="w-28 h-28 rounded-xl object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0 py-0.5">
                              <p className="font-semibold text-foreground">
                                @{postInfo.ownerUsername}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-3 mt-1.5">
                                {postInfo.caption?.slice(0, 180) || "Sin descripción"}
                                {(postInfo.caption?.length || 0) > 180 ? "..." : ""}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Heart className="w-3.5 h-3.5" />
                                  {postInfo.likeCount.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {postInfo.commentCount.toLocaleString()} comentarios
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Background scraping progress (step 1) */}
                          {loadingProgress && (() => {
                            // Accelerated progress: sqrt curve makes it feel faster at the start
                            const realPct = loadingProgress.total > 0
                              ? Math.min(loadingProgress.fetched / loadingProgress.total, 1)
                              : 0
                            const displayPct = Math.round(Math.sqrt(realPct) * 100)

                            return (
                              <div className="pt-2 border-t border-border/30">
                                <div className="flex items-center gap-2">
                                  {loadingProgress.status === "complete" ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  ) : loadingProgress.status === "loading" ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {loadingProgress.status === "complete"
                                      ? `${loadingProgress.fetched.toLocaleString("es-AR")} comentarios listos · ${loadingProgress.uniqueParticipants.toLocaleString("es-AR")} participantes`
                                      : loadingProgress.status === "loading"
                                        ? loadingProgress.uniqueParticipants > 0
                                          ? `${loadingProgress.uniqueParticipants.toLocaleString("es-AR")} participantes encontrados${displayPct > 0 ? ` · ${displayPct}%` : ""}`
                                          : `Descargando comentarios...${displayPct > 0 ? ` ${displayPct}%` : ""}`
                                        : `Descarga interrumpida (${loadingProgress.fetched.toLocaleString("es-AR")})`}
                                  </p>
                                </div>
                                <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden mt-1.5">
                                  {loadingProgress.status === "complete" ? (
                                    <div className="h-full bg-emerald-500 rounded-full w-full" />
                                  ) : displayPct > 0 ? (
                                    <motion.div
                                      className="h-full bg-primary rounded-full"
                                      animate={{ width: `${displayPct}%` }}
                                      transition={{ duration: 0.3, ease: "easeOut" }}
                                    />
                                  ) : (
                                    <motion.div
                                      className="h-full bg-primary rounded-full w-1/3"
                                      animate={{ x: ["-100%", "300%"] }}
                                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </motion.div>
                      )}
                    </div>

                    {/* Instructions */}
                    {!postInfo && !verifying && (
                      <div className="max-w-lg mx-auto p-5 rounded-xl bg-secondary/30 border border-border/50">
                        <h3 className="font-medium text-foreground text-sm mb-3">
                          Cómo obtener la URL
                        </h3>
                        <ol className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded bg-primary/8 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                              1
                            </span>
                            Abre la publicación en Instagram
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded bg-primary/8 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                              2
                            </span>
                            Toca los tres puntos (...)
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded bg-primary/8 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                              3
                            </span>
                            Selecciona &quot;Copiar enlace&quot;
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Filters */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-xl bg-primary/8 mx-auto mb-4 flex items-center justify-center">
                        <Settings className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Reglas del sorteo
                      </h2>
                      <p className="mt-2 text-muted-foreground text-sm">
                        Define los criterios de participación
                      </p>
                    </div>

                    {/* Filter cards grid */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {/* Winners */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <Label className="font-medium text-foreground text-sm">
                            Ganadores
                          </Label>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={settings.numberOfWinners}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              numberOfWinners: parseInt(e.target.value) || 1,
                            })
                          }
                          className="bg-card border-border/50 rounded-lg"
                        />
                      </div>

                      {/* Mentions */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-primary" />
                          </div>
                          <Label className="font-medium text-foreground text-sm">
                            Menciones mínimas
                          </Label>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={settings.requireMentions}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              requireMentions: parseInt(e.target.value) || 0,
                            })
                          }
                          className="bg-card border-border/50 rounded-lg"
                        />
                      </div>

                      {/* Min length */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <Label className="font-medium text-foreground text-sm">
                            Caracteres mínimos
                          </Label>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={500}
                          value={settings.minCommentLength}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              minCommentLength: parseInt(e.target.value) || 0,
                            })
                          }
                          className="bg-card border-border/50 rounded-lg"
                        />
                      </div>

                      {/* Filter duplicates */}
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 card-hover">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <Hash className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">
                                Sin duplicados
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                1 usuario = 1 participación
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={settings.filterDuplicates}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                filterDuplicates: checked,
                              })
                            }
                          />
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
                          <Label className="font-medium text-foreground text-sm">
                            Excluir cuentas
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Separa las cuentas con comas
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
                          setSettings({ ...settings, excludeAccounts: accounts })
                        }}
                        className="bg-card border-border/50 rounded-lg min-h-[80px]"
                      />
                    </div>

                    {/* Keyword filter */}
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <Label className="font-medium text-foreground text-sm">
                            Filtro por palabras clave
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Solo participan comentarios que contengan estas palabras
                          </p>
                        </div>
                        {settings.keywordFilter.length > 0 && (
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">+$1.000</Badge>
                        )}
                      </div>
                      <Input
                        placeholder="Escribe y presiona Enter..."
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
                        className="bg-card border-border/50 rounded-lg"
                      />
                      {settings.keywordFilter.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {settings.keywordFilter.map((kw) => (
                            <Badge
                              key={kw}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/20 transition-colors text-xs"
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

                    {/* Backup winners */}
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <Label className="font-medium text-foreground text-sm">
                            Ganadores suplentes
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Respaldo en caso de que un ganador no reclame
                          </p>
                        </div>
                        {settings.backupWinners > 0 && (
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">+$1.000</Badge>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={settings.backupWinners}
                        onChange={(e) =>
                          setSettings(prev => ({
                            ...prev,
                            backupWinners: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)),
                          }))
                        }
                        className="bg-card border-border/50 rounded-lg"
                      />
                    </div>

                    {/* Personalization section */}
                    <div className="pt-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Personalización
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Logo upload */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">
                                Logo del sorteo
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Visible en resultados e imagen
                              </p>
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
                            <label className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/20 hover:bg-primary/[0.02] transition-colors text-sm text-muted-foreground">
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

                        {/* Accent color */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3 card-hover">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${settings.accentColor}15` }}
                            >
                              <Palette className="w-4 h-4" style={{ color: settings.accentColor }} />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground text-sm">
                                Color de acento
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Aplicado a la imagen de resultados
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={settings.accentColor}
                              onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                              className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent"
                            />
                            <div className="flex gap-1.5">
                              {ACCENT_PRESETS.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setSettings(prev => ({ ...prev, accentColor: color }))}
                                  className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: settings.accentColor === color ? "white" : "transparent",
                                    boxShadow: settings.accentColor === color ? `0 0 0 2px ${color}` : "none",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price preview */}
                    <div className="p-4 rounded-xl border border-border/50 bg-secondary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              Costo del sorteo
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {estimatedFree
                                ? "Sin filtros, hasta 500 comentarios"
                                : "Base $5.000 + filtros seleccionados"}
                            </p>
                          </div>
                        </div>
                        <motion.span
                          key={estimatedFree ? "free" : price}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xl font-bold text-foreground"
                        >
                          {estimatedFree ? "Sin costo" : `$${price.toLocaleString("es-AR")}`}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Summary & Run */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-xl bg-primary/8 mx-auto mb-4 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Configuración validada
                      </h2>
                      <p className="mt-2 text-muted-foreground text-sm">
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
                            <p className="text-xs text-muted-foreground truncate">
                              {postInfo.commentCount.toLocaleString()} comentarios
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
                    <div className="max-w-lg mx-auto p-5 rounded-xl bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-foreground text-sm flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          {estimatedFree ? "Plan actual: Sin costo" : "Costo total"}
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {estimatedFree ? (
                            "Sin costo"
                          ) : (
                            <>
                              ${price.toLocaleString("es-AR")}
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                ARS
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Se procesarán {postInfo?.commentCount.toLocaleString() || 0} comentarios
                        y se seleccionarán{" "}
                        <strong>{settings.numberOfWinners}</strong> ganador
                        {settings.numberOfWinners > 1 ? "es" : ""}{settings.backupWinners > 0 ? ` + ${settings.backupWinners} suplente${settings.backupWinners > 1 ? "s" : ""}` : ""} mediante
                        algoritmo criptográfico verificable.
                      </p>
                    </div>

                    {/* Scraping progress */}
                    {loadingProgress && (() => {
                      // Accelerated progress: sqrt curve makes it feel faster at the start
                      const realPct = loadingProgress.total > 0
                        ? Math.min(loadingProgress.fetched / loadingProgress.total, 1)
                        : 0
                      const displayPct = Math.round(Math.sqrt(realPct) * 100)
                      const sourceLabel = loadingProgress.source === "browser" ? "navegador" : loadingProgress.source === "cache" ? "cache" : loadingProgress.source === "http" ? "HTTP" : null

                      return (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`max-w-lg mx-auto p-5 rounded-xl border ${
                            loadingProgress.status === "complete"
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : loadingProgress.status === "incomplete"
                                ? "bg-amber-500/10 border-amber-500/30"
                                : loadingProgress.status === "failed"
                                  ? "bg-red-500/10 border-red-500/30"
                                  : "bg-secondary/30 border-border/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {loadingProgress.status === "complete" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : loadingProgress.status === "failed" || loadingProgress.status === "incomplete" ? (
                              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                                loadingProgress.status === "failed" ? "text-red-500" : "text-amber-500"
                              }`} />
                            ) : (
                              <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">
                                {loadingProgress.status === "complete"
                                  ? `${loadingProgress.uniqueParticipants.toLocaleString("es-AR")} participantes · ${loadingProgress.fetched.toLocaleString("es-AR")} comentarios`
                                  : loadingProgress.status === "failed"
                                    ? "Error al descargar comentarios"
                                    : loadingProgress.status === "incomplete"
                                      ? `Descarga incompleta: ${loadingProgress.uniqueParticipants.toLocaleString("es-AR")} participantes (${loadingProgress.fetched.toLocaleString("es-AR")} comentarios)`
                                      : loadingProgress.uniqueParticipants > 0
                                        ? `${loadingProgress.uniqueParticipants.toLocaleString("es-AR")} participantes encontrados`
                                        : "Descargando comentarios del post..."}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {loadingProgress.pages > 0 && `${loadingProgress.pages} pág.`}
                                {loadingProgress.status === "complete" && loadingProgress.total > 0 && loadingProgress.fetched < loadingProgress.total && (
                                  ` · IG reportó ~${loadingProgress.total.toLocaleString("es-AR")} (incluye eliminados/filtrados)`
                                )}
                                {loadingProgress.status === "loading" && displayPct > 0 && ` · ${displayPct}%`}
                                {sourceLabel && ` · via ${sourceLabel}`}
                              </p>
                              {loadingProgress.errorMessage && loadingProgress.status !== "loading" && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {loadingProgress.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-border/50 rounded-full overflow-hidden mt-3">
                            {loadingProgress.status === "complete" ? (
                              <motion.div
                                className="h-full bg-emerald-500 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                              />
                            ) : loadingProgress.status === "failed" ? (
                              <motion.div
                                className="h-full bg-red-500 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: displayPct > 0 ? `${displayPct}%` : "100%" }}
                                transition={{ duration: 0.3 }}
                              />
                            ) : loadingProgress.status === "incomplete" ? (
                              <motion.div
                                className="h-full bg-amber-500 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: displayPct > 0 ? `${displayPct}%` : "75%" }}
                                transition={{ duration: 0.3 }}
                              />
                            ) : displayPct > 0 ? (
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                animate={{ width: `${displayPct}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              />
                            ) : (
                              <motion.div
                                className="h-full bg-primary rounded-full w-1/3"
                                animate={{ x: ["-100%", "300%"] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                              />
                            )}
                          </div>

                          {/* Retry button for failed/incomplete */}
                          {(loadingProgress.status === "failed" || loadingProgress.status === "incomplete") && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={handleRetry}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reintentar
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )
                    })()}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-10 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="gap-2 h-11 px-5 rounded-lg border-border/50 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="gap-2 h-11 px-6 rounded-lg bg-primary hover:bg-primary/90"
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="text-right">
                      <div className="flex gap-2 justify-end">
                        {/* Continue with partial data when loading and enough participants */}
                        {loadingProgress?.status === "loading" && loadingProgress.uniqueParticipants >= 10 && (
                          <Button
                            variant="outline"
                            onClick={handleContinuePartial}
                            className="gap-2 h-11 px-5 rounded-lg border-border/50"
                          >
                            <Users className="h-4 w-4" />
                            Continuar con {loadingProgress.uniqueParticipants.toLocaleString("es-AR")}
                          </Button>
                        )}
                        <Button
                          onClick={handleExecuteGiveaway}
                          disabled={loadingProgress?.status !== "complete"}
                          className="gap-2 h-11 px-6 rounded-lg bg-primary hover:bg-primary/90"
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
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 max-w-[260px] ml-auto">
                        {loadingProgress?.status === "loading"
                          ? loadingProgress.uniqueParticipants >= 10
                            ? "Podés continuar con los datos parciales o esperar a que termine"
                            : "Esperando a que se descarguen los comentarios..."
                          : "Selección mediante algoritmo aleatorio verificable"}
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
