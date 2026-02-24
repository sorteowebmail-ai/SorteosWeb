/**
 * Apify configuration and validation.
 *
 * Actor: louisdeconinck/instagram-comments-scraper
 * Docs: https://apify.com/louisdeconinck/instagram-comments-scraper
 */

export const APIFY_CONFIG = {
  actorId: process.env.APIFY_ACTOR_ID || "louisdeconinck/instagram-comments-scraper",
  token: process.env.APIFY_API_TOKEN || "",
  /** Max seconds to wait for a run to finish (10 min) */
  timeoutSecs: 600,
  /** Memory limit in MB for the actor run (lower = faster boot) */
  memoryMbytes: 1024,
} as const

export function validateApifyConfig(): { valid: boolean; error?: string } {
  if (!APIFY_CONFIG.token || APIFY_CONFIG.token.startsWith("apify_api_XXX")) {
    return { valid: false, error: "APIFY_API_TOKEN no configurado en .env.local" }
  }
  if (!APIFY_CONFIG.actorId) {
    return { valid: false, error: "APIFY_ACTOR_ID no configurado en .env.local" }
  }
  return { valid: true }
}
