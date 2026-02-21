import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GiveawayWizard } from "@/components/giveaway/giveaway-wizard"

export const metadata = {
  title: "Crear Nuevo Sorteo - SorteoWeb",
  description: "Configura y realiza un nuevo sorteo de Instagram de forma fácil y transparente."
}

export default function NewGiveawayPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <GiveawayWizard />
      </div>
      <Footer />
    </main>
  )
}
