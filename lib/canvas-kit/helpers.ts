import type { KitStyle, StyleConfig } from "./types"

export const STYLES: Record<KitStyle, StyleConfig> = {
  minimal: {
    bgDraw: (ctx, W, H) => {
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, W, H)
    },
    textPrimary: "#1a1a1a",
    textSecondary: "#666666",
    textMuted: "#BBBBBB",
    labelColor: "#999999",
    separatorColor: "#E5E5E5",
    isLight: true,
    fontFamily: "system-ui, sans-serif",
  },
  elegante: {
    bgDraw: (ctx, W, H) => {
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, "#1a1a2e")
      grad.addColorStop(0.5, "#12122a")
      grad.addColorStop(1, "#0f0f23")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      const glow = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, W * 0.45)
      glow.addColorStop(0, "rgba(212,175,55,0.06)")
      glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
    },
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.6)",
    textMuted: "rgba(255,255,255,0.35)",
    labelColor: "rgba(255,255,255,0.4)",
    separatorColor: "#D4AF37",
    isLight: false,
    fontFamily: 'Georgia, "Times New Roman", serif',
    goldAccent: "#D4AF37",
  },
  corporativo: {
    bgDraw: (ctx, W, H, accent) => {
      ctx.fillStyle = "#F5F5F7"
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, W, H * 0.05)
    },
    textPrimary: "#1a1a1a",
    textSecondary: "#666666",
    textMuted: "#AAAAAA",
    labelColor: "#888888",
    separatorColor: "#E0E0E0",
    isLight: true,
    fontFamily: "system-ui, sans-serif",
  },
}

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
  ctx.font = `400 ${Math.round(W * 0.022)}px system-ui, sans-serif`
  ctx.fillStyle = isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)"
  ctx.fillText("Generado con SorteosWeb", W / 2, H - W * 0.03)
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
  ctx.beginPath()
  ctx.moveTo(cx - halfWidth, cy)
  ctx.lineTo(cx + halfWidth, cy)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.translate(cx, cy)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = color
  ctx.fillRect(-3.5, -3.5, 7, 7)
  ctx.restore()
}

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

export function heroFontSize(username: string, W: number, scale = 1): number {
  const len = username.length
  const base = len > 14 ? W * 0.08 : len > 10 ? W * 0.10 : W * 0.12
  return Math.round(base * scale)
}
