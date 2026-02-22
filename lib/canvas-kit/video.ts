import type { DrawParams, KitStyle } from "./types"
import {
  STYLES,
  truncateText,
  drawLogo,
  drawWatermark,
  heroFontSize,
} from "./helpers"

const TOTAL_DURATION = 7.0
const FPS = 30
const FADE_DURATION = 0.3

// ── Scene 1: "RESULTADOS DEL SORTEO" ─────────────

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

  // Logo centered
  if (params.logoImage) {
    const size = Math.round(W * 0.12)
    ctx.globalAlpha = alpha
    drawLogo(ctx, params.logoImage, W / 2 - size / 2, H * 0.30, size, 12)
    ctx.globalAlpha = 1
  }

  // Title
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `300 ${Math.round(W * 0.038)}px ${s.fontFamily}`
  ctx.fillStyle = s.textSecondary
  ctx.letterSpacing = "3px"
  ctx.fillText("RESULTADOS DEL SORTEO", W / 2, params.logoImage ? H * 0.50 : H * 0.48)
  ctx.letterSpacing = "0px"
  ctx.restore()
}

// ── Scene 2: Giveaway name ────────────────────────

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

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${Math.round(W * 0.060)}px ${s.fontFamily}`
  ctx.fillStyle = s.textPrimary
  ctx.fillText(
    truncateText(ctx, params.giveawayName.toUpperCase(), W * 0.85),
    W / 2,
    H * 0.48,
  )
  ctx.restore()
}

// ── Scene 3: Winner reveal ────────────────────────

function drawScene3(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  progress: number,
): void {
  const { W, H } = params
  const s = STYLES[style]
  s.bgDraw(ctx, W, H, params.accentColor)

  // "GANADOR" label
  const labelAlpha = Math.min(progress * 4, 1)
  ctx.save()
  ctx.globalAlpha = labelAlpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `300 ${Math.round(W * 0.030)}px ${s.fontFamily}`
  ctx.fillStyle = style === "elegante" ? s.goldAccent! : s.labelColor
  ctx.letterSpacing = "8px"
  ctx.fillText("GANADOR", W / 2, H * 0.36)
  ctx.letterSpacing = "0px"
  ctx.restore()

  // Username with scale reveal
  const revealProgress = Math.max(0, (progress - 0.15) / 0.85)
  const nameAlpha = Math.min(revealProgress * 2.5, 1)
  const scale = 0.85 + 0.15 * Math.min(revealProgress * 2, 1)

  const username = `@${params.winner.username}`
  const fontSize = heroFontSize(username, W)

  ctx.save()
  ctx.translate(W / 2, H * 0.48)
  ctx.scale(scale, scale)
  ctx.globalAlpha = nameAlpha
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = s.textPrimary
  if (style === "elegante") {
    ctx.shadowColor = "rgba(212,175,55,0.3)"
    ctx.shadowBlur = 30
  }
  ctx.fillText(truncateText(ctx, username, W * 0.85), 0, 0)
  ctx.restore()
}

// ── Scene 4: Details ──────────────────────────────

function drawScene4(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  progress: number,
): void {
  const { W, H } = params
  const s = STYLES[style]
  s.bgDraw(ctx, W, H, params.accentColor)

  // Winner stays visible (smaller, moved up)
  const username = `@${params.winner.username}`
  const fontSize = heroFontSize(username, W, 0.85)
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = s.textPrimary
  if (style === "elegante") {
    ctx.shadowColor = "rgba(212,175,55,0.3)"
    ctx.shadowBlur = 20
  }
  ctx.fillText(truncateText(ctx, username, W * 0.85), W / 2, H * 0.38)
  ctx.restore()

  // Details fade in with stagger
  const details = [
    params.dateString,
    `${params.totalComments.toLocaleString("es-AR")} comentarios analizados`,
    params.verificationId,
  ]
  const baseY = H * 0.50
  const lineH = H * 0.045

  details.forEach((text, i) => {
    const staggerDelay = i * 0.15
    const lineAlpha = Math.max(0, Math.min((progress - staggerDelay) * 4, 1))
    ctx.save()
    ctx.globalAlpha = lineAlpha
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `400 ${Math.round(W * 0.026)}px system-ui, sans-serif`
    ctx.fillStyle = s.textMuted
    ctx.fillText(text, W / 2, baseY + i * lineH)
    ctx.restore()
  })

  // Logo at bottom
  if (params.logoImage) {
    const logoAlpha = Math.max(0, Math.min((progress - 0.5) * 3, 1))
    const logoSize = Math.round(W * 0.07)
    ctx.save()
    ctx.globalAlpha = logoAlpha
    drawLogo(ctx, params.logoImage, W / 2 - logoSize / 2, H * 0.72, logoSize, 8)
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

// ── Scene timeline ────────────────────────────────

const SCENES = [
  { start: 0.0, end: 1.5, draw: drawScene1 },
  { start: 1.5, end: 3.0, draw: drawScene2 },
  { start: 3.0, end: 5.0, draw: drawScene3 },
  { start: 5.0, end: 7.0, draw: drawScene4 },
]

// ── Public: draw a single video frame ─────────────

export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  params: DrawParams,
  style: KitStyle,
  currentTime: number,
): void {
  const idx = SCENES.findIndex((sc) => currentTime >= sc.start && currentTime < sc.end)

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

// ── Public: record video as WebM Blob ─────────────

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

// ── Public: check if video recording is supported ─

export function isVideoSupported(): boolean {
  if (typeof document === "undefined") return false
  const testCanvas = document.createElement("canvas")
  return typeof testCanvas.captureStream === "function" && typeof MediaRecorder !== "undefined"
}
