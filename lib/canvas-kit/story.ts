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

export function drawStory(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
): void {
  const { W, H } = params
  const s = STYLES[style]

  // ── Background ─────────────────────────────────
  s.bgDraw(ctx, W, H, params.accentColor)

  // ── Confetti decoration ────────────────────────
  drawConfetti(ctx, W, H, s.confettiColors, 60, 42, {
    yMin: 0,
    yMax: H * 0.25,
    sizeRange: [4, 14],
    alphaRange: [0.06, 0.22],
  })
  drawConfetti(ctx, W, H, s.confettiColors, 40, 99, {
    yMin: H * 0.65,
    yMax: H,
    sizeRange: [3, 10],
    alphaRange: [0.04, 0.15],
  })

  // ── Logo — top-left ────────────────────────────
  if (params.logoImage) {
    const size = Math.round(W * 0.085)
    const border =
      style === "elegante"
        ? "rgba(212,175,55,0.3)"
        : style === "corporativo"
          ? params.accentColor
          : undefined
    drawLogo(ctx, params.logoImage, W * 0.06, H * 0.038, size, 10, border)
  }

  // ── Giveaway name — centered ───────────────────
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `600 ${Math.round(W * 0.030)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.textSecondary
  ctx.letterSpacing = "4px"
  ctx.fillText(
    truncateText(ctx, params.giveawayName.toUpperCase(), W * 0.8),
    W / 2,
    H * 0.12,
  )
  ctx.letterSpacing = "0px"
  ctx.restore()

  // ── Separator under name ───────────────────────
  if (style === "elegante") {
    drawGoldOrnament(ctx, W / 2, H * 0.155, W * 0.18, s.goldAccent!)
  } else {
    // Subtle gradient line
    ctx.save()
    const lineGrad = ctx.createLinearGradient(W * 0.15, 0, W * 0.85, 0)
    lineGrad.addColorStop(0, "transparent")
    lineGrad.addColorStop(0.3, s.separatorColor)
    lineGrad.addColorStop(0.7, s.separatorColor)
    lineGrad.addColorStop(1, "transparent")
    ctx.beginPath()
    ctx.moveTo(W * 0.15, H * 0.155)
    ctx.lineTo(W * 0.85, H * 0.155)
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // ── Accent glow behind winner ──────────────────
  drawAccentGlow(
    ctx,
    W / 2,
    H * 0.40,
    W * 0.5,
    style === "elegante" ? "#D4AF37" : params.accentColor,
    style === "elegante" ? 0.08 : 0.06,
  )

  // ── "GANADOR" badge ────────────────────────────
  drawGanadorBadge(ctx, W / 2, H * 0.30, W, style, params.accentColor)

  // ── Winner username — HERO ─────────────────────
  drawWinnerName(
    ctx,
    params.winner.username,
    W / 2,
    H * 0.40,
    W,
    style,
    params.accentColor,
  )

  // ── Lower section ──────────────────────────────
  if (style === "elegante") {
    drawGoldOrnament(ctx, W / 2, H * 0.52, W * 0.18, s.goldAccent!)
    drawEleganteMetadata(ctx, params, W, H)
  } else if (style === "corporativo") {
    drawCorporativoDataCard(ctx, params, W, H)
  } else {
    drawMinimalMetadata(ctx, params, W, H)
  }

  // ── Watermark ──────────────────────────────────
  if (params.isFreeGiveaway) {
    drawWatermark(ctx, W, H, s.isLight)
  }
}

// ── Minimal metadata lines ──────────────────────────

function drawMinimalMetadata(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  W: number,
  H: number,
): void {
  const s = STYLES.minimal

  // Thin separator
  ctx.save()
  const lineGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0)
  lineGrad.addColorStop(0, "transparent")
  lineGrad.addColorStop(0.3, s.separatorColor)
  lineGrad.addColorStop(0.7, s.separatorColor)
  lineGrad.addColorStop(1, "transparent")
  ctx.beginPath()
  ctx.moveTo(W * 0.2, H * 0.54)
  ctx.lineTo(W * 0.8, H * 0.54)
  ctx.strokeStyle = lineGrad
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // Metadata items with icons
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `400 ${Math.round(W * 0.022)}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = s.textMuted

  const spacing = H * 0.035
  const baseY = H * 0.59

  ctx.fillText(params.dateString, W / 2, baseY)
  ctx.fillText(
    `${params.totalComments.toLocaleString("es-AR")} comentarios analizados`,
    W / 2,
    baseY + spacing,
  )

  // Verification ID with accent
  ctx.font = `500 ${Math.round(W * 0.020)}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = hexToRgba(params.accentColor, 0.5)
  ctx.fillText(params.verificationId, W / 2, baseY + spacing * 2)

  ctx.restore()
}

// ── Elegante metadata ───────────────────────────────

function drawEleganteMetadata(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  W: number,
  H: number,
): void {
  const s = STYLES.elegante

  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `400 ${Math.round(W * 0.022)}px ${s.fontFamily}`
  ctx.fillStyle = s.textMuted

  const spacing = H * 0.035
  const baseY = H * 0.58

  ctx.fillText(params.dateString, W / 2, baseY)
  ctx.fillText(
    `${params.totalComments.toLocaleString("es-AR")} comentarios analizados`,
    W / 2,
    baseY + spacing,
  )

  // Gold verification ID
  ctx.font = `500 ${Math.round(W * 0.020)}px ${s.fontFamily}`
  ctx.fillStyle = "rgba(212,175,55,0.5)"
  ctx.fillText(params.verificationId, W / 2, baseY + spacing * 2)

  ctx.restore()
}

// ── Corporativo data card ───────────────────────────

function drawCorporativoDataCard(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  W: number,
  H: number,
): void {
  const margin = W * 0.07
  const cardW = W - margin * 2
  const cardH = H * 0.14
  const cardY = H * 0.54
  const radius = 14

  // Card shadow
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.06)"
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 4
  ctx.fillStyle = "#FFFFFF"
  ctx.beginPath()
  ctx.roundRect(margin, cardY, cardW, cardH, radius)
  ctx.fill()
  ctx.restore()

  // Card border
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(margin, cardY, cardW, cardH, radius)
  ctx.strokeStyle = "#E8E8E8"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // 3 stat columns
  const stats = [
    {
      value: params.totalComments.toLocaleString("es-AR"),
      label: "Comentarios",
    },
    {
      value: params.filteredCount.toLocaleString("es-AR"),
      label: "Validos",
    },
    { value: params.verificationId, label: "Verificacion" },
  ]
  const colW = cardW / 3

  stats.forEach((stat, i) => {
    const cx = margin + colW * i + colW / 2

    // Divider between columns
    if (i > 0) {
      ctx.save()
      const divGrad = ctx.createLinearGradient(
        0,
        cardY + cardH * 0.2,
        0,
        cardY + cardH * 0.8,
      )
      divGrad.addColorStop(0, "transparent")
      divGrad.addColorStop(0.5, "#E0E0E0")
      divGrad.addColorStop(1, "transparent")
      ctx.beginPath()
      ctx.moveTo(margin + colW * i, cardY + cardH * 0.2)
      ctx.lineTo(margin + colW * i, cardY + cardH * 0.8)
      ctx.strokeStyle = divGrad
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }

    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Value
    ctx.font = `700 ${Math.round(W * 0.026)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = "#1a1a1a"
    ctx.fillText(stat.value, cx, cardY + cardH * 0.40)

    // Label
    ctx.font = `400 ${Math.round(W * 0.016)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = "#888888"
    ctx.fillText(stat.label, cx, cardY + cardH * 0.65)

    ctx.restore()
  })

  // Date below card
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `400 ${Math.round(W * 0.019)}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = "#AAAAAA"
  ctx.fillText(params.dateString, W / 2, cardY + cardH + H * 0.025)
  ctx.restore()
}
