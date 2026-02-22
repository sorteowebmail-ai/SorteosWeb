import { NextRequest, NextResponse } from "next/server"
import { getQuote, markQuoteVerified, isPaymentIdUsed } from "@/lib/payment-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id")
    const quoteId = searchParams.get("quote_id")

    // ── Require both params ──────────────────────
    if (!paymentId || !quoteId) {
      return NextResponse.json(
        { error: "payment_id y quote_id requeridos" },
        { status: 400 },
      )
    }

    // ── Validate payment_id format (MP IDs are numeric) ──
    if (!/^\d{1,20}$/.test(paymentId)) {
      return NextResponse.json(
        { error: "payment_id invalido" },
        { status: 400 },
      )
    }

    // ── Check if quote exists ────────────────────
    const quote = getQuote(quoteId)
    if (!quote) {
      return NextResponse.json(
        { error: "Quote no encontrado o expirado" },
        { status: 404 },
      )
    }

    // ── Already verified? Return cached result ───
    if (quote.verified && quote.paymentId === paymentId) {
      return NextResponse.json({
        status: "approved",
        verified: true,
      })
    }

    // ── Idempotency: reject reused payment IDs ───
    if (isPaymentIdUsed(paymentId)) {
      return NextResponse.json(
        { error: "Este pago ya fue utilizado" },
        { status: 409 },
      )
    }

    // ── Fetch from MercadoPago ───────────────────
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago no configurado" },
        { status: 500 },
      )
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo verificar el pago" },
        { status: 500 },
      )
    }

    const data = await response.json()

    // ── Validate payment status ──────────────────
    if (data.status !== "approved") {
      return NextResponse.json({
        status: data.status,
        verified: false,
      })
    }

    // ── Validate amount matches quote ────────────
    if (data.transaction_amount < quote.expectedAmount) {
      console.error(
        `Amount mismatch: paid ${data.transaction_amount}, expected ${quote.expectedAmount}`,
      )
      return NextResponse.json(
        { error: "El monto pagado no coincide" },
        { status: 400 },
      )
    }

    // ── Mark verified + idempotency ──────────────
    const marked = markQuoteVerified(quoteId, paymentId)
    if (!marked) {
      return NextResponse.json(
        { error: "No se pudo verificar el pago (ya utilizado)" },
        { status: 409 },
      )
    }

    return NextResponse.json({
      status: "approved",
      verified: true,
    })
  } catch (error) {
    console.error("Payment verify error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
