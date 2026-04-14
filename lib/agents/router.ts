import { callLLM } from './shared'
import routerConfig from '../data/router-config.json'

const CLASSIFY_PROMPT = `Bạn là bộ phân loại intent cho chatbot hải quan Việt Nam.
Phân loại tin nhắn người dùng vào ĐÚNG 1 trong 4 loại:

1. **customs** — Hỏi về mã HS, phân loại hàng hóa, thuế suất, C/O, xuất xứ, ECUS.
   QUAN TRỌNG: Bất kỳ TÊN SẢN PHẨM / MÔ TẢ HÀNG HÓA nào đều là customs.
   VD: "máy bơm nước", "cảm biến nhiệt độ", "ốc vít thép", kèm ảnh/file sản phẩm

2. **care** — CHỈ khi chào hỏi, hướng dẫn sử dụng chatbot, cảm ơn, phàn nàn

3. **pricing** — Hỏi báo giá dịch vụ, chi phí khai báo, cước tàu, phí ủy thác

4. **regulation** — Hỏi về văn bản pháp luật, thông tư, nghị định, quy định hải quan

NGUYÊN TẮC: Nếu không chắc → chọn customs
Trả lời ĐÚNG JSON:
{"intent": "customs|care|pricing|regulation", "confidence": 0.0-1.0}`

interface RouterConfig {
  keywords: Record<string, string[]>
  thresholds: {
    keywordMatchConfidence: number
    shortMessageMaxWords: number
    shortMessageConfidence: number
  }
  defaultShortMessageAgent: string
  fallbackAgent: string
}

function getConfig(): RouterConfig {
  return routerConfig as RouterConfig
}

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
}

export interface ClassifyResult {
  intent: string
  confidence: number
  method: string
}

export async function classifyIntent(
  message: string,
  _apiKey?: string,
  history?: Array<{ role: string; content: string }>
): Promise<ClassifyResult> {
  const config = getConfig()
  const { keywords, thresholds } = config
  const lowerMsg = message.toLowerCase()
  const normalizedMsg = removeDiacritics(lowerMsg)

  for (const [intent, kwList] of Object.entries(keywords)) {
    if (kwList.some((k: string) => {
      const normalizedK = removeDiacritics(k.toLowerCase())
      const pattern = new RegExp(`(?:^|\\s|[,;.!?])${normalizedK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[,;.!?])`, 'i')
      return pattern.test(` ${normalizedMsg} `) || pattern.test(` ${lowerMsg} `)
    })) {
      return { intent, confidence: thresholds.keywordMatchConfidence, method: 'keyword' }
    }
  }

  const wordCount = message.trim().split(/\s+/).length
  if (wordCount <= thresholds.shortMessageMaxWords) {
    return {
      intent: config.defaultShortMessageAgent || 'customs',
      confidence: thresholds.shortMessageConfidence,
      method: 'short_message',
    }
  }

  const historyHint = history?.length
    ? `\nContext: cuộc hội thoại trước đó về ${history[history.length - 1]?.content?.substring(0, 100)}`
    : ''

  const prompt = `${CLASSIFY_PROMPT}\n${historyHint}\nTin nhắn: "${message}"`

  try {
    const raw = await callLLM(prompt, _apiKey, { temperature: 0.1, maxTokens: 100 })
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    const validIntents = Object.keys(keywords)
    if (!validIntents.includes(result.intent)) {
      return { intent: config.fallbackAgent, confidence: 0.5, method: 'llm_fallback' }
    }

    return {
      intent: result.intent,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      method: 'llm',
    }
  } catch {
    return { intent: config.fallbackAgent, confidence: 0.3, method: 'error_fallback' }
  }
}
