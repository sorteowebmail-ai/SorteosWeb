import { NextRequest, NextResponse } from "next/server"
import { getQuote, markQuoteVerified } from "@/lib/payment-store"

/**
 * Webhook de MercadoPago.
 *
 * MP envia POST con:
 * { action: "payment.updated", type: "payment", data: { id: "123456789" } }
 *
 * Flujo:
 * 1. Validar estructura basica
 * 2. Fetch payment de MP API para obtener status + external_reference (= quoteId)
 * 3. Si approved, marcar quote como verificado
 *
 * Siempre responder 200 para que MP no reintente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Solo nos interesan notificaciones de pago
    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ received: true })
    }

    const mpPaymentId = String(body.data.id)

    // Validar formato
    if (!/^\d{1,20}$/.test(mpPaymentId)) {
      return NextResponse.json({ received: true })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error("Webhook: MERCADOPAGO_ACCESS_TOKEN not set")
      return NextResponse.json({ received: true })
    }

    // Fetch payment details from MP
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      console.error(`Webhook: MP API error ${response.status} for payment ${mpPaymentId}`)
      return NextResponse.json({ received: true })
    }

    const payment = await response.json()

    // Only process approved payments
    if (payment.status !== "approved") {
      return NextResponse.json({ received: true })
    }

    // external_reference = quoteId (set in create route)
    const quoteId = payment.external_reference
    if (!quoteId || typeof quoteId !== "string") {
      console.error(`Webhook: no external_reference for payment ${mpPaymentId}`)
      return NextResponse.json({ received: true })
    }

    const quote = getQuote(quoteId)
    if (!quote) {
      // Quote may have expired or server restarted
      console.warn(`Webhook: quote ${quoteId} not found for payment ${mpPaymentId}`)
      return NextResponse.json({ received: true })
    }

    // Already verified
    if (quote.verified) {
      return NextResponse.json({ received: true })
    }

    // Validate amount
    if (payment.transaction_amount < quote.expectedAmount) {
      console.error(
        `Webhook: amount mismatch for ${mpPaymentId}: paid ${payment.transaction_amount}, expected ${quote.expectedAmount}`,
      )
      return NextResponse.json({ received: true })
    }

    // Mark verified
    markQuoteVerified(quoteId, mpPaymentId)
    console.log(`Webhook: payment ${mpPaymentId} verified for quote ${quoteId}`)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    // Always return 200 to avoid MP retries
    return NextResponse.json({ received: true })
  }
}
