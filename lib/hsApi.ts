/**
 * HS Code Knowledge API client with Redis + Memory cache (WA26)
 */

const BASE_URL = 'https://hs-knowledge-api.vercel.app'
const CACHE_TTL = 60 * 60 * 1000
const CACHE_TTL_SECONDS = 3600
const MAX_MEMORY_CACHE = 500

const memoryCache = new Map<string, { data: unknown; time: number }>()
let redisClient: { get: (key: string) => Promise<unknown>; set: (key: string, value: unknown, opts: { ex: number }) => Promise<void> } | null = null
let redisChecked = false

const cacheStats = {
  hits: 0, misses: 0, redisHits: 0, redisErrors: 0, memoryHits: 0,
  resetTime: new Date().toISOString(),
}

function getRedis() {
  if (redisChecked) return redisClient
  redisChecked = true
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      
      const { Redis } = require('@upstash/redis')
      redisClient = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })
    }
  } catch (err) {
    console.warn('[hsApi] Redis init failed:', (err as Error).message)
    redisClient = null
  }
  return redisClient
}

async function getCached(key: string): Promise<unknown | null> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(`hs:${key}`)
      if (cached) { cacheStats.hits++; cacheStats.redisHits++; return cached }
    } catch (err) {
      console.warn(`[hsApi] Redis get failed for ${key}:`, (err as Error).message)
      cacheStats.redisErrors++
    }
  }
  const entry = memoryCache.get(key)
  if (!entry) { cacheStats.misses++; return null }
  if (Date.now() - entry.time > CACHE_TTL) { memoryCache.delete(key); cacheStats.misses++; return null }
  cacheStats.hits++; cacheStats.memoryHits++
  return entry.data
}

async function setCache(key: string, data: unknown) {
  const redis = getRedis()
  if (redis) {
    try { await redis.set(`hs:${key}`, data, { ex: CACHE_TTL_SECONDS }) } catch {}
  }
  if (memoryCache.size >= MAX_MEMORY_CACHE) {
    const oldest = memoryCache.keys().next().value
    if (oldest) memoryCache.delete(oldest)
  }
  memoryCache.set(key, { data, time: Date.now() })
}


export async function searchHS(query: string, limit = 10): Promise<any> {
  const cacheKey = `search:${query}:${limit}`
  const cached = await getCached(cacheKey)
  if (cached) return cached
  const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json()
  await setCache(cacheKey, data)
  return data
}


export async function getHSDetail(hsCode: string, fields?: string): Promise<any> {
  const cacheKey = `hs:${hsCode}:${fields || 'all'}`
  const cached = await getCached(cacheKey)
  if (cached) return cached
  let url = `${BASE_URL}/api/hs?hs=${encodeURIComponent(hsCode)}`
  if (fields) url += `&fields=${encodeURIComponent(fields)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HS detail failed: ${res.status}`)
  const data = await res.json()
  await setCache(cacheKey, data)
  return data
}


export async function getChapter(chapter: string): Promise<any> {
  const cacheKey = `chapter:${chapter}`
  const cached = await getCached(cacheKey)
  if (cached) return cached
  const res = await fetch(`${BASE_URL}/api/chapter?chapter=${chapter}`)
  if (!res.ok) throw new Error(`Chapter failed: ${res.status}`)
  const data = await res.json()
  await setCache(cacheKey, data)
  return data
}


export async function getKTCN(hsCode: string): Promise<any> {
  const cacheKey = `ktcn:${hsCode}`
  const cached = await getCached(cacheKey)
  if (cached) return cached
  const res = await fetch(`${BASE_URL}/api/kg_ktcn?hs=${encodeURIComponent(hsCode)}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.found) { await setCache(cacheKey, data); return data }
  return null
}


export async function getPrecedentByHSCode(hsCode: string): Promise<any> {
  const cacheKey = `precedent:hs:${hsCode}`
  const cached = await getCached(cacheKey)
  if (cached) return cached
  const res = await fetch(`${BASE_URL}/api/precedent?hs=${encodeURIComponent(hsCode)}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.found) { await setCache(cacheKey, data); return data }
  return null
}


export async function getPrecedentStats(): Promise<any> {
  const cacheKey = 'precedent:stats'
  const cached = await getCached(cacheKey)
  if (cached) return cached
  const res = await fetch(`${BASE_URL}/api/precedent?stats=1`)
  if (!res.ok) return null
  const data = await res.json()
  await setCache(cacheKey, data)
  return data
}

export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : '0'
  return { hitRate: `${hitRate}%`, ...cacheStats, total }
}

export function resetCacheStats() {
  cacheStats.hits = 0; cacheStats.misses = 0; cacheStats.redisHits = 0
  cacheStats.redisErrors = 0; cacheStats.memoryHits = 0
  cacheStats.resetTime = new Date().toISOString()
}
