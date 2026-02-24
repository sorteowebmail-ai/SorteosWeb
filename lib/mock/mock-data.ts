/**
 * Mock data generators for development without Apify credits.
 * Activated by MOCK_SCRAPER=true in .env.local
 */

import type { Comment } from "../scrape-types"

// ── Config ───────────────────────────────────────────────────

export const MOCK_ENABLED = process.env.MOCK_SCRAPER === "true"

// ── Username pool ────────────────────────────────────────────

const USERNAMES = [
  "mariagomez_", "juanpe_ok", "cande.fit", "sofi.luna", "tomi_rios",
  "agus.rocks", "mica_delvalle", "facu.martinez", "luli_style", "nico_wanderer",
  "vale.crafts", "mati.code", "caro_bloom", "santi_beats", "flor_vintage",
  "gaston.run", "pilar.art", "nacho_foodie", "brenda.yoga", "leo_gamer",
  "rocio_travel", "martin_photo", "dani.reads", "pau_fitness", "seba.music",
  "camii_nails", "fede_asado", "joha.design", "rodri.skate", "melu_bakes",
  "eze_surf", "lau_wanderlust", "thiago_dev", "abi_moda", "gonza.rides",
  "karen_vibes", "lucas.films", "nati_pets", "rami.drift", "ailin.handmade",
]

// ── Comment text pool ────────────────────────────────────────

const TOP_LEVEL_TEXTS = [
  "Participoo!! @{m1} @{m2}",
  "@{m1} @{m2} vamos!! quiero ganar",
  "Que genial el sorteo! @{m1} @{m2} vengan",
  "@{m1} @{m2} participo!",
  "yo quieroo @{m1} @{m2}",
  "Sorteo increible!! @{m1} @{m2} @{m3}",
  "@{m1} @{m2} dale dale",
  "participo participo! @{m1} @{m2}",
  "ojala me toque!! @{m1} @{m2}",
  "@{m1} @{m2} vamos q se puede!",
  "quiero!! @{m1} @{m2}",
  "@{m1} @{m2} suerte para todos",
  "participo con toda! @{m1} @{m2}",
  "@{m1} mira este sorteo @{m2}",
  "ahi va! @{m1} @{m2} @{m3}",
  "buenisimooo @{m1} @{m2}",
  "@{m1} @{m2} lo necesitoo",
  "que hermoso sorteo! @{m1} @{m2}",
  "yo yo yo! @{m1} @{m2}",
  "@{m1} @{m2} dale que sale!",
]

const REPLY_TEXTS = [
  "dale!! ya participe",
  "vamosss",
  "jaja gracias por el tag!",
  "ahi lo comparto!",
  "yo tambien quiero!",
  "genial!",
  "suerte!!",
  "ojala nos toque",
  "listo!",
  "ya me anote",
]

// ── Helpers ──────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function fillMentions(text: string): string {
  const mentions = pickN(USERNAMES, 3)
  return text
    .replace("{m1}", mentions[0])
    .replace("{m2}", mentions[1])
    .replace("{m3}", mentions[2] || mentions[0])
}

// ── Mock PostInfo ────────────────────────────────────────────

// Placeholder images from picsum.photos (public, no auth needed)
const MOCK_IMAGES = [
  "https://picsum.photos/seed/sorteo1/640/640",
  "https://picsum.photos/seed/sorteo2/640/640",
  "https://picsum.photos/seed/sorteo3/640/640",
  "https://picsum.photos/seed/sorteo4/640/640",
  "https://picsum.photos/seed/sorteo5/640/640",
]

const MOCK_POSTS = [
  {
    ownerUsername: "tienda.demo",
    caption: "SORTEO! Ganate este pack increible. Participar es facil: 1) Segui esta cuenta 2) Dale like 3) Etiqueta a 2 amigos. Mucha suerte!",
    likeCount: 4521,
  },
  {
    ownerUsername: "marca.ejemplo",
    caption: "MEGA SORTEO por nuestro aniversario! Reglas: seguir + like + etiquetar 2 amigos. Sorteamos el viernes!",
    likeCount: 8932,
  },
  {
    ownerUsername: "influencer.test",
    caption: "Les traigo un sorteazo! 3 ganadores se llevan este premio. Participen etiquetando amigos!",
    likeCount: 12450,
  },
]

export interface MockPostInfo {
  shortcode: string
  mediaId: string
  ownerUsername: string
  caption: string
  displayUrl: string
  commentCount: number
  topLevelCommentCount: number
  likeCount: number
  isVideo: boolean
}

export function generateMockPostInfo(shortcode: string): MockPostInfo {
  const post = pick(MOCK_POSTS)
  const topLevel = randomInt(200, 1500)
  const replies = Math.floor(topLevel * (0.3 + Math.random() * 0.5))
  return {
    shortcode,
    mediaId: `mock_${Date.now()}_${randomInt(100000, 999999)}`,
    ownerUsername: post.ownerUsername,
    caption: post.caption,
    displayUrl: pick(MOCK_IMAGES),
    commentCount: topLevel + replies,
    topLevelCommentCount: topLevel,
    likeCount: post.likeCount + randomInt(-500, 500),
    isVideo: Math.random() > 0.7,
  }
}

// ── Mock Comments ────────────────────────────────────────────

export function generateMockComments(totalCount: number): Comment[] {
  const comments: Comment[] = []

  // ~70% top-level, ~30% replies
  const topLevelCount = Math.ceil(totalCount * 0.7)
  const replyCount = totalCount - topLevelCount

  const now = Date.now()
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000

  // Generate top-level comments
  for (let i = 0; i < topLevelCount; i++) {
    const commentId = `mock_${i}_${randomInt(100000000, 999999999)}`
    const username = pick(USERNAMES)
    const ts = threeDaysAgo + Math.random() * (now - threeDaysAgo)

    comments.push({
      commentId,
      userId: `uid_${randomInt(10000, 99999)}`,
      username,
      text: fillMentions(pick(TOP_LEVEL_TEXTS)),
      createdAt: new Date(ts).toISOString(),
      parentId: null,
      childCommentCount: 0, // will be updated below
    })
  }

  // Generate replies pointing to random top-level comments
  const topLevelIds = comments.map((c) => c.commentId)
  const replyCounts = new Map<string, number>()

  for (let i = 0; i < replyCount; i++) {
    const parentId = pick(topLevelIds)
    replyCounts.set(parentId, (replyCounts.get(parentId) || 0) + 1)

    const parentComment = comments.find((c) => c.commentId === parentId)
    const parentTs = parentComment ? new Date(parentComment.createdAt).getTime() : threeDaysAgo
    const ts = parentTs + Math.random() * (now - parentTs)

    comments.push({
      commentId: `mock_reply_${i}_${randomInt(100000000, 999999999)}`,
      userId: `uid_${randomInt(10000, 99999)}`,
      username: pick(USERNAMES),
      text: pick(REPLY_TEXTS),
      createdAt: new Date(ts).toISOString(),
      parentId,
      childCommentCount: 0,
    })
  }

  // Update childCommentCount on parent comments
  for (const [parentId, count] of replyCounts) {
    const parent = comments.find((c) => c.commentId === parentId)
    if (parent) parent.childCommentCount = count
  }

  return comments
}
