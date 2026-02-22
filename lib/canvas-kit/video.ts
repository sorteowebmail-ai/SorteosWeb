import type { DrawParams, KitStyle } from "./types"
import {
  STYLES,
  truncateText,
  drawLogo,
  drawWatermark,
  drawGanadorBadge,
  drawConfetti,
  drawAccentGlow,
  heroFontSize,
  hexToRgba,
} from "./helpers"

const TOTAL_DURATION = 7.0
const FPS = 30
const FADE_DURATION = 0.35

// ── Scene 1: Logo + "RESULTADOS DEL SORTEO" ────────

function drawScene1(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  progress: number,
): void {
  const { W, H } = params
  const s = STYLES[style]
  s.bgDraw(ctx, W, H, params.accentColor)

  const alpha = Math.min(progress * 2.5, 1)

  // Logo centered with scale animation
  if (params.logoImage) {
    const size = Math.round(W * 0.14)
    const scale = 0.8 + 0.2 * Math.min(progress * 3, 1)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(W / 2, H * 0.35)
    ctx.scale(scale, scale)
    drawLogo(
      ctx,
      params.logoImage,
      -size / 2,
      -size / 2,
      size,
      14,
      style === "elegante" ? "rgba(212,175,55,0.3)" : undefined,
    )
    ctx.restore()
  }

  // Title text
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `300 ${Math.round(W * 0.035)}px ${s.fontFamily}`
  ctx.fillStyle = s.textSecondary
  ctx.letterSpacing = "4px"
  ctx.fillText(
    "RESULTADOS DEL SORTEO",
    W / 2,
    params.logoImage ? H * 0.52 : H * 0.48,
  )
  ctx.letterSpacing = "0px"
  ctx.restore()
}

// ── Scene 2: Giveaway name ──────────────────────────

function drawScene2(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  progress: number,
): void {
  const { W, H } = params
  const s = STYLES[style]
  s.bgDraw(ctx, W, H, params.accentColor)

  const alpha = Math.min(progress * 3, 1)
  const slideY = (1 - Math.min(progress * 2, 1)) * H * 0.02

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${Math.round(W * 0.055)}px ${s.fontFamily}`
  ctx.fillStyle = s.textPrimary
  ctx.fillText(
    truncateText(ctx, params.giveawayName.toUpperCase(), W * 0.85),
    W / 2,
    H * 0.48 + slideY,
  )
  ctx.restore()

  // Subtitle with participant count
  const subtitleAlpha = Math.max(0, Math.min((progress - 0.4) * 3, 1))
  if (subtitleAlpha > 0) {
    ctx.save()
    ctx.globalAlpha = subtitleAlpha
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.024)}px ${s.fontFamily}`
    ctx.fillStyle = s.textMuted
    ctx.fillText(
      `${params.totalComments.toLocaleString("es-AR")} participantes`,
      W / 2,
      H * 0.56,
    )
    ctx.restore()
  }
}

// ── Scene 3: Winner reveal with confetti burst ──────

function drawScene3(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  progress: number,
): void {
  const { W, H } = params
  const s = STYLES[style]
  s.bgDraw(ctx, W, H, params.accentColor)

  // Confetti burst — fades in with progress
  const confettiAlpha = Math.min(progress * 2, 1)
  if (confettiAlpha > 0) {
    ctx.save()
    ctx.globalAlpha = confettiAlpha
    drawConfetti(ctx, W, H, s.confettiColors, 80, 42, {
      yMin: 0,
      yMax: H * 0.3,
      sizeRange: [5, 16],
      alphaRange: [0.10, 0.35],
    })
    drawConfetti(ctx, W, H, s.confettiColors, 50, 99, {
      yMin: H * 0.65,
      yMax: H,
      sizeRange: [4, 12],
      alphaRange: [0.08, 0.25],
    })
    ctx.restore()
  }

  // Accent glow behind name
  const glowAlpha = Math.min(progress * 2, 1)
  drawAccentGlow(
    ctx,
    W / 2,
    H * 0.46,
    W * 0.5,
    style === "elegante" ? "#D4AF37" : params.accentColor,
    0.12 * glowAlpha,
  )

  // "GANADOR" badge fade-in
  const labelAlpha = Math.min(progress * 4, 1)
  ctx.save()
  ctx.globalAlpha = labelAlpha
  drawGanadorBadge(ctx, W / 2, H * 0.34, W, style, params.accentColor)
  ctx.restore()

  // Username with scale reveal
  const revealProgress = Math.max(0, (progress - 0.15) / 0.85)
  const nameAlpha = Math.min(revealProgress * 2.5, 1)
  const scale = 0.85 + 0.15 * Math.min(revealProgress * 2, 1)

  const username = `@${params.winner.username}`
  const fontSize = heroFontSize(username, W)

  ctx.save()
  ctx.translate(W / 2, H * 0.46)
  ctx.scale(scale, scale)
  ctx.globalAlpha = nameAlpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`

  if (style === "elegante") {
    ctx.shadowColor = "rgba(212,175,55,0.35)"
    ctx.shadowBlur = 40
    ctx.fillStyle = "#FFFFFF"
  } else {
    ctx.shadowColor = hexToRgba(params.accentColor, 0.15)
    ctx.shadowBlur = 25
    ctx.fillStyle = s.textPrimary
  }

  ctx.fillText(truncateText(ctx, username, W * 0.85), 0, 0)
  ctx.restore()
}

// ── Scene 4: Details + final frame ──────────────────

function drawScene4(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  progress: number,
): void {
  const { W, H } = params
  const s = STYLES[style]
  s.bgDraw(ctx, W, H, params.accentColor)

  // Persistent confetti (subtle)
  ctx.save()
  ctx.globalAlpha = 0.8
  drawConfetti(ctx, W, H, s.confettiColors, 50, 42, {
    yMin: 0,
    yMax: H * 0.25,
    sizeRange: [4, 12],
    alphaRange: [0.06, 0.20],
  })
  drawConfetti(ctx, W, H, s.confettiColors, 35, 99, {
    yMin: H * 0.70,
    yMax: H,
    sizeRange: [3, 10],
    alphaRange: [0.05, 0.16],
  })
  ctx.restore()

  // Accent glow
  drawAccentGlow(
    ctx,
    W / 2,
    H * 0.38,
    W * 0.45,
    style === "elegante" ? "#D4AF37" : params.accentColor,
    0.06,
  )

  // "GANADOR" badge stays but muted
  ctx.save()
  ctx.globalAlpha = 0.7
  drawGanadorBadge(ctx, W / 2, H * 0.28, W, style, params.accentColor)
  ctx.restore()

  // Winner stays visible (smaller, moved up)
  const username = `@${params.winner.username}`
  const fontSize = heroFontSize(username, W, 0.82)
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`

  if (style === "elegante") {
    ctx.shadowColor = "rgba(212,175,55,0.25)"
    ctx.shadowBlur = 25
    ctx.fillStyle = "#FFFFFF"
  } else {
    ctx.shadowColor = hexToRgba(params.accentColor, 0.10)
    ctx.shadowBlur = 15
    ctx.fillStyle = s.textPrimary
  }

  ctx.fillText(truncateText(ctx, username, W * 0.85), W / 2, H * 0.38)
  ctx.restore()

  // Details fade in with stagger + slide
  const details = [
    params.dateString,
    `${params.totalComments.toLocaleString("es-AR")} comentarios analizados`,
    params.verificationId,
  ]
  const baseY = H * 0.51
  const lineH = H * 0.042

  details.forEach((text, i) => {
    const staggerDelay = i * 0.15
    const lineAlpha = Math.max(0, Math.min((progress - staggerDelay) * 4, 1))
    const slideY = (1 - lineAlpha) * H * 0.01

    ctx.save()
    ctx.globalAlpha = lineAlpha
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.024)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle =
      i === 2
        ? style === "elegante"
          ? "rgba(212,175,55,0.5)"
          : hexToRgba(params.accentColor, 0.5)
        : s.textMuted
    ctx.fillText(text, W / 2, baseY + i * lineH + slideY)
    ctx.restore()
  })

  // Logo at bottom
  if (params.logoImage) {
    const logoAlpha = Math.max(0, Math.min((progress - 0.5) * 3, 1))
    const logoSize = Math.round(W * 0.07)
    ctx.save()
    ctx.globalAlpha = logoAlpha
    drawLogo(
      ctx,
      params.logoImage,
      W / 2 - logoSize / 2,
      H * 0.70,
      logoSize,
      8,
    )
    ctx.restore()
  }

  // Watermark
  if (params.isFreeGiveaway) {
    const wmAlpha = Math.max(0, Math.min((progress - 0.6) * 3, 1))
    ctx.save()
    ctx.globalAlpha = wmAlpha
    drawWatermark(ctx, W, H, s.isLight)
    ctx.restore()
  }
}

// ── Scene timeline ──────────────────────────────────

const SCENES = [
  { start: 0.0, end: 1.5, draw: drawScene1 },
  { start: 1.5, end: 3.0, draw: drawScene2 },
  { start: 3.0, end: 5.0, draw: drawScene3 },
  { start: 5.0, end: 7.0, draw: drawScene4 },
]

// ── Public: draw a single video frame ───────────────

export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  currentTime: number,
): void {
  const idx = SCENES.findIndex(
    (sc) => currentTime >= sc.start && currentTime < sc.end,
  )

  if (idx === -1) {
    // After last scene: hold final frame
    const last = SCENES[SCENES.length - 1]
    last.draw(ctx, params, style, 1)
    return
  }

  const scene = SCENES[idx]
  const duration = scene.end - scene.start
  const progress = (currentTime - scene.start) / duration
  const timeIntoScene = currentTime - scene.start

  // Cross-fade transition
  if (idx > 0 && timeIntoScene < FADE_DURATION) {
    const fadeProgress = timeIntoScene / FADE_DURATION
    const prev = SCENES[idx - 1]

    ctx.save()
    ctx.globalAlpha = 1 - fadeProgress
    prev.draw(ctx, params, style, 1)
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = fadeProgress
    scene.draw(ctx, params, style, progress)
    ctx.restore()
  } else {
    scene.draw(ctx, params, style, progress)
  }
}

// ── Public: record video as WebM Blob ───────────────

export async function recordVideo(
  canvas: HTMLCanvasElement,
  params: DrawParams,
  style: KitStyle,
): Promise<Blob> {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas 2d context")

  const stream = canvas.captureStream(FPS)
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm"

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }))
    }
    recorder.onerror = () => reject(new Error("MediaRecorder error"))

    recorder.start()

    const totalFrames = Math.ceil(TOTAL_DURATION * FPS)
    let frame = 0

    const renderFrame = () => {
      const t = frame / FPS
      drawVideoFrame(ctx, params, style, t)
      frame++

      if (frame <= totalFrames) {
        requestAnimationFrame(renderFrame)
      } else {
        setTimeout(() => recorder.stop(), 500)
      }
    }

    renderFrame()
  })
}

// ── Public: check if video recording is supported ───

export function isVideoSupported(): boolean {
  if (typeof document === "undefined") return false
  const testCanvas = document.createElement("canvas")
  return (
    typeof testCanvas.captureStream === "function" &&
    typeof MediaRecorder !== "undefined"
  )
}
