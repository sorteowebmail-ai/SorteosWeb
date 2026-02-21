"use client";

import { motion } from "framer-motion";
import { Link2, Settings, Play, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Pega el enlace",
    description:
      "Copia el enlace de tu publicacion de Instagram y pegalo en nuestra plataforma. Aceptamos posts, reels y carruseles.",
    color: "#820AD1",
    bgColor: "rgba(255, 107, 107, 0.1)",
  },
  {
    number: "02",
    icon: Settings,
    title: "Configura filtros",
    description:
      "Personaliza las reglas: menciones requeridas, hashtags obligatorios, cuentas excluidas y mucho mas.",
    color: "#4ECDC4",
    bgColor: "rgba(78, 205, 196, 0.1)",
  },
  {
    number: "03",
    icon: Play,
    title: "Inicia el sorteo",
    description:
      "Presiona el boton y disfruta de la animacion mientras se selecciona al ganador de forma aleatoria.",
    color: "#B76EF0",
    bgColor: "rgba(254, 215, 102, 0.1)",
  },
  {
    number: "04",
    icon: Trophy,
    title: "Comparte resultados",
    description:
      "Exporta un certificado profesional con los ganadores y compartelo en tus redes sociales.",
    color: "#C792EA",
    bgColor: "rgba(199, 146, 234, 0.1)",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32 bg-gradient-to-b from-secondary/30 to-background relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <svg
          className="absolute top-0 left-0 w-full h-32 text-secondary/50"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,0 C480,100 960,100 1440,0 L1440,100 L0,100 Z"
          />
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-[#B76EF0]/20 text-[#9B44D8] text-sm font-medium mb-4">
            Super Facil
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Crea tu sorteo en{" "}
            <span className="relative inline-block">
              <span className="relative z-10">4 simples pasos</span>
              <motion.span
                className="absolute bottom-2 left-0 w-full h-3 bg-[#B76EF0]/30 -z-0"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
              />
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Realiza tu sorteo en menos de 2 minutos con nuestra interfaz
            intuitiva. Sin complicaciones, sin registro.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line - desktop */}
          <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-1">
            <div className="w-full h-full bg-gradient-to-r from-[#820AD1] via-[#4ECDC4] via-[#B76EF0] to-[#C792EA] rounded-full opacity-30" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Icon container */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="relative mb-6"
                  >
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: step.bgColor }}
                    >
                      <step.icon
                        className="w-9 h-9"
                        style={{ color: step.color }}
                      />
                    </div>
                    {/* Step number badge */}
                    <div
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.number}
                    </div>
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  {/* Arrow for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-4 z-10">
                      <ArrowRight
                        className="w-6 h-6 text-muted-foreground/30"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Link href="/sorteo/nuevo">
            <Button
              size="lg"
              className="gap-2 px-8 bg-gradient-to-r from-primary to-[#9B44D8] hover:opacity-90 shadow-xl shadow-primary/25"
            >
              Comenzar Ahora
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Sin registro. Sin tarjeta de credito. 100% gratis.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
