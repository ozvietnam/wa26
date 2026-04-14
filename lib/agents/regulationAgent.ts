import { callLLM, formatHistory } from './shared'
import { getKTCN } from '../hsApi'
import regulationsData from '../data/regulations.json'

const SYSTEM_PROMPT = `Bạn là Chuyên viên Pháp luật Hải quan.
Trả lời tiếng Việt, chính xác, dễ hiểu.

FORMAT: 📜 VĂN BẢN LIÊN QUAN (bảng) → 📖 GIẢI THÍCH → ⚖️ ĐIỀU KHOẢN → 💡 LƯU Ý

PHẢI trích dẫn số hiệu văn bản. Không tư vấn pháp lý chuyên sâu.`

export async function handleRegulation({
  message, history, apiKey,
}: {
  message: string; history?: Array<{ role: string; content: string }>; apiKey?: string
}) {
  const apiLog: Array<{ step: string; status: string }> = []
  const regContext = `VĂN BẢN:\n${JSON.stringify(regulationsData, null, 2)}`
  const historyText = formatHistory(history)

  let ktcnContext = ''
  const hsMatch = message.match(/\b(\d{4})[\.\s]?(\d{2})[\.\s]?(\d{2})\b/)
  if (hsMatch) {
    const hsCode = hsMatch[1] + hsMatch[2] + hsMatch[3]
    try {
      const ktcnData = await getKTCN(hsCode)
      if (ktcnData?.found) ktcnContext = `\nDỮ LIỆU KTCN MÃ ${hsCode}:\n${JSON.stringify(ktcnData, null, 2)}`
    } catch { /* skip */ }
  }

  const prompt = `${SYSTEM_PROMPT}\n\n${regContext}\n${ktcnContext}\n${historyText}\nKhách hàng: "${message}"\n\nTra cứu và giải thích.`

  apiLog.push({ step: 'llm_regulation', status: 'calling' })
  const reply = await callLLM(prompt, apiKey, { temperature: 0.2, maxTokens: 6144 })
  apiLog[apiLog.length - 1] = { step: 'llm_regulation', status: 'done' }

  return { reply, debug: { agent: 'regulation', apiCalls: apiLog } }
}
