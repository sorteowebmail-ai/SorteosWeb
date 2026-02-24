/**
 * Dólar blue exchange rate from dolarapi.com
 *
 * Caches the rate for 5 minutes to avoid excessive API calls.
 * Falls back to a hardcoded rate if the API is down.
 */

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const FALLBACK_RATE = 1200 // Safe fallback ARS/USD (updated periodically)
const API_URL = "https://dolarapi.com/v1/ambito/dolares/blue"

interface DolarBlueResponse {
  compra: number
  venta: number
  promedio?: number
  fechaActualizacion: string
}

interface CachedRate {
  compra: number
  venta: number
  promedio: number
  fetchedAt: number
}

let cached: CachedRate | null = null

export type ExchangeRateStrategy = "compra" | "venta" | "promedio"

/**
 * Fetch the current dólar blue rate.
 * Returns ARS per 1 USD.
 */
export async function getDolarBlueRate(
  strategy: ExchangeRateStrategy = "promedio",
): Promise<{ rate: number; source: "api" | "cache" | "fallback"; updatedAt: string | null }> {
  // Return cached if fresh
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      rate: cached[strategy],
      source: "cache",
      updatedAt: new Date(cached.fetchedAt).toISOString(),
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(API_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`dolarapi.com responded ${res.status}`)

    const data: DolarBlueResponse = await res.json()

    if (!data.compra || !data.venta) {
      throw new Error("Invalid response from dolarapi.com")
    }

    const promedio = data.promedio ?? Math.round((data.compra + data.venta) / 2)

    cached = {
      compra: data.compra,
      venta: data.venta,
      promedio,
      fetchedAt: Date.now(),
    }

    return {
      rate: cached[strategy],
      source: "api",
      updatedAt: data.fechaActualizacion,
    }
  } catch (error) {
    console.error("[exchange-rate] Error fetching dólar blue:", error)

    // Return stale cache if available
    if (cached) {
      return {
        rate: cached[strategy],
        source: "cache",
        updatedAt: new Date(cached.fetchedAt).toISOString(),
      }
    }

    // Last resort fallback
    return {
      rate: FALLBACK_RATE,
      source: "fallback",
      updatedAt: null,
    }
  }
}

/**
 * Convert USD to ARS using dólar blue rate.
 */
export async function usdToArs(
  usd: number,
  strategy: ExchangeRateStrategy = "promedio",
): Promise<{ ars: number; rate: number; source: "api" | "cache" | "fallback" }> {
  const { rate, source } = await getDolarBlueRate(strategy)
  return {
    ars: Math.ceil(usd * rate), // Always round up
    rate,
    source,
  }
}
