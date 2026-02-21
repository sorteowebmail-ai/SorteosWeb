import { NextRequest, NextResponse } from "next/server"
import { scrapeComments } from "@/lib/scraper"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shortcode = searchParams.get("shortcode")
    const cursor = searchParams.get("cursor") || undefined

    if (!shortcode) {
      return NextResponse.json(
        { error: "shortcode es requerido" },
        { status: 400 }
      )
    }

    const result = await scrapeComments(shortcode, cursor)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("Scrape comments error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
