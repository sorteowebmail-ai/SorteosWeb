"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Play,
  Star,
  Users,
  Trophy,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { FloatingShapes } from "@/components/confetti";

const stats = [
  { value: "2M+", label: "Sorteos realizados", icon: Trophy },
  { value: "50K+", label: "Usuarios activos", icon: Users },
  { value: "4.9", label: "Valoracion", icon: Star },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <FloatingShapes />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Nuevo: Sorteos con IA integrada
              </Badge>
            </motion.div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              <span className="text-foreground">Sorteos de Instagram </span>
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-[#9B44D8] to-accent bg-clip-text text-transparent">
                  faciles y divertidos
                </span>
                <motion.svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
                  <motion.path
                    d="M2 8 Q 50 2, 100 8 T 198 6"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#820AD1" />
                      <stop offset="100%" stopColor="#4ECDC4" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 text-pretty">
              Selecciona ganadores de tus publicaciones de Instagram de forma
              transparente y profesional. Sin registro, sin limites.
            </p>

            {/* Feature list */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              {["100% Gratis", "Sin registro", "Resultados al instante"].map(
                (feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#4ECDC4]" />
                    {feature}
                  </div>
                )
              )}
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/sorteo/nuevo">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 text-base px-8 bg-gradient-to-r from-primary to-[#9B44D8] hover:opacity-90 shadow-xl shadow-primary/30 transition-all hover:shadow-primary/40 hover:scale-[1.02]"
                >
                  <Sparkles className="w-5 h-5" />
                  Crear Sorteo Gratis
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto gap-2 text-base px-8 border-2 hover:bg-secondary/50 bg-transparent"
              >
                <Play className="w-4 h-4" />
                Ver Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="text-center lg:text-left"
                >
                  <div className="flex items-center gap-1.5 justify-center lg:justify-start">
                    <stat.icon className="w-4 h-4 text-primary" />
                    <span className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Interactive Demo Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-[#4ECDC4]/20 rounded-3xl blur-3xl scale-110" />
              
              {/* Main card */}
              <div className="relative bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Sorteo de Navidad</h3>
                      <p className="text-sm text-muted-foreground">@tu_marca</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Participants counter */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#4ECDC4]/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#4ECDC4]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Participantes</p>
                        <motion.p
                          className="text-2xl font-bold text-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          1,847
                        </motion.p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-[#4ECDC4]/10 text-[#4ECDC4] border-[#4ECDC4]/20">
                      Verificados
                    </Badge>
                  </div>

                  {/* Winner preview */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Ganador seleccionado:</p>
                    <motion.div
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#B76EF0]/20 to-[#9B44D8]/20 border-2 border-[#B76EF0]/30"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-primary-foreground">
                        MG
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">@maria_garcia</p>
                        <p className="text-sm text-muted-foreground">{"Que sorteo tan increible!"}</p>
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        <span className="text-3xl">🎉</span>
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Action button */}
                  <Button className="w-full bg-gradient-to-r from-primary to-[#9B44D8] hover:opacity-90 shadow-lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Seleccionar Nuevo Ganador
                  </Button>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl bg-[#B76EF0] shadow-lg flex items-center justify-center"
                animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <span className="text-4xl">🎁</span>
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 w-16 h-16 rounded-2xl bg-[#4ECDC4] shadow-lg flex items-center justify-center"
                animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              >
                <span className="text-3xl">✨</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
