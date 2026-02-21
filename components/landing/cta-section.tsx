"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Main card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#9B44D8] to-accent p-1">
            <div className="relative rounded-[1.4rem] bg-gradient-to-br from-primary/95 via-[#9B44D8]/95 to-accent/95 p-8 sm:p-12 lg:p-16">
              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                />
              </div>

              {/* Floating icons */}
              <motion.div
                className="absolute top-8 right-8 lg:top-12 lg:right-12"
                animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Gift className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 hidden sm:flex"
                animate={{ y: [0, 10, 0], rotate: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </motion.div>

              {/* Content */}
              <div className="relative z-10 max-w-2xl mx-auto text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" />
                    Comienza hoy mismo
                  </span>
                </motion.div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-balance">
                  Listo para tu proximo sorteo increible?
                </h2>
                
                <p className="mt-6 text-lg text-white/80 max-w-xl mx-auto">
                  Unete a miles de marcas e influencers que ya confian en SorteosWeb para sus sorteos de Instagram.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/sorteo/nuevo">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto gap-2 px-8 bg-white text-primary hover:bg-white/90 shadow-xl transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="w-5 h-5" />
                      Crear Sorteo Gratis
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="#pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto px-8 border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white/50"
                    >
                      Ver Planes
                    </Button>
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#4ECDC4]" />
                    Sin registro requerido
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#B76EF0]" />
                    100% gratis
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    Resultados instantaneos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
