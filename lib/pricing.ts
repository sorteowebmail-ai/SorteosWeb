/**
 * Pricing module — Volume-based model with premium add-ons.
 *
 * Model:
 *   ≤600 comments → FREE (base)
 *   >600 comments → $0.80 USD / 1000 comments (ALL comments, not just excess)
 *   Minimum charge: $0.40 USD
 *   Add-ons: Logo +$0.50 USD, Color personalizado +$0.50 USD
 *   Converted to ARS via dólar blue (promedio)
 *
 * Filters (menciones, duplicados, keywords, etc.) are FREE.
 */

import type { GiveawaySettings } from "./types"
import {
  PRICING_CONFIG,
  calculatePriceUsd,
  isFreeTier,
} from "./pricing/pricing-config"
import type { PricingAddOns } from "./pricing/pricing-config"
import { usdToArs, getDolarBlueRate } from "./pricing/exchange-rate"
import type { ExchangeRateStrategy } from "./pricing/exchange-rate"

// Re-export for convenience
export { PRICING_CONFIG, isFreeTier }
export type { PricingAddOns }

export interface PriceEstimate {
  priceArs: number
  priceUsd: number
  baseUsd: number
  addOnsUsd: number
  rate: number
  rateSource: "api" | "cache" | "fallback"
  isFree: boolean
}

/**
 * Calculate the giveaway price in ARS based on comment count + add-ons.
 * This is an async function because it fetches the dólar blue rate.
 */
export async function calculateGiveawayPriceArs(
  commentCount: number,
  addOns?: PricingAddOns,
): Promise<PriceEstimate> {
  const baseUsd = calculatePriceUsd(commentCount)
  const totalUsd = calculatePriceUsd(commentCount, addOns)

  if (totalUsd === 0) {
    return { priceArs: 0, priceUsd: 0, baseUsd: 0, addOnsUsd: 0, rate: 0, rateSource: "cache", isFree: true }
  }

  const addOnsUsd = totalUsd - baseUsd

  const { ars, rate, source } = await usdToArs(
    totalUsd,
    PRICING_CONFIG.exchangeRateStrategy as ExchangeRateStrategy,
  )

  return {
    priceArs: ars,
    priceUsd: totalUsd,
    baseUsd,
    addOnsUsd,
    rate,
    rateSource: source,
    isFree: false,
  }
}

/**
 * Synchronous price calculation (USD only, no exchange rate needed).
 */
export function calculateGiveawayPrice(_settings: GiveawaySettings, commentCount: number = 0): number {
  return calculatePriceUsd(commentCount)
}

/**
 * Determine if a giveaway is free (no add-ons, within free tier).
 */
export function isFreeGiveaway(_settings: GiveawaySettings, commentCount: number): boolean {
  return isFreeTier(commentCount)
}

/**
 * Get the dólar blue rate info (for display in pricing section).
 */
export async function getExchangeRateInfo(): Promise<{
  rate: number
  source: "api" | "cache" | "fallback"
  updatedAt: string | null
}> {
  return getDolarBlueRate(PRICING_CONFIG.exchangeRateStrategy as ExchangeRateStrategy)
}

// Export constants for backward compat
export const PRICING = {
  FREE_COMMENT_LIMIT: PRICING_CONFIG.freeTierLimit,
  USER_PRICE_PER_1000: PRICING_CONFIG.userPricePer1000,
  LOGO_ADDON_USD: PRICING_CONFIG.logoAddOnUsd,
  COLOR_ADDON_USD: PRICING_CONFIG.colorAddOnUsd,
} as const
