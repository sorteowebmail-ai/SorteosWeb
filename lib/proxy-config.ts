/**
 * Proxy pool configuration.
 *
 * Parses proxy URLs from env vars and caches ProxyAgent instances.
 * If no proxy env vars are set, all functions return null (direct connection).
 *
 * Env vars:
 *   INSTAGRAM_PROXY_POOL  — "http://u:p@host1:port;;;http://u:p@host2:port"
 *   INSTAGRAM_PROXY_URL   — single proxy for all sessions
 */

import type { Dispatcher } from "undici"

// ── Types ─────────────────────────────────────────────────────

export interface ProxyConfig {
  url: string
  host: string // hostname:port only (no credentials)
  agent: Dispatcher
}

// ── Global state (survives HMR) ───────────────────────────────

const g = globalThis as unknown as {
  __proxyConfigs?: ProxyConfig[]
  __proxyInitialized?: boolean
}

// ── Init ──────────────────────────────────────────────────────

function sanitizeProxyUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.hostname}:${u.port || "80"}`
  } catch {
    return raw.replace(/\/\/.*@/, "//***@")
  }
}

function initProxies(): ProxyConfig[] {
  if (g.__proxyInitialized && g.__proxyConfigs) return g.__proxyConfigs

  const configs: ProxyConfig[] = []

  try {
    // Pool takes precedence
    const poolRaw = process.env.INSTAGRAM_PROXY_POOL
    if (poolRaw) {
      const urls = poolRaw.split(";;;").map((s) => s.trim()).filter(Boolean)
      for (const url of urls) {
        configs.push(createProxyConfig(url))
      }
    }

    // Single proxy fallback
    if (configs.length === 0) {
      const singleRaw = process.env.INSTAGRAM_PROXY_URL
      if (singleRaw) {
        configs.push(createProxyConfig(singleRaw.trim()))
      }
    }
  } catch (error) {
    console.warn("[proxy-config] Failed to initialize proxies:", error)
  }

  g.__proxyConfigs = configs
  g.__proxyInitialized = true

  if (configs.length > 0) {
    console.log(`[proxy-config] Pool initialized: ${configs.length} proxy(ies)`)
  }

  return configs
}

function createProxyConfig(url: string): ProxyConfig {
  // Dynamic import to avoid bundling issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProxyAgent } = require("undici") as typeof import("undici")
  return {
    url,
    host: sanitizeProxyUrl(url),
    agent: new ProxyAgent(url),
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Get the proxy config for a session index.
 * Returns null if no proxies are configured.
 * Positional mapping: session[i] → proxy[i % proxyCount].
 */
export function getProxyForSession(sessionIndex: number): ProxyConfig | null {
  const pool = initProxies()
  if (pool.length === 0) return null
  return pool[sessionIndex % pool.length]
}

/** Check if any proxies are configured. */
export function hasProxies(): boolean {
  return initProxies().length > 0
}

/** Diagnostics (no credentials exposed). */
export function getProxyDiagnostics(): {
  configured: boolean
  count: number
  entries: { index: number; host: string }[]
} {
  const pool = initProxies()
  return {
    configured: pool.length > 0,
    count: pool.length,
    entries: pool.map((p, i) => ({ index: i, host: p.host })),
  }
}
