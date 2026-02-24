"use client";

import { motion } from "framer-motion";
import { Link2, Settings, Play, Trophy } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Pegá la URL",
    description: "Post, reel o carrusel. Cualquier publicación de Instagram con comentarios.",
    color: "text-primary bg-primary/10",
  },
  {
    number: "02",
    icon: Settings,
    title: "Configurá las reglas",
    description: "Ganadores, suplentes, filtros de menciones, palabras clave y duplicados.",
    color: "text-accent bg-accent/10",
  },
  {
    number: "03",
    icon: Play,
    title: "Ejecutá el sorteo",
    description: "Selección al instante con algoritmo criptográfico verificable.",
    color: "text-success bg-success/10",
  },
  {
    number: "04",
    icon: Trophy,
    title: "Compartí los resultados",
    description: "Certificado único e imágenes personalizadas listas para stories.",
    color: "text-primary bg-primary/10",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            Cómo funciona
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Cuatro pasos. Menos de 2 minutos.
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Sin registro, sin instalar nada, sin complicaciones.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                className="relative text-center"
              >
                {/* Connecting line to next step (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px">
                    <div className="w-full h-full border-t-2 border-dashed border-border" />
                  </div>
                )}

                {/* Step number + icon */}
                <div className="relative inline-flex mb-5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${step.color}`}>
                    <step.icon className="w-7 h-7" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[220px] mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
