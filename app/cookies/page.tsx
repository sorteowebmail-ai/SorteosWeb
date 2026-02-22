import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politica de Cookies - SorteosWeb",
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Politica de Cookies
        </h1>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Que son las cookies
            </h2>
            <p>
              Las cookies son pequenos archivos de texto que se almacenan en tu
              navegador cuando visitas un sitio web. Se utilizan para recordar
              preferencias y mejorar la experiencia del usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Cookies que utilizamos
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Cookies esenciales:</strong>{" "}
                Necesarias para el funcionamiento basico del sitio (sessionStorage
                para datos temporales del sorteo).
              </li>
              <li>
                <strong className="text-foreground">Cookies de analitica:</strong>{" "}
                Utilizamos Vercel Analytics para entender como se usa el sitio. No
                recopilan informacion personal identificable.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Como gestionar las cookies
            </h2>
            <p>
              Podes configurar tu navegador para bloquear o eliminar cookies. Ten
              en cuenta que esto puede afectar el funcionamiento del sitio.
            </p>
          </section>
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          Ultima actualizacion: febrero 2026.
        </p>
      </div>
      <Footer />
    </main>
  )
}
