"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Gift, Plus, Minus, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const BASE_PRICE = 5000
const MAX_PRICE = 10000

const filters = [
  { id: "extraWinners", label: "Multiples ganadores", description: "Mas de 1 ganador por sorteo", price: 1000 },
  { id: "filterDuplicates", label: "Filtrar duplicados", description: "1 usuario = 1 participacion", price: 1000 },
  { id: "requireMentions", label: "Menciones minimas", description: "Exige que mencionen amigos", price: 1000 },
  { id: "excludeAccounts", label: "Excluir cuentas", description: "Excluye cuentas especificas", price: 1000 },
  { id: "minCommentLength", label: "Largo minimo", description: "Requiere largo minimo en comentario", price: 1000 },
  { id: "keywordFilter", label: "Filtro por palabras clave", description: "Solo quienes usen ciertas palabras", price: 1000 },
  { id: "backupWinners", label: "Ganadores suplentes", description: "Suplentes de respaldo", price: 1000 },
]

export function PricingSection() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const subtotal = BASE_PRICE + activeFilters.size * 1000
  const total = Math.min(subtotal, MAX_PRICE)
  const capped = subtotal > MAX_PRICE

  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Precios claros
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sin suscripciones. Pagas por sorteo, solo cuando lo necesitas.
          </p>
        </motion.div>

        {/* Free tier */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-5 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium mb-2">
              <Gift className="w-4 h-4" />
              Sin costo
            </div>
            <p className="text-foreground font-medium">
              Sorteos simples con hasta 500 comentarios y 1 ganador
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sin filtros adicionales. Ideal para sorteos de baja escala.
            </p>
          </div>
        </motion.div>

        {/* Pricing card */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <h3 className="text-lg font-semibold text-foreground">Sorteo con filtros</h3>
              <p className="text-sm text-muted-foreground">Selecciona las opciones que necesites</p>
            </div>

            {/* Base price */}
            <div className="px-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Sorteo base</p>
                    <p className="text-xs text-muted-foreground">1 ganador, sin filtros</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground">
                  ${BASE_PRICE.toLocaleString("es-AR")}
                </span>
              </div>

              <div className="flex gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/5 text-primary text-xs font-medium">
                  <Check className="w-3 h-3" /> Logo incluido
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/5 text-primary text-xs font-medium">
                  <Check className="w-3 h-3" /> Color personalizado
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="px-6 pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Filtros opcionales — $1.000 c/u
              </p>
              <div className="space-y-1.5">
                {filters.map((filter) => {
                  const isActive = activeFilters.has(filter.id)
                  return (
                    <button
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                        isActive
                          ? "border-primary/20 bg-primary/[0.03]"
                          : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          {isActive ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{filter.label}</p>
                          <p className="text-xs text-muted-foreground">{filter.description}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        +$1.000
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Total */}
            <div className="p-6">
              <div className="border-t border-border/50 pt-5">
                {capped && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 px-4 py-3 rounded-lg bg-primary/[0.04] border border-primary/10"
                  >
                    <p className="text-sm text-primary font-medium">
                      Tope maximo aplicado — nunca pagas mas de ${MAX_PRICE.toLocaleString("es-AR")} por sorteo.
                    </p>
                  </motion.div>
                )}

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        key={total}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-foreground"
                      >
                        ${total.toLocaleString("es-AR")}
                      </motion.span>
                      <span className="text-muted-foreground">ARS</span>
                    </div>
                    {capped && (
                      <p className="text-xs text-muted-foreground line-through mt-0.5">
                        ${subtotal.toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                  <Link href="/sorteo/nuevo">
                    <Button className="h-11 px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
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
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary/60" />
            Pago seguro con Mercado Pago
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary/60" />
            Sin suscripciones
          </div>
        </motion.div>
      </div>
    </section>
  )
}
