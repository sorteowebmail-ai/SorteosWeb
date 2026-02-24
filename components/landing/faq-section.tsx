"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "¿Necesito dar mi contraseña de Instagram?",
    a: "No. SorteosWeb nunca pide ni almacena credenciales de Instagram. Solo necesitamos la URL de la publicación pública — nosotros nos encargamos de leer los comentarios.",
  },
  {
    q: "¿Cómo se garantiza que el sorteo es justo?",
    a: "Usamos crypto.getRandomValues, un generador criptográfico del navegador que es imposible de predecir o manipular. Cada sorteo genera un certificado con ID único que cualquier persona puede verificar de forma independiente.",
  },
  {
    q: "¿Cuántos comentarios se pueden procesar gratis?",
    a: "Hasta 600 comentarios con todas las funcionalidades incluidas: filtros, personalización, certificado y múltiples ganadores. Para sorteos más grandes, el precio se calcula automáticamente según la cantidad de comentarios.",
  },
  {
    q: "¿En qué moneda se cobra?",
    a: "En pesos argentinos (ARS). La conversión se hace con la cotización del dólar blue en tiempo real, y el pago se procesa de forma segura a través de Mercado Pago.",
  },
  {
    q: "¿Se pueden permitir comentarios duplicados?",
    a: "Vos decidís. Si querés que cada persona tenga una sola participación, activás el filtro de duplicados. Pero si preferís que comentar más veces aumente las chances de ganar, simplemente lo desactivás. Cada sorteo se configura como vos quieras.",
  },
  {
    q: "¿Puedo personalizar las reglas del sorteo?",
    a: "Sí, todo es configurable: cantidad de ganadores y suplentes, menciones requeridas, largo mínimo de comentario, palabras clave obligatorias, cuentas excluidas, y hasta el color y logo del certificado. Vos armás las reglas que necesites.",
  },
  {
    q: "¿Funciona con reels y carruseles?",
    a: "Sí. SorteosWeb funciona con cualquier publicación pública de Instagram que tenga comentarios: posts, reels, carruseles e IGTV.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 sm:py-24 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            Preguntas frecuentes
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            ¿Tenés dudas?
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
                    isOpen
                      ? "bg-card border-border/60 shadow-sm"
                      : "bg-card/50 border-border/30 hover:border-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed mt-3 pr-8">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
