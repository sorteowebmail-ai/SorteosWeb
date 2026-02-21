"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
  Users,
  MessageCircle,
  UserX,
  Hash,
  FileText,
  Instagram,
  Gift,
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
  { id: 1, name: "Publicacion", icon: Instagram, color: "#820AD1" },
  { id: 2, name: "Filtros", icon: Settings, color: "#4ECDC4" },
  { id: 3, name: "Sortear", icon: Play, color: "#B76EF0" },
]

const ACCENT_PRESETS = ["#820AD1", "#4ECDC4", "#B76EF0", "#C792EA", "#45B7D1", "#D2248F"]

export function GiveawayWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
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
  const [loadingProgress, setLoadingProgress] = useState("")

  const isValidInstagramUrl = (url: string) => {
    return (
      url.includes("instagram.com/p/") ||
      url.includes("instagram.com/reel/") ||
      url.includes("instagram.com/tv/")
    )
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
        setVerifyError(data.error || "Error al verificar el post")
        return
      }

      setPostInfo(data.post)
      setSettings((prev) => ({ ...prev, postUrl }))
    } catch {
      setVerifyError("Error de conexion. Intenta de nuevo.")
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

  const handleStartGiveaway = async () => {
    if (!postInfo) return
    setIsLoading(true)

    // Load all comments from the post via scraping
    const allComments: {
      id: string
      username: string
      comment: string
      timestamp: string
    }[] = []
    let cursor: string | undefined
    let hasMore = true
    let page = 0

    while (hasMore) {
      try {
        page++
        setLoadingProgress(
          `Cargando comentarios... (${allComments.length} de ~${postInfo.commentCount})`
        )

        const url = `/api/scrape/comments?shortcode=${postInfo.shortcode}${cursor ? `&cursor=${cursor}` : ""}`
        const res = await fetch(url)
        const data = await res.json()

        if (!res.ok) {
          if (page === 1) {
            setVerifyError(data.error || "Error al cargar comentarios")
            setIsLoading(false)
            return
          }
          break
        }

        for (const c of data.comments) {
          allComments.push({
            id: c.id,
            username: c.username,
            comment: c.text,
            timestamp: c.timestamp,
          })
        }

        hasMore = data.hasMore
        cursor = data.cursor

        // Small delay to avoid rate limiting
        if (hasMore) {
          await new Promise((r) => setTimeout(r, 300))
        }
      } catch {
        break
      }
    }

    setLoadingProgress(`${allComments.length} comentarios cargados!`)

    // Store data for the result page
    const isFree = isFreeGiveaway(settings, allComments.length)
    sessionStorage.setItem("giveawaySettings", JSON.stringify(settings))
    sessionStorage.setItem("giveawayParticipants", JSON.stringify(allComments))
    sessionStorage.setItem("giveawayMedia", JSON.stringify(postInfo))
    sessionStorage.setItem("giveawayIsFree", JSON.stringify(isFree))

    router.push("/sorteo/resultado")
  }

  const canProceed = () => {
    if (currentStep === 1) return postInfo !== null
    return true
  }

  const price = calculateGiveawayPrice(settings)
  const estimatedFree = postInfo ? isFreeGiveaway(settings, postInfo.commentCount) : false

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="container mx-auto max-w-4xl px-4 py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Gift className="w-4 h-4" />
            Nuevo Sorteo
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Crea tu sorteo en segundos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Solo 3 pasos para elegir a tus ganadores
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center relative">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: currentStep === step.id ? 1.1 : 1,
                      backgroundColor:
                        currentStep >= step.id ? step.color : "transparent",
                    }}
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all shadow-lg ${
                      currentStep >= step.id
                        ? "border-transparent"
                        : "border-border bg-card"
                    }`}
                    style={{
                      boxShadow:
                        currentStep >= step.id
                          ? `0 8px 24px ${step.color}40`
                          : "none",
                    }}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-6 w-6 text-white" />
                    ) : (
                      <step.icon
                        className={`h-6 w-6 ${
                          currentStep >= step.id
                            ? "text-white"
                            : "text-muted-foreground"
                        }`}
                      />
                    )}
                  </motion.div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep >= step.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded-full transition-colors ${
                      currentStep > step.id ? "bg-[#4ECDC4]" : "bg-border"
                    }`}
                  />
                )}
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
            <div className="bg-card rounded-3xl border border-border/50 shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8 lg:p-10">
                {/* Step 1: Paste URL + Verify */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255, 107, 107, 0.1)" }}
                      >
                        <Instagram className="w-8 h-8 text-[#820AD1]" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Pega el enlace de Instagram
                      </h2>
                      <p className="mt-2 text-muted-foreground">
                        Acepta posts, reels y carruseles
                      </p>
                    </div>

                    <div className="max-w-lg mx-auto space-y-4">
                      {/* URL Input + Verify button */}
                      <div className="flex gap-3">
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
                            className="h-14 pl-12 text-base bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20"
                          />
                          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        </div>
                        <Button
                          onClick={handleVerifyPost}
                          disabled={!isValidInstagramUrl(postUrl) || verifying}
                          className="h-14 px-6 rounded-xl bg-gradient-to-r from-primary to-[#9B44D8] hover:opacity-90"
                        >
                          {verifying ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Search className="w-5 h-5" />
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
                          Ingresa una URL valida de Instagram
                        </motion.p>
                      )}

                      {/* Verify error */}
                      {verifyError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20"
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
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-5 rounded-2xl bg-secondary/30 border border-primary/20 space-y-4"
                        >
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <Check className="w-4 h-4" />
                            Post verificado
                          </div>
                          <div className="flex gap-4">
                            {postInfo.displayUrl && (
                              <img
                                src={postInfo.displayUrl}
                                alt="Post preview"
                                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">
                                @{postInfo.ownerUsername}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {postInfo.caption?.slice(0, 120) || "Sin descripcion"}
                                {(postInfo.caption?.length || 0) > 120 ? "..." : ""}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {postInfo.likeCount.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {postInfo.commentCount.toLocaleString()} comentarios
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="max-w-lg mx-auto p-5 rounded-2xl bg-secondary/30 border border-border/50">
                      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Como obtener el enlace
                      </h3>
                      <ol className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                            1
                          </span>
                          Abre la publicacion en Instagram
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                            2
                          </span>
                          Haz clic en los tres puntos (...)
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                            3
                          </span>
                          Selecciona &quot;Copiar enlace&quot;
                        </li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Step 2: Filters */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ backgroundColor: "rgba(78, 205, 196, 0.1)" }}
                      >
                        <Settings className="w-8 h-8 text-[#4ECDC4]" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Configura los filtros
                      </h2>
                      <p className="mt-2 text-muted-foreground">
                        Personaliza las reglas de tu sorteo
                      </p>
                    </div>

                    {/* Filter cards grid */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Winners */}
                      <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#B76EF0]/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#9B44D8]" />
                          </div>
                          <Label className="font-medium text-foreground">
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
                          className="bg-card border-border/50 rounded-xl"
                        />
                      </div>

                      {/* Mentions */}
                      <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#C792EA]/20 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-[#C792EA]" />
                          </div>
                          <Label className="font-medium text-foreground">
                            Menciones minimas
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
                          className="bg-card border-border/50 rounded-xl"
                        />
                      </div>

                      {/* Min length */}
                      <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#45B7D1]/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#45B7D1]" />
                          </div>
                          <Label className="font-medium text-foreground">
                            Caracteres minimos
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
                          className="bg-card border-border/50 rounded-xl"
                        />
                      </div>

                      {/* Filter duplicates */}
                      <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#820AD1]/20 flex items-center justify-center">
                              <Hash className="w-5 h-5 text-[#820AD1]" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground">
                                Sin duplicados
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                1 usuario = 1 participacion
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
                    <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D2248F]/20 flex items-center justify-center">
                          <UserX className="w-5 h-5 text-[#D2248F]" />
                        </div>
                        <div>
                          <Label className="font-medium text-foreground">
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
                        className="bg-card border-border/50 rounded-xl min-h-[80px]"
                      />
                    </div>

                    {/* Keyword filter */}
                    <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#45B7D1]/20 flex items-center justify-center">
                          <Tag className="w-5 h-5 text-[#45B7D1]" />
                        </div>
                        <div className="flex-1">
                          <Label className="font-medium text-foreground">
                            Filtro por palabras
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Solo incluir comentarios con estas palabras o hashtags
                          </p>
                        </div>
                        {settings.keywordFilter.length > 0 && (
                          <Badge className="bg-[#45B7D1]/20 text-[#45B7D1] border-0">+$1.000</Badge>
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
                        className="bg-card border-border/50 rounded-xl"
                      />
                      {settings.keywordFilter.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {settings.keywordFilter.map((kw) => (
                            <Badge
                              key={kw}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/20 transition-colors"
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
                    <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D2248F]/20 flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-[#D2248F]" />
                        </div>
                        <div className="flex-1">
                          <Label className="font-medium text-foreground">
                            Ganadores suplentes
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Suplentes en caso de que un ganador no reclame
                          </p>
                        </div>
                        {settings.backupWinners > 0 && (
                          <Badge className="bg-[#D2248F]/20 text-[#D2248F] border-0">+$1.000</Badge>
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
                        className="bg-card border-border/50 rounded-xl"
                      />
                    </div>

                    {/* Personalization section */}
                    <div className="pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                        Personalizacion
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Logo upload */}
                        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground">
                                Tu logo
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Aparece en los resultados
                              </p>
                            </div>
                          </div>
                          {settings.logoDataUrl ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={settings.logoDataUrl}
                                alt="Logo"
                                className="w-14 h-14 rounded-xl object-contain bg-card border border-border/50"
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
                            <label className="flex items-center justify-center gap-2 h-14 rounded-xl border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm text-muted-foreground">
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
                        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${settings.accentColor}20` }}
                            >
                              <Palette className="w-5 h-5" style={{ color: settings.accentColor }} />
                            </div>
                            <div>
                              <Label className="font-medium text-foreground">
                                Color de acento
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Personaliza tu sorteo
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={settings.accentColor}
                              onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                              className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                            />
                            <div className="flex gap-2">
                              {ACCENT_PRESETS.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setSettings(prev => ({ ...prev, accentColor: color }))}
                                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
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
                    <div className={`p-5 rounded-2xl border ${estimatedFree ? "bg-[#4ECDC4]/5 border-[#4ECDC4]/20" : "bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className={`w-5 h-5 ${estimatedFree ? "text-[#4ECDC4]" : "text-primary"}`} />
                          <div>
                            <p className="font-medium text-foreground">
                              Precio de este sorteo
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {estimatedFree
                                ? "Sorteo simple con menos de 500 comentarios"
                                : "Base $5.000 + filtros activos"}
                            </p>
                          </div>
                        </div>
                        <motion.span
                          key={estimatedFree ? "free" : price}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`text-2xl font-bold ${estimatedFree ? "text-[#4ECDC4]" : "text-foreground"}`}
                        >
                          {estimatedFree ? "GRATIS" : `$${price.toLocaleString("es-AR")}`}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Summary & Run */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ backgroundColor: "rgba(254, 215, 102, 0.1)" }}
                      >
                        <Sparkles className="w-8 h-8 text-[#9B44D8]" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Todo listo para sortear
                      </h2>
                      <p className="mt-2 text-muted-foreground">
                        Revisa la configuracion y lanza el sorteo
                      </p>
                    </div>

                    {/* Summary */}
                    <div className="max-w-lg mx-auto space-y-3">
                      {/* Post preview */}
                      {postInfo && (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-4">
                          {postInfo.displayUrl && (
                            <img
                              src={postInfo.displayUrl}
                              alt="Post"
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
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

                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                        <span className="text-muted-foreground">Ganadores</span>
                        <Badge
                          variant="secondary"
                          className="bg-[#B76EF0]/20 text-[#9B44D8]"
                        >
                          {settings.numberOfWinners}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Sin duplicados
                        </span>
                        <Badge
                          variant="secondary"
                          className={
                            settings.filterDuplicates
                              ? "bg-[#4ECDC4]/20 text-[#4ECDC4]"
                              : "bg-secondary"
                          }
                        >
                          {settings.filterDuplicates ? "Si" : "No"}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Menciones requeridas
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-[#C792EA]/20 text-[#C792EA]"
                        >
                          {settings.requireMentions}
                        </Badge>
                      </div>
                      {settings.excludeAccounts.length > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Cuentas excluidas
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-[#D2248F]/20 text-[#D2248F]"
                          >
                            {settings.excludeAccounts.length}
                          </Badge>
                        </div>
                      )}
                      {settings.minCommentLength > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Caracteres minimos
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-[#45B7D1]/20 text-[#45B7D1]"
                          >
                            {settings.minCommentLength}
                          </Badge>
                        </div>
                      )}
                      {settings.keywordFilter.length > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Filtro por palabras
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-[#45B7D1]/20 text-[#45B7D1]"
                          >
                            {settings.keywordFilter.join(", ")}
                          </Badge>
                        </div>
                      )}
                      {settings.backupWinners > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Suplentes
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-[#D2248F]/20 text-[#D2248F]"
                          >
                            {settings.backupWinners}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Price summary */}
                    <div className={`max-w-lg mx-auto p-5 rounded-2xl border ${estimatedFree ? "bg-[#4ECDC4]/10 border-[#4ECDC4]/20" : "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <CreditCard className={`w-4 h-4 ${estimatedFree ? "text-[#4ECDC4]" : "text-primary"}`} />
                          {estimatedFree ? "Sorteo gratuito" : "Total a pagar"}
                        </p>
                        <p className={`text-2xl font-bold ${estimatedFree ? "text-[#4ECDC4]" : "text-foreground"}`}>
                          {estimatedFree ? (
                            "GRATIS"
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
                        Al iniciar, cargaremos los{" "}
                        {postInfo?.commentCount.toLocaleString() || 0} comentarios
                        reales y seleccionaremos{" "}
                        <strong>{settings.numberOfWinners}</strong> ganador
                        {settings.numberOfWinners > 1 ? "es" : ""}{settings.backupWinners > 0 ? ` + ${settings.backupWinners} suplente${settings.backupWinners > 1 ? "s" : ""}` : ""} al azar de forma
                        criptograficamente segura.
                      </p>
                    </div>

                    {/* Loading progress */}
                    {isLoading && loadingProgress && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-lg mx-auto p-4 rounded-xl bg-primary/5 border border-primary/20 text-center"
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-foreground">{loadingProgress}</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-10 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="gap-2 h-12 px-6 rounded-xl border-2 hover:bg-secondary/50 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Atras
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-[#9B44D8] hover:opacity-90 shadow-lg shadow-primary/25"
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartGiveaway}
                      disabled={isLoading}
                      className="gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-[#B76EF0] to-[#D2248F] text-foreground hover:opacity-90 shadow-lg shadow-[#B76EF0]/25"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" />
                          Iniciar Sorteo
                        </>
                      )}
                    </Button>
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
