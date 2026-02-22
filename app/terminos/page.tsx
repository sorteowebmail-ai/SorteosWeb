import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos de Uso - SorteosWeb",
}

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Términos de Uso
        </h1>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Aceptación de los términos
            </h2>
            <p>
              Al utilizar SorteosWeb, aceptas estos términos de uso. Si no estás
              de acuerdo, no utilices el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Descripción del servicio
            </h2>
            <p>
              SorteosWeb es una herramienta para seleccionar ganadores al azar de
              comentarios en publicaciones de Instagram. El servicio funciona con
              datos públicos y no requiere acceso a tu cuenta de Instagram.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Uso permitido
            </h2>
            <p>
              El servicio debe usarse exclusivamente para sorteos legítimos. Queda
              prohibido su uso para actividades fraudulentas, spam o cualquier
              actividad que viole los términos de servicio de Instagram.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Pagos y reembolsos
            </h2>
            <p>
              Los sorteos con funciones premium se pagan por uso a través de
              Mercado Pago. Los sorteos simples con menos de 500 comentarios y sin
              filtros son gratuitos. No ofrecemos reembolsos una vez ejecutado el
              sorteo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Limitación de responsabilidad
            </h2>
            <p>
              SorteosWeb no se responsabiliza por disputas entre organizadores y
              participantes de sorteos. La plataforma provee una herramienta de
              selección aleatoria, pero la responsabilidad del sorteo recae en su
              organizador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Modificaciones
            </h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier
              momento. Los cambios entrarán en vigencia al publicarse en esta
              página.
            </p>
          </section>
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          Última actualización: febrero 2026.
        </p>
      </div>
      <Footer />
    </main>
  )
}
