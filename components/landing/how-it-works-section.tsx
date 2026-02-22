"use client";

import { motion } from "framer-motion";
import { Link2, Settings, Play, Trophy } from "lucide-react";

const steps = [
  {
    number: "1",
    icon: Link2,
    title: "Ingresa la URL",
    description: "Pega la URL del post, reel o carrusel de Instagram.",
  },
  {
    number: "2",
    icon: Settings,
    title: "Configura las reglas",
    description: "Define ganadores, filtros, menciones y criterios de participacion.",
  },
  {
    number: "3",
    icon: Play,
    title: "Ejecuta el sorteo",
    description: "El sistema selecciona ganadores con algoritmo criptografico verificable.",
  },
  {
    number: "4",
    icon: Trophy,
    title: "Comparte resultados",
    description: "Descarga el certificado o genera una imagen para tus redes.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Proceso
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Cuatro pasos. Menos de 2 minutos. Sin registro.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative text-center"
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
              )}

              <div className="relative inline-flex mb-5">
                <div className="w-14 h-14 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {step.number}
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[200px] mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
