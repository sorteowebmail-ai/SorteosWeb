"use client";

import { motion } from "framer-motion";
import { Star, MessageSquare, Zap, Calendar, Quote } from "lucide-react";

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
] as const;

const testimonials = [
  {
    name: "Carolina M.",
    initial: "C",
    role: "Fundadora",
    industry: "E-commerce",
    text: "Sorteo con 3.000 comentarios resuelto en menos de 2 minutos. El certificado de verificación le da seriedad real frente a los seguidores.",
    rating: 5,
    comments: 3200,
    executionTime: "1m 47s",
    date: "Ene 2026",
  },
  {
    name: "Matías R.",
    initial: "M",
    role: "Content creator",
    industry: "Streaming",
    text: "Lo uso en vivo durante transmisiones. Rápido, transparente y sin pedir contraseña de Instagram. Mis viewers confían en los resultados.",
    rating: 5,
    comments: 8500,
    executionTime: "3m 12s",
    date: "Dic 2025",
  },
  {
    name: "Lucía G.",
    initial: "L",
    role: "Social media manager",
    industry: "Cosmética",
    text: "Los filtros de menciones y duplicados nos ahorraron horas de revisión manual. Procesamos más de 12.000 comentarios sin problemas.",
    rating: 5,
    comments: 12400,
    executionTime: "4m 33s",
    date: "Feb 2026",
  },
];

function formatNumber(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return n.toLocaleString("es-AR");
}

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-16"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            Testimonios
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Marcas y creadores que confían en SorteosWeb
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">
            Resultados reales de sorteos realizados en la plataforma.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl sm:rounded-2xl bg-card border border-border/50 p-5 sm:p-6 flex flex-col relative"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-primary/10 absolute top-5 right-5" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground text-sm leading-relaxed mb-5 flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Stats strip */}
              <div className="flex gap-2 mb-5">
                <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1.5">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {formatNumber(t.comments)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    comentarios
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1.5">
                  <Zap className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {t.executionTime}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${AVATAR_COLORS[index]}`}
                    >
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.role}
                        <span className="mx-1 text-border">&middot;</span>
                        {t.industry}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[11px]">{t.date}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
