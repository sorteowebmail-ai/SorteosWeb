import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GiveawayResultView } from "@/components/giveaway/giveaway-result-view"

export const metadata = {
  title: "Resultado del Sorteo - SorteosWeb",
  description: "Mira los ganadores de tu sorteo de Instagram."
}

export default function GiveawayResultPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <Suspense fallback={
          <div className="flex min-h-[80vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="mt-6 text-muted-foreground">Cargando sorteo...</p>
            </div>
          </div>
        }>
          <GiveawayResultView />
        </Suspense>
      </div>
      <Footer />
    </main>
  )
}
