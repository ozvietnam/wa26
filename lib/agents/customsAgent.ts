import { searchHS, getHSDetail, getChapter, getKTCN, getPrecedentByHSCode } from '../hsApi'
import { callLLM, formatHistory } from './shared'
import { searchByHSCodes, trackUsage, addKnowledgeItem } from '../stores/knowledgeStore'

// ============================================================
// PHASE 1: EXPERT VERDICT
// ============================================================
const VERDICT_PROMPT = `Bạn là chuyên gia hải quan Việt Nam, phân loại HS code nằm trong gen.
Bạn thuộc lòng 6 quy tắc GIR, chú giải HS, và hàng trăm TB-TCHQ.

Khách hàng: "{message}"
{file_info}
{history}

NGƯỜI DÙNG CÓ THỂ VIẾT KHÔNG DẤU. Bạn PHẢI hiểu nghĩa.

═══════════════════════════════════════════════════════════
HỆ THỐNG DỮ LIỆU — 5 CÔNG CỤ TRA CỨU
═══════════════════════════════════════════════════════════

• 11,871 mã HS 8 số (biểu thuế 2026)
• 4,390 TB-TCHQ tiền lệ (2014-2025)
• 7,365 mã có KTCN (9 bộ ngành)
• 8,203 entries SEN/bao gồm/không bao gồm

TOOL 1: search("từ khóa") — TÌM KIẾM 4 NGUỒN
TOOL 2: lookup("XXXXXXXX") — CHI TIẾT 9 TẦNG
TOOL 3: chapter("XX") — TOÀN BỘ MÃ TRONG CHƯƠNG
TOOL 4: precedent("XXXXXXXX") — TB-TCHQ THEO MÃ HS
TOOL 5: ktcn("XXXXXXXX") — KIỂM TRA CHUYÊN NGÀNH

Trả lời JSON:
{
  "verdict": "nhận định [tên SP] → mã [XXXX.XX.XX] vì [lý do]",
  "confidence": 50-100,
  "primary_code": "XXXXXXXX",
  "gir": "GIR X — lý do",
  "lookup_commands": [
    {"tool": "lookup", "params": "XXXXXXXX", "why": "mã chính"},
    {"tool": "search", "params": "từ khóa tiếng Việt CÓ DẤU", "why": "quét 4 nguồn"}
  ],
  "what_could_change": "nếu [đặc điểm X] thì có thể mã [Y]"
}

QUY TẮC: confidence≥80%: 2-3 commands | 60-79%: 4-5 | <60%: 5-6. LUÔN có ≥1 lookup + 1 search. Max 7.`

// ============================================================
// PHASE 2: RESPOND
// ============================================================
const RESPOND_PROMPT = `Bạn là chuyên gia hải quan Việt Nam. Bạn vừa tra cứu hệ thống dữ liệu HS Code.

KHÁCH HÀNG: "{message}"
{file_info}
{history}

PHÁN ĐOÁN: {verdict}
CONFIDENCE: {confidence}%

DỮ LIỆU THỰC TỪ HỆ THỐNG:
{data}

{knowledge_base}

NGUYÊN TẮC TRẢ LỜI:

1. SO SÁNH phán đoán vs data thực — nếu khác → "⚡ Lưu ý: theo biểu thuế 2026..."

2. Confidence CAO (≥80%):
   🎯 [MÃ HS] — [Tên SP]
   Thuế NK (MFN): X% | ACFTA (TQ): X% | VAT: X%
   📌 Căn cứ: [chú giải/SEN/TB-TCHQ]

3. Confidence TRUNG BÌNH (50-79%): So sánh 2-3 mã

4. LUÔN KẾT THÚC bằng gợi ý follow-up (3-5 mục phù hợp):
   → "Xem chú giải chi tiết"
   → "TB-TCHQ liên quan"
   → "Kiểm tra chuyên ngành"
   → "Mô tả khai ECUS"
   → "So sánh thuế FTA"

5. Thuế suất CHỈ từ fact_layer.rates. LUÔN HIỂN THỊ THUẾ. Null → "—"
6. Viết tiếng Việt, thân thiện, chuyên nghiệp

QUAN TRỌNG: Luôn kết thúc bằng disclaimer:
_⚠️ Thông tin trên chỉ mang tính chất tham khảo, không thay thế kết quả phân loại chính thức của cơ quan Hải quan._`

// ============================================================
// FOLLOW-UP PATTERNS
// ============================================================
function removeDiacritics(str: string): string {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, '')
    .replace(/[đ\u0111]/g, 'd').replace(/[Đ\u0110]/g, 'D')
}

const FOLLOWUP_PATTERNS: Record<string, RegExp> = {
  chu_giai: /chu giai|\bsen\b|legal|annotation/i,
  tb_tchq: /tb[- ]?tchq|thong bao|precedent|tien le/i,
  rui_ro: /rui ro|de nham|conflict|tranh chap/i,
  ecus: /ecus|mo ta khai|khai bao/i,
  kiem_tra: /kiem tra|chuyen nganh|giay phep|kiem dich/i,
  cong_van: /cong van|giai trinh|ap ma/i,
  thue_fta: /thue.*fta|so sanh thue|acfta|atiga|evfta|cptpp/i,
}

// ============================================================
// KB LEARNING
// ============================================================
export async function saveLearningFromFeedback(productName: string, hsCode: string, confidence = 0.95) {
  if (!hsCode || !productName) return
  try {
    return await addKnowledgeItem({
      type: 'hs_insight',
      content: `${productName} → HS ${hsCode} (từ user confirm)`,
      hsCodes: [hsCode.replace(/\./g, '')],
      confidence: Math.min(confidence, 0.99),
      source: 'user_feedback',
    })
  } catch (err) {
    console.error('[KB] Error saving learning:', (err as Error).message)
    return null
  }
}

// ============================================================
// HELPERS
// ============================================================
interface SearchSources {
  
  bieu_thue: any[]; tb_tchq: any[]; bao_gom: any[]; conflict: any[]
}


function parseSearchResults(searchData: any): { sources: SearchSources; all: any[] } {
  const sources: SearchSources = { bieu_thue: [], tb_tchq: [], bao_gom: [], conflict: [] }
  
  const all: any[] = []
  if (!searchData?.results) return { sources, all }
  for (const [source, data] of Object.entries(searchData.results)) {
    if (!(source in sources)) continue
    
    const items = (data as any)?.items || (Array.isArray(data) ? data : [])
    if (items.length > 0) {
      ;(sources as unknown as Record<string, unknown[]>)[source].push(...items)
      
      all.push(...items.map((i: any) => ({ ...i, _source: source })))
    }
  }
  return { sources, all }
}


function dedup(results: any[]): any[] {
  const seen = new Set<string>()
  return results.filter(r => {
    const key = r.hs || r.ma_hs || r.hs_code || r.so_hieu || JSON.stringify(r).substring(0, 100)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ============================================================
// EXECUTE LOOKUPS
// ============================================================
interface ApiLogEntry { step: string; params?: string; why?: string; status: string; [key: string]: unknown }

async function executeLookups(commands: Array<{ tool: string; params: string; why: string }>, apiLog: ApiLogEntry[]) {
  const searchSources: SearchSources = { bieu_thue: [], tb_tchq: [], bao_gom: [], conflict: [] }
  
  let allResults: any[] = []
  
  const hsDetails: any[] = []
  
  const precedentData: any[] = []
  
  let ktcnData: any = null

  const results = await Promise.allSettled(
    (commands || []).slice(0, 7).map(async (cmd) => {
      const { tool, params, why } = cmd
      apiLog.push({ step: tool, params, why, status: 'calling' })
      try {
        if (tool === 'search') {
          const data = await searchHS(params, 10)
          const parsed = parseSearchResults(data)
          apiLog.push({ step: tool, params, status: 'done', count: parsed.all.length })
          return { type: 'search', parsed }
        }
        if (tool === 'lookup') {
          const detail = await getHSDetail(params)
          if (detail?.found !== false) {
            apiLog.push({ step: tool, params, status: 'done' })
            return { type: 'lookup', detail: { code: params, ...detail } }
          }
          const ch2 = params.substring(0, 2)
          const ch4 = params.substring(0, 4)
          apiLog.push({ step: tool, params, status: 'expanding', chapter: ch4 })
          try {
            const chData = await getChapter(ch2)
            const items = (chData?.items || chData?.results || [])
            
            const matching = items.filter((i: any) => (i.hs || i.ma_hs || i.hs_code || '').startsWith(ch4)).slice(0, 4)
            if (matching.length > 0) {
              const expanded = await Promise.allSettled(
                
                matching.slice(0, 3).map(async (item: any) => {
                  const code = item.hs || item.ma_hs || item.hs_code
                  const d = await getHSDetail(code)
                  return d?.found !== false ? { code, ...d } : null
                })
              )
              const details = expanded.filter(r => r.status === 'fulfilled' && r.value).map(r => (r as PromiseFulfilledResult<unknown>).value)
              apiLog.push({ step: tool, params, status: 'expanded', found: details.length })
              return { type: 'lookup_expanded', details }
            }
          } catch { /* skip */ }
          return null
        }
        if (tool === 'chapter') {
          const chData = await getChapter(params)
          const items = (chData?.items || chData?.results || []).slice(0, 20)
          apiLog.push({ step: tool, params, status: 'done', count: items.length })
          
          return { type: 'chapter', items: items.map((i: any) => ({ ...i, _source: `chapter_${params}` })) }
        }
        if (tool === 'precedent') {
          const data = await getPrecedentByHSCode(params)
          if (data?.found && data.precedents?.length > 0) {
            apiLog.push({ step: tool, params, status: 'done', count: data.precedents.length })
            return { type: 'precedent', data: data.precedents }
          }
          apiLog.push({ step: tool, params, status: 'done', count: 0 })
          return null
        }
        if (tool === 'ktcn') {
          const data = await getKTCN(params)
          if (data?.found) {
            apiLog.push({ step: tool, params, status: 'done', co_quan: data.co_quan })
            return { type: 'ktcn', data }
          }
          apiLog.push({ step: tool, params, status: 'done', found: false })
          return null
        }
        return null
      } catch (e) {
        apiLog.push({ step: tool, params, status: 'error', error: (e as Error).message })
        return null
      }
    })
  )

  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue
    
    const v = r.value as any
    if (v.type === 'search') {
      for (const [key, items] of Object.entries(v.parsed.sources)) {
        if (key in searchSources) (searchSources as unknown as Record<string, unknown[]>)[key].push(...(items as unknown[]))
      }
      allResults.push(...v.parsed.all)
    } else if (v.type === 'lookup') {
      hsDetails.push(v.detail)
      allResults.push({ hs: v.detail.code, _source: 'lookup', vn: v.detail.fact_layer?.vn || v.detail.code })
    } else if (v.type === 'lookup_expanded') {
      
      for (const d of v.details) { hsDetails.push(d); allResults.push({ hs: (d as any).code, _source: 'expanded' }) }
    } else if (v.type === 'chapter') { allResults.push(...v.items) }
    else if (v.type === 'precedent') { precedentData.push(...v.data) }
    else if (v.type === 'ktcn') { ktcnData = v.data }
  }

  return { searchSources, allResults: dedup(allResults), hsDetails, precedentData, ktcnData }
}

// ============================================================
// BUILD DATA CONTEXT
// ============================================================

function buildDataContext(searchSources: SearchSources, allResults: any[], hsDetails: any[], precedentData: any[], ktcnData: any): string {
  const parts: string[] = []

  if (hsDetails.length > 0) {
    
    const details = hsDetails.slice(0, 3).map((d: any) => {
      
      const detail: any = { code: d.code }
      if (d.fact_layer) {
        const rates = d.fact_layer.rates || {}
        detail.tax = {
          vn: (d.fact_layer.vn || '').substring(0, 120),
          mfn: rates.mfn || d.fact_layer.mfn, acfta: rates.acfta || d.fact_layer.acfta,
          atiga: rates.atiga, vat: rates.vat || d.fact_layer.vat,
          bvmt: rates.bvmt, ttdb: rates.ttdb, tt: rates.tt,
        }
        if (d.fact_layer.chinh_sach) detail.tax.cs = d.fact_layer.chinh_sach
        if (d.fact_layer.canh_bao_cs) detail.tax.cb = d.fact_layer.canh_bao_cs
      }
      if (d.legal_layer) {
        detail.legal = {}
        if (d.legal_layer.chu_giai_chuong) detail.legal.chuong = typeof d.legal_layer.chu_giai_chuong === 'string' ? d.legal_layer.chu_giai_chuong.substring(0, 500) : d.legal_layer.chu_giai_chuong
        if (d.legal_layer.chu_giai_nhom) detail.legal.nhom = typeof d.legal_layer.chu_giai_nhom === 'string' ? d.legal_layer.chu_giai_nhom.substring(0, 300) : d.legal_layer.chu_giai_nhom
        if (d.legal_layer.bao_gom) detail.legal.bg = d.legal_layer.bao_gom
        if (d.legal_layer.khong_bao_gom) detail.legal.kbg = d.legal_layer.khong_bao_gom
        if (d.legal_layer.sen) detail.legal.sen = d.legal_layer.sen
        if (d.legal_layer.tinh_chat) detail.legal.tc = d.legal_layer.tinh_chat
      }
      if (d.precedent_layer?.tb_tchq?.length) detail.tb = d.precedent_layer.tb_tchq.slice(0, 3).map(
        
        (t: any) => ({ tb: t.so_hieu, sp: (t.ten_san_pham || '').substring(0, 60), hs: t.ma_hs, ly_do: (t.ly_do_phan_loai || '').substring(0, 100) })
      )
      if (d.conflict_layer) detail.conflict = d.conflict_layer
      if (d.classification_layer) detail.gir = d.classification_layer
      return detail
    })
    parts.push(`CHI TIẾT 9 TẦNG:${JSON.stringify(details)}`)
  }

  if (searchSources.tb_tchq.length > 0) {
    
    const tb = searchSources.tb_tchq.slice(0, 4).map((t: any) => ({
      tb: t.so_hieu, sp: (t.ten_san_pham || '').substring(0, 80), hs: t.ma_hs,
      ly_do: (t.ly_do_phan_loai || '').substring(0, 150),
    }))
    parts.push(`TB-TCHQ:${JSON.stringify(tb)}`)
  }

  if (searchSources.conflict.length > 0) {
    
    const conflict = searchSources.conflict.slice(0, 3).map((c: any) => ({
      hs: c.hs || c.ma_hs, product: c.product, risk: c.muc_rui_ro, reason: c.reason,
    }))
    parts.push(`XUNG ĐỘT:${JSON.stringify(conflict)}`)
  }

  if (precedentData?.length > 0) {
    
    const prec = precedentData.slice(0, 5).map((p: any) => ({
      so_hieu: p.so_hieu, sp: (p.hang_hoa?.ten_thuong_mai || '').substring(0, 80),
      hs: p.phan_loai?.ma_hs, ly_do: (p.phan_loai?.ly_do || '').substring(0, 200),
      gir: p.phan_loai?.gir,
      tranh_chap: p.tranh_chap?.co_tranh_chap ? { ma_ban_dau: p.tranh_chap.ma_hs_ban_dau, ma_dung: p.phan_loai?.ma_hs } : null,
    }))
    parts.push(`TB-TCHQ CHI TIẾT (${precedentData.length} tiền lệ):${JSON.stringify(prec)}`)
  }

  if (ktcnData) {
    const ktcnCompact = {
      hs: ktcnData.hs, ten: ktcnData.ten, muc_canh_bao: ktcnData.muc_canh_bao,
      co_quan: ktcnData.co_quan,
      
      ktcn: (ktcnData.ktcn_chi_tiet || ktcnData.ktcn || []).slice(0, 5).map((k: any) => ({
        cq: k.co_quan, loai: k.loai_ten || k.loai, vb: k.van_ban,
        thu_tuc: k.thu_tuc ? { buoc: k.thu_tuc.buoc?.length, tg: k.thu_tuc.thoi_gian } : null,
      })),
    }
    parts.push(`KIỂM TRA CHUYÊN NGÀNH:${JSON.stringify(ktcnCompact)}`)
  }

  if (allResults.length > 0 && hsDetails.length === 0) {
    
    const trimmed = allResults.slice(0, 8).map((r: any) => ({
      hs: r.hs || r.ma_hs || r.hs_code, vn: (r.vn || r.ten_vn || r.mo_ta || '').substring(0, 80),
    }))
    parts.push(`TÌM KIẾM:${JSON.stringify(trimmed)}`)
  }

  return parts.join('\n\n')
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================
export interface CustomsResult {
  reply: string
  
  debug: Record<string, any>
}

export async function handleCustoms({
  message, history, file, apiKey,
}: {
  message: string
  history?: Array<{ role: string; content: string }>
  file?: { name: string; mimeType: string; data: string }
  apiKey?: string
}): Promise<CustomsResult> {
  const apiLog: ApiLogEntry[] = []
  const fileInfo = file ? `[File: ${file.name} (${file.mimeType})]` : ''
  const historyText = formatHistory(history)

  const isFollowUp = detectFollowUp(message, history)

  if (isFollowUp === 'kiem_tra') {
    const ktcnResult = await handleKTCNFollowUp(history)
    if (ktcnResult) return ktcnResult
  }

  if (isFollowUp === 'chu_giai') {
    const chuGiaiResult = await handleChuGiaiFollowUp(history)
    if (chuGiaiResult) return chuGiaiResult
  }

  // PHASE 1: VERDICT
  apiLog.push({ step: 'verdict', status: 'calling' })
  
  let verdict: any
  try {
    const prompt = VERDICT_PROMPT
      .replace('{message}', message || '(xem file đính kèm)')
      .replace('{file_info}', fileInfo ? `\n${fileInfo}` : '')
      .replace('{history}', historyText ? `\nHỘI THOẠI TRƯỚC:${historyText}` : '')

    const raw = await callLLM(prompt, undefined, { file, temperature: 0.2, maxTokens: 1500, tier: 'heavy', thinkingBudget: 512 })

    let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    if (!cleaned.startsWith('{')) {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) cleaned = match[0]
    }
    try { verdict = JSON.parse(cleaned) }
    catch { cleaned = cleaned.replace(/,\s*}/, '}').replace(/,\s*]/, ']'); verdict = JSON.parse(cleaned) }

    if (!verdict?.verdict) verdict.verdict = message || '(unknown)'
    if (!verdict?.confidence) verdict.confidence = 50
    if (!verdict?.lookup_commands) verdict.lookup_commands = []

    apiLog.push({ step: 'verdict', status: 'done', confidence: verdict.confidence, primary: verdict.primary_code, commands: verdict.lookup_commands?.length })
  } catch (err) {
    apiLog.push({ step: 'verdict', status: 'error', error: (err as Error).message })
    const text = (message || '').trim()
    verdict = {
      verdict: text, confidence: 40, primary_code: '', gir: 'GIR 1',
      lookup_commands: [{ tool: 'search', params: text, why: 'tìm trực tiếp (fallback)' }],
      what_could_change: '',
    }
  }

  // PHASE 2: LOOKUP
  apiLog.push({ step: 'lookup', status: 'calling' })
  let { searchSources, allResults, hsDetails, precedentData, ktcnData } = await executeLookups(verdict.lookup_commands, apiLog)

  // Fallback search
  if (allResults.length === 0 && hsDetails.length === 0) {
    apiLog.push({ step: 'fallback_search', status: 'calling' })
    const words = (message || '').trim().split(/\s+/).filter(w => w.length > 1)
    const shortTerms: string[] = []
    for (let i = 0; i < words.length - 1; i++) shortTerms.push(words.slice(i, i + 2).join(' '))
    words.filter(w => w.length > 2).forEach(w => shortTerms.push(w))

    const fallback = await Promise.allSettled(
      Array.from(new Set(shortTerms)).slice(0, 5).map(async (term) => {
        try { return parseSearchResults(await searchHS(term, 10)) } catch { return null }
      })
    )
    for (const r of fallback) {
      if (r.status === 'fulfilled' && r.value) {
        for (const [key, items] of Object.entries(r.value.sources)) {
          if (key in searchSources) (searchSources as unknown as Record<string, unknown[]>)[key].push(...(items as unknown[]))
        }
        allResults.push(...r.value.all)
      }
    }
    allResults = dedup(allResults)

    if (allResults.length > 0 && hsDetails.length === 0) {
      
      const topCodes = allResults.slice(0, 3).map((r: any) => r.hs || r.ma_hs || r.hs_code).filter(Boolean)
      const detailResults = await Promise.allSettled(
        topCodes.map(async (code: string) => {
          const d = await getHSDetail(code)
          return d?.found !== false ? { code, ...d } : null
        })
      )
      hsDetails.push(...detailResults.filter(r => r.status === 'fulfilled' && r.value).map(r => (r as PromiseFulfilledResult<unknown>).value))
    }
    apiLog.push({ step: 'fallback_search', status: 'done', results: allResults.length, details: hsDetails.length })
  }

  const hasData = allResults.length > 0 || hsDetails.length > 0
  apiLog.push({ step: 'lookup', status: 'done', results: allResults.length, details: hsDetails.length })

  // KB query
  
  let knowledgeItems: any[] = []
  
  const allCodes = Array.from(new Set(allResults.map((r: any) => r.hs || r.ma_hs || r.hs_code).filter(Boolean)))
  if (allCodes.length > 0) {
    try {
      knowledgeItems = await searchByHSCodes(allCodes, 5)
      if (knowledgeItems.length > 0) {
        apiLog.push({ step: 'kb', status: 'done', items: knowledgeItems.length })
        
        trackUsage(knowledgeItems.map((i: any) => i.id)).catch(() => {})
      }
    } catch { /* skip */ }
  }

  // PHASE 3: RESPOND
  const dataContext = buildDataContext(searchSources, allResults, hsDetails, precedentData, ktcnData)
  
  const kbSection = knowledgeItems.length > 0
    
    ? `\nKIẾN THỨC TỪ HỘI THOẠI TRƯỚC:\n${knowledgeItems.map((i: any) => `[${i.type}] ${i.content}`).join('\n')}`
    : ''

  let responsePrompt: string
  if (hasData) {
    responsePrompt = RESPOND_PROMPT
      .replace('{message}', message || '(xem file)')
      .replace('{file_info}', fileInfo)
      .replace('{history}', historyText)
      .replace('{verdict}', verdict.verdict || message)
      .replace('{confidence}', String(verdict.confidence || 50))
      .replace('{data}', dataContext)
      .replace('{knowledge_base}', kbSection)
  } else {
    responsePrompt = `Bạn là chuyên gia hải quan Việt Nam.
KHÁCH HÀNG: "${message || '(xem file)'}"
${fileInfo}
${historyText}
PHÁN ĐOÁN: ${verdict.verdict || message}
CONFIDENCE: ${verdict.confidence || 50}%

Đã tra cứu biểu thuế 2026 nhưng KHÔNG tìm thấy kết quả trực tiếp.

Trả lời tiếng Việt, gợi ý mã HS dự kiến và hỏi thêm chi tiết. Kết thúc bằng follow-up suggestions.`
  }

  // BUG-9 FIX: Skip LLM call when no data — return static text
  if (!hasData) {
    apiLog.push({ step: 'respond', status: 'skipped_no_data' })
    const reply = `🔍 Đã tra cứu "${message}" trong biểu thuế 2026 nhưng chưa tìm thấy kết quả trực tiếp.

Để phân loại chính xác, vui lòng cung cấp thêm:
- **Chất liệu** (thép, nhựa, gỗ, vải...)
- **Chức năng** (dùng để làm gì)
- **Hình ảnh** sản phẩm (nếu có)

💡 Bạn có thể thử:
→ "Máy bơm nước ly tâm bằng thép"
→ "Cảm biến nhiệt độ công nghiệp"

_⚠️ Thông tin trên chỉ mang tính chất tham khảo._`
    return { reply, debug: { agent: 'customs', verdict: { confidence: verdict.confidence, primary_code: verdict.primary_code, commands: (verdict.lookup_commands || []).length }, lookup: { searchResults: allResults.length, hsDetails: hsDetails.length }, hasData, apiCalls: apiLog } }
  }

  apiLog.push({ step: 'respond', status: 'calling' })
  let reply: string
  try {
    reply = await callLLM(responsePrompt, undefined, { file, maxTokens: 4000, tier: 'heavy' })
    apiLog.push({ step: 'respond', status: 'done', length: reply.length })
  } catch (err) {
    apiLog.push({ step: 'respond', status: 'error', error: (err as Error).message })
    // BUG-1 FIX: Handle allResults > 0 but hsDetails === 0
    if (hsDetails.length > 0) {
      const d = hsDetails[0]
      const r = d.fact_layer?.rates || {}
      reply = `🎯 **${d.code}** — ${d.fact_layer?.vn || 'N/A'}\nThuế NK (MFN): ${r.mfn ?? '—'}% | ACFTA (TQ): ${r.acfta ?? '—'}% | VAT: ${r.vat ?? '—'}%\n\n💡 Hỏi thêm: "Xem chú giải chi tiết", "TB-TCHQ liên quan"`
    } else if (allResults.length > 0) {
      // Has search results but no details — show what we have
      const top = allResults.slice(0, 5).map((r: any) => {
        const code = r.hs || r.ma_hs || r.hs_code || ''
        const name = r.vn || r.ten_vn || r.mo_ta || r.ten_san_pham || ''
        const formatted = code.length === 8 ? `${code.slice(0,4)}.${code.slice(4,6)}.${code.slice(6,8)}` : code
        return `- **${formatted}** — ${name.substring(0, 80)}`
      }).join('\n')
      reply = `🔍 Tìm thấy ${allResults.length} kết quả liên quan đến "${message}":\n\n${top}\n\n❓ Chọn mã HS cụ thể hoặc mô tả chi tiết hơn để tra thuế suất.\n\n_⚠️ Thông tin trên chỉ mang tính chất tham khảo._`
    } else {
      reply = `🔍 Đã tra cứu "${message}" nhưng chưa tìm được kết quả phù hợp. Vui lòng mô tả chi tiết hơn (chất liệu, chức năng, công dụng).`
    }
  }

  return {
    reply,
    debug: {
      agent: 'customs', verdict: { confidence: verdict.confidence, primary_code: verdict.primary_code, commands: (verdict.lookup_commands || []).length },
      lookup: { searchResults: allResults.length, hsDetails: hsDetails.length, precedent_detail: precedentData?.length || 0, ktcn: ktcnData ? { found: true } : { found: false } },
      hasData, knowledgeItems: knowledgeItems.length, apiCalls: apiLog,
    },
  }
}

// ============================================================
// KTCN FOLLOW-UP
// ============================================================
async function handleKTCNFollowUp(history?: Array<{ role: string; content: string }>): Promise<CustomsResult | null> {
  const hsCode = extractHSCodeFromHistory(history)
  if (!hsCode) return null
  const ktcnData = await getKTCN(hsCode)
  if (!ktcnData?.found) return null

  const formattedHS = `${hsCode.slice(0,4)}.${hsCode.slice(4,6)}.${hsCode.slice(6,8)}`
  const ktcnList = ktcnData.ktcn_chi_tiet || ktcnData.ktcn || []
  const parts = [`🔍 **KIỂM TRA CHUYÊN NGÀNH** cho mã **${formattedHS}** — ${ktcnData.ten || ''}`]

  if (ktcnData.muc_canh_bao) {
    const icons: Record<string, string> = { RED: '🔴', ORANGE: '🟠', YELLOW: '🟡' }
    parts.push(`${icons[ktcnData.muc_canh_bao] || '⚪'} Mức cảnh báo: **${ktcnData.muc_canh_bao}**`)
  }

  const byCoQuan: Record<string, unknown[]> = {}
  
  for (const k of ktcnList) { const cq = (k as any).co_quan || 'Khác'; if (!byCoQuan[cq]) byCoQuan[cq] = []; byCoQuan[cq].push(k) }

  parts.push('\n📋 **CƠ QUAN QUẢN LÝ:**')
  let idx = 1
  for (const [cq, entries] of Object.entries(byCoQuan)) {
    
    const types = Array.from(new Set(entries.map((e: any) => e.loai_ten || e.loai || '').filter(Boolean)))
    parts.push(`${idx}. **${cq}** — ${types.join(', ')}`); idx++
  }

  parts.push(`\n💡 Hỏi thêm: **Xem chú giải chi tiết** | **TB-TCHQ liên quan** | **So sánh thuế FTA**`)
  return { reply: parts.join('\n'), debug: { agent: 'customs', architecture: 'ktcn_followup', hs_code: hsCode } }
}

// ============================================================
// CHU GIAI FOLLOW-UP
// ============================================================
async function handleChuGiaiFollowUp(history?: Array<{ role: string; content: string }>): Promise<CustomsResult | null> {
  const hsCode = extractHSCodeFromHistory(history)
  if (!hsCode) return null
  let detail
  try { detail = await getHSDetail(hsCode, 'legal_layer,fact_layer') } catch { return null }
  if (!detail || detail.found === false || !detail.legal_layer) return null

  const formattedHS = `${hsCode.slice(0,4)}.${hsCode.slice(4,6)}.${hsCode.slice(6,8)}`
  const legal = detail.legal_layer || {}
  const fact = detail.fact_layer || {}
  const rates = fact.rates || {}
  const parts = [`📖 **CHÚ GIẢI** cho mã **${formattedHS}** — ${fact.vn || ''}`]

  if (legal.chu_giai_chuong) parts.push(`\n**📋 Chú giải chương:**\n${String(legal.chu_giai_chuong).substring(0, 1200)}`)
  if (legal.chu_giai_nhom) parts.push(`\n**📋 Chú giải nhóm:**\n${String(legal.chu_giai_nhom).substring(0, 600)}`)
  if (legal.bao_gom?.length > 0) { parts.push(`\n**✅ Bao gồm:**`); legal.bao_gom.slice(0, 6).forEach((i: string) => parts.push(`- ${i}`)) }
  if (legal.khong_bao_gom?.length > 0) { parts.push(`\n**❌ Không bao gồm:**`); legal.khong_bao_gom.slice(0, 6).forEach((i: string) => parts.push(`- ${i}`)) }
  if (legal.sen) parts.push(`\n**📌 SEN AHTN 2022:**\n${String(legal.sen).substring(0, 600)}`)

  if (rates.mfn || rates.acfta || rates.vat) {
    parts.push(`\n**💰 Thuế suất:**`)
    parts.push(`- NK (MFN): **${rates.mfn ?? '—'}%** | ACFTA: **${rates.acfta ?? '—'}%** | VAT: **${rates.vat ?? '—'}%**`)
  }

  parts.push(`\n💡 Hỏi thêm: **Kiểm tra chuyên ngành** | **TB-TCHQ liên quan** | **So sánh thuế FTA**`)
  parts.push(`\n_⚠️ Thông tin trên chỉ mang tính chất tham khảo._`)

  return { reply: parts.join('\n'), debug: { agent: 'customs', architecture: 'chu_giai_followup', hs_code: hsCode } }
}

function extractHSCodeFromHistory(history?: Array<{ role: string; content: string }>): string | null {
  if (!history?.length) return null
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== 'assistant') continue
    const match = history[i].content.match(/\b(\d{4})[.\s]?(\d{2})[.\s]?(\d{2})\b/)
    if (match) return match[1] + match[2] + match[3]
  }
  return null
}

function detectFollowUp(message: string, history?: Array<{ role: string; content: string }>): string | null {
  if (!history?.length || !message) return null
  const normalized = removeDiacritics(message.toLowerCase())
  for (const [type, pattern] of Object.entries(FOLLOWUP_PATTERNS)) {
    if (pattern.test(normalized)) return type
  }
  return null
}
