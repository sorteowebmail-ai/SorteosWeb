/**
 * Volume-based pricing configuration.
 *
 * Model:
 *   - ≤600 comments: FREE (base)
 *   - >600 comments: $0.80 USD per 1000 comments (ALL comments, not just excess)
 *   - Minimum charge: $0.40 USD
 *   - Add-ons (any tier): Logo personalizado +$0.50 USD, Color personalizado +$0.50 USD
 *   - Converted to ARS via dólar blue (promedio)
 */

export const PRICING_CONFIG = {
  /** Comments threshold for free tier */
  freeTierLimit: parseInt(process.env.FREE_TIER_LIMIT || "600", 10),

  /** Price per 1000 comments in USD (charged to user) */
  userPricePer1000: parseFloat(process.env.USER_PRICE_PER_1000 || "0.80"),

  /** Apify cost per 1000 comments in USD (our cost) */
  apifyCostPer1000: parseFloat(process.env.APIFY_COST_PER_1000 || "0.20"),

  /** Minimum charge in USD (avoid micro-transactions) */
  minChargeUsd: parseFloat(process.env.MIN_CHARGE_USD || "0.40"),

  /** Add-on: custom logo on downloadable image (USD) */
  logoAddOnUsd: parseFloat(process.env.LOGO_ADDON_USD || "0.50"),

  /** Add-on: custom accent color on downloadable image (USD) */
  colorAddOnUsd: parseFloat(process.env.COLOR_ADDON_USD || "0.50"),

  /** Exchange rate strategy: compra, venta, or promedio */
  exchangeRateStrategy: (process.env.EXCHANGE_RATE_STRATEGY || "promedio") as
    | "compra"
    | "venta"
    | "promedio",
} as const

export interface PricingAddOns {
  customLogo?: boolean
  customColor?: boolean
}

/**
 * Calculate price in USD for a given comment count + optional add-ons.
 * Returns 0 only if within free tier AND no add-ons selected.
 */
export function calculatePriceUsd(commentCount: number, addOns?: PricingAddOns): number {
  let base = 0
  if (commentCount > PRICING_CONFIG.freeTierLimit) {
    const raw = (commentCount / 1000) * PRICING_CONFIG.userPricePer1000
    base = Math.max(raw, PRICING_CONFIG.minChargeUsd)
  }

  let addOnTotal = 0
  if (addOns?.customLogo) addOnTotal += PRICING_CONFIG.logoAddOnUsd
  if (addOns?.customColor) addOnTotal += PRICING_CONFIG.colorAddOnUsd

  return base + addOnTotal
}

/**
 * Calculate our Apify cost in USD for a given comment count.
 */
export function calculateApifyCostUsd(commentCount: number): number {
  return (commentCount / 1000) * PRICING_CONFIG.apifyCostPer1000
}

/**
 * Check if a comment count falls within the free tier.
 */
export function isFreeTier(commentCount: number): boolean {
  return commentCount <= PRICING_CONFIG.freeTierLimit
}
