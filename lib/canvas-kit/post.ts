import type { DrawParams, KitStyle } from "./types"
import {
  STYLES,
  truncateText,
  drawLogo,
  drawWatermark,
  drawGoldOrnament,
  drawGanadorBadge,
  drawConfetti,
  drawAccentGlow,
  drawWinnerName,
  hexToRgba,
} from "./helpers"

export function drawPost(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
): void {
  const { W, H } = params
  const s = STYLES[style]

  // ── Background ─────────────────────────────────
  s.bgDraw(ctx, W, H, params.accentColor)

  // ── Confetti — scattered across ────────────────
  drawConfetti(ctx, W, H, s.confettiColors, 45, 77, {
    yMin: 0,
    yMax: H * 0.20,
    sizeRange: [3, 11],
    alphaRange: [0.06, 0.20],
  })
  drawConfetti(ctx, W, H, s.confettiColors, 30, 123, {
    yMin: H * 0.75,
    yMax: H,
    sizeRange: [3, 9],
    alphaRange: [0.04, 0.14],
  })

  // ── Giveaway name — top ────────────────────────
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `500 ${Math.round(W * 0.026)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.textMuted
  ctx.letterSpacing = "3px"
  ctx.fillText(
    truncateText(ctx, params.giveawayName.toUpperCase(), W * 0.85),
    W / 2,
    H * 0.10,
  )
  ctx.letterSpacing = "0px"
  ctx.restore()

  // ── Decorative element under name ──────────────
  if (style === "elegante") {
    drawGoldOrnament(ctx, W / 2, H * 0.145, W * 0.14, s.goldAccent!)
  }

  // ── Accent glow ────────────────────────────────
  drawAccentGlow(
    ctx,
    W / 2,
    H * 0.50,
    W * 0.45,
    style === "elegante" ? "#D4AF37" : params.accentColor,
    style === "elegante" ? 0.07 : 0.05,
  )

  // ── "GANADOR" badge ────────────────────────────
  drawGanadorBadge(ctx, W / 2, H * 0.36, W, style, params.accentColor)

  // ── Winner username — MASSIVE protagonist ──────
  drawWinnerName(
    ctx,
    params.winner.username,
    W / 2,
    H * 0.50,
    W,
    style,
    params.accentColor,
  )

  // ── Logo — bottom-left ─────────────────────────
  if (params.logoImage) {
    const logoSize = Math.round(W * 0.055)
    const border =
      style === "elegante"
        ? "rgba(212,175,55,0.3)"
        : style === "corporativo"
          ? params.accentColor
          : undefined
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

  // ── Metadata line — bottom ─────────────────────
  const metaParts = [
    params.dateString,
    `${params.totalComments.toLocaleString("es-AR")} comentarios`,
    params.verificationId,
  ]
  const metaLine = metaParts.join("  \u00B7  ")

  if (style === "corporativo") {
    drawCorporativoMetaCard(ctx, metaLine, W, H, params.accentColor)
  } else {
    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.018)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = s.textMuted
    ctx.fillText(metaLine, W / 2, H * 0.92)
    ctx.restore()
  }

  // ── Watermark ──────────────────────────────────
  if (params.isFreeGiveaway) {
    drawWatermark(ctx, W, H, s.isLight)
  }
}

// ── Corporativo meta card ───────────────────────────

function drawCorporativoMetaCard(
  ctx: CanvasRenderingContext2D,
  metaLine: string,
  W: number,
  H: number,
  _accent: string,
): void {
  const cardW = W * 0.88
  const cardH = H * 0.065
  const cardX = (W - cardW) / 2
  const cardY = H * 0.82
  const radius = 10

  // Card shadow
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.05)"
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 2
  ctx.fillStyle = "#FFFFFF"
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, radius)
  ctx.fill()
  ctx.restore()

  // Card border
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, radius)
  ctx.strokeStyle = "#E8E8E8"
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `400 ${Math.round(W * 0.017)}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = "#888888"
  ctx.fillText(metaLine, W / 2, cardY + cardH / 2)
  ctx.restore()
}
