import type { KitStyle, StyleConfig } from "./types"

// ── Seeded PRNG for deterministic confetti ──────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Style definitions ───────────────────────────────

export const STYLES: Record<KitStyle, StyleConfig> = {
  minimal: {
    bgDraw: (ctx, W, H, accent) => {
      // Clean white base
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, W, H)

      // Subtle accent gradient at top edge
      const topGrad = ctx.createLinearGradient(0, 0, W, 0)
      topGrad.addColorStop(0, accent)
      topGrad.addColorStop(1, shiftHue(accent, 40))
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, W, Math.round(H * 0.004))

      // Very subtle radial glow from center
      const glow = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.6)
      glow.addColorStop(0, hexToRgba(accent, 0.03))
      glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
    },
    textPrimary: "#111111",
    textSecondary: "#555555",
    textMuted: "#AAAAAA",
    labelColor: "#999999",
    separatorColor: "#E8E8E8",
    isLight: true,
    fontFamily: "system-ui, -apple-system, sans-serif",
    confettiColors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"],
  },
  elegante: {
    bgDraw: (ctx, W, H) => {
      // Deep dark gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, "#0f0f1a")
      grad.addColorStop(0.3, "#141428")
      grad.addColorStop(0.7, "#0e0e20")
      grad.addColorStop(1, "#080815")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Golden glow from center
      const glow = ctx.createRadialGradient(W / 2, H * 0.40, 0, W / 2, H * 0.40, W * 0.55)
      glow.addColorStop(0, "rgba(212,175,55,0.08)")
      glow.addColorStop(0.5, "rgba(212,175,55,0.03)")
      glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Subtle corner vignettes
      const corners = [
        [0, 0],
        [W, 0],
        [0, H],
        [W, H],
      ]
      for (const [cx, cy] of corners) {
        const v = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5)
        v.addColorStop(0, "rgba(0,0,0,0.15)")
        v.addColorStop(1, "transparent")
        ctx.fillStyle = v
        ctx.fillRect(0, 0, W, H)
      }
    },
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.65)",
    textMuted: "rgba(255,255,255,0.30)",
    labelColor: "rgba(255,255,255,0.35)",
    separatorColor: "#D4AF37",
    isLight: false,
    fontFamily: 'Georgia, "Times New Roman", serif',
    goldAccent: "#D4AF37",
    confettiColors: [
      "#D4AF37",
      "#F5D76E",
      "#C0A033",
      "rgba(255,255,255,0.5)",
      "#E8C547",
      "#B8960C",
    ],
  },
  corporativo: {
    bgDraw: (ctx, W, H, accent) => {
      // Light professional background
      ctx.fillStyle = "#F7F7FA"
      ctx.fillRect(0, 0, W, H)

      // Accent gradient bar at top
      const barH = Math.round(H * 0.045)
      const grad = ctx.createLinearGradient(0, 0, W, 0)
      grad.addColorStop(0, accent)
      grad.addColorStop(1, shiftHue(accent, 30))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, barH)

      // Subtle grid pattern
      ctx.strokeStyle = "rgba(0,0,0,0.02)"
      ctx.lineWidth = 1
      const step = Math.round(W * 0.05)
      for (let x = step; x < W; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, barH)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = barH + step; y < H; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
    },
    textPrimary: "#1a1a1a",
    textSecondary: "#555555",
    textMuted: "#999999",
    labelColor: "#777777",
    separatorColor: "#E0E0E0",
    isLight: true,
    fontFamily: "system-ui, -apple-system, sans-serif",
    confettiColors: ["#6B3FA0", "#E040FB", "#2979FF", "#00BFA5", "#FF6D00", "#FFD600"],
  },
}

// ── Color utils ─────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return `rgba(${r},${g},${b},${alpha})`
}

function shiftHue(hex: string, degrees: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const s = max === 0 ? 0 : (max - min) / max
  const v = max

  if (max !== min) {
    const d = max - min
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }

  h = (h + degrees / 360) % 1
  if (h < 0) h += 1

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let rr: number, gg: number, bb: number
  switch (i % 6) {
    case 0: rr = v; gg = t; bb = p; break
    case 1: rr = q; gg = v; bb = p; break
    case 2: rr = p; gg = v; bb = t; break
    case 3: rr = p; gg = q; bb = v; break
    case 4: rr = t; gg = p; bb = v; break
    default: rr = v; gg = p; bb = q; break
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0")
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

export { hexToRgba, shiftHue }

// ── Text helpers ────────────────────────────────────

export function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + "\u2026").width > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + "\u2026"
}

export function heroFontSize(username: string, W: number, scale = 1): number {
  const len = username.length
  const base = len > 18 ? W * 0.065 : len > 14 ? W * 0.08 : len > 10 ? W * 0.10 : W * 0.12
  return Math.round(base * scale)
}

// ── Drawing components ──────────────────────────────

export function drawLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  radius: number,
  borderColor?: string,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, radius)
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
  if (borderColor) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, size, size, radius)
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  isLight: boolean,
): void {
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"
  ctx.font = `500 ${Math.round(W * 0.020)}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)"
  ctx.fillText("sorteosweb.com.ar", W / 2, H - W * 0.025)
  ctx.restore()
}

export function drawGoldOrnament(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfWidth: number,
  color: string,
): void {
  ctx.save()

  // Left line with fade
  const leftGrad = ctx.createLinearGradient(cx - halfWidth, cy, cx - 8, cy)
  leftGrad.addColorStop(0, "transparent")
  leftGrad.addColorStop(1, color)
  ctx.beginPath()
  ctx.moveTo(cx - halfWidth, cy)
  ctx.lineTo(cx - 8, cy)
  ctx.strokeStyle = leftGrad
  ctx.lineWidth = 1
  ctx.stroke()

  // Right line with fade
  const rightGrad = ctx.createLinearGradient(cx + 8, cy, cx + halfWidth, cy)
  rightGrad.addColorStop(0, color)
  rightGrad.addColorStop(1, "transparent")
  ctx.beginPath()
  ctx.moveTo(cx + 8, cy)
  ctx.lineTo(cx + halfWidth, cy)
  ctx.strokeStyle = rightGrad
  ctx.lineWidth = 1
  ctx.stroke()

  // Center diamond
  ctx.translate(cx, cy)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = color
  ctx.fillRect(-4, -4, 8, 8)

  ctx.restore()
}

/**
 * Draw "GANADOR" as a styled pill badge
 */
export function drawGanadorBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  W: number,
  style: KitStyle,
  accent: string,
): void {
  const s = STYLES[style]
  const fontSize = Math.round(W * 0.024)
  const text = "GANADOR"

  ctx.save()
  ctx.font = `600 ${fontSize}px ${s.fontFamily}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.letterSpacing = "6px"
  const metrics = ctx.measureText(text)
  const textW = metrics.width + 20 // extra for letter spacing
  ctx.letterSpacing = "0px"

  const pillW = textW + W * 0.06
  const pillH = fontSize * 2.6
  const pillX = cx - pillW / 2
  const pillY = cy - pillH / 2

  if (style === "elegante") {
    // Gold bordered pill
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
    ctx.strokeStyle = s.goldAccent!
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.font = `600 ${fontSize}px ${s.fontFamily}`
    ctx.fillStyle = s.goldAccent!
    ctx.letterSpacing = "6px"
    ctx.fillText(text, cx, cy)
    ctx.letterSpacing = "0px"
  } else if (style === "corporativo") {
    // Solid accent pill
    const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY)
    grad.addColorStop(0, accent)
    grad.addColorStop(1, shiftHue(accent, 25))
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
    ctx.fillStyle = grad
    ctx.fill()

    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = "#FFFFFF"
    ctx.letterSpacing = "6px"
    ctx.fillText(text, cx, cy)
    ctx.letterSpacing = "0px"
  } else {
    // Minimal: outlined with accent
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
    ctx.strokeStyle = hexToRgba(accent, 0.4)
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = hexToRgba(accent, 0.04)
    ctx.fill()

    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = accent
    ctx.letterSpacing = "6px"
    ctx.fillText(text, cx, cy)
    ctx.letterSpacing = "0px"
  }

  ctx.restore()
}

/**
 * Draw deterministic confetti particles.
 * Seed ensures same pattern on re-render.
 */
export function drawConfetti(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  colors: string[],
  count: number,
  seed: number = 42,
  options: {
    yMin?: number
    yMax?: number
    sizeRange?: [number, number]
    alphaRange?: [number, number]
  } = {},
): void {
  const rand = mulberry32(seed)
  const yMin = options.yMin ?? 0
  const yMax = options.yMax ?? H
  const [sMin, sMax] = options.sizeRange ?? [3, 10]
  const [aMin, aMax] = options.alphaRange ?? [0.08, 0.30]

  ctx.save()
  for (let i = 0; i < count; i++) {
    const x = rand() * W
    const y = yMin + rand() * (yMax - yMin)
    const size = sMin + rand() * (sMax - sMin)
    const color = colors[Math.floor(rand() * colors.length)]
    const rotation = rand() * Math.PI * 2
    const alpha = aMin + rand() * (aMax - aMin)

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.globalAlpha = alpha
    ctx.fillStyle = color

    const shape = rand()
    if (shape > 0.65) {
      // Circle
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (shape > 0.3) {
      // Rectangle
      ctx.fillRect(-size / 2, -size / 3, size, size * 0.6)
    } else {
      // Diamond
      ctx.beginPath()
      ctx.moveTo(0, -size / 2)
      ctx.lineTo(size / 3, 0)
      ctx.lineTo(0, size / 2)
      ctx.lineTo(-size / 3, 0)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }
  ctx.restore()
}

/**
 * Draw an accent glow circle behind the winner name area.
 */
export function drawAccentGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number = 0.12,
): void {
  ctx.save()
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  grad.addColorStop(0, hexToRgba(color, alpha))
  grad.addColorStop(0.6, hexToRgba(color, alpha * 0.3))
  grad.addColorStop(1, "transparent")
  ctx.fillStyle = grad
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  ctx.restore()
}

/**
 * Draw winner username with glow effect.
 */
export function drawWinnerName(
  ctx: CanvasRenderingContext2D,
  username: string,
  cx: number,
  cy: number,
  W: number,
  style: KitStyle,
  accent: string,
  fontScale: number = 1,
): void {
  const s = STYLES[style]
  const displayName = `@${username}`
  const fontSize = heroFontSize(displayName, W, fontScale)

  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`

  if (style === "elegante") {
    // Gold shadow glow
    ctx.shadowColor = "rgba(212,175,55,0.35)"
    ctx.shadowBlur = 40
    ctx.fillStyle = "#FFFFFF"
  } else if (style === "corporativo") {
    ctx.fillStyle = s.textPrimary
  } else {
    // Minimal: subtle accent shadow
    ctx.shadowColor = hexToRgba(accent, 0.15)
    ctx.shadowBlur = 25
    ctx.fillStyle = s.textPrimary
  }

  ctx.fillText(truncateText(ctx, displayName, W * 0.88), cx, cy)
  ctx.restore()
}

// ── Generator helpers ───────────────────────────────

export function generateVerificationId(postUrl: string): string {
  const input = `${postUrl}|${new Date().toISOString().slice(0, 10)}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return "SRW-" + Math.abs(hash).toString(16).padStart(8, "0").toUpperCase()
}

export function formatDate(): string {
  return new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
