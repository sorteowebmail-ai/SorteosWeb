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
  Sparkles,
  CheckCircle,
  Video,
  Lock,
  CreditCard,
  Shield,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WinnerSlotMachine } from "./winner-slot-machine"
import { ParticipantsList } from "./participants-list"
import { ShareAnimationModal } from "./share-animation-modal"
import { filterParticipants } from "@/lib/giveaway-store"
import { calculateGiveawayPrice } from "@/lib/pricing"
import type { Participant, GiveawaySettings } from "@/lib/types"

const DEFAULT_COLORS = ["#820AD1", "#4ECDC4", "#B76EF0", "#C792EA", "#45B7D1", "#D2248F"]

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

  // Payment states
  const [paymentRequired, setPaymentRequired] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "waiting" | "creating" | "verifying" | "approved" | "failed">("idle")
  const [showPaywall, setShowPaywall] = useState(false)
  const [price, setPrice] = useState(0)

  // Check payment on load (returning from Mercado Pago)
  useEffect(() => {
    const status = searchParams.get("status")
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id")

    // Check if this is a free giveaway
    const isFree = JSON.parse(sessionStorage.getItem("giveawayIsFree") || "false")
    if (isFree) {
      setPaymentRequired(false)
      setPaymentStatus("approved")
      return
    }

    // Check sessionStorage cache first
    if (sessionStorage.getItem("giveawayPaid") === "true") {
      setPaymentRequired(false)
      setPaymentStatus("approved")
      return
    }

    if (status === "approved" && paymentId) {
      setPaymentStatus("verifying")
      fetch(`/api/payment/verify?payment_id=${paymentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "approved") {
            setPaymentRequired(false)
            setPaymentStatus("approved")
            sessionStorage.setItem("giveawayPaid", "true")
          } else {
            setPaymentStatus("failed")
          }
        })
        .catch(() => {
          setPaymentStatus("failed")
        })
    } else if (status === "approved") {
      // auto_return from MP without payment_id — trust the redirect
      setPaymentRequired(false)
      setPaymentStatus("approved")
      sessionStorage.setItem("giveawayPaid", "true")
    }
  }, [searchParams])

  useEffect(() => {
    const storedSettings = sessionStorage.getItem("giveawaySettings")
    const storedParticipants = sessionStorage.getItem("giveawayParticipants")

    if (storedSettings && storedParticipants) {
      const parsed = JSON.parse(storedSettings) as GiveawaySettings
      setSettings(parsed)
      setPrice(calculateGiveawayPrice(parsed))

      // Load real comment data from the API
      const rawComments = JSON.parse(storedParticipants) as {
        id: string
        username: string
        comment: string
        timestamp: string
      }[]

      // Convert to Participant format
      const participants: Participant[] = rawComments.map((c) => ({
        id: c.id,
        username: c.username,
        comment: c.comment,
        timestamp: new Date(c.timestamp),
        profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`,
      }))

      setAllParticipants(participants)
      const filtered = filterParticipants(participants, parsed)
      setFilteredParticipants(filtered)
    } else {
      router.push("/sorteo/nuevo")
    }
  }, [router])

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
          price,
          title: `Sorteo Instagram - SorteosWeb`,
        }),
      })

      const data = await res.json()

      if (data.init_point) {
        setPaymentStatus("waiting")
        // Save current state so we can resume after redirect
        sessionStorage.setItem("giveawayPaymentPending", "true")
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
    setTimeout(() => setShowAnimation(false), 2000)
  }

  const handleNewGiveaway = () => {
    sessionStorage.removeItem("giveawaySettings")
    sessionStorage.removeItem("giveawayParticipants")
    sessionStorage.removeItem("giveawayMedia")
    sessionStorage.removeItem("giveawayPaid")
    sessionStorage.removeItem("giveawayPaymentPending")
    sessionStorage.removeItem("giveawayIsFree")
    router.push("/sorteo/nuevo")
  }

  const handleRetry = () => {
    setWinners([])
    setShowAnimation(true)
  }

  const handleExport = async () => {
    setIsExporting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const content = `
CERTIFICADO DE SORTEO - SORTEOSWEB
================================
Fecha: ${new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}

Publicacion: ${settings?.postUrl}

CONFIGURACION DEL SORTEO:
- Total de comentarios: ${allParticipants.length}
- Participantes validos (post filtros): ${filteredParticipants.length}
- Numero de ganadores: ${settings?.numberOfWinners}
- Filtrar duplicados: ${settings?.filterDuplicates ? "Si" : "No"}
- Menciones requeridas: ${settings?.requireMentions}
- Caracteres minimos: ${settings?.minCommentLength || 0}
- Cuentas excluidas: ${settings?.excludeAccounts.length ? settings.excludeAccounts.join(", ") : "Ninguna"}

GANADORES:
${winners.map((w, i) => `${i + 1}. @${w.username} - "${w.comment}"`).join("\n")}
${backupWinnersList.length > 0 ? `\nSUPLENTES:\n${backupWinnersList.map((w, i) => `${i + 1}. @${w.username} - "${w.comment}"`).join("\n")}\n` : ""}
================================
Metodo de seleccion: crypto.getRandomValues() (aleatorio criptografico)
Sorteo realizado con SorteosWeb
https://sorteosweb.app
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sorteo-sorteosweb-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)

    setIsExporting(false)
  }

  const handleShare = async () => {
    const text = `Ganador${winners.length > 1 ? "es" : ""} del sorteo:\n${winners.map((w) => `@${w.username}`).join("\n")}\n\nSorteo realizado con @sorteosweb`

    if (navigator.share) {
      await navigator.share({
        title: "Resultado del Sorteo - SorteosWeb",
        text,
      })
    } else {
      await navigator.clipboard.writeText(text)
      alert("Resultado copiado al portapapeles")
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="mx-auto h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <p className="mt-6 text-muted-foreground">Cargando sorteo...</p>
        </div>
      </div>
    )
  }

  const COLORS = settings?.accentColor
    ? [settings.accentColor, ...DEFAULT_COLORS.filter(c => c !== settings.accentColor)]
    : DEFAULT_COLORS

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          asChild
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/sorteo/nuevo">
            <ArrowLeft className="h-4 w-4" />
            Nuevo Sorteo
          </Link>
        </Button>

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
                  {/* Backdrop blur */}
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-md rounded-3xl" />

                  {/* Paywall card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring", bounce: 0.3 }}
                    className="relative z-10 w-full max-w-md mx-4"
                  >
                    <div className="rounded-3xl border-2 border-primary/30 bg-card p-8 shadow-2xl shadow-primary/10">
                      {/* Lock icon */}
                      <div className="flex justify-center mb-6">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                        >
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[#9B44D8] flex items-center justify-center shadow-lg">
                            <Lock className="w-7 h-7 text-white" />
                          </div>
                        </motion.div>
                      </div>

                      <h3 className="text-2xl font-bold text-center text-foreground mb-2">
                        Los ganadores estan listos!
                      </h3>
                      <p className="text-center text-muted-foreground mb-6">
                        Paga para revelar los resultados del sorteo
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="rounded-xl bg-secondary/50 p-3 text-center">
                          <p className="text-2xl font-bold text-foreground">
                            {filteredParticipants.length.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Participantes</p>
                        </div>
                        <div className="rounded-xl bg-secondary/50 p-3 text-center">
                          <p className="text-2xl font-bold text-foreground">
                            {settings.numberOfWinners}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {settings.numberOfWinners === 1 ? "Ganador" : "Ganadores"}
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4 mb-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Precio total</p>
                        <p className="text-4xl font-bold text-foreground">
                          ${price.toLocaleString("es-AR")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">ARS</p>
                      </div>

                      {/* Pay button */}
                      <Button
                        onClick={handlePayment}
                        disabled={paymentStatus === "creating" || paymentStatus === "waiting"}
                        className="w-full h-14 text-lg gap-3 rounded-2xl bg-gradient-to-r from-[#009ee3] to-[#00b1ea] hover:opacity-90 transition-opacity shadow-lg"
                      >
                        {paymentStatus === "creating" || paymentStatus === "waiting" ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Redirigiendo a Mercado Pago...
                          </>
                        ) : paymentStatus === "failed" ? (
                          <>
                            <CreditCard className="w-5 h-5" />
                            Reintentar Pago
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            Pagar con Mercado Pago
                          </>
                        )}
                      </Button>

                      {paymentStatus === "failed" && (
                        <p className="text-center text-sm text-red-400 mt-3">
                          Hubo un error con el pago. Intenta nuevamente.
                        </p>
                      )}

                      {/* Security badge */}
                      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        Pago seguro con Mercado Pago
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verifying payment overlay */}
            {paymentStatus === "verifying" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-3xl">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Verificando pago...</p>
                  <p className="text-sm text-muted-foreground">Esto solo toma un momento</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Winners Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-8 lg:p-12"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
              </div>

              <div className="text-center mb-10">
                {settings.logoDataUrl && (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={settings.logoDataUrl}
                    alt="Logo"
                    className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4"
                  />
                )}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="relative w-24 h-24 mx-auto mb-6"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#820AD1] via-[#B76EF0] to-[#4ECDC4] animate-spin-slow" />
                  <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-[#B76EF0]" />
                  </div>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                  {winners.length === 1
                    ? "Tenemos un Ganador!"
                    : "Tenemos Ganadores!"}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Sorteo realizado el{" "}
                  {new Date().toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Winners Grid */}
              <div className="flex flex-wrap justify-center gap-4 mb-10">
                {winners.map((winner, index) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div
                      className="relative flex items-center gap-4 rounded-2xl px-6 py-5 border-2 bg-card"
                      style={{
                        borderColor: `${COLORS[index % COLORS.length]}50`,
                      }}
                    >
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold text-xl shadow-lg"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-xl text-foreground">
                          @{winner.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ganador #{index + 1}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Backup Winners */}
              {backupWinnersList.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-4 text-center">
                    Suplentes
                  </h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {backupWinnersList.map((backup, index) => (
                      <motion.div
                        key={backup.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 border border-border/50 bg-secondary/30"
                      >
                        <Badge variant="outline" className="text-xs">
                          Suplente #{index + 1}
                        </Badge>
                        <span className="font-medium text-foreground">@{backup.username}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => setShowShareModal(true)}
                  className="gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-[#9B44D8] hover:opacity-90 shadow-lg"
                >
                  <Video className="h-4 w-4" />
                  Crear para Instagram
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="gap-2 h-12 px-6 rounded-xl border-2 hover:bg-secondary/50 bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exportando..." : "Certificado"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="gap-2 h-12 px-6 rounded-xl border-2 hover:bg-secondary/50 bg-transparent"
                >
                  <Share2 className="h-4 w-4" />
                  Compartir
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="gap-2 h-12 px-6 rounded-xl border-2 hover:bg-secondary/50 bg-transparent"
                >
                  <RotateCcw className="h-4 w-4" />
                  Repetir
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNewGiveaway}
                  className="gap-2 h-12 px-6 rounded-xl border-2 hover:bg-secondary/50 bg-transparent"
                >
                  <Sparkles className="h-4 w-4" />
                  Nuevo Sorteo
                </Button>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                {
                  icon: Users,
                  value: allParticipants.length,
                  label: "Total comentarios",
                  color: "#820AD1",
                },
                {
                  icon: Filter,
                  value: filteredParticipants.length,
                  label: "Participantes validos",
                  color: "#4ECDC4",
                },
                {
                  icon: Trophy,
                  value: winners.length,
                  label: "Ganadores",
                  color: "#B76EF0",
                },
                {
                  icon: Calendar,
                  value: new Date().toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  }),
                  label: "Fecha del sorteo",
                  color: "#C792EA",
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="p-5 rounded-2xl bg-card border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Giveaway Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl bg-card border border-border/50 overflow-hidden"
            >
              <div className="p-6 border-b border-border/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Detalles del Sorteo
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Publicacion
                    </p>
                    <p className="font-medium text-foreground truncate">
                      {settings.postUrl.replace("https://www.instagram.com/", "")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Sin duplicados
                    </p>
                    <Badge
                      variant="secondary"
                      className={
                        settings.filterDuplicates
                          ? "bg-[#4ECDC4]/10 text-[#4ECDC4]"
                          : "bg-secondary"
                      }
                    >
                      {settings.filterDuplicates ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Activado
                        </span>
                      ) : (
                        "Desactivado"
                      )}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Menciones requeridas
                    </p>
                    <Badge variant="secondary" className="bg-[#C792EA]/10 text-[#C792EA]">
                      {settings.requireMentions} menciones
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Cuentas excluidas
                    </p>
                    <Badge variant="secondary" className="bg-[#D2248F]/10 text-[#D2248F]">
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
              transition={{ delay: 0.5 }}
            >
              <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                Lista de Participantes
              </h2>
              <ParticipantsList
                participants={filteredParticipants}
                highlightedIds={winners.map((w) => w.id)}
              />
            </motion.div>
          </div>
        )}
      </div>

      {/* Share Animation Modal */}
      <ShareAnimationModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        winners={winners}
        postUrl={settings?.postUrl || ""}
        logoDataUrl={settings?.logoDataUrl}
        accentColor={settings?.accentColor}
        isFreeGiveaway={!paymentRequired}
        backupWinners={backupWinnersList}
      />
    </div>
  )
}
