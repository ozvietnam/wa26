import { callLLM, formatHistory } from './shared'
import pricingData from '../data/pricing.json'

const SYSTEM_PROMPT = `Bạn là Chuyên viên Báo giá dịch vụ hải quan.
Trả lời tiếng Việt, chuyên nghiệp, thuyết phục.

FORMAT BÁO GIÁ:
📋 YÊU CẦU KHÁCH HÀNG → 💰 BÁO GIÁ CHI TIẾT (bảng) → 📊 TỔNG → 📌 GHI CHÚ

Giá PHẢI lấy từ bảng giá — KHÔNG bịa số. Không có → "Liên hệ để báo giá".`

export async function handlePricing({
  message, history, apiKey,
}: {
  message: string; history?: Array<{ role: string; content: string }>; apiKey?: string
}) {
  const apiLog: Array<{ step: string; status: string }> = []
  const pricingContext = `BẢNG GIÁ (${(pricingData as { updated?: string }).updated}):\n${JSON.stringify((pricingData as { services?: unknown }).services)}`
  const historyText = formatHistory(history)

  const prompt = `${SYSTEM_PROMPT}\n\n${pricingContext}\n${historyText}\nKhách hàng: "${message}"\n\nTính chi phí theo bảng giá.`

  apiLog.push({ step: 'llm_pricing', status: 'calling' })
  const reply = await callLLM(prompt, undefined, { temperature: 0.1, maxTokens: 4096, tier: 'heavy' })
  apiLog[apiLog.length - 1] = { step: 'llm_pricing', status: 'done' }

  return { reply, debug: { agent: 'pricing', apiCalls: apiLog } }
}
