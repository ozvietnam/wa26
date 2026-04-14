'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// --- Types ---
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  debug?: Record<string, unknown>
  file?: { name: string; mimeType: string; sizeLabel: string; preview?: string }
}

interface AttachedFile {
  name: string
  mimeType: string
  size: number
  sizeLabel: string
  data: string
  preview?: string
}

// --- Constants ---
const MAX_FILE_SIZE = 15 * 1024 * 1024
const ACCEPTED_TYPES: Record<string, string> = {
  'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image',
  'application/pdf': 'pdf',
  'audio/mpeg': 'audio', 'audio/mp3': 'audio', 'audio/wav': 'audio',
}
const FILE_ICONS: Record<string, string> = { image: '🖼️', pdf: '📄', audio: '🎤' }

const STATS = [
  { value: 11871, label: 'mã HS\nbiểu thuế 2026' },
  { value: 4390, label: 'TB-TCHQ\ntiền lệ phân loại' },
  { value: 7365, label: 'mã KTCN\n9 bộ ngành' },
  { value: 9, label: 'tầng dữ liệu\nmỗi mã HS' },
]

const HOT_QUERIES = [
  { hs: '8517.62.59', name: 'Thiết bị thu phát vô tuyến', query: 'thiết bị thu phát vô tuyến' },
  { hs: '3926.90.99', name: 'Sản phẩm bằng nhựa khác', query: 'sản phẩm bằng nhựa' },
  { hs: '8481.80.99', name: 'Van và thiết bị tương tự', query: 'van điện từ khí nén' },
  { hs: '8516.71.00', name: 'Máy pha cà phê điện', query: 'máy pha cà phê điện' },
]

// --- Helpers ---
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('chatSessionId')
  if (!id) {
    id = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8)
    sessionStorage.setItem('chatSessionId', id)
  }
  return id
}

// --- Expert Markdown Formatter ---
function formatMessage(text: string): string {
  const lines = text.split('\n')
  const processed: string[] = []
  let inList = false
  let listType = ''
  let sectionContext = ''

  function closeList() {
    if (inList) { processed.push('</ul>'); inList = false; listType = '' }
  }

  for (const line of lines) {
    let l = line

    // Verdict line: 🎯
    if (/^🎯/.test(l)) {
      closeList(); sectionContext = ''
      l = l.replace(/\*\*([\d.]+)\*\*/g, '<span class="hs-code-primary">$1</span>')
      l = formatInline(l)
      processed.push(`<div class="verdict-box">${l}</div>`)
      continue
    }

    // Tax line
    if (/^Thu[eế]:/i.test(l) || /MFN.*ACFTA.*VAT/i.test(l) || /Thuế NK/i.test(l)) {
      closeList()
      l = l.replace(/(\d+(?:\.\d+)?%)/g, '<span class="tax-rate">$1</span>')
      l = formatInline(l)
      processed.push(`<div class="tax-line">${l}</div>`)
      continue
    }

    // Citation: 📌
    if (/^📌/.test(l)) {
      closeList(); sectionContext = 'citation'
      processed.push(`<div class="citation">${formatInline(l)}</div>`)
      continue
    }

    // Alert: ⚡ / ⚠️
    if (/^[⚡⚠️]/.test(l) && /[Ll]ưu ý|quan trọng|thay đổi/i.test(l)) {
      closeList(); sectionContext = ''
      processed.push(`<div class="discovery-alert">${formatInline(l)}</div>`)
      continue
    }

    // Follow-up header: 💡
    if (/^💡/.test(l)) {
      closeList(); sectionContext = 'followup'
      processed.push(`<div class="section-header">${formatInline(l)}</div>`)
      continue
    }

    // Section headers with emoji
    if (/^[🔍❓📊📋📦💰📝📜🏭📖🔬✅❌⛔]/.test(l) && l.length > 5) {
      closeList(); sectionContext = ''
      processed.push(`<div class="section-header">${formatInline(l)}</div>`)
      continue
    }

    // Numbered HS options: 1. **XXXX.XX.XX**
    if (/^\d+\.\s+\*\*\d{4}/.test(l)) {
      closeList()
      l = l.replace(/\*\*([\d.]+)\*\*/g, '<span class="hs-code">$1</span>')
      processed.push(`<div class="hs-option">${formatInline(l)}</div>`)
      continue
    }

    // Follow-up arrows: → "text"
    if (/^\s*[→►*]\s/.test(l)) {
      if (sectionContext === 'followup' || /[""]/.test(l)) {
        if (!inList || listType !== 'followup') {
          closeList()
          processed.push('<ul class="followup-list">')
          inList = true; listType = 'followup'
        }
        l = l.replace(/^\s*[→►*]\s*/, '')
        processed.push(`<li class="followup-item">${formatInline(l)}</li>`)
        continue
      }
    }

    // Bullet lists
    if (/^\s*[-*]\s+/.test(l)) {
      const content = l.replace(/^\s*[-*]\s+/, '')
      if (sectionContext === 'followup') {
        if (!inList || listType !== 'followup') {
          closeList(); processed.push('<ul class="followup-list">'); inList = true; listType = 'followup'
        }
        processed.push(`<li class="followup-item">${formatInline(content)}</li>`)
        continue
      }
      if (!inList || listType !== 'expert') {
        closeList(); processed.push('<ul class="expert-list">'); inList = true; listType = 'expert'
      }
      let formatted = content.replace(/\*\*([\d.]+)\*\*/g, '<span class="hs-code">$1</span>')
      processed.push(`<li>${formatInline(formatted)}</li>`)
      continue
    }

    // Table rows
    if (/^\|/.test(l.trim())) {
      closeList()
      if (/^[\|\s\-:]+$/.test(l.trim())) continue // separator row
      const cells = l.split('|').filter(c => c.trim())
      const isHeader = processed.length > 0 && !processed[processed.length - 1].includes('<td')
      const tag = isHeader && cells.length > 1 ? 'th' : 'td'
      const row = cells.map(c => `<${tag} class="table-cell">${formatInline(c.trim())}</${tag}>`).join('')
      if (!processed.some(p => p.includes('<table'))) {
        processed.push('<table class="data-table"><tbody>')
      }
      processed.push(`<tr>${row}</tr>`)
      continue
    } else if (processed.length > 0 && processed[processed.length - 1].includes('<tr>')) {
      processed.push('</tbody></table>')
    }

    if (inList && l.trim() !== '') closeList()
    if (l.trim() === '') { closeList(); processed.push('<div class="spacer"></div>'); continue }
    processed.push(`<div>${formatInline(l)}</div>`)
  }

  closeList()
  if (processed.some(p => p.includes('<tr>') && !processed.includes('</tbody></table>'))) {
    processed.push('</tbody></table>')
  }
  return processed.join('')
}

function formatInline(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/(?<!\d)((\d{4})\.(\d{2})(?:\.(\d{2}))?)(?!\d)/g, '<span class="hs-code">$1</span>')
}

// --- Components ---
function AnimatedCounter({ end, duration = 1500 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const startTime = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [end, duration])

  return <span className="stat-number">{count.toLocaleString('vi-VN')}</span>
}

function DebugPanel({ debug }: { debug: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const d = debug as { routing?: { intent: string; confidence: number; method: string }; duration?: string; apiCalls?: Array<{ step: string; status: string; params?: string; [k: string]: unknown }>; hasData?: boolean; [k: string]: unknown }

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
        <span>{open ? '▼' : '▶'}</span>
        <span>API Debug</span>
        {d.routing && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px]">{d.routing.intent}</span>}
        {d.duration && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{d.duration}</span>}
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${d.hasData ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {d.hasData ? '✅ data' : '❌ no data'}
        </span>
      </button>
      {open && (
        <div className="mt-1 p-2 bg-gray-900 text-gray-300 rounded-lg text-[11px] font-mono max-h-60 overflow-auto">
          {d.routing && (
            <div className="mb-1"><span className="text-gray-500">Agent:</span> <span className="text-blue-400">{d.routing.intent}</span> <span className="text-gray-600">({d.routing.method}, {(d.routing.confidence * 100).toFixed(0)}%)</span></div>
          )}
          {d.apiCalls?.map((call, i) => (
            <div key={i} className={call.status === 'error' ? 'text-red-400' : 'text-gray-400'}>
              {call.status === 'done' ? '✅' : call.status === 'error' ? '❌' : '⏳'}{' '}
              <span className="text-gray-200">{call.step}</span>
              {call.params && <span className="text-blue-400"> &quot;{call.params}&quot;</span>}
              {(call as Record<string, unknown>).count !== undefined && <span> → {String((call as Record<string, unknown>).count)} results</span>}
              {(call as Record<string, unknown>).error ? <span className="text-red-400"> → {String((call as Record<string, unknown>).error)}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilePreview({ file, onRemove }: { file: { name: string; mimeType: string; sizeLabel: string; preview?: string }; onRemove?: () => void }) {
  const type = ACCEPTED_TYPES[file.mimeType] || 'doc'
  const icon = FILE_ICONS[type] || '📎'
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm">
      {type === 'image' && file.preview ? (
        <img src={file.preview} alt="" className="w-9 h-9 rounded object-cover" />
      ) : (
        <span className="text-xl">{icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium text-gray-700 text-xs">{file.name}</div>
        <div className="text-[10px] text-gray-400">{file.sizeLabel}</div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
      )}
    </div>
  )
}

// --- Main Chat ---
export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const [streamingIdx, setStreamingIdx] = useState(-1)
  const sessionId = useRef('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { sessionId.current = getSessionId() }, [])
  useEffect(() => { return () => { if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview) } }, [attachedFile])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  useEffect(() => { scrollToBottom() }, [messages, loading, streamingIdx, scrollToBottom])

  function handleNewChat() {
    setMessages([]); setInput(''); setAttachedFile(null); setStreamingIdx(-1)
    sessionStorage.removeItem('chatSessionId')
    sessionId.current = getSessionId()
    inputRef.current?.focus()
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!ACCEPTED_TYPES[file.type]) { alert('File không hỗ trợ. Chấp nhận: Ảnh, PDF, Audio'); return }
    if (file.size > MAX_FILE_SIZE) { alert('File quá lớn. Giới hạn: 15MB'); return }
    const data = await fileToBase64(file)
    const preview = ACCEPTED_TYPES[file.type] === 'image' ? URL.createObjectURL(file) : undefined
    setAttachedFile({ name: file.name, mimeType: file.type, size: file.size, sizeLabel: formatFileSize(file.size), data, preview })
  }

  function removeFile() {
    if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview)
    setAttachedFile(null)
  }

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if ((!msg && !attachedFile) || loading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: msg || (attachedFile ? `[Đính kèm: ${attachedFile.name}]` : ''),
      timestamp: new Date().toISOString(),
      file: attachedFile ? { name: attachedFile.name, mimeType: attachedFile.mimeType, sizeLabel: attachedFile.sizeLabel, preview: attachedFile.preview } : undefined,
    }

    const apiFile = attachedFile ? { name: attachedFile.name, mimeType: attachedFile.mimeType, data: attachedFile.data } : undefined

    setMessages(prev => [...prev, userMsg])
    setInput('')
    removeFile()
    setLoading(true)

    try {
      const cleanHistory = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }))
      const body: Record<string, unknown> = {
        message: msg || (apiFile ? `Phân tích file: ${apiFile.name}` : ''),
        history: cleanHistory,
        sessionId: sessionId.current,
      }
      if (apiFile) body.file = apiFile

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      setMessages(prev => {
        setStreamingIdx(prev.length)
        return [...prev, { role: 'assistant', content: data.reply || 'Không nhận được phản hồi.', timestamp: new Date().toISOString(), debug: data.debug }]
      })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, đã xảy ra lỗi kết nối. Vui lòng thử lại.', timestamp: new Date().toISOString() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleRetry(msgIndex: number) {
    if (loading) return
    const userMsgIdx = msgIndex - 1
    if (userMsgIdx < 0 || messages[userMsgIdx]?.role !== 'user') return
    const userMsg = messages[userMsgIdx]
    setMessages(prev => prev.slice(0, msgIndex))
    setInput(userMsg.content)
    setTimeout(() => sendMessage(userMsg.content), 50)
  }

  function sendFeedback(msgIndex: number, rating: 'up' | 'down') {
    const msg = messages[msgIndex]
    if (!msg) return
    const hsMatch = msg.content.match(/\b(\d{4})[.\s]?(\d{2})[.\s]?(\d{2})\b/)
    const hsCode = hsMatch ? hsMatch[1] + hsMatch[2] + hsMatch[3] : undefined
    const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : undefined
    const productName = userMsg?.role === 'user' ? userMsg.content.substring(0, 100) : undefined
    fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId.current, messageIndex: msgIndex, rating, productName, hsCode }),
    }).catch(() => {})
  }

  const canSubmit = !loading && (input.trim() || attachedFile)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-gray-800 tracking-tight">WA26 Chatbot</h1>
          <p className="text-[11px] text-gray-400 truncate">Gemini 2.0 Flash + HS Knowledge API</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button onClick={handleNewChat} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border rounded-lg hover:bg-gray-50 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
              Mới
            </button>
          )}
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-[11px] text-gray-400">Online</span>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        onClick={(e) => {
          const item = (e.target as HTMLElement).closest('.followup-item')
          if (item && !loading) {
            e.preventDefault()
            const text = (item.textContent || '').replace(/^[""\u201C\u201D]+|[""\u201C\u201D]+$/g, '').trim()
            if (text) { setInput(text); setTimeout(() => inputRef.current?.focus(), 50) }
          }
        }}
      >
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-6 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-1">WA26 — HS Code Chatbot</h2>
            <p className="text-sm text-gray-400 max-w-sm mb-5">Hệ thống phân loại mã HS thông minh — dựa trên AI + cơ sở dữ liệu biểu thuế 2026</p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6 w-full max-w-md">
              {STATS.map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-blue-600"><AnimatedCounter end={s.value} duration={1500 + i * 200} /></div>
                  <div className="text-[10px] text-gray-400 whitespace-pre-line leading-tight mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature pills */}
            <div className="flex gap-1.5 flex-wrap justify-center mb-5">
              {['Gemini 2.0 Flash', 'HS Knowledge API', '9 tầng dữ liệu', 'TB-TCHQ'].map((f, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 text-[11px] font-semibold">{f}</span>
              ))}
            </div>

            {/* Hot queries */}
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Top tra cứu nhiều nhất</div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {HOT_QUERIES.map((item, i) => (
                <button key={i} onClick={() => sendMessage(`Tra mã HS: ${item.query}`)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10 transition text-left w-full group">
                  <span className="text-[11px] font-bold font-mono bg-blue-50 text-blue-500 px-2 py-1 rounded shrink-0">{item.hs}</span>
                  <span className="text-sm text-gray-600 group-hover:text-gray-800">{item.name}</span>
                  <span className="ml-auto text-gray-300 group-hover:text-blue-400 shrink-0">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 animate-fadeIn ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
            {/* File preview in user message */}
            {msg.file && <div className="mb-1.5"><FilePreview file={msg.file} /></div>}

            {msg.role === 'user' ? (
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[85%] text-[15px] leading-relaxed shadow-lg shadow-blue-500/25 whitespace-pre-wrap">
                {msg.content}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </div>
                <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 max-w-[calc(100%-44px)] shadow-sm overflow-x-auto">
                  {i === streamingIdx ? (
                    <StreamingText content={msg.content} onComplete={() => setStreamingIdx(-1)} scrollRef={messagesEndRef} />
                  ) : (
                    <div className="chat-content text-[14px] leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  )}

                  {/* Actions */}
                  {i !== streamingIdx && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="p-1 text-gray-300 hover:text-blue-500 transition" title="Copy">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button onClick={() => handleRetry(i)} className="p-1 text-gray-300 hover:text-amber-500 transition" title="Thử lại">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      </button>
                      <button onClick={() => sendFeedback(i, 'up')} className="p-1 text-gray-300 hover:text-green-500 transition text-xs" title="Tốt">👍</button>
                      <button onClick={() => sendFeedback(i, 'down')} className="p-1 text-gray-300 hover:text-red-500 transition text-xs" title="Chưa tốt">👎</button>
                    </div>
                  )}

                  {/* Debug */}
                  {i !== streamingIdx && msg.debug && <DebugPanel debug={msg.debug} />}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 items-start mb-4 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <div className="bg-white border rounded-2xl rounded-bl-md px-5 py-3 shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white shrink-0">
        {attachedFile && (
          <div className="px-3 pt-2"><FilePreview file={attachedFile} onRemove={removeFile} /></div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="px-3 py-3 flex gap-2 items-center">
          <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.mp3,.wav,.ogg,.m4a" onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}
            className={`p-2.5 border rounded-xl transition shrink-0 ${attachedFile ? 'border-blue-300 text-blue-500' : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'} disabled:opacity-40`}
            title="Đính kèm file">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
            placeholder="Mô tả hàng hóa cần tra mã HS..."
            rows={1} disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button type="submit" disabled={!canSubmit}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-md shadow-blue-500/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}

// --- Streaming Text ---
function StreamingText({ content, onComplete, scrollRef }: { content: string; onComplete: () => void; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!content) return
    const chunks = content.split(/\n\n/).flatMap(section => {
      const lines = section.split('\n')
      return [...lines, '\n']
    })
    let idx = 0, built = ''

    const timer = setInterval(() => {
      if (idx >= chunks.length) { clearInterval(timer); setDone(true); onComplete(); return }
      const chunk = chunks[idx]
      if (chunk === '\n') { built += '\n' } else { built += (built.length > 0 && !built.endsWith('\n') ? '\n' : '') + chunk }
      idx++
      setDisplayed(built)
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 40)

    return () => clearInterval(timer)
  }, [content, onComplete, scrollRef])

  return (
    <div className={`chat-content text-[14px] leading-relaxed text-gray-800 ${!done ? 'streaming' : ''}`}
      dangerouslySetInnerHTML={{ __html: formatMessage(displayed) }} />
  )
}
