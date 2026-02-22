"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Link2,
  ShieldCheck,
  Zap,
  Lock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export function HeroSection() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const isValid = url.includes("instagram.com/p/") || url.includes("instagram.com/reel/") || url.includes("instagram.com/tv/");

  const handleGo = () => {
    if (!isValid) return;
    setIsNavigating(true);
    sessionStorage.setItem("prefillUrl", url);
    router.push("/sorteo/nuevo");
  };

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-muted/50 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1]"
          >
            <span className="text-foreground">Sorteos de Instagram,{" "}</span>
            <span className="text-primary">
              profesionales y verificables
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto text-pretty"
          >
            Ingresá la URL de tu publicación, configurá las reglas y seleccioná ganadores con criptografía verificable. Sin registro. Sin credenciales.
          </motion.p>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-10 max-w-xl mx-auto"
          >
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="https://instagram.com/p/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGo();
                  }}
                  className="h-12 pl-12 pr-4 text-base bg-card border-border rounded-lg"
                />
              </div>
              <Button
                onClick={handleGo}
                disabled={!isValid || isNavigating}
                className="h-12 px-6 sm:px-8 rounded-lg bg-primary hover:bg-primary/90 text-base font-medium gap-2"
              >
                {isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Iniciar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Compatible con posts, reels y carruseles. Sorteos simples hasta 500 comentarios sin costo.
            </p>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {[
              { icon: Lock, text: "Sin credenciales" },
              { icon: ShieldCheck, text: "Criptografía verificable" },
              { icon: Zap, text: "Resultados inmediatos" },
              { icon: CheckCircle2, text: "Sin registro" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <item.icon className="w-4 h-4 text-primary/60" />
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
