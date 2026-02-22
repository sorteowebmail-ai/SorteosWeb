/**
 * In-memory payment store for soft launch.
 *
 * LIMITACION: los datos se pierden al reiniciar el servidor.
 * Para produccion real, migrar a Redis/KV/DB.
 * Para soft launch con trafico organico bajo, esto es suficiente.
 */

interface PaymentRecord {
  paymentId: string
  expectedAmount: number
  commentCount: number
  settingsHash: string
  verified: boolean
  verifiedAt?: number
  createdAt: number
}

// Quotes: server-generated IDs before payment
const quotes = new Map<string, PaymentRecord>()

// Used payment IDs: prevents reuse
const usedPaymentIds = new Set<string>()

// TTL: 2 hours for quotes
const QUOTE_TTL = 2 * 60 * 60 * 1000

function cleanupExpired() {
  const now = Date.now()
  for (const [id, record] of quotes) {
    if (now - record.createdAt > QUOTE_TTL) {
      quotes.delete(id)
    }
  }
}

export function createQuote(
  expectedAmount: number,
  commentCount: number,
  settingsHash: string,
): string {
  cleanupExpired()
  const quoteId = crypto.randomUUID()
  quotes.set(quoteId, {
    paymentId: "",
    expectedAmount,
    commentCount,
    settingsHash,
    verified: false,
    createdAt: Date.now(),
  })
  return quoteId
}

export function getQuote(quoteId: string): PaymentRecord | undefined {
  return quotes.get(quoteId)
}

export function markQuoteVerified(quoteId: string, paymentId: string): boolean {
  const record = quotes.get(quoteId)
  if (!record) return false
  if (usedPaymentIds.has(paymentId)) return false

  usedPaymentIds.add(paymentId)
  record.paymentId = paymentId
  record.verified = true
  record.verifiedAt = Date.now()
  quotes.set(quoteId, record)
  return true
}

export function isPaymentIdUsed(paymentId: string): boolean {
  return usedPaymentIds.has(paymentId)
}

export function isQuoteVerified(quoteId: string): boolean {
  const record = quotes.get(quoteId)
  return record?.verified === true
}

/**
 * Genera un hash simple de los settings para comparar
 * que el quote corresponde a la configuracion original.
 */
export function hashSettings(settings: {
  numberOfWinners: number
  filterDuplicates: boolean
  requireMentions: number
  excludeAccounts: string[]
  minCommentLength: number
  keywordFilter: string[]
  backupWinners: number
}): string {
  const input = [
    settings.numberOfWinners,
    settings.filterDuplicates ? 1 : 0,
    settings.requireMentions,
    settings.excludeAccounts.length,
    settings.minCommentLength,
    settings.keywordFilter?.length || 0,
    settings.backupWinners,
  ].join("|")

  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
