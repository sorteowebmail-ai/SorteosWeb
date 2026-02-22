"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Gift, Facebook, Shield, Instagram, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFacebookLogin = async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement",
      },
    })

    if (error) {
      setError("Error al iniciar sesion. Intenta nuevamente.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="bg-card rounded-3xl border border-border/50 shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mx-auto mb-4">
              <Gift className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Iniciar sesion en SorteosWeb
            </h1>
            <p className="mt-2 text-muted-foreground">
              Conecta tu cuenta de Instagram para empezar a hacer sorteos
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Login button */}
          <Button
            onClick={handleFacebookLogin}
            disabled={isLoading}
            className="w-full h-14 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-base font-medium gap-3"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Facebook className="w-5 h-5" />
            )}
            {isLoading ? "Conectando..." : "Continuar con Facebook"}
          </Button>

          {/* Requirements */}
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Requisitos:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#C792EA]/10 flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-4 h-4 text-[#C792EA]" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Cuenta Business o Creator</p>
                  <p className="text-muted-foreground">
                    Tu cuenta de Instagram debe ser de tipo Business o Creator (es gratis, se cambia en Configuracion de Instagram).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center flex-shrink-0">
                  <Facebook className="w-4 h-4 text-[#4ECDC4]" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Pagina de Facebook vinculada</p>
                  <p className="text-muted-foreground">
                    Tu cuenta de Instagram debe estar conectada a una Pagina de Facebook.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#D2248F]/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-[#D2248F]" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Seguridad garantizada</p>
                  <p className="text-muted-foreground">
                    Nunca pedimos tu contrasena. Solo leemos los comentarios de tus publicaciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Al continuar, aceptas los Terminos de Servicio y Politica de Privacidad de SorteosWeb.
        </p>
      </motion.div>
    </div>
  )
}
