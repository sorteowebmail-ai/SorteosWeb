/**
 * Proxy-aware fetch wrapper.
 *
 * Routes requests through the proxy assigned to a session index.
 * If no proxy is configured, falls through to native fetch().
 */

import { getProxyForSession } from "./proxy-config"

/**
 * Fetch with optional proxy routing based on session index.
 *
 * Usage:
 *   const res = await proxyFetch(url, { headers, sessionIndex: 0 })
 *
 * If sessionIndex is provided and a proxy is configured for it,
 * the request is routed through that proxy's dispatcher.
 * Otherwise, it's a plain native fetch().
 */
export async function proxyFetch(
  url: string | URL,
  init?: RequestInit & { sessionIndex?: number },
): Promise<Response> {
  const sessionIndex = init?.sessionIndex
  const proxyConfig = sessionIndex !== undefined
    ? getProxyForSession(sessionIndex)
    : null

  // Build fetch options, removing our custom property
  const { sessionIndex: _removed, ...fetchInit } = init || {} as RequestInit & { sessionIndex?: number }

  if (proxyConfig) {
    // Pass ProxyAgent as dispatcher (undici-compatible)
    return fetch(url, {
      ...fetchInit,
      // @ts-expect-error -- dispatcher is a valid undici option on Node's native fetch
      dispatcher: proxyConfig.agent,
    })
  }

  return fetch(url, fetchInit)
}
