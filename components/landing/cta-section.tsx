"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-primary p-8 sm:p-12 lg:p-16">
            {/* Subtle decorations */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/[0.05] rounded-full blur-2xl" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/[0.03] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-balance">
                Tu próximo sorteo, profesional y verificable
              </h2>

              <p className="mt-5 text-lg text-white/70 max-w-lg mx-auto">
                Selección aleatoria criptográfica. Certificado con ID único. Sin registro ni credenciales.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/sorteo/nuevo">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2 px-8 bg-white text-primary hover:bg-white/90 font-medium rounded-lg"
                  >
                    Iniciar sorteo
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/50 text-sm">
                <span>Sin registro</span>
                <span className="hidden sm:inline">&middot;</span>
                <span>Sin credenciales</span>
                <span className="hidden sm:inline">&middot;</span>
                <span>Resultados verificables</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
