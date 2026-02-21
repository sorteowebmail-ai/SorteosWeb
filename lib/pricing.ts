import type { GiveawaySettings } from "./types"

// Precio base: sorteo simple (1 ganador, sin filtros)
const BASE_PRICE = 5000

// Costo adicional por cada feature activada
const FEATURE_COSTS = {
  extraWinners: 1000,       // Más de 1 ganador
  filterDuplicates: 1000,   // Filtrar comentarios duplicados
  requireMentions: 1000,    // Exigir menciones mínimas
  excludeAccounts: 1000,    // Excluir cuentas específicas
  minCommentLength: 1000,   // Largo mínimo de comentario
  keywordFilter: 1000,      // Filtro por palabras clave
  backupWinners: 1000,      // Ganadores suplentes
} as const

// Precio máximo sin importar cuántos filtros se activen
const MAX_PRICE = 10000

// Sorteos simples con hasta este numero de comentarios son gratis
const FREE_COMMENT_LIMIT = 500

export function calculateGiveawayPrice(settings: GiveawaySettings): number {
  let price = BASE_PRICE

  if (settings.numberOfWinners > 1) {
    price += FEATURE_COSTS.extraWinners
  }

  if (settings.filterDuplicates) {
    price += FEATURE_COSTS.filterDuplicates
  }

  if (settings.requireMentions > 0) {
    price += FEATURE_COSTS.requireMentions
  }

  if (settings.excludeAccounts.length > 0) {
    price += FEATURE_COSTS.excludeAccounts
  }

  if (settings.minCommentLength > 0) {
    price += FEATURE_COSTS.minCommentLength
  }

  if (settings.keywordFilter?.length > 0) {
    price += FEATURE_COSTS.keywordFilter
  }

  if (settings.backupWinners > 0) {
    price += FEATURE_COSTS.backupWinners
  }

  return Math.min(price, MAX_PRICE)
}

/**
 * Determina si un sorteo es gratis.
 * Gratis = hasta 500 comentarios + sorteo simple (sin filtros ni features extras).
 * Logo y color de acento NO cuentan como features pagas.
 */
export function isFreeGiveaway(settings: GiveawaySettings, commentCount: number): boolean {
  if (commentCount > FREE_COMMENT_LIMIT) return false
  if (settings.numberOfWinners > 1) return false
  if (settings.filterDuplicates) return false
  if (settings.requireMentions > 0) return false
  if (settings.excludeAccounts.length > 0) return false
  if (settings.minCommentLength > 0) return false
  if (settings.keywordFilter?.length > 0) return false
  if (settings.backupWinners > 0) return false
  return true
}

export function getPriceBreakdown(settings: GiveawaySettings) {
  const items: { label: string; price: number }[] = [
    { label: "Sorteo base (1 ganador)", price: BASE_PRICE },
  ]

  if (settings.numberOfWinners > 1) {
    items.push({ label: `Multiples ganadores (${settings.numberOfWinners})`, price: FEATURE_COSTS.extraWinners })
  }

  if (settings.filterDuplicates) {
    items.push({ label: "Filtrar duplicados", price: FEATURE_COSTS.filterDuplicates })
  }

  if (settings.requireMentions > 0) {
    items.push({ label: `Menciones minimas (${settings.requireMentions})`, price: FEATURE_COSTS.requireMentions })
  }

  if (settings.excludeAccounts.length > 0) {
    items.push({ label: `Excluir cuentas (${settings.excludeAccounts.length})`, price: FEATURE_COSTS.excludeAccounts })
  }

  if (settings.minCommentLength > 0) {
    items.push({ label: `Largo minimo (${settings.minCommentLength} chars)`, price: FEATURE_COSTS.minCommentLength })
  }

  if (settings.keywordFilter?.length > 0) {
    items.push({ label: `Filtro por palabras (${settings.keywordFilter.length})`, price: FEATURE_COSTS.keywordFilter })
  }

  if (settings.backupWinners > 0) {
    items.push({ label: `Suplentes (${settings.backupWinners})`, price: FEATURE_COSTS.backupWinners })
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const total = Math.min(subtotal, MAX_PRICE)
  const capped = subtotal > MAX_PRICE

  return { items, subtotal, total, capped }
}

export const PRICING = {
  BASE_PRICE,
  MAX_PRICE,
  FREE_COMMENT_LIMIT,
  FEATURE_COSTS,
} as const
