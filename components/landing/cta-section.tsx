"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-primary p-8 sm:p-14 lg:p-20">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/[0.06] rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "32px 32px",
                }}
              />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white text-balance leading-tight">
                Tu próximo sorteo, profesional y verificable
              </h2>

              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/70 max-w-lg mx-auto leading-relaxed">
                Selección criptográfica. Certificado con ID único.
                Sin registro ni credenciales de Instagram.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/sorteo/nuevo">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2 px-8 bg-white text-primary hover:bg-white/90 font-medium rounded-xl text-base h-12"
                  >
                    Iniciar sorteo gratis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sin registro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Sin credenciales</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Hasta 600 comentarios gratis</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
