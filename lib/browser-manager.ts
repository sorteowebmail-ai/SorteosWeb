// Singleton Chromium browser manager for Playwright
// Uses dynamic import so it doesn't crash when Playwright is not installed (e.g. Vercel)

import type { Browser, BrowserContext, Page } from "playwright"

// ============================================================
// Singleton (survives Next.js HMR)
// ============================================================

const g = globalThis as unknown as {
  __pwBrowser?: Browser | null
  __pwContext?: BrowserContext | null
  __pwPage?: Page | null
  __pwLaunching?: Promise<void> | null
  __pwMutexQueue?: Array<() => void>
  __pwMutexLocked?: boolean
}

// ============================================================
// Cookie parsing
// ============================================================

function parseInstagramCookies(): Array<{
  name: string
  value: string
  domain: string
  path: string
}> {
  const raw = process.env.INSTAGRAM_COOKIES
  if (!raw) {
    throw new Error("INSTAGRAM_COOKIES env var not set")
  }

  return raw
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.includes("="))
    .map((pair) => {
      const eqIdx = pair.indexOf("=")
      return {
        name: pair.slice(0, eqIdx).trim(),
        value: pair.slice(eqIdx + 1).trim(),
        domain: ".instagram.com",
        path: "/",
      }
    })
}

// ============================================================
// Browser lifecycle
// ============================================================

async function ensureBrowser(): Promise<void> {
  // Already running
  if (g.__pwBrowser && g.__pwBrowser.isConnected()) return

  // Another call is already launching — wait for it
  if (g.__pwLaunching) {
    await g.__pwLaunching
    return
  }

  g.__pwLaunching = (async () => {
    try {
      const pw = await import("playwright")

      const browser = await pw.chromium.launch({
        headless: true,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      })

      browser.on("disconnected", () => {
        console.log("[browser-manager] Browser disconnected, will re-launch on next request")
        g.__pwBrowser = null
        g.__pwContext = null
        g.__pwPage = null
      })

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: "es-AR",
        timezoneId: "America/Buenos_Aires",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      })

      // Inject Instagram cookies
      const cookies = parseInstagramCookies()
      await context.addCookies(cookies)

      const page = await context.newPage()

      // Block unnecessary resources for speed
      await page.route("**/*", (route) => {
        const req = route.request()
        const type = req.resourceType()
        const url = req.url()

        // Block heavy resources
        if (["image", "media", "font", "stylesheet"].includes(type)) {
          return route.abort()
        }

        // Block tracking/analytics
        if (
          url.includes("connect.facebook.net") ||
          url.includes("graph.instagram.com/logging") ||
          url.includes("fbcdn.net/rsrc.php")
        ) {
          return route.abort()
        }

        return route.continue()
      })

      // Navigate to Instagram to establish session (loads runtime cookies)
      await page.goto("https://www.instagram.com/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })

      // Wait a bit for JS to set additional cookies
      await page.waitForTimeout(2000)

      g.__pwBrowser = browser
      g.__pwContext = context
      g.__pwPage = page

      console.log("[browser-manager] Chromium launched and Instagram session established")
    } finally {
      g.__pwLaunching = null
    }
  })()

  await g.__pwLaunching
}

// ============================================================
// Mutex for exclusive page access
// ============================================================

function initMutex() {
  if (!g.__pwMutexQueue) g.__pwMutexQueue = []
  if (g.__pwMutexLocked === undefined) g.__pwMutexLocked = false
}

// ============================================================
// Public API
// ============================================================

/**
 * Check if Playwright is available (installed and importable)
 */
export async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    await import("playwright")
    return true
  } catch {
    return false
  }
}

/**
 * Acquire exclusive access to the browser page.
 * Caller MUST call release() when done.
 * Timeout: 60s — if not released, next caller gets an error.
 */
export async function acquirePage(): Promise<{ page: Page; release: () => void }> {
  initMutex()

  // Wait for mutex if locked
  if (g.__pwMutexLocked) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = g.__pwMutexQueue!.indexOf(resolve)
        if (idx !== -1) g.__pwMutexQueue!.splice(idx, 1)
        reject(new Error("[browser-manager] Mutex timeout (60s) — page not released"))
      }, 60000)

      const wrappedResolve = () => {
        clearTimeout(timeout)
        resolve()
      }
      g.__pwMutexQueue!.push(wrappedResolve)
    })
  }

  g.__pwMutexLocked = true

  // Ensure browser is running
  await ensureBrowser()

  if (!g.__pwPage) {
    g.__pwMutexLocked = false
    const next = g.__pwMutexQueue?.shift()
    if (next) next()
    throw new Error("[browser-manager] Browser page not available after launch")
  }

  return {
    page: g.__pwPage,
    release: () => {
      g.__pwMutexLocked = false
      const next = g.__pwMutexQueue?.shift()
      if (next) next()
    },
  }
}

/**
 * Gracefully close the browser
 */
export async function closeBrowser(): Promise<void> {
  if (g.__pwBrowser) {
    try {
      await g.__pwBrowser.close()
    } catch {
      // Already closed
    }
    g.__pwBrowser = null
    g.__pwContext = null
    g.__pwPage = null
  }
}
