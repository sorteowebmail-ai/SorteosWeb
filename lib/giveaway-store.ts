"use client"

import type { GiveawaySettings, Participant } from "./types"

/**
 * Cryptographically secure random winner selection using crypto.getRandomValues().
 * Fisher-Yates shuffle ensures uniform distribution.
 */
export function selectRandomWinners(participants: Participant[], count: number): Participant[] {
  const pool = [...participants]
  const n = pool.length

  // Fisher-Yates shuffle with crypto random
  for (let i = n - 1; i > 0; i--) {
    const randomBuffer = new Uint32Array(1)
    crypto.getRandomValues(randomBuffer)
    const j = randomBuffer[0] % (i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, Math.min(count, n))
}

export function filterParticipants(
  participants: Participant[],
  settings: GiveawaySettings
): Participant[] {
  let filtered = [...participants]

  // Filter duplicates (keep first comment per user)
  if (settings.filterDuplicates) {
    const seen = new Set<string>()
    filtered = filtered.filter(p => {
      const lower = p.username.toLowerCase()
      if (seen.has(lower)) return false
      seen.add(lower)
      return true
    })
  }

  // Filter by minimum mentions
  if (settings.requireMentions > 0) {
    filtered = filtered.filter(p => {
      const mentions = (p.comment.match(/@[\w.]+/g) || []).length
      return mentions >= settings.requireMentions
    })
  }

  // Filter excluded accounts
  if (settings.excludeAccounts.length > 0) {
    const excluded = new Set(settings.excludeAccounts.map(a => a.toLowerCase().replace("@", "")))
    filtered = filtered.filter(p => !excluded.has(p.username.toLowerCase()))
  }

  // Filter by minimum comment length
  if (settings.minCommentLength > 0) {
    filtered = filtered.filter(p => p.comment.length >= settings.minCommentLength)
  }

  // Filter by keywords (OR logic: comment must contain ANY keyword)
  if (settings.keywordFilter?.length > 0) {
    filtered = filtered.filter(p => {
      const commentLower = p.comment.toLowerCase()
      return settings.keywordFilter.some(kw => commentLower.includes(kw.toLowerCase()))
    })
  }

  return filtered
}

/**
 * Select main winners and backup/substitute winners.
 * Uses Fisher-Yates shuffle with crypto.getRandomValues() for fairness.
 */
export function selectWinnersAndBackups(
  participants: Participant[],
  mainCount: number,
  backupCount: number
): { winners: Participant[]; backups: Participant[] } {
  const pool = [...participants]
  const n = pool.length

  for (let i = n - 1; i > 0; i--) {
    const randomBuffer = new Uint32Array(1)
    crypto.getRandomValues(randomBuffer)
    const j = randomBuffer[0] % (i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const winners = pool.slice(0, Math.min(mainCount, n))
  const backups = pool.slice(Math.min(mainCount, n), Math.min(mainCount + backupCount, n))

  return { winners, backups }
}
