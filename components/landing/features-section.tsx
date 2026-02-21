"use client";

import { motion } from "framer-motion";
import {
  Users,
  Filter,
  Shuffle,
  Download,
  History,
  Shield,
  Zap,
  MessageCircle,
  Hash,
  UserX,
  FileText,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Carga Masiva",
    description:
      "Importa miles de comentarios desde cualquier publicacion de Instagram en segundos.",
    color: "#FF6B6B",
    bgColor: "rgba(255, 107, 107, 0.1)",
  },
  {
    icon: Filter,
    title: "Filtros Avanzados",
    description:
      "Elimina duplicados, exige menciones minimas y excluye cuentas especificas.",
    color: "#4ECDC4",
    bgColor: "rgba(78, 205, 196, 0.1)",
  },
  {
    icon: Shuffle,
    title: "Seleccion Aleatoria",
    description:
      "Algoritmo transparente y justo para seleccionar ganadores al azar.",
    color: "#45B7D1",
    bgColor: "rgba(69, 183, 209, 0.1)",
  },
  {
    icon: Download,
    title: "Exporta Resultados",
    description:
      "Descarga certificados en PDF o comparte directamente en tus redes.",
    color: "#FED766",
    bgColor: "rgba(254, 215, 102, 0.1)",
  },
  {
    icon: History,
    title: "Historial Completo",
    description:
      "Accede a todos tus sorteos anteriores y sus resultados cuando quieras.",
    color: "#C792EA",
    bgColor: "rgba(199, 146, 234, 0.1)",
  },
  {
    icon: Shield,
    title: "100% Transparente",
    description:
      "Genera certificados de sorteo para demostrar la legitimidad del proceso.",
    color: "#FF9F43",
    bgColor: "rgba(255, 159, 67, 0.1)",
  },
];

const advancedFilters = [
  {
    icon: MessageCircle,
    title: "Menciones Requeridas",
    description: "Exige que los participantes mencionen a amigos.",
  },
  {
    icon: Hash,
    title: "Hashtags Obligatorios",
    description: "Filtra por uso de hashtags especificos.",
  },
  {
    icon: UserX,
    title: "Excluir Cuentas",
    description: "Elimina participantes no deseados del sorteo.",
  },
  {
    icon: FileText,
    title: "Longitud Minima",
    description: "Requiere comentarios con cierta cantidad de caracteres.",
  },
  {
    icon: Zap,
    title: "Sin Duplicados",
    description: "Un usuario = una participacion automaticamente.",
  },
  {
    icon: Globe,
    title: "Filtro por Idioma",
    description: "Detecta y filtra comentarios por idioma.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Funciones Potentes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance">
            Todo lo que necesitas para{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              sorteos profesionales
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Funciones avanzadas disenadas para marcas, influencers y agencias de
            marketing que buscan resultados reales.
          </p>
        </motion.div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-border hover:shadow-xl transition-all duration-300"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: feature.bgColor }}
              >
                <feature.icon
                  className="w-7 h-7"
                  style={{ color: feature.color }}
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Advanced Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-3xl border border-border/50 p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left content */}
              <div>
                <span className="inline-block px-4 py-2 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-sm font-medium mb-4">
                  Filtros Avanzados
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Controla cada detalle de tu sorteo
                </h3>
                <p className="text-lg text-muted-foreground mb-8">
                  Nuestros filtros inteligentes te permiten personalizar las
                  reglas del sorteo para obtener participantes de calidad.
                </p>

                {/* Filter pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "Sin duplicados",
                    "Menciones",
                    "Hashtags",
                    "Longitud",
                    "Idioma",
                  ].map((filter) => (
                    <span
                      key={filter}
                      className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Filter grid */}
              <div className="grid grid-cols-2 gap-4">
                {advancedFilters.map((filter, index) => (
                  <motion.div
                    key={filter.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-card border border-border/50 hover:shadow-lg transition-all"
                  >
                    <filter.icon className="w-5 h-5 text-primary mb-2" />
                    <h4 className="font-medium text-foreground text-sm">
                      {filter.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {filter.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
