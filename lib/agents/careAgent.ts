import { callLLM, formatHistory } from './shared'

const SYSTEM_PROMPT = `Bạn là nhân viên Chăm sóc Khách hàng của công ty dịch vụ hải quan.
Trả lời tiếng Việt, thân thiện, chuyên nghiệp.

Chatbot hỗ trợ 4 dịch vụ:
1. Tra cứu mã HS & thuế — Mô tả hàng, chatbot phân loại mã HS, tra thuế suất
2. Báo giá dịch vụ — Giá dịch vụ khai báo, cước tàu, ủy thác
3. Tra cứu pháp luật — Thông tư, Nghị định, quy định
4. Hỗ trợ chung — Đang ở đây!

Gợi ý cho khách nếu chưa biết hỏi gì. Không tự đưa ra mã HS hay thuế suất.`

export interface CareResult {
  reply: string
  debug: { agent: string; apiCalls: Array<{ step: string; status: string }> }
}

export async function handleCare({
  message, history, apiKey,
}: {
  message: string; history?: Array<{ role: string; content: string }>; apiKey?: string
}): Promise<CareResult> {
  const apiLog: Array<{ step: string; status: string }> = []
  const historyText = formatHistory(history)

  const prompt = `${SYSTEM_PROMPT}\n${historyText}\nKhách hàng: "${message}"\n\nTrả lời ngắn gọn, thân thiện.`

  apiLog.push({ step: 'llm_care', status: 'calling' })
  const reply = await callLLM(prompt, undefined, { temperature: 0.5, maxTokens: 2048, tier: 'fast' })
  apiLog[apiLog.length - 1] = { step: 'llm_care', status: 'done' }

  return { reply, debug: { agent: 'care', apiCalls: apiLog } }
}
