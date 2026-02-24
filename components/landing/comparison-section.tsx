"use client";

import { motion } from "framer-motion";
import { Check, X, Crown } from "lucide-react";

const comparisons = [
  { feature: "Comentarios gratis", us: "600", them: "300" },
  { feature: "Registro requerido", us: "No", them: "Sí", usGood: true, themBad: true },
  { feature: "Credenciales de Instagram", us: "No", them: "Sí", usGood: true, themBad: true },
  { feature: "Verificación criptográfica", us: "Sí", them: "No", usGood: true, themBad: true },
  { feature: "Certificado con ID único", us: "Sí", them: "Limitado", usGood: true },
  { feature: "Precios en ARS (dólar blue)", us: "Sí", them: "No", usGood: true, themBad: true },
  { feature: "Filtros avanzados", us: "Gratis", them: "Plan pago" },
  { feature: "Personalización (logo/color)", us: "Económico", them: "Plan pago" },
];

export function ComparisonSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            Comparativa
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            ¿Por qué SorteosWeb?
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Más funcionalidades gratis. Más transparencia. Más simple.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 bg-secondary/30 border-b border-border/50">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                Característica
              </span>
              <div className="w-16 sm:w-24 text-center">
                <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-semibold">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Nosotros
                </div>
              </div>
              <div className="w-16 sm:w-24 text-center">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  Otros
                </span>
              </div>
            </div>

            {/* Rows */}
            {comparisons.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 ${
                  index < comparisons.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <span className="text-xs sm:text-sm text-foreground">{row.feature}</span>
                <div className="w-16 sm:w-24 flex items-center justify-center gap-1">
                  {row.usGood && (
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                  )}
                  <span className={`text-xs sm:text-sm font-medium ${row.usGood ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {row.us}
                  </span>
                </div>
                <div className="w-16 sm:w-24 flex items-center justify-center gap-1">
                  {row.themBad && (
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                  )}
                  <span className={`text-xs sm:text-sm ${row.themBad ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
                    {row.them}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
