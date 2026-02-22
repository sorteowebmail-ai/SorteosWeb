import type { DrawParams, KitStyle } from "./types"
import {
  STYLES,
  truncateText,
  drawLogo,
  drawWatermark,
  drawGoldOrnament,
  heroFontSize,
} from "./helpers"

export function drawStory(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
): void {
  const { W, H } = params
  const s = STYLES[style]

  // Background
  s.bgDraw(ctx, W, H, params.accentColor)

  // Logo — top-left, 8% of W
  if (params.logoImage) {
    const size = Math.round(W * 0.08)
    const border = style === "elegante" ? "rgba(212,175,55,0.3)" : undefined
    drawLogo(ctx, params.logoImage, W * 0.06, H * 0.04, size, 8, border)
  }

  // Giveaway name — centered
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `600 ${Math.round(W * 0.032)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.textSecondary
  ctx.letterSpacing = "4px"
  ctx.fillText(
    truncateText(ctx, params.giveawayName.toUpperCase(), W * 0.8),
    W / 2,
    H * 0.12,
  )
  ctx.letterSpacing = "0px"
  ctx.restore()

  // Separator under name
  if (style === "elegante") {
    drawGoldOrnament(ctx, W / 2, H * 0.15, W * 0.15, s.goldAccent!)
  } else {
    ctx.beginPath()
    ctx.moveTo(W * 0.2, H * 0.15)
    ctx.lineTo(W * 0.8, H * 0.15)
    ctx.strokeStyle = s.separatorColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // "GANADOR" label
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `300 ${Math.round(W * 0.028)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.labelColor
  ctx.letterSpacing = "6px"
  ctx.fillText("GANADOR", W / 2, H * 0.32)
  ctx.letterSpacing = "0px"
  ctx.restore()

  // Winner username — HERO
  const username = `@${params.winner.username}`
  const fontSize = heroFontSize(username, W)
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = s.textPrimary
  if (style === "elegante") {
    ctx.shadowColor = "rgba(212,175,55,0.3)"
    ctx.shadowBlur = 30
  }
  ctx.fillText(truncateText(ctx, username, W * 0.88), W / 2, H * 0.42)
  ctx.restore()

  // Lower separator
  if (style === "elegante") {
    drawGoldOrnament(ctx, W / 2, H * 0.55, W * 0.15, s.goldAccent!)
  } else if (style === "corporativo") {
    drawCorporativoDataCard(ctx, params, W, H)
  } else {
    ctx.beginPath()
    ctx.moveTo(W * 0.25, H * 0.55)
    ctx.lineTo(W * 0.75, H * 0.55)
    ctx.strokeStyle = s.separatorColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Metadata lines (minimal & elegante)
  if (style !== "corporativo") {
    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.024)}px system-ui, sans-serif`
    ctx.fillStyle = s.textMuted

    const spacing = H * 0.035
    ctx.fillText(params.dateString, W / 2, H * 0.60)
    ctx.fillText(
      `${params.totalComments.toLocaleString("es-AR")} comentarios analizados`,
      W / 2,
      H * 0.60 + spacing,
    )
    ctx.fillText(params.verificationId, W / 2, H * 0.60 + spacing * 2)
    ctx.restore()
  }

  // Watermark
  if (params.isFreeGiveaway) {
    drawWatermark(ctx, W, H, s.isLight)
  }
}

// ── Corporativo data card ──────────────────────────

function drawCorporativoDataCard(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  W: number,
  H: number,
): void {
  const margin = W * 0.08
  const cardW = W - margin * 2
  const cardH = H * 0.13
  const cardY = H * 0.56

  // Card bg
  ctx.save()
  ctx.fillStyle = "#FFFFFF"
  ctx.beginPath()
  ctx.roundRect(margin, cardY, cardW, cardH, 12)
  ctx.fill()
  ctx.strokeStyle = "#E0E0E0"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // 3 stat columns
  const stats = [
    { value: params.totalComments.toLocaleString("es-AR"), label: "Comentarios" },
    { value: params.filteredCount.toLocaleString("es-AR"), label: "Validos" },
    { value: params.verificationId, label: "Verificacion" },
  ]
  const colW = cardW / 3

  stats.forEach((stat, i) => {
    const cx = margin + colW * i + colW / 2

    // Divider between columns
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(margin + colW * i, cardY + cardH * 0.2)
      ctx.lineTo(margin + colW * i, cardY + cardH * 0.8)
      ctx.strokeStyle = "#E0E0E0"
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Value
    ctx.font = `700 ${Math.round(W * 0.028)}px system-ui, sans-serif`
    ctx.fillStyle = "#1a1a1a"
    ctx.fillText(stat.value, cx, cardY + cardH * 0.40)

    // Label
    ctx.font = `400 ${Math.round(W * 0.018)}px system-ui, sans-serif`
    ctx.fillStyle = "#888888"
    ctx.fillText(stat.label, cx, cardY + cardH * 0.65)

    ctx.restore()
  })

  // Date below card
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `400 ${Math.round(W * 0.020)}px system-ui, sans-serif`
  ctx.fillStyle = "#AAAAAA"
  ctx.fillText(params.dateString, W / 2, cardY + cardH + H * 0.025)
  ctx.restore()
}
