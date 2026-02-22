import { NextRequest, NextResponse } from "next/server"
import { calculateGiveawayPrice, isFreeGiveaway } from "@/lib/pricing"
import { createQuote, hashSettings } from "@/lib/payment-store"
import type { GiveawaySettings } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ── Validate required fields ──────────────────
    const { commentCount, settings } = body as {
      commentCount: unknown
      settings: unknown
    }

    if (
      typeof commentCount !== "number" ||
      !Number.isFinite(commentCount) ||
      commentCount < 0
    ) {
      return NextResponse.json(
        { error: "commentCount invalido" },
        { status: 400 },
      )
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "settings requerido" },
        { status: 400 },
      )
    }

    // ── Sanitize settings ─────────────────────────
    const s = settings as Record<string, unknown>
    const sanitized: Pick<
      GiveawaySettings,
      | "numberOfWinners"
      | "filterDuplicates"
      | "requireMentions"
      | "excludeAccounts"
      | "minCommentLength"
      | "keywordFilter"
      | "backupWinners"
    > = {
      numberOfWinners: Math.max(1, Math.min(20, Number(s.numberOfWinners) || 1)),
      filterDuplicates: Boolean(s.filterDuplicates),
      requireMentions: Math.max(0, Math.min(10, Number(s.requireMentions) || 0)),
      excludeAccounts: Array.isArray(s.excludeAccounts)
        ? s.excludeAccounts.filter((x): x is string => typeof x === "string").slice(0, 50)
        : [],
      minCommentLength: Math.max(0, Math.min(500, Number(s.minCommentLength) || 0)),
      keywordFilter: Array.isArray(s.keywordFilter)
        ? s.keywordFilter.filter((x): x is string => typeof x === "string").slice(0, 20)
        : [],
      backupWinners: Math.max(0, Math.min(10, Number(s.backupWinners) || 0)),
    }

    // ── Check if free ─────────────────────────────
    const fullSettings = {
      ...sanitized,
      postUrl: "",
      accentColor: "",
      logoDataUrl: null,
    } as GiveawaySettings

    if (isFreeGiveaway(fullSettings, commentCount)) {
      return NextResponse.json(
        { error: "Este sorteo es gratuito, no requiere pago" },
        { status: 400 },
      )
    }

    // ── Calculate price server-side ───────────────
    const price = calculateGiveawayPrice(fullSettings)

    // ── Create quote ──────────────────────────────
    const settingsHash = hashSettings(sanitized)
    const quoteId = createQuote(price, commentCount, settingsHash)

    // ── Create MercadoPago preference ─────────────
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago no configurado" },
        { status: 500 },
      )
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const isLocalhost =
      siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1")

    const preferenceBody: Record<string, unknown> = {
      items: [
        {
          title: "Sorteo Instagram - SorteosWeb",
          unit_price: price,
          quantity: 1,
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: `${siteUrl}/sorteo/resultado?status=approved&quote_id=${quoteId}`,
        failure: `${siteUrl}/sorteo/resultado?status=failed`,
        pending: `${siteUrl}/sorteo/resultado?status=pending`,
      },
      external_reference: quoteId,
    }

    if (!isLocalhost) {
      preferenceBody.auto_return = "approved"

      // Webhook URL for production
      const webhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL
      if (webhookUrl) {
        preferenceBody.notification_url = webhookUrl
      }
    }

    const preference = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preferenceBody),
      },
    )

    if (!preference.ok) {
      const errorData = await preference.text()
      console.error("Mercado Pago error:", errorData)
      return NextResponse.json(
        { error: "Error al crear preferencia de pago" },
        { status: 500 },
      )
    }

    const data = await preference.json()

    return NextResponse.json({
      init_point: data.init_point,
      id: data.id,
      quote_id: quoteId,
      price,
    })
  } catch (error) {
    console.error("Payment create error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
