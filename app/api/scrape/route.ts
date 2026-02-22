import { NextRequest, NextResponse } from "next/server"
import { extractShortcode, scrapePostInfo } from "@/lib/scraper"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = body.url as string

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL es requerida" }, { status: 400 })
    }

    if (url.length > 500) {
      return NextResponse.json({ error: "URL demasiado larga" }, { status: 400 })
    }

    if (!url.includes("instagram.com/")) {
      return NextResponse.json(
        { error: "Solo se aceptan URLs de Instagram" },
        { status: 400 },
      )
    }

    const shortcode = extractShortcode(url)
    if (!shortcode) {
      return NextResponse.json(
        { error: "URL de Instagram invalida. Usa una URL de post, reel o carrusel." },
        { status: 400 }
      )
    }

    const postInfo = await scrapePostInfo(shortcode)
    return NextResponse.json({ post: postInfo })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("Scrape error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
