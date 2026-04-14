/**
 * Session Store — Conversation memory (WA26)
 * Upstash Redis in production, in-memory Map for local dev
 */

interface RedisLike {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown, opts?: { ex: number }) => Promise<void>
  del: (key: string) => Promise<void>
  scan: (cursor: number, opts: { match: string; count: number }) => Promise<[number, string[]]>
}

let redisClient: RedisLike | null = null
let redisChecked = false

function getRedis(): RedisLike | null {
  if (redisChecked) return redisClient
  redisChecked = true
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      
      const { Redis } = require('@upstash/redis')
      redisClient = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    }
  } catch { redisClient = null }
  return redisClient
}

const memStore = new Map<string, unknown>()
const SESSION_TTL = parseInt(process.env.SESSION_TTL_DAYS || '7', 10) * 86400
const META_TTL = parseInt(process.env.META_TTL_DAYS || '7', 10) * 86400

interface SessionEntry {
  role: string; content: string; agent: string | null; timestamp: string
}

interface SessionMeta {
  created: string; lastActive: string; messageCount: number; extracted?: boolean
}

export async function saveMessages(
  sessionId: string, userMsg: string, assistantMsg: string, agent: string
): Promise<void> {
  const timestamp = new Date().toISOString()
  const entries: SessionEntry[] = [
    { role: 'user', content: userMsg, agent: null, timestamp },
    { role: 'assistant', content: assistantMsg, agent, timestamp },
  ]
  const redis = getRedis()
  const msgKey = `session:${sessionId}:messages`
  const metaKey = `session:${sessionId}:meta`

  if (redis) {
    const existing = ((await redis.get(msgKey)) as SessionEntry[]) || []
    existing.push(...entries)
    await redis.set(msgKey, existing.slice(-20), { ex: SESSION_TTL })
    const meta = ((await redis.get(metaKey)) as SessionMeta) || { created: timestamp, messageCount: 0, lastActive: timestamp }
    meta.lastActive = timestamp
    meta.messageCount = (meta.messageCount || 0) + 2
    await redis.set(metaKey, meta, { ex: META_TTL })
  } else {
    const existing = (memStore.get(msgKey) as SessionEntry[]) || []
    existing.push(...entries)
    memStore.set(msgKey, existing.slice(-20))
    const meta = (memStore.get(metaKey) as SessionMeta) || { created: timestamp, messageCount: 0, lastActive: timestamp }
    meta.lastActive = timestamp
    meta.messageCount = (meta.messageCount || 0) + 2
    memStore.set(metaKey, meta)
  }
}

export async function getSessionMessages(sessionId: string): Promise<SessionEntry[]> {
  const redis = getRedis()
  const msgKey = `session:${sessionId}:messages`
  if (redis) return ((await redis.get(msgKey)) as SessionEntry[]) || []
  return (memStore.get(msgKey) as SessionEntry[]) || []
}

export async function saveFeedback(
  sessionId: string, messageIndex: number, rating: string
): Promise<void> {
  const redis = getRedis()
  const entry = { sessionId, messageIndex, rating, timestamp: new Date().toISOString() }
  const key = 'pipeline:user_feedback'
  if (redis) {
    const existing = ((await redis.get(key)) as unknown[]) || []
    existing.push(entry)
    await redis.set(key, existing, { ex: 604800 })
  } else {
    const existing = (memStore.get(key) as unknown[]) || []
    existing.push(entry)
    memStore.set(key, existing)
  }
}
