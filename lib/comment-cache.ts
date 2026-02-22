// File-based comment cache per shortcode
// Stores scraped comments to disk for resume and deduplication

import fs from "fs"
import path from "path"
import type { ScrapedComment } from "./scraper"

// ============================================================
// Types
// ============================================================

export interface CommentCacheFile {
  shortcode: string
  mediaId: string
  pages: number
  cursor: string | null // null = scraping complete
  comments: ScrapedComment[]
  updatedAt: number // Date.now()
  complete: boolean
}

// ============================================================
// Paths
// ============================================================

const CACHE_DIR = path.join(process.cwd(), ".cache", "comments")

function cacheFilePath(shortcode: string): string {
  // Sanitize shortcode for filesystem safety
  const safe = shortcode.replace(/[^a-zA-Z0-9_-]/g, "")
  return path.join(CACHE_DIR, `${safe}.json`)
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Read cached comments for a shortcode.
 * Returns null if no cache exists or file is corrupt.
 */
export function getCachedComments(shortcode: string): CommentCacheFile | null {
  try {
    const filePath = cacheFilePath(shortcode)
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(raw) as CommentCacheFile
  } catch {
    return null
  }
}

/**
 * Check if cache is complete and fresh (within maxAgeMs).
 * Default TTL: 30 minutes.
 */
export function isCacheComplete(
  shortcode: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): boolean {
  const cache = getCachedComments(shortcode)
  if (!cache || !cache.complete || cache.comments.length === 0) return false
  return Date.now() - cache.updatedAt < maxAgeMs
}

/**
 * Get resume point from partial cache.
 * Returns cursor and existing comments, or null if no partial cache.
 */
export function getResumePoint(
  shortcode: string,
): { cursor: string; comments: ScrapedComment[]; pages: number } | null {
  const cache = getCachedComments(shortcode)
  if (!cache || cache.complete || !cache.cursor) return null
  return {
    cursor: cache.cursor,
    comments: cache.comments,
    pages: cache.pages,
  }
}

/**
 * Append a page of comments to the cache.
 * Creates the cache file if it doesn't exist.
 * Uses atomic write (temp file + rename) to prevent corruption.
 */
export function appendToCache(
  shortcode: string,
  mediaId: string,
  page: {
    comments: ScrapedComment[]
    cursor: string | null
    complete: boolean
  },
): void {
  try {
    ensureCacheDir()

    const existing = getCachedComments(shortcode)
    const cache: CommentCacheFile = existing || {
      shortcode,
      mediaId,
      pages: 0,
      cursor: null,
      comments: [],
      updatedAt: Date.now(),
      complete: false,
    }

    // Append new comments (deduplicate by id)
    const existingIds = new Set(cache.comments.map((c) => c.id))
    for (const comment of page.comments) {
      if (!existingIds.has(comment.id)) {
        cache.comments.push(comment)
        existingIds.add(comment.id)
      }
    }

    cache.pages += 1
    cache.cursor = page.cursor
    cache.complete = page.complete
    cache.updatedAt = Date.now()

    // Atomic write: temp file + rename
    const filePath = cacheFilePath(shortcode)
    const tmpPath = filePath + ".tmp"
    fs.writeFileSync(tmpPath, JSON.stringify(cache), "utf-8")
    fs.renameSync(tmpPath, filePath)
  } catch (error) {
    // Cache is best-effort — don't crash the scraping
    console.warn("[comment-cache] Failed to write cache:", error)
  }
}

/**
 * Get cache stats without reading all comments into the response.
 */
export function getCacheStats(shortcode: string): {
  exists: boolean
  complete: boolean
  commentCount: number
  pages: number
  cursor: string | null
  ageMs: number
} | null {
  const cache = getCachedComments(shortcode)
  if (!cache) return null
  return {
    exists: true,
    complete: cache.complete,
    commentCount: cache.comments.length,
    pages: cache.pages,
    cursor: cache.cursor,
    ageMs: Date.now() - cache.updatedAt,
  }
}

/**
 * Clear cache for a specific shortcode.
 */
export function clearCache(shortcode: string): void {
  try {
    const filePath = cacheFilePath(shortcode)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // Best-effort
  }
}
