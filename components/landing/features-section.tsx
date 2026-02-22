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
    title: "Rápido y directo",
    description:
      "Ingresá la URL, configurá reglas y obtené resultados. Sin registro, sin login, sin esperas.",
  },
  {
    icon: Filter,
    title: "Filtros avanzados",
    description:
      "Eliminá duplicados, exigí menciones, filtrá por palabras clave o excluí cuentas específicas.",
  },
  {
    icon: Shuffle,
    title: "Selección aleatoria verificable",
    description:
      "Algoritmo criptográfico (crypto.getRandomValues) que garantiza una selección justa y demostrable.",
  },
  {
    icon: Users,
    title: "Múltiples ganadores y suplentes",
    description:
      "Hasta 20 ganadores principales con suplentes de respaldo en caso de que alguien no reclame.",
  },
  {
    icon: Download,
    title: "Certificado verificable",
    description:
      "Genera un certificado con ID único y crea imágenes listas para compartir en tus redes.",
  },
  {
    icon: Shield,
    title: "Privacidad primero",
    description:
      "No pedimos tu contraseña de Instagram. No guardamos datos personales. Tu sorteo, tu control.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Funcionalidades
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Herramientas profesionales para sorteos transparentes.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group p-6 rounded-xl bg-card border border-border/50 card-hover"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
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
