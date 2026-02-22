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

    // B2: Sanitize shortcode — alphanumeric + _ - only, max 50 chars
    if (!/^[\w-]{1,50}$/.test(shortcode)) {
      return NextResponse.json(
        { error: "shortcode invalido" },
        { status: 400 },
      )
    }

    // B2: Sanitize cursor — max 200 chars
    if (cursor && cursor.length > 200) {
      return NextResponse.json(
        { error: "cursor invalido" },
        { status: 400 },
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
