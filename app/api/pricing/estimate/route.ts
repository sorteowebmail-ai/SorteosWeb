import { NextRequest, NextResponse } from "next/server"
import { calculateGiveawayPriceArs } from "@/lib/pricing"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const count = parseInt(searchParams.get("comments") || "0", 10)
  const customLogo = searchParams.get("logo") === "1"
  const customColor = searchParams.get("color") === "1"

  if (isNaN(count) || count < 0 || count > 1_000_000) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 })
  }

  const result = await calculateGiveawayPriceArs(count, { customLogo, customColor })

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=60" },
  })
}
