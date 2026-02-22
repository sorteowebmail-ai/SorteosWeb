export type KitFormat = "story" | "post" | "video"
export type KitStyle = "minimal" | "elegante" | "corporativo"

export const FORMAT_DIMS: Record<KitFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1080 },
  video: { w: 1080, h: 1920 },
}

export interface DrawParams {
  W: number
  H: number
  winner: { username: string }
  giveawayName: string
  accentColor: string
  logoImage: HTMLImageElement | null
  isFreeGiveaway: boolean
  totalComments: number
  filteredCount: number
  verificationId: string
  dateString: string
}

export interface StyleConfig {
  bgDraw: (ctx: CanvasRenderingContext2D, W: number, H: number, accent: string) => void
  textPrimary: string
  textSecondary: string
  textMuted: string
  labelColor: string
  separatorColor: string
  isLight: boolean
  fontFamily: string
  goldAccent?: string
}
