/**
 * Shared utilities for all agents — Gemini-only (WA26)
 * Supports key rotation: GEMINI_API_KEY=key1,key2,key3
 */

const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim()
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// === Key Rotation ===
// Env: GEMINI_API_KEY=key1,key2,key3 (comma-separated)
const ALL_KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)
let keyIndex = 0

// Track failed keys with cooldown (60s)
const failedKeys = new Map<number, number>()
const KEY_COOLDOWN = 60_000

function getNextKey(): string {
  if (ALL_KEYS.length === 0) throw new Error('GEMINI_API_KEY not configured')
  if (ALL_KEYS.length === 1) return ALL_KEYS[0]

  const now = Date.now()
  // Try up to ALL_KEYS.length times to find a working key
  for (let i = 0; i < ALL_KEYS.length; i++) {
    const idx = (keyIndex + i) % ALL_KEYS.length
    const failedAt = failedKeys.get(idx)
    if (!failedAt || now - failedAt > KEY_COOLDOWN) {
      keyIndex = (idx + 1) % ALL_KEYS.length
      return ALL_KEYS[idx]
    }
  }
  // All keys on cooldown — try the oldest failed one
  keyIndex = (keyIndex + 1) % ALL_KEYS.length
  failedKeys.delete(keyIndex)
  return ALL_KEYS[keyIndex]
}

function markKeyFailed(key: string) {
  const idx = ALL_KEYS.indexOf(key)
  if (idx >= 0) failedKeys.set(idx, Date.now())
}

export interface LLMOptions {
  file?: { mimeType: string; data: string; name?: string }
  temperature?: number
  maxTokens?: number
  model?: string
  retries?: number
}

/**
 * Call Gemini API with key rotation
 * On 429/rate limit → rotate to next key and retry
 */
export async function callLLM(prompt: string, _apiKey?: string, options: LLMOptions = {}): Promise<string> {
  const {
    file,
    temperature = 0.2,
    maxTokens = 8192,
    retries = 2,
  } = options

  const maxAttempts = Math.max(retries + 1, ALL_KEYS.length)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = _apiKey || getNextKey()
    try {
      const result = await callGemini(prompt, apiKey, { file, temperature, maxTokens })
      return result
    } catch (err) {
      lastError = err as Error
      const isRateLimit = /429|RESOURCE_EXHAUSTED|rate|limit|quota/i.test(lastError.message)
      const isServerError = /5\d\d|overloaded/i.test(lastError.message)

      if (isRateLimit) {
        console.warn(`[Gemini] Key ${apiKey.slice(-6)} rate limited — rotating`)
        markKeyFailed(apiKey)
        // No delay for key rotation, try next key immediately
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

async function callGemini(
  prompt: string,
  apiKey: string,
  options: { file?: LLMOptions['file']; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { file, temperature = 0.2, maxTokens = 12000 } = options
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [{ text: prompt }]

  if (file?.data && file?.mimeType) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } })
  }

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }),
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

  console.log(`[Gemini] key=...${apiKey.slice(-6)} finish=${finishReason} output=${result.length}chars thinking=${usage.thoughtsTokenCount || 0} total=${usage.totalTokenCount || 0}`)

  if (finishReason === 'MAX_TOKENS' && result.length > 0) {
    console.warn(`[Gemini] TRUNCATED at ${result.length} chars`)
  }

  return result
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
export function parseGeminiJSON<T = unknown>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as T
}

/**
 * Format conversation history for prompt
 */
export function formatHistory(history: Array<{ role: string; content: string }> | undefined, maxTurns = 6): string {
  if (!history?.length) return ''
  return '\nLỊCH SỬ HỘI THOẠI:\n' + history.slice(-maxTurns).map(h =>
    `${h.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${h.content.substring(0, 500)}`
  ).join('\n') + '\n'
}

/**
 * Get key pool status (for /api/stats)
 */
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
  }
}
