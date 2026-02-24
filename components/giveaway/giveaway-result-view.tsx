"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Download,
  Share2,
  RotateCcw,
  ArrowLeft,
  Users,
  Filter,
  Calendar,
  LinkIcon,
  CheckCircle,
  Lock,
  CreditCard,
  Shield,
  Loader2,
  Maximize,
  Minimize,
  Copy,
  Check,
  Image as ImageIcon,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WinnerSlotMachine } from "./winner-slot-machine"
import { ParticipantsList } from "./participants-list"
import { ShareAnimationModal } from "./share-animation-modal"
import { TransparencyBlock } from "./transparency-block"
import { filterParticipants } from "@/lib/giveaway-store"
import { calculateGiveawayPrice, isFreeGiveaway as checkIsFree } from "@/lib/pricing"
import type { Participant, GiveawaySettings } from "@/lib/types"

export function GiveawayResultView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState<GiveawaySettings | null>(null)
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [winners, setWinners] = useState<Participant[]>([])
  const [showAnimation, setShowAnimation] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [backupWinnersList, setBackupWinnersList] = useState<Participant[]>([])
  const [copiedText, setCopiedText] = useState(false)

  const [isFullscreen, setIsFullscreen] = useState(false)

  // Comment breakdown (total downloaded including replies)
  const [commentBreakdown, setCommentBreakdown] = useState<{
    totalDownloaded: number; topLevel: number; replies: number
  } | null>(null)

  // Payment states
  const [paymentRequired, setPaymentRequired] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "waiting" | "creating" | "verifying" | "approved" | "failed">("idle")
  const [showPaywall, setShowPaywall] = useState(false)
  const [price, setPrice] = useState(0)
  const [isGiveawayFree, setIsGiveawayFree] = useState(false)

  // Check payment on load — server-verified, no sessionStorage trust
  useEffect(() => {
    if (!settings || allParticipants.length === 0) return

    // Compute free status from actual settings + participant count
    const isFree = checkIsFree(settings, allParticipants.length)
    setIsGiveawayFree(isFree)

    if (isFree) {
      setPaymentRequired(false)
      setPaymentStatus("approved")
      return
    }

    // Not free — require server-verified payment
    const status = searchParams.get("status")
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id")
    const quoteId = searchParams.get("quote_id")

    if (status === "approved" && paymentId && quoteId) {
      setPaymentStatus("verifying")
      fetch(`/api/payment/verify?payment_id=${encodeURIComponent(paymentId)}&quote_id=${encodeURIComponent(quoteId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "approved" && data.verified) {
            setPaymentRequired(false)
            setPaymentStatus("approved")
          } else {
            setPaymentStatus("failed")
          }
        })
        .catch(() => setPaymentStatus("failed"))
    }
  }, [settings, allParticipants.length, searchParams])

  useEffect(() => {
    const storedSettings = sessionStorage.getItem("giveawaySettings")
    const storedParticipants = sessionStorage.getItem("giveawayParticipants")

    if (storedSettings && storedParticipants) {
      const parsed = JSON.parse(storedSettings) as GiveawaySettings
      setSettings(parsed)
      setPrice(calculateGiveawayPrice(parsed))

      const rawComments = JSON.parse(storedParticipants) as {
        id: string; username: string; comment: string; timestamp: string
      }[]

      const participants: Participant[] = rawComments.map((c) => ({
        id: c.id,
        username: c.username,
        comment: c.comment,
        timestamp: new Date(c.timestamp),
        profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`,
      }))

      setAllParticipants(participants)
      setFilteredParticipants(filterParticipants(participants, parsed))

      // Read comment breakdown (top-level vs replies)
      const storedBreakdown = sessionStorage.getItem("giveawayCommentBreakdown")
      if (storedBreakdown) {
        try { setCommentBreakdown(JSON.parse(storedBreakdown)) } catch { /* ignore */ }
      }
    } else {
      router.push("/sorteo/nuevo")
    }
  }, [router])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false)
      if (e.key === "f" && !e.metaKey && !e.ctrlKey && showAnimation) setIsFullscreen((v) => !v)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isFullscreen, showAnimation])

  const handleShuffleReady = useCallback(() => {
    if (paymentRequired && paymentStatus !== "approved") {
      setShowPaywall(true)
    }
  }, [paymentRequired, paymentStatus])

  const handlePayment = async () => {
    if (!settings) return
    setPaymentStatus("creating")
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentCount: allParticipants.length,
          settings: {
            numberOfWinners: settings.numberOfWinners,
            filterDuplicates: settings.filterDuplicates,
            requireMentions: settings.requireMentions,
            excludeAccounts: settings.excludeAccounts,
            minCommentLength: settings.minCommentLength,
            keywordFilter: settings.keywordFilter,
            backupWinners: settings.backupWinners,
          },
        }),
      })
      const data = await res.json()
      if (data.init_point) {
        setPaymentStatus("waiting")
        if (data.price) setPrice(data.price)
        window.location.href = data.init_point
      } else {
        setPaymentStatus("failed")
      }
    } catch {
      setPaymentStatus("failed")
    }
  }

  const handleAnimationComplete = (selectedWinners: Participant[], selectedBackups: Participant[]) => {
    setWinners(selectedWinners)
    setBackupWinnersList(selectedBackups)
    setTimeout(() => {
      setShowAnimation(false)
      setIsFullscreen(false)
    }, 2500)
  }

  const handleNewGiveaway = () => {
    sessionStorage.removeItem("giveawaySettings")
    sessionStorage.removeItem("giveawayParticipants")
    sessionStorage.removeItem("giveawayMedia")
    router.push("/sorteo/nuevo")
  }

  const handleRetry = () => {
    setWinners([])
    setShowAnimation(true)
  }

  const handleExport = async () => {
    setIsExporting(true)
    await new Promise((r) => setTimeout(r, 500))

    const content = `CERTIFICADO DE SORTEO — SORTEOSWEB
================================
Fecha: ${new Date().toLocaleDateString("es-ES", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    })}

Publicacion: ${settings?.postUrl}

CONFIGURACION:
- Comentarios totales: ${allParticipants.length}
- Participantes v\u00E1lidos: ${filteredParticipants.length}
- Ganadores seleccionados: ${settings?.numberOfWinners}
- Filtrar duplicados: ${settings?.filterDuplicates ? "Si" : "No"}
- Menciones requeridas: ${settings?.requireMentions}
- Caracteres minimos: ${settings?.minCommentLength || 0}
- Cuentas excluidas: ${settings?.excludeAccounts.length ? settings.excludeAccounts.join(", ") : "Ninguna"}

GANADORES:
${winners.map((w, i) => `${i + 1}. @${w.username} — "${w.comment}"`).join("\n")}
${backupWinnersList.length > 0 ? `\nSUPLENTES:\n${backupWinnersList.map((w, i) => `${i + 1}. @${w.username} — "${w.comment}"`).join("\n")}\n` : ""}
================================
Metodo: crypto.getRandomValues() (algoritmo criptografico)
Sorteo verificable realizado con SorteosWeb
https://sorteosweb.com.ar`

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sorteo-sorteosweb-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setIsExporting(false)
  }

  const handleCopyText = async () => {
    const text = winners.length > 1
      ? `Resultado del sorteo:\n\n${winners.map((w, i) => `${i + 1}. @${w.username}`).join("\n")}${backupWinnersList.length > 0 ? `\n\nSuplentes:\n${backupWinnersList.map((w, i) => `${i + 1}. @${w.username}`).join("\n")}` : ""}\n\nSorteo verificable realizado con SorteosWeb`
      : `Resultado del sorteo: @${winners[0]?.username}\n\nSorteo verificable realizado con SorteosWeb`

    await navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleShare = async () => {
    const text = `Resultado del sorteo:\n${winners.map((w) => `@${w.username}`).join("\n")}\n\nSorteo verificable con @sorteosweb`
    if (navigator.share) {
      await navigator.share({ title: "Resultado del Sorteo — SorteosWeb", text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="mx-auto h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <p className="mt-6 text-sm text-muted-foreground">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  // Fullscreen mode
  if (isFullscreen && showAnimation) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f]">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="text-white/30 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <Minimize className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <WinnerSlotMachine
            participants={filteredParticipants}
            numberOfWinners={settings.numberOfWinners}
            numberOfBackups={settings.backupWinners || 0}
            onComplete={handleAnimationComplete}
            pauseBeforeReveal={paymentRequired && paymentStatus !== "approved"}
            onShuffleReady={handleShuffleReady}
            isFullscreen
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Back button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            asChild
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/sorteo/nuevo">
              <ArrowLeft className="h-4 w-4" />
              Nuevo sorteo
            </Link>
          </Button>

          {showAnimation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="gap-2 text-xs rounded-lg"
            >
              <Maximize className="w-3.5 h-3.5" />
              Pantalla completa
            </Button>
          )}
        </div>

        {showAnimation && filteredParticipants.length > 0 ? (
          <div className="relative">
            <WinnerSlotMachine
              participants={filteredParticipants}
              numberOfWinners={settings.numberOfWinners}
              numberOfBackups={settings.backupWinners || 0}
              onComplete={handleAnimationComplete}
              pauseBeforeReveal={paymentRequired && paymentStatus !== "approved"}
              onShuffleReady={handleShuffleReady}
            />

            {/* Paywall Overlay */}
            <AnimatePresence>
              {showPaywall && paymentRequired && paymentStatus !== "approved" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-md rounded-2xl" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 w-full max-w-md mx-4"
                  >
                    <div className="rounded-xl border border-border/50 bg-card p-8">
                      <div className="flex justify-center mb-6">
                        <div className="w-14 h-14 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-primary" />
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-center text-foreground mb-2">
                        Resultados generados
                      </h3>
                      <p className="text-center text-sm text-muted-foreground mb-6">
                        Completa el pago para acceder a los resultados
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="rounded-lg bg-secondary/50 p-3 text-center">
                          <p className="text-xl font-bold text-foreground">
                            {filteredParticipants.length.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Participantes</p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-3 text-center">
                          <p className="text-xl font-bold text-foreground">
                            {settings.numberOfWinners}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {settings.numberOfWinners === 1 ? "Ganador" : "Ganadores"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 mb-6 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Costo total</p>
                        <p className="text-3xl font-bold text-foreground">
                          ${price.toLocaleString("es-AR")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">ARS</p>
                      </div>

                      <Button
                        onClick={handlePayment}
                        disabled={paymentStatus === "creating" || paymentStatus === "waiting"}
                        className="w-full h-11 text-base gap-2 rounded-lg bg-[#009ee3] hover:bg-[#0087c9] transition-colors"
                      >
                        {paymentStatus === "creating" || paymentStatus === "waiting" ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a Mercado Pago...</>
                        ) : paymentStatus === "failed" ? (
                          <><CreditCard className="w-4 h-4" /> Reintentar pago</>
                        ) : (
                          <><CreditCard className="w-4 h-4" /> Pagar con Mercado Pago</>
                        )}
                      </Button>

                      {paymentStatus === "failed" && (
                        <p className="text-center text-xs text-destructive mt-3">
                          Error en el pago. Intenta nuevamente.
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        Pago seguro con Mercado Pago
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {paymentStatus === "verifying" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground">Verificando pago...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Winners Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 bg-card p-8 lg:p-12"
            >
              <div className="text-center mb-10">
                {settings.logoDataUrl && (
                  <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={settings.logoDataUrl}
                    alt="Logo"
                    className="w-14 h-14 rounded-lg object-contain mx-auto mb-4"
                  />
                )}
                <div className="relative w-14 h-14 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-lg" />
                  <div className="relative w-14 h-14 rounded-full bg-primary/8 border border-primary/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Resultado del sorteo
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sorteo realizado el{" "}
                  {new Date().toLocaleDateString("es-ES", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>

              {/* Winners Grid */}
              <div className="flex flex-wrap justify-center gap-3 mb-10">
                {winners.map((winner, index) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center gap-4 rounded-xl px-5 py-4 border border-border/50 bg-card card-hover">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg text-foreground">
                          @{winner.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Posici\u00F3n #{index + 1}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Backup Winners */}
              {backupWinnersList.length > 0 && (
                <div className="mb-10">
                  <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-wider">
                    Suplentes
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {backupWinnersList.map((backup, index) => (
                      <motion.div
                        key={backup.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 border border-border/50 bg-secondary/20 text-sm"
                      >
                        <span className="text-xs text-muted-foreground">S{index + 1}</span>
                        <span className="font-medium text-foreground">@{backup.username}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification microcopy */}
              <div className="flex items-center justify-center gap-2 mb-8 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                Este sorteo puede verificarse mediante su ID interno
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => setShowShareModal(true)}
                  className="gap-2 h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-sm"
                >
                  <ImageIcon className="h-4 w-4" />
                  Descargar imagen
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyText}
                  className="gap-2 h-10 px-4 rounded-lg text-sm"
                >
                  {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedText ? "Copiado" : "Copiar texto"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="gap-2 h-10 px-4 rounded-lg text-sm"
                >
                  <Download className="h-4 w-4" />
                  Certificado
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="gap-2 h-10 px-4 rounded-lg text-sm"
                >
                  <Share2 className="h-4 w-4" />
                  Compartir
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="gap-2 h-10 px-4 rounded-lg text-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  Repetir sorteo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNewGiveaway}
                  className="gap-2 h-10 px-4 rounded-lg text-sm"
                >
                  <ArrowRight className="h-4 w-4" />
                  Nuevo sorteo
                </Button>
              </div>
            </motion.div>

            {/* Transparency Block */}
            <TransparencyBlock
              settings={settings}
              totalComments={allParticipants.length}
              filteredCount={filteredParticipants.length}
              winners={winners}
              backups={backupWinnersList}
              commentBreakdown={commentBreakdown}
            />

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                { icon: Users, value: allParticipants.length, label: "Comentarios totales" },
                { icon: Filter, value: filteredParticipants.length, label: "Participantes v\u00E1lidos" },
                { icon: Trophy, value: winners.length, label: "Ganadores" },
                { icon: Calendar, value: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" }), label: "Fecha" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="p-4 rounded-lg bg-card border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Giveaway Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-lg bg-card border border-border/50 overflow-hidden"
            >
              <div className="p-5 border-b border-border/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  Configuraci\u00F3n aplicada
                </h2>
              </div>
              <div className="p-5">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Publicacion</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {settings.postUrl.replace("https://www.instagram.com/", "")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sin duplicados</p>
                    <Badge variant="secondary" className="text-xs">
                      {settings.filterDuplicates ? (
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Activado</span>
                      ) : "Desactivado"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Menciones</p>
                    <Badge variant="secondary" className="text-xs">
                      {settings.requireMentions} requeridas
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Excluidas</p>
                    <Badge variant="secondary" className="text-xs">
                      {settings.excludeAccounts.length || "Ninguna"}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Participants List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Participantes ({filteredParticipants.length})
              </h2>
              <ParticipantsList
                participants={filteredParticipants}
                highlightedIds={winners.map((w) => w.id)}
              />
            </motion.div>
          </div>
        )}
      </div>

      <ShareAnimationModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        winners={winners}
        postUrl={settings?.postUrl || ""}
        logoDataUrl={settings?.logoDataUrl}
        accentColor={settings?.accentColor}
        isFreeGiveaway={isGiveawayFree}
        backupWinners={backupWinnersList}
        totalComments={allParticipants.length}
        filteredCount={filteredParticipants.length}
      />
    </div>
  )
}
