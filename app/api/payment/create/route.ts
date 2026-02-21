import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { price, title } = await request.json()

    if (!price || price <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago no configurado" },
        { status: 500 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const isLocalhost = siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1")

    const preferenceBody: Record<string, unknown> = {
      items: [
        {
          title: title || "Sorteo Instagram - SorteosWeb",
          unit_price: price,
          quantity: 1,
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: `${siteUrl}/sorteo/resultado?status=approved`,
        failure: `${siteUrl}/sorteo/resultado?status=failed`,
        pending: `${siteUrl}/sorteo/resultado?status=pending`,
      },
    }

    // auto_return only works with non-localhost URLs
    if (!isLocalhost) {
      preferenceBody.auto_return = "approved"
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
      }
    )

    if (!preference.ok) {
      const errorData = await preference.text()
      console.error("Mercado Pago error:", errorData)
      return NextResponse.json(
        { error: "Error al crear preferencia de pago" },
        { status: 500 }
      )
    }

    const data = await preference.json()

    return NextResponse.json({
      init_point: data.init_point,
      id: data.id,
    })
  } catch (error) {
    console.error("Payment create error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
