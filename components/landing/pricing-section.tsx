"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, Gift, Shield, Zap, MessageSquare, Image, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { PRICING_CONFIG } from "@/lib/pricing/pricing-config"

const EXAMPLE_COUNTS = [500, 1000, 2500, 5000, 10000]

function formatArs(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 })
}

interface EstimateData {
  priceArs: number
  priceUsd: number
  baseUsd: number
  addOnsUsd: number
  rate: number
  isFree: boolean
  rateSource: string
}

export function PricingSection() {
  const [commentCount, setCommentCount] = useState(1000)
  const [customLogo, setCustomLogo] = useState(false)
  const [customColor, setCustomColor] = useState(false)
  const [arsData, setArsData] = useState<EstimateData | null>(null)
  const [loading, setLoading] = useState(false)

  const isFreeBase = commentCount <= PRICING_CONFIG.freeTierLimit
  const hasAddOns = customLogo || customColor
  const isFullyFree = isFreeBase && !hasAddOns

  useEffect(() => {
    if (isFullyFree) {
      setArsData(null)
      return
    }
    setLoading(true)
    const params = new URLSearchParams({
      comments: String(commentCount),
      ...(customLogo ? { logo: "1" } : {}),
      ...(customColor ? { color: "1" } : {}),
    })
    const controller = new AbortController()
    fetch(`/api/pricing/estimate?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setArsData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    return () => controller.abort()
  }, [commentCount, customLogo, customColor, isFullyFree])

  return (
    <section id="pricing" className="py-16 sm:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            Precios
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Pagás solo cuando lo necesitás
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Sin suscripciones. Sin compromisos. Todos los filtros incluidos gratis.
          </p>
        </motion.div>

        {/* Free tier highlight */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-6 sm:mb-8"
        >
          <div className="rounded-2xl bg-primary/[0.04] border border-primary/10 p-5 sm:p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              <Gift className="w-4 h-4" />
              Gratis
            </div>
            <p className="text-lg sm:text-xl font-semibold text-foreground">
              Hasta {PRICING_CONFIG.freeTierLimit} comentarios sin costo
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Todos los filtros, certificado y múltiples ganadores incluidos.
            </p>
          </div>
        </motion.div>

        {/* Pricing card */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Calculá tu precio
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Precio en pesos argentinos al tipo de cambio del momento
              </p>
            </div>

            {/* What's always free */}
            <div className="px-5 sm:px-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Incluido sin costo
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  "Filtros avanzados",
                  "Menciones y keywords",
                  "Certificado verificable",
                  "Múltiples ganadores",
                  "Suplentes",
                ].map((feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-medium"
                  >
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Comment slider */}
            <div className="px-5 sm:px-6 pt-5 sm:pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Cantidad de comentarios
              </p>
              <div className="space-y-3">
                <div>
                  <input
                    type="range"
                    min={0}
                    max={15000}
                    step={100}
                    value={commentCount}
                    onChange={(e) => setCommentCount(parseInt(e.target.value))}
                    className="w-full accent-primary h-2 rounded-full appearance-none bg-secondary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span className="font-medium text-foreground text-xs sm:text-sm">
                      {commentCount.toLocaleString("es-AR")} comentarios
                    </span>
                    <span>15.000</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_COUNTS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setCommentCount(count)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                        commentCount === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {count.toLocaleString("es-AR")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium add-ons */}
            <div className="px-5 sm:px-6 pt-5 sm:pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Personalización premium
              </p>
              <div className="space-y-3">
                {/* Logo add-on */}
                <div
                  className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all ${
                    customLogo
                      ? "bg-primary/[0.04] border-primary/15"
                      : "bg-secondary/30 border-border/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      customLogo ? "bg-primary/10" : "bg-secondary/60"
                    }`}>
                      <Image className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${customLogo ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground">Logo en la imagen</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Tu logo o marca en el certificado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {arsData && arsData.rate > 0 && (
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground hidden sm:inline">
                        +${formatArs(Math.round(PRICING_CONFIG.logoAddOnUsd * arsData.rate))}
                      </span>
                    )}
                    <Switch
                      checked={customLogo}
                      onCheckedChange={setCustomLogo}
                    />
                  </div>
                </div>

                {/* Color add-on */}
                <div
                  className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all ${
                    customColor
                      ? "bg-primary/[0.04] border-primary/15"
                      : "bg-secondary/30 border-border/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      customColor ? "bg-primary/10" : "bg-secondary/60"
                    }`}>
                      <Palette className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${customColor ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground">Color personalizado</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Color de tu marca en el certificado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {arsData && arsData.rate > 0 && (
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground hidden sm:inline">
                        +${formatArs(Math.round(PRICING_CONFIG.colorAddOnUsd * arsData.rate))}
                      </span>
                    )}
                    <Switch
                      checked={customColor}
                      onCheckedChange={setCustomColor}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="p-5 sm:p-6">
              <div className="border-t border-border/50 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      {isFullyFree ? "Gratis" : "Total estimado"}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        key={isFullyFree ? "free" : `${arsData?.priceArs}-${customLogo}-${customColor}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-4xl font-bold text-foreground"
                      >
                        {isFullyFree
                          ? "Sin costo"
                          : loading
                            ? "..."
                            : arsData
                              ? `$${formatArs(arsData.priceArs)}`
                              : "..."}
                      </motion.span>
                      {!isFullyFree && arsData && !loading && (
                        <span className="text-base sm:text-lg text-muted-foreground">ARS</span>
                      )}
                    </div>
                    {!isFullyFree && arsData && !loading && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        Dólar blue ${formatArs(arsData.rate)} al momento de la consulta
                      </p>
                    )}
                  </div>
                  <Link href="/sorteo/nuevo" className="shrink-0">
                    <Button className="h-10 sm:h-11 px-5 sm:px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm sm:text-base">
                      Iniciar sorteo
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 sm:mt-12 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary/60" />
            Pago seguro con Mercado Pago
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary/60" />
            Sin suscripciones
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary/60" />
            2x más comentarios gratis que la competencia
          </div>
        </motion.div>
      </div>
    </section>
  )
}
