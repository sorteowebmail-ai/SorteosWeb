import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacto - SorteosWeb",
}

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Contacto
        </h1>
        <p className="text-muted-foreground mb-10">
          Si tenes alguna pregunta, sugerencia o problema, no dudes en
          escribirnos.
        </p>

        <div className="rounded-2xl bg-card border border-border/50 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Email</p>
              <a
                href="mailto:contacto@sorteosweb.com.ar"
                className="text-sm text-primary hover:underline"
              >
                contacto@sorteosweb.com.ar
              </a>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Respondemos en un plazo de 24-48 horas habiles.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  )
}
