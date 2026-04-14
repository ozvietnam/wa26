/**
 * WA26 Multi-Provider LLM Engine
 *
 * ┌─────────────┬───────────────────────┬──────────────────────────┐
 * │ Tier        │ Primary               │ Fallback                 │
 * ├─────────────┼───────────────────────┼──────────────────────────┤
 * │ FAST        │ Groq llama-3.1-8b     │ Gemini 2.5 Flash         │
 * │ (router,    │ $0.05/M, ~100ms       │ (existing keys)          │
 * │  care)      │ 3 keys round-robin    │                          │
 * ├─────────────┼───────────────────────┼──────────────────────────┤
 * │ HEAVY       │ Gemini 2.5 Flash      │ OpenRouter Gemini        │
 * │ (verdict,   │ $0.15/M, VN tốt      │ ($30 credit, 4 keys)     │
 * │  respond)   │ 4 keys round-robin    │                          │
 * └─────────────┴───────────────────────┴──────────────────────────┘
 *
 * Env vars:
 *   GEMINI_API_KEY=key1,key2,...
 *   GROQ_API_KEY=gsk_xxx,gsk_yyy,...
 *   OPENROUTER_API_KEY=sk-or-v1-xxx,sk-or-v1-yyy,...
 */

// === Provider Config ===
interface ProviderConfig {
  name: string
  keys: string[]
  keyIndex: number
  failedKeys: Map<number, number>
  cooldown: number
}

const providers: Record<string, ProviderConfig> = {
  gemini: {
    name: 'gemini',
    keys: (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
    keyIndex: 0,
    failedKeys: new Map(),
    cooldown: 120_000,
  },
  groq: {
    name: 'groq',
    keys: (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
    keyIndex: 0,
    failedKeys: new Map(),
    cooldown: 60_000,
  },
  openrouter: {
    name: 'openrouter',
    keys: (process.env.OPENROUTER_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
    keyIndex: 0,
    failedKeys: new Map(),
    cooldown: 60_000,
  },
}

// === Tier → Provider Chain ===
const TIER_CHAIN = {
  fast: [
    { provider: 'groq', model: 'llama-3.1-8b-instant', thinking: 0, maxTokens: 1024 },
    { provider: 'gemini', model: 'gemini-2.5-flash', thinking: 0, maxTokens: 2048 },
  ],
  heavy: [
    { provider: 'gemini', model: 'gemini-2.5-flash', thinking: 2048, maxTokens: 8192 },
    { provider: 'openrouter', model: 'google/gemini-2.0-flash-001', thinking: 0, maxTokens: 8192 },
    { provider: 'groq', model: 'llama-3.3-70b-versatile', thinking: 0, maxTokens: 8192 },
  ],
}

// === Key Rotation ===
function getNextKey(p: ProviderConfig): string | null {
  if (p.keys.length === 0) return null
  const now = Date.now()
  for (let i = 0; i < p.keys.length; i++) {
    const idx = (p.keyIndex + i) % p.keys.length
    const failedAt = p.failedKeys.get(idx)
    if (!failedAt || now - failedAt > p.cooldown) {
      p.keyIndex = (idx + 1) % p.keys.length
      return p.keys[idx]
    }
  }
  // All on cooldown — use least-recently-failed
  let oldestIdx = 0, oldestTime = Infinity
  p.failedKeys.forEach((time, idx) => { if (time < oldestTime) { oldestTime = time; oldestIdx = idx } })
  p.failedKeys.delete(oldestIdx)
  p.keyIndex = (oldestIdx + 1) % p.keys.length
  return p.keys[oldestIdx]
}

function markFailed(p: ProviderConfig, key: string) {
  const idx = p.keys.indexOf(key)
  if (idx >= 0) p.failedKeys.set(idx, Date.now())
}

// === Token Tracking ===
const usage = new Map<string, { calls: number; tokens: number; lastReset: number }>()

function trackUsage(provider: string, key: string, tokens: number) {
  const id = `${provider}:${key.slice(-6)}`
  const now = Date.now()
  const u = usage.get(id) || { calls: 0, tokens: 0, lastReset: now }
  if (now - u.lastReset > 86400000) { u.calls = 0; u.tokens = 0; u.lastReset = now }
  u.calls++; u.tokens += tokens
  usage.set(id, u)
}

// === LLM Interface ===
export interface LLMOptions {
  file?: { mimeType: string; data: string; name?: string }
  temperature?: number
  maxTokens?: number
  tier?: 'fast' | 'heavy'
  thinkingBudget?: number
  retries?: number
}

/**
 * Call LLM with automatic provider fallback chain
 */
export async function callLLM(prompt: string, _apiKey?: string, options: LLMOptions = {}): Promise<string> {
  const { tier = 'heavy', temperature = 0.2, file, retries = 1 } = options
  const chain = TIER_CHAIN[tier]
  let lastError: Error | null = null

  for (const step of chain) {
    const p = providers[step.provider]
    if (!p || p.keys.length === 0) continue

    const maxTokens = options.maxTokens ? Math.min(options.maxTokens, step.maxTokens) : step.maxTokens
    const thinking = options.thinkingBudget ?? step.thinking

    // Try each key in this provider
    for (let attempt = 0; attempt <= retries; attempt++) {
      const key = _apiKey || getNextKey(p)
      if (!key) break

      try {
        let result: string
        if (step.provider === 'gemini') {
          result = await callGemini(prompt, key, { file, temperature, maxTokens, model: step.model, thinkingBudget: thinking })
        } else {
          result = await callOpenAICompat(prompt, key, {
            temperature, maxTokens, model: step.model,
            apiUrl: step.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
            providerName: step.provider,
          })
        }

        trackUsage(step.provider, key, result.length) // approximate
        return result
      } catch (err) {
        lastError = err as Error
        const msg = lastError.message
        const isRetryable = /429|5\d\d|rate|limit|quota|leaked|RESOURCE_EXHAUSTED/i.test(msg)

        if (isRetryable) {
          console.warn(`[LLM] ${step.provider} key ...${key.slice(-6)} failed: ${msg.substring(0, 60)} — rotating`)
          markFailed(p, key)
          continue
        }
        // Non-retryable error — skip to next provider
        console.error(`[LLM] ${step.provider} non-retryable: ${msg.substring(0, 80)}`)
        break
      }
    }
    console.warn(`[LLM] ${step.provider} exhausted — falling back`)
  }

  throw lastError || new Error('All LLM providers failed')
}

// === Gemini Direct Call ===
async function callGemini(
  prompt: string, apiKey: string,
  opts: { file?: LLMOptions['file']; temperature?: number; maxTokens?: number; model?: string; thinkingBudget?: number }
): Promise<string> {
  const { file, temperature = 0.2, maxTokens = 8192, model = 'gemini-2.5-flash', thinkingBudget = 0 } = opts
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [{ text: prompt }]
  if (file?.data && file?.mimeType) parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } })

  const genConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens }
  if (thinkingBudget > 0) genConfig.thinkingConfig = { thinkingBudget }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: genConfig }),
  })

  if (!res.ok) throw new Error(`Gemini ${res.status} - ${(await res.text()).substring(0, 200)}`)

  const data = await res.json()
  const responseParts = data.candidates?.[0]?.content?.parts || []
  let text = ''
  for (const part of responseParts) {
    if (part.thought !== true && part.text) text += part.text
  }
  if (!text) text = responseParts.map((p: { text?: string }) => p.text || '').join('')

  const total = data.usageMetadata?.totalTokenCount || 0
  console.log(`[Gemini] key=...${apiKey.slice(-6)} model=${model} tokens=${total}`)
  return text.trim()
}

// === OpenAI-Compatible Call (Groq, OpenRouter) ===
async function callOpenAICompat(
  prompt: string, apiKey: string,
  opts: { temperature?: number; maxTokens?: number; model: string; apiUrl: string; providerName: string }
): Promise<string> {
  const { temperature = 0.2, maxTokens = 4096, model, apiUrl, providerName } = opts

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
  // OpenRouter requires site info
  if (providerName === 'openrouter') {
    headers['HTTP-Referer'] = 'https://wa26.vercel.app'
    headers['X-Title'] = 'WA26 HS Code Chatbot'
  }

  const res = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) throw new Error(`${providerName} ${res.status} - ${(await res.text()).substring(0, 200)}`)

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''
  const total = data.usage?.total_tokens || 0
  console.log(`[${providerName}] key=...${apiKey.slice(-6)} model=${model} tokens=${total}`)

  // Strip thinking tags (Qwen3, DeepSeek)
  return raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

// === Utilities ===
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
  const providerStatus = Object.entries(providers).map(([name, p]) => ({
    provider: name,
    totalKeys: p.keys.length,
    activeKeys: p.keys.filter((_, i) => { const f = p.failedKeys.get(i); return !f || now - f > p.cooldown }).length,
    cooldownKeys: p.keys.filter((_, i) => { const f = p.failedKeys.get(i); return f && now - f <= p.cooldown }).length,
  }))

  const tierInfo = {
    fast: TIER_CHAIN.fast.map(s => `${s.provider}/${s.model}`),
    heavy: TIER_CHAIN.heavy.map(s => `${s.provider}/${s.model}`),
  }

  const usageInfo = Array.from(usage.entries()).map(([id, u]) => ({ id, calls: u.calls, tokens: u.tokens }))

  return { providers: providerStatus, tiers: tierInfo, usage: usageInfo }
}
