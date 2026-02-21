"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  HelpCircle,
  Instagram,
  CreditCard,
  Shield,
  Zap,
  Gift,
  Users,
  FileCheck,
  MessageCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const categories = [
  { id: "all", label: "Todas", icon: HelpCircle, color: "#820AD1" },
  { id: "getting-started", label: "Comenzar", icon: Zap, color: "#4ECDC4" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#C792EA" },
  { id: "features", label: "Funciones", icon: Gift, color: "#B76EF0" },
  { id: "pricing", label: "Precios", icon: CreditCard, color: "#D2248F" },
  { id: "security", label: "Seguridad", icon: Shield, color: "#45B7D1" },
];

const faqs: FAQItem[] = [
  // Getting Started
  {
    category: "getting-started",
    question: "Como hacer un sorteo en Instagram con SorteosWeb?",
    answer:
      "Es muy sencillo: solo tienes que pegar el enlace de tu publicacion de Instagram, configurar las opciones del sorteo (numero de ganadores, filtros, etc.) y hacer clic en 'Sortear'. SorteosWeb se encarga de cargar los comentarios y seleccionar ganadores de forma aleatoria y transparente. No necesitas iniciar sesion ni compartir tus credenciales.",
  },
  {
    category: "getting-started",
    question: "Necesito crear una cuenta para usar SorteosWeb?",
    answer:
      "No, SorteosWeb esta disenado para ser lo mas simple posible. Puedes hacer sorteos sin necesidad de registrarte. Para funciones avanzadas como historial de sorteos y certificados personalizados, puedes crear una cuenta gratuita opcional.",
  },
  {
    category: "getting-started",
    question: "Cuanto tiempo tarda en cargar los comentarios?",
    answer:
      "El tiempo depende de la cantidad de comentarios. Para publicaciones con menos de 500 comentarios, generalmente tarda unos segundos. Para sorteos mas grandes, puede tomar entre 30 segundos y 2 minutos. Veras una barra de progreso durante la carga.",
  },
  {
    category: "getting-started",
    question: "Puedo hacer un sorteo desde mi celular?",
    answer:
      "Si, SorteosWeb funciona perfectamente desde cualquier dispositivo. La plataforma esta optimizada para moviles, tablets y computadoras. No necesitas descargar ninguna aplicacion.",
  },

  // Instagram
  {
    category: "instagram",
    question: "Donde encuentro el enlace de mi publicacion de Instagram?",
    answer:
      "Abre tu publicacion en Instagram, toca los tres puntos (...) en la esquina superior derecha y selecciona 'Copiar enlace'. Tambien puedes ver el post en un navegador web y copiar la URL directamente de la barra de direcciones. El formato es: instagram.com/p/CODIGO o instagram.com/reel/CODIGO.",
  },
  {
    category: "instagram",
    question: "Puedo hacer sorteos con publicaciones de cuentas privadas?",
    answer:
      "No, solo podemos acceder a publicaciones de cuentas publicas. Si tu cuenta es privada, deberas cambiarla a publica temporalmente para realizar el sorteo, o al menos hacer publica la publicacion especifica.",
  },
  {
    category: "instagram",
    question: "Se puede verificar si los participantes siguen mi cuenta?",
    answer:
      "Instagram no permite acceder a la lista de seguidores de otras cuentas por politicas de privacidad. Puedes establecer 'seguir la cuenta' como requisito del sorteo, pero la verificacion debe hacerse manualmente para el ganador antes de entregar el premio.",
  },
  {
    category: "instagram",
    question: "Funciona con Reels e historias?",
    answer:
      "Si, funcionamos con publicaciones del feed y Reels. Actualmente no soportamos historias de Instagram ya que los comentarios funcionan de forma diferente y desaparecen despues de 24 horas.",
  },
  {
    category: "instagram",
    question: "Puedo sortear multiples publicaciones a la vez?",
    answer:
      "Por ahora, cada sorteo se realiza con una sola publicacion. Si necesitas incluir participantes de varias publicaciones, te recomendamos hacer sorteos separados o usar nuestro plan Pro que incluye la funcion de multiples posts (proximamente).",
  },

  // Features
  {
    category: "features",
    question: "Que filtros puedo aplicar a los participantes?",
    answer:
      "SorteosWeb ofrece filtros avanzados: eliminar comentarios duplicados del mismo usuario, requerir un numero minimo de menciones (@amigos), excluir cuentas especificas, establecer longitud minima de comentario, y filtrar por palabras clave. Puedes combinar multiples filtros segun las reglas de tu sorteo.",
  },
  {
    category: "features",
    question: "Puedo elegir varios ganadores y suplentes?",
    answer:
      "Si, puedes configurar el numero de ganadores que desees (1, 2, 3 o mas). Tambien puedes establecer ganadores suplentes en caso de que algun ganador principal no reclame su premio o no cumpla con los requisitos.",
  },
  {
    category: "features",
    question: "Como comparto los resultados del sorteo?",
    answer:
      "SorteosWeb genera multiples formatos para compartir: certificado oficial en imagen, animaciones personalizadas para historias de Instagram (formato 9:16) y posts (formato 1:1), y la opcion de grabar la pantalla durante la seleccion del ganador. Todo disenado para generar confianza con tu audiencia.",
  },
  {
    category: "features",
    question: "Las animaciones de ganador se pueden personalizar?",
    answer:
      "Si, ofrecemos varias plantillas de animacion con diferentes estilos (confetti, elegante, minimalista, festivo). Puedes elegir colores, agregar tu logo (plan Pro), y seleccionar el formato ideal para historias o feed de Instagram.",
  },
  {
    category: "features",
    question: "Se genera algun certificado o comprobante?",
    answer:
      "Si, generamos un certificado digital que incluye: fecha y hora del sorteo, enlace de la publicacion, configuracion utilizada, total de participantes, ganadores seleccionados y un codigo unico de verificacion. Esto aporta transparencia y credibilidad a tu sorteo.",
  },

  // Pricing
  {
    category: "pricing",
    question: "Es gratis usar SorteosWeb?",
    answer:
      "Si, ofrecemos un plan gratuito que permite sorteos en publicaciones de hasta 500 comentarios. Para sorteos mas grandes o funciones premium, ofrecemos planes accesibles de pago unico (sin suscripciones).",
  },
  {
    category: "pricing",
    question: "Como funcionan los pagos?",
    answer:
      "Los pagos son por sorteo individual, sin suscripciones ni cargos mensuales. Usamos Stripe y Mercado Pago, plataformas 100% seguras. No almacenamos datos de tarjetas. Pagas solo cuando necesitas realizar un sorteo que excede el limite gratuito.",
  },
  {
    category: "pricing",
    question: "Que pasa si pago y hay un error?",
    answer:
      "Tu sorteo queda guardado automaticamente. Si el pago fue exitoso y hubo algun error tecnico, puedes acceder a 'Mis Sorteos' y retomar donde lo dejaste. Si tienes algun problema, nuestro soporte te ayudara en menos de 24 horas.",
  },
  {
    category: "pricing",
    question: "Puedo obtener factura de mi compra?",
    answer:
      "Si, enviamos factura automaticamente al correo registrado. Si necesitas una factura con datos fiscales especificos, contactanos a soporte@sorteosweb.app con los datos de facturacion.",
  },

  // Security
  {
    category: "security",
    question: "Es seguro usar SorteosWeb?",
    answer:
      "Absolutamente. Nunca pedimos tu contrasena de Instagram ni acceso a tu cuenta. Solo leemos los comentarios publicos de la publicacion que nos indicas. Usamos conexiones encriptadas (HTTPS) y no almacenamos informacion sensible.",
  },
  {
    category: "security",
    question: "Como garantizan que el sorteo es aleatorio?",
    answer:
      "Utilizamos algoritmos criptograficos de generacion de numeros aleatorios (CSPRNG) que son imposibles de predecir o manipular. Ademas, mostramos la animacion de seleccion en tiempo real para mayor transparencia.",
  },
  {
    category: "security",
    question: "Los datos de los participantes quedan guardados?",
    answer:
      "Los datos de participantes solo se procesan durante el sorteo y se eliminan automaticamente despues. No vendemos ni compartimos informacion con terceros. Solo guardamos el resultado final si decides crear un certificado.",
  },
  {
    category: "security",
    question: "Que pasa con mi informacion de pago?",
    answer:
      "No tenemos acceso a los datos de tu tarjeta. Los pagos son procesados directamente por Stripe o Mercado Pago, que cuentan con certificacion PCI-DSS nivel 1, el estandar mas alto de seguridad en pagos.",
  },
];

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const category = categories.find((c) => c.id === item.category);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border/50 bg-card transition-colors hover:border-border"
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${category?.color}15` }}
        >
          {category && (
            <category.icon className="h-5 w-5" style={{ color: category.color }} />
          )}
        </div>
        <span className="flex-1 font-medium text-foreground">{item.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-0">
              <div className="ml-14 text-muted-foreground leading-relaxed">
                {item.answer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-secondary/30 to-background pt-24 pb-16">
        {/* Background shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#820AD1]/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#4ECDC4]/10 blur-3xl" />
        </div>

        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-0 px-4 py-2">
              <HelpCircle className="mr-2 h-4 w-4" />
              Centro de Ayuda
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
              Preguntas Frecuentes
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Todo lo que necesitas saber sobre SorteosWeb. Si no encuentras tu
              respuesta, no dudes en contactarnos.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar en preguntas frecuentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 pr-4 rounded-2xl border-border/50 bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg py-4">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? "text-white shadow-lg"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
                style={
                  selectedCategory === category.id
                    ? { backgroundColor: category.color }
                    : {}
                }
              >
                <category.icon className="h-4 w-4" />
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-12">
        <div className="container mx-auto max-w-4xl px-4">
          {filteredFaqs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No encontramos resultados
              </h3>
              <p className="text-muted-foreground mb-6">
                Intenta con otras palabras o revisa las categorias
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="rounded-full bg-transparent"
              >
                Ver todas las preguntas
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => (
                <FAQItem
                  key={`${faq.category}-${index}`}
                  item={faq}
                  isOpen={openItems.has(index)}
                  onToggle={() => toggleItem(index)}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { value: "24h", label: "Tiempo de respuesta", icon: MessageCircle },
              { value: "99.9%", label: "Disponibilidad", icon: Zap },
              { value: "50k+", label: "Sorteos realizados", icon: Gift },
              { value: "4.9/5", label: "Satisfaccion", icon: Users },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-2xl bg-card border border-border/50 text-center"
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-[#9B44D8] p-8 md:p-12 text-center"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                No encontraste tu respuesta?
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8">
                Nuestro equipo de soporte esta listo para ayudarte. Respondemos
                todas las consultas en menos de 24 horas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 rounded-full h-12 px-8"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contactar Soporte
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 rounded-full h-12 px-8 bg-transparent"
                >
                  <Link href="/sorteo/nuevo">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Hacer un Sorteo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
