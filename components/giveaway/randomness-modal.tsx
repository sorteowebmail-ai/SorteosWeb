"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Lock, Shuffle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RandomnessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RandomnessModal({ isOpen, onClose }: RandomnessModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg bg-card rounded-xl border border-border/50 shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Metodo de seleccion aleatoria
              </h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              SorteosWeb utiliza un algoritmo criptografico para garantizar
              que cada seleccion sea imparcial y no pueda ser manipulada.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Criptograficamente seguro
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Utilizamos <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded">crypto.getRandomValues()</code>,
                    la misma API que los navegadores usan para generar claves
                    de encriptacion. Produce valores imposibles de predecir.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shuffle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Algoritmo Fisher-Yates
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cada participante tiene exactamente la misma probabilidad
                    de ser seleccionado. El algoritmo mezcla la lista completa
                    de forma uniforme antes de determinar los resultados.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Sin intervencion humana
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Una vez que se ejecuta el sorteo, nadie puede influir en el
                    resultado. La seleccion ocurre en tu navegador, no en
                    nuestros servidores.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cada sorteo genera un ID unico que funciona como certificado
                de verificacion. Este identificador puede usarse como referencia
                para confirmar que la seleccion se realizo con SorteosWeb.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
