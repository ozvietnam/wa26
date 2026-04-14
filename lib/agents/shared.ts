/**
 * Shared utilities for all agents — Gemini (WA26)
 *
 * KEY STRATEGY (paid keys — optimize cost):
 * ┌─────────────┬──────────────────┬────────────────────────────────────┐
 * │ Tier        │ Model            │ Used for                           │
 * ├─────────────┼──────────────────┼────────────────────────────────────┤
 * │ FAST        │ gemini-2.5-flash │ Router, keyword extraction, care   │
 * │ HEAVY       │ gemini-2.5-flash │ Verdict, respond, regulation       │
 * └─────────────┴──────────────────┴────────────────────────────────────┘
 *
 * Key rotation: GEMINI_API_KEY=key1,key2,key3 (comma-separated)
 * On 429 → rotate to next key immediately, 120s cooldown per key
 */

// === Model Config ===
const MODEL_FAST = (process.env.GEMINI_MODEL_FAST || 'gemini-2.5-flash').trim()
const MODEL_HEAVY = (process.env.GEMINI_MODEL_HEAVY || 'gemini-2.5-flash').trim()

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// === Key Pool ===
const ALL_KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)
let keyIndex = 0

const failedKeys = new Map<number, number>()
const KEY_COOLDOWN = 120_000 // 2 min for paid keys

// Token usage tracking per key
const keyUsage = new Map<number, { tokens: number; calls: number; lastReset: number }>()

function getNextKey(): string {
  if (ALL_KEYS.length === 0) throw new Error('GEMINI_API_KEY not configured')
  if (ALL_KEYS.length === 1) return ALL_KEYS[0]

  const now = Date.now()
  for (let i = 0; i < ALL_KEYS.length; i++) {
    const idx = (keyIndex + i) % ALL_KEYS.length
    const failedAt = failedKeys.get(idx)
    if (!failedAt || now - failedAt > KEY_COOLDOWN) {
      keyIndex = (idx + 1) % ALL_KEYS.length
      return ALL_KEYS[idx]
    }
  }
  // All on cooldown — use least-recently-failed
  let oldestIdx = 0, oldestTime = Infinity
  failedKeys.forEach((time, idx) => { if (time < oldestTime) { oldestTime = time; oldestIdx = idx } })
  failedKeys.delete(oldestIdx)
  keyIndex = (oldestIdx + 1) % ALL_KEYS.length
  return ALL_KEYS[oldestIdx]
}

function markKeyFailed(key: string) {
  const idx = ALL_KEYS.indexOf(key)
  if (idx >= 0) failedKeys.set(idx, Date.now())
}

function trackKeyUsage(key: string, tokens: number) {
  const idx = ALL_KEYS.indexOf(key)
  if (idx < 0) return
  const now = Date.now()
  const usage = keyUsage.get(idx) || { tokens: 0, calls: 0, lastReset: now }
  // Reset daily
  if (now - usage.lastReset > 86400000) {
    usage.tokens = 0; usage.calls = 0; usage.lastReset = now
  }
  usage.tokens += tokens
  usage.calls += 1
  keyUsage.set(idx, usage)
}

// === LLM Interface ===
export interface LLMOptions {
  file?: { mimeType: string; data: string; name?: string }
  temperature?: number
  maxTokens?: number
  tier?: 'fast' | 'heavy' // Controls model selection
  thinkingBudget?: number  // Override default (fast=0, heavy=2048)
  retries?: number
}

/**
 * Call Gemini API with key rotation + tiered model selection
 *
 * tier='fast'  → gemini-2.5-flash (router, keywords, care)
 *   Low tokens, high speed, cheap
 *
 * tier='heavy' → gemini-2.5-flash (verdict, respond, regulation)
 *   Higher tokens, thinking enabled
 */
export async function callLLM(prompt: string, _apiKey?: string, options: LLMOptions = {}): Promise<string> {
  const {
    file,
    temperature = 0.2,
    maxTokens = 8192,
    tier = 'heavy',
    retries = 2,
  } = options

  const model = tier === 'fast' ? MODEL_FAST : MODEL_HEAVY
  const thinkingBudget = options.thinkingBudget ?? (tier === 'fast' ? 0 : 2048)
  const effectiveMaxTokens = tier === 'fast' ? Math.min(maxTokens, 2048) : maxTokens

  const maxAttempts = Math.max(retries + 1, ALL_KEYS.length)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = _apiKey || getNextKey()
    try {
      const result = await callGemini(prompt, apiKey, {
        file, temperature, maxTokens: effectiveMaxTokens, model, thinkingBudget,
      })
      return result
    } catch (err) {
      lastError = err as Error
      const msg = lastError.message
      const isRateLimit = /429|RESOURCE_EXHAUSTED|rate|limit|quota/i.test(msg)
      const isServerError = /5\d\d|overloaded/i.test(msg)
      const isLeaked = /leaked|403/i.test(msg)

      if (isRateLimit || isLeaked) {
        console.warn(`[Gemini] Key ...${apiKey.slice(-6)} ${isLeaked ? 'LEAKED' : 'rate limited'} — rotating`)
        markKeyFailed(apiKey)
        continue
      }
      if (isServerError && attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw lastError
}

// === Core Gemini Call ===
async function callGemini(
  prompt: string,
  apiKey: string,
  options: {
    file?: LLMOptions['file']; temperature?: number; maxTokens?: number
    model?: string; thinkingBudget?: number
  } = {}
): Promise<string> {
  const { file, temperature = 0.2, maxTokens = 8192, model = MODEL_HEAVY, thinkingBudget = 2048 } = options
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [{ text: prompt }]

  if (file?.data && file?.mimeType) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } })
  }

  const genConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
  }
  // Only add thinking for heavy tier
  if (thinkingBudget > 0) {
    genConfig.thinkingConfig = { thinkingBudget }
  }

  const url = `${API_BASE}/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: genConfig }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${res.status} - ${err}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0] || {}
  const responseParts = candidate.content?.parts || []
  const finishReason = candidate.finishReason

  let responseText = ''
  for (const part of responseParts) {
    if (part.thought !== true && part.text) {
      responseText += part.text
    }
  }
  if (!responseText) {
    responseText = responseParts.map((p: { text?: string }) => p.text || '').join('')
  }

  const result = responseText.trim()
  const usage = data.usageMetadata || {}
  const totalTokens = usage.totalTokenCount || 0

  // Track usage
  trackKeyUsage(apiKey, totalTokens)

  console.log(`[Gemini] key=...${apiKey.slice(-6)} model=${model} tier=${thinkingBudget > 0 ? 'heavy' : 'fast'} tokens=${totalTokens} output=${result.length}chars`)

  if (finishReason === 'MAX_TOKENS') {
    console.warn(`[Gemini] TRUNCATED at ${result.length} chars`)
  }

  return result
}

// === Utility Functions ===
export function parseGeminiJSON<T = unknown>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as T
}

export function formatHistory(history: Array<{ role: string; content: string }> | undefined, maxTurns = 6): string {
  if (!history?.length) return ''
  return '\nLỊCH SỬ HỘI THOẠI:\n' + history.slice(-maxTurns).map(h =>
    `${h.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${h.content.substring(0, 500)}`
  ).join('\n') + '\n'
}

export function getKeyPoolStatus() {
  const now = Date.now()
  return {
    totalKeys: ALL_KEYS.length,
    activeKeys: ALL_KEYS.filter((_, i) => {
      const failedAt = failedKeys.get(i)
      return !failedAt || now - failedAt > KEY_COOLDOWN
    }).length,
    cooldownKeys: ALL_KEYS.filter((_, i) => {
      const failedAt = failedKeys.get(i)
      return failedAt && now - failedAt <= KEY_COOLDOWN
    }).length,
    model: { fast: MODEL_FAST, heavy: MODEL_HEAVY },
    usage: Array.from(keyUsage.entries()).map(([idx, u]) => ({
      key: `...${ALL_KEYS[idx]?.slice(-6) || '?'}`,
      calls: u.calls,
      tokens: u.tokens,
    })),
  }
}
