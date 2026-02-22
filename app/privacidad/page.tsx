import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidad - SorteosWeb",
}

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Política de Privacidad
        </h1>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Qué datos recopilamos
            </h2>
            <p>
              SorteosWeb no requiere registro ni inicio de sesión. No almacenamos
              contraseñas, tokens de acceso ni credenciales de Instagram de
              nuestros usuarios.
            </p>
            <p>
              Los datos que procesamos temporalmente incluyen: la URL de la
              publicación de Instagram proporcionada, los comentarios públicos de
              dicha publicación, y la configuración del sorteo elegida por el
              usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Cómo usamos los datos
            </h2>
            <p>
              Los datos se utilizan exclusivamente para ejecutar el sorteo
              solicitado. Los comentarios se procesan en tiempo real y no se
              almacenan de forma permanente en nuestros servidores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Datos de pago
            </h2>
            <p>
              Los pagos se procesan a través de Mercado Pago. No almacenamos datos
              de tarjetas de crédito ni información financiera. Consulta la{" "}
              <a
                href="https://www.mercadopago.com.ar/ayuda/terminos-y-politicas_702"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                política de privacidad de Mercado Pago
              </a>{" "}
              para más detalles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Cookies
            </h2>
            <p>
              Utilizamos cookies esenciales para el funcionamiento del sitio.
              Consulta nuestra{" "}
              <a href="/cookies" className="text-primary hover:underline">
                Política de Cookies
              </a>{" "}
              para más información.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Contacto
            </h2>
            <p>
              Para consultas sobre privacidad, contactanos en nuestra{" "}

              <a href="/contacto" className="text-primary hover:underline">
                página de contacto
              </a>
              .
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
