"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
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
  Sparkles,
  Trophy,
  Users,
  MessageSquare,
} from "lucide-react";

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("es-AR")}
      {suffix}
    </span>
  );
}

export function HeroSection() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const isValid =
    url.includes("instagram.com/p/") ||
    url.includes("instagram.com/reel/") ||
    url.includes("instagram.com/tv/");

  const handleGo = () => {
    if (!isValid) return;
    setIsNavigating(true);
    sessionStorage.setItem("prefillUrl", url);
    router.push("/sorteo/nuevo");
  };

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-32 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-accent/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-primary/[0.015] rounded-full blur-[120px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] hidden sm:block"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/[0.06] border border-primary/10 mb-6 sm:mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">
              Hasta 600 comentarios gratis
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold tracking-tight leading-[1.1] sm:leading-[1.08]"
          >
            <span className="text-foreground">Sorteos de Instagram{" "}</span>
            <br className="hidden sm:block" />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              }}
            >
              profesionales y verificables
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-4 sm:mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed px-2 sm:px-0"
          >
            Pegá la URL de tu publicación, configurá las reglas y seleccioná
            ganadores al instante. Sin registro. Sin credenciales de Instagram.
          </motion.p>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 sm:mt-10 max-w-xl mx-auto"
          >
            <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-3 p-2 rounded-xl bg-card border border-border/60 shadow-lg shadow-primary/[0.03]">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  placeholder="https://instagram.com/p/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGo();
                  }}
                  className="h-11 pl-11 pr-4 text-base bg-transparent border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                onClick={handleGo}
                disabled={!isValid || isNavigating}
                className="h-11 px-6 sm:px-8 rounded-lg bg-primary hover:bg-primary/90 text-base font-medium gap-2 shrink-0 w-full sm:w-auto"
              >
                {isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Iniciar sorteo
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              Compatible con posts, reels y carruseles
            </p>

            {/* How to get URL — collapsible helper */}
            <details className="mt-4 text-left max-w-md mx-auto group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5 justify-center select-none">
                <span className="group-open:hidden">¿Cómo obtener la URL?</span>
                <span className="hidden group-open:inline">Cómo obtener la URL</span>
              </summary>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground pl-1">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded bg-primary/8 text-primary flex items-center justify-center text-xs font-medium shrink-0">1</span>
                  Abrí la publicación en Instagram
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded bg-primary/8 text-primary flex items-center justify-center text-xs font-medium shrink-0">2</span>
                  Tocá los tres puntos (...)
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded bg-primary/8 text-primary flex items-center justify-center text-xs font-medium shrink-0">3</span>
                  Seleccioná &quot;Copiar enlace&quot;
                </li>
              </ol>
            </details>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-8 sm:mt-12 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-6"
          >
            {[
              { icon: Lock, text: "Sin credenciales" },
              { icon: ShieldCheck, text: "Criptografía verificable" },
              { icon: Zap, text: "Resultados en segundos" },
              { icon: CheckCircle2, text: "Sin registro" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-primary/[0.06] flex items-center justify-center shrink-0">
                  <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                </div>
                {item.text}
              </div>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-10 sm:mt-16 grid grid-cols-3 gap-3 sm:gap-6 max-w-lg mx-auto"
          >
            {[
              {
                icon: Trophy,
                value: 5200,
                suffix: "+",
                label: "Sorteos realizados",
              },
              {
                icon: MessageSquare,
                value: 2800000,
                suffix: "+",
                label: "Comentarios procesados",
              },
              {
                icon: Users,
                value: 1400,
                suffix: "+",
                label: "Creadores confían",
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
                  <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/50" />
                  <span className="text-lg sm:text-2xl font-bold text-foreground tabular-nums">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      duration={2200}
                    />
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
