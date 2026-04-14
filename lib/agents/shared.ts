/**
 * Shared utilities for all agents — Gemini-only (WA26)
 */

const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim()
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export interface LLMOptions {
  file?: { mimeType: string; data: string; name?: string }
  temperature?: number
  maxTokens?: number
  model?: string
  retries?: number
}

/**
 * Call Gemini API
 */
export async function callLLM(prompt: string, _apiKey?: string, options: LLMOptions = {}): Promise<string> {
  const {
    file,
    temperature = 0.2,
    maxTokens = 8192,
    retries = 1,
  } = options

  const apiKey = process.env.GEMINI_API_KEY || _apiKey
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callGemini(prompt, apiKey, { file, temperature, maxTokens })
    } catch (err) {
      lastError = err as Error
      if (attempt < retries && /429|5\d\d|rate|limit|overloaded/i.test(lastError.message)) {
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

  console.log(`[Gemini] finish=${finishReason} output=${result.length}chars thinking=${usage.thoughtsTokenCount || 0} total=${usage.totalTokenCount || 0}`)

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
