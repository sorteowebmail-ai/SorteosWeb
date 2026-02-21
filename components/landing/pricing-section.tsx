"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Gift, Plus, Minus, Shield, Zap, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const BASE_PRICE = 5000
const MAX_PRICE = 10000

const filters = [
  {
    id: "extraWinners",
    label: "Multiples ganadores",
    description: "Mas de 1 ganador por sorteo",
    price: 1000,
  },
  {
    id: "filterDuplicates",
    label: "Filtrar duplicados",
    description: "Elimina comentarios repetidos del mismo usuario",
    price: 1000,
  },
  {
    id: "requireMentions",
    label: "Menciones minimas",
    description: "Exige que los participantes mencionen amigos",
    price: 1000,
  },
  {
    id: "excludeAccounts",
    label: "Excluir cuentas",
    description: "Excluye cuentas especificas del sorteo",
    price: 1000,
  },
  {
    id: "minCommentLength",
    label: "Largo minimo de comentario",
    description: "Requiere un largo minimo en el comentario",
    price: 1000,
  },
  {
    id: "keywordFilter",
    label: "Filtro por palabras clave",
    description: "Solo participan quienes usen ciertas palabras o hashtags",
    price: 1000,
  },
  {
    id: "backupWinners",
    label: "Ganadores suplentes",
    description: "Selecciona suplentes en caso de que un ganador no reclame",
    price: 1000,
  },
]

export function PricingSection() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const subtotal = BASE_PRICE + activeFilters.size * 1000
  const total = Math.min(subtotal, MAX_PRICE)
  const capped = subtotal > MAX_PRICE

  return (
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-[#C792EA]/20 text-[#C792EA] text-sm font-medium mb-4">
            Precios Simples
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Paga solo por{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              lo que usas
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Sin suscripciones ni compromisos. Pagas por cada sorteo que realices,
            y solo sumas lo que necesitas.
          </p>
        </motion.div>

        {/* Free tier banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative rounded-2xl bg-gradient-to-r from-[#4ECDC4]/10 to-[#45B7D1]/10 border border-[#4ECDC4]/20 p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4ECDC4]/20 text-[#4ECDC4] text-sm font-bold mb-3">
              <Gift className="w-4 h-4" />
              GRATIS
            </div>
            <p className="text-foreground font-semibold text-lg">
              Sorteos simples con menos de 500 comentarios son{" "}
              <span className="text-[#4ECDC4]">completamente gratis</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              1 ganador, sin filtros adicionales. Ideal para sorteos pequenos.
            </p>
          </div>
        </motion.div>

        {/* Pricing card */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-card border border-border/50 shadow-xl overflow-hidden"
          >
            {/* Card header */}
            <div className="p-8 pb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-[#FF8A80] to-accent flex items-center justify-center">
                  <Gift className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Precio por sorteo</h3>
                  <p className="text-sm text-muted-foreground">Personaliza segun tus necesidades</p>
                </div>
              </div>
            </div>

            {/* Base price */}
            <div className="px-8 pt-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#4ECDC4]" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sorteo basico</p>
                    <p className="text-xs text-muted-foreground">1 ganador, sin filtros adicionales</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-foreground">
                  ${BASE_PRICE.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-xs font-medium">
                  <Check className="w-3 h-3" /> Logo personalizado incluido
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-xs font-medium">
                  <Check className="w-3 h-3" /> Color de acento incluido
                </span>
              </div>
            </div>

            {/* Optional filters */}
            <div className="px-8 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Filtros opcionales (+$1.000 c/u)
                </p>
              </div>

              <div className="space-y-3">
                {filters.map((filter) => {
                  const isActive = activeFilters.has(filter.id)
                  return (
                    <button
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                        isActive
                          ? "border-primary/50 bg-primary/5"
                          : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {isActive ? (
                            <Minus className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{filter.label}</p>
                          <p className="text-xs text-muted-foreground">{filter.description}</p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        +$1.000
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Total */}
            <div className="p-8">
              <div className="border-t border-border/50 pt-6">
                {capped && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 px-4 py-3 rounded-xl bg-[#4ECDC4]/10 border border-[#4ECDC4]/20"
                  >
                    <p className="text-sm text-[#4ECDC4] font-medium">
                      Tope maximo aplicado — no pagas mas de ${MAX_PRICE.toLocaleString("es-AR")} sin importar cuantos filtros uses.
                    </p>
                  </motion.div>
                )}

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total por sorteo</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        key={total}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-foreground"
                      >
                        ${total.toLocaleString("es-AR")}
                      </motion.span>
                      <span className="text-muted-foreground">ARS</span>
                    </div>
                    {capped && (
                      <p className="text-xs text-muted-foreground line-through mt-1">
                        ${subtotal.toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                  <Link href="/sorteo/nuevo">
                    <Button className="h-12 px-8 text-base font-medium rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-all hover:scale-[1.02]">
                      Crear Sorteo
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
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4ECDC4]" />
            Pago seguro con Mercado Pago
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#4ECDC4]" />
            Sin suscripciones
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#4ECDC4]" />
            Soporte en espanol
          </div>
        </motion.div>
      </div>
    </section>
  )
}
