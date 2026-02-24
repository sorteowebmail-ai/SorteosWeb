"use client";

import { motion } from "framer-motion";
import {
  Users,
  Filter,
  Shuffle,
  Download,
  Shield,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Resultados en segundos",
    description:
      "Pegá la URL, configurá reglas y listo. Sin registro, sin contraseñas, sin esperas innecesarias.",
    highlight: true,
  },
  {
    icon: Shuffle,
    title: "Selección criptográfica",
    description:
      "Algoritmo basado en crypto.getRandomValues — imposible de manipular, verificable por cualquiera.",
    highlight: true,
  },
  {
    icon: Filter,
    title: "Filtros avanzados",
    description:
      "Menciones mínimas, largo de comentario, palabras clave, exclusión de cuentas y eliminación de duplicados.",
  },
  {
    icon: Users,
    title: "Múltiples ganadores",
    description:
      "Hasta 20 ganadores principales con suplentes de respaldo automáticos.",
  },
  {
    icon: Download,
    title: "Certificado verificable",
    description:
      "Genera un certificado con ID único e imágenes listas para compartir en stories.",
  },
  {
    icon: Shield,
    title: "Privacidad total",
    description:
      "No pedimos tu contraseña de Instagram. No guardamos datos personales. Cero riesgo.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 lg:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            Funcionalidades
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Todo lo que necesitás para un sorteo profesional
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Herramientas diseñadas para marcas y creadores que quieren
            transparencia real.
          </p>
        </motion.div>

        {/* Bento-style grid: 2 highlighted + 4 regular */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className={`group relative p-6 rounded-2xl border transition-all duration-200
                ${
                  feature.highlight
                    ? "bg-primary/[0.03] border-primary/10 hover:border-primary/20 hover:bg-primary/[0.05]"
                    : "bg-card border-border/50 hover:border-border card-hover"
                }
              `}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors
                ${
                  feature.highlight
                    ? "bg-primary/10 group-hover:bg-primary/15"
                    : "bg-secondary/60 group-hover:bg-secondary"
                }
              `}
              >
                <feature.icon
                  className={`w-5 h-5 ${
                    feature.highlight ? "text-primary" : "text-foreground/60"
                  }`}
                />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
