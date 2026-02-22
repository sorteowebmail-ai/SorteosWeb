import type { DrawParams, KitStyle } from "./types"
import {
  STYLES,
  truncateText,
  drawLogo,
  drawWatermark,
  drawGoldOrnament,
} from "./helpers"

export function drawPost(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
): void {
  const { W, H } = params
  const s = STYLES[style]

  // Background
  s.bgDraw(ctx, W, H, params.accentColor)

  // Giveaway name — top, small
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `500 ${Math.round(W * 0.028)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.textMuted
  ctx.letterSpacing = "3px"
  ctx.fillText(
    truncateText(ctx, params.giveawayName.toUpperCase(), W * 0.85),
    W / 2,
    H * 0.10,
  )
  ctx.letterSpacing = "0px"
  ctx.restore()

  // Decorative element under name
  if (style === "elegante") {
    drawGoldOrnament(ctx, W / 2, H * 0.145, W * 0.12, s.goldAccent!)
  }

  // "GANADOR" label
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `300 ${Math.round(W * 0.024)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.labelColor
  ctx.letterSpacing = "6px"
  ctx.fillText("GANADOR", W / 2, H * 0.38)
  ctx.letterSpacing = "0px"
  ctx.restore()

  // Winner username — MASSIVE protagonist
  const username = `@${params.winner.username}`
  const len = username.length
  const fontSize = Math.round(
    len > 14 ? W * 0.09 : len > 10 ? W * 0.12 : W * 0.15,
  )
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = s.textPrimary
  if (style === "elegante") {
    ctx.shadowColor = "rgba(212,175,55,0.3)"
    ctx.shadowBlur = 30
  }
  ctx.fillText(truncateText(ctx, username, W * 0.90), W / 2, H * 0.50)
  ctx.restore()

  // Logo — bottom-left, small
  if (params.logoImage) {
    const logoSize = Math.round(W * 0.055)
    const border = style === "elegante" ? "rgba(212,175,55,0.3)" : undefined
    drawLogo(
      ctx,
      params.logoImage,
      W * 0.05,
      H * 0.88 - logoSize / 2,
      logoSize,
      6,
      border,
    )
  }

  // Metadata line — bottom center
  const metaParts = [
    params.dateString,
    `${params.totalComments.toLocaleString("es-AR")} comentarios`,
    params.verificationId,
  ]
  const metaLine = metaParts.join("  \u00B7  ")

  if (style === "corporativo") {
    // Card-style metadata
    const cardW = W * 0.86
    const cardH = H * 0.065
    const cardX = (W - cardW) / 2
    const cardY = H * 0.82

    ctx.save()
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, 8)
    ctx.fill()
    ctx.strokeStyle = "#E0E0E0"
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.018)}px system-ui, sans-serif`
    ctx.fillStyle = "#888888"
    ctx.fillText(metaLine, W / 2, cardY + cardH / 2)
    ctx.restore()
  } else {
    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.020)}px system-ui, sans-serif`
    ctx.fillStyle = s.textMuted
    ctx.fillText(metaLine, W / 2, H * 0.92)
    ctx.restore()
  }

  // Watermark
  if (params.isFreeGiveaway) {
    drawWatermark(ctx, W, H, s.isLight)
  }
}
