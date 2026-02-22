import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politica de Privacidad - SorteosWeb",
}

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Politica de Privacidad
        </h1>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Que datos recopilamos
            </h2>
            <p>
              SorteosWeb no requiere registro ni inicio de sesion. No almacenamos
              contrasenas, tokens de acceso ni credenciales de Instagram de
              nuestros usuarios.
            </p>
            <p>
              Los datos que procesamos temporalmente incluyen: la URL de la
              publicacion de Instagram proporcionada, los comentarios publicos de
              dicha publicacion, y la configuracion del sorteo elegida por el
              usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Como usamos los datos
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
              Los pagos se procesan a traves de Mercado Pago. No almacenamos datos
              de tarjetas de credito ni informacion financiera. Consulta la{" "}
              <a
                href="https://www.mercadopago.com.ar/ayuda/terminos-y-politicas_702"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                politica de privacidad de Mercado Pago
              </a>{" "}
              para mas detalles.
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
                Politica de Cookies
              </a>{" "}
              para mas informacion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Contacto
            </h2>
            <p>
              Para consultas sobre privacidad, contactanos en nuestra{" "}
              <a href="/contacto" className="text-primary hover:underline">
                pagina de contacto
              </a>
              .
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
