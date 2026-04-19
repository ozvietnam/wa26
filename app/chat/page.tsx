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

const SUGGESTED_PROMPTS = [
  { icon: '📦', title: 'Tra mã HS', desc: 'Thiết bị thu phát vô tuyến', query: 'Tra mã HS: thiết bị thu phát vô tuyến' },
  { icon: '💰', title: 'Thuế nhập khẩu', desc: 'Máy pha cà phê điện', query: 'Thuế nhập khẩu máy pha cà phê điện từ Trung Quốc?' },
  { icon: '📋', title: 'So sánh mã HS', desc: 'Sản phẩm nhựa', query: 'So sánh mã HS cho sản phẩm bằng nhựa: 3926.90.99 vs 3926.30.90' },
  { icon: '🔍', title: 'Quy định KTCN', desc: 'Van điện từ khí nén', query: 'Van điện từ khí nén cần kiểm tra chuyên ngành gì?' },
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

    if (/^🎯/.test(l)) {
      closeList(); sectionContext = ''
      l = l.replace(/\*\*([\d.]+)\*\*/g, '<span class="hs-code-primary">$1</span>')
      l = formatInline(l)
      processed.push(`<div class="verdict-box">${l}</div>`)
      continue
    }

    if (/^Thu[eế]:/i.test(l) || /MFN.*ACFTA.*VAT/i.test(l) || /Thuế NK/i.test(l)) {
      closeList()
      l = l.replace(/(\d+(?:\.\d+)?%)/g, '<span class="tax-rate">$1</span>')
      l = formatInline(l)
      processed.push(`<div class="tax-line">${l}</div>`)
      continue
    }

    if (/^📌/.test(l)) {
      closeList(); sectionContext = 'citation'
      processed.push(`<div class="citation">${formatInline(l)}</div>`)
      continue
    }

    if (/^[⚡⚠️]/.test(l) && /[Ll]ưu ý|quan trọng|thay đổi/i.test(l)) {
      closeList(); sectionContext = ''
      processed.push(`<div class="discovery-alert">${formatInline(l)}</div>`)
      continue
    }

    if (/^💡/.test(l)) {
      closeList(); sectionContext = 'followup'
      processed.push(`<div class="section-header">${formatInline(l)}</div>`)
      continue
    }

    if (/^[🔍❓📊📋📦💰📝📜🏭📖🔬✅❌⛔]/.test(l) && l.length > 5) {
      closeList(); sectionContext = ''
      processed.push(`<div class="section-header">${formatInline(l)}</div>`)
      continue
    }

    if (/^\d+\.\s+\*\*\d{4}/.test(l)) {
      closeList()
      l = l.replace(/\*\*([\d.]+)\*\*/g, '<span class="hs-code">$1</span>')
      processed.push(`<div class="hs-option">${formatInline(l)}</div>`)
      continue
    }

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

    if (/^\|/.test(l.trim())) {
      closeList()
      if (/^[\|\s\-:]+$/.test(l.trim())) continue
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
function DebugPanel({ debug }: { debug: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const d = debug as { routing?: { intent: string; confidence: number; method: string }; duration?: string; apiCalls?: Array<{ step: string; status: string; params?: string; [k: string]: unknown }>; hasData?: boolean; [k: string]: unknown }

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex items-center gap-1.5 transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
        <span>Debug</span>
        {d.routing && <span className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px]">{d.routing.intent}</span>}
        {d.duration && <span className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px]">{d.duration}</span>}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-[#1a1a1a] text-gray-300 rounded-xl text-[11px] font-mono max-h-60 overflow-auto">
          {d.routing && (
            <div className="mb-1"><span className="text-gray-500">Agent:</span> <span className="text-blue-400">{d.routing.intent}</span> <span className="text-gray-600">({d.routing.method}, {(d.routing.confidence * 100).toFixed(0)}%)</span></div>
          )}
          {d.apiCalls?.map((call, i) => (
            <div key={i} className={call.status === 'error' ? 'text-red-400' : 'text-gray-400'}>
              {call.status === 'done' ? '✓' : call.status === 'error' ? '✗' : '…'}{' '}
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
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm">
      {type === 'image' && file.preview ? (
        <img src={file.preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
      ) : (
        <span className="text-lg">{icon}</span>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium text-[var(--text-primary)] text-xs">{file.name}</div>
        <div className="text-[10px] text-[var(--text-tertiary)]">{file.sizeLabel}</div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="ml-1 text-[var(--text-tertiary)] hover:text-red-500 text-lg leading-none transition-colors">×</button>
      )}
    </div>
  )
}

// --- Claude-style Avatar ---
function ClaudeAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#d97757] flex items-center justify-center shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.9"/>
      </svg>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
      <span className="text-white text-xs font-semibold">U</span>
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

  const prevMessagesLenRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to batch scroll with next paint
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    // Only scroll when new messages are added, not on loading state changes
    if (messages.length > prevMessagesLenRef.current) {
      scrollToBottom()
      prevMessagesLenRef.current = messages.length
    }
  }, [messages, scrollToBottom])

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
    <div className="claude-chat flex flex-col h-screen">
      {/* Sidebar-like header strip */}
      <div className="claude-chat-header flex items-center justify-between px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <ClaudeAvatar />
          <div>
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">WA26 Chatbot</h1>
            <p className="text-[11px] text-[var(--text-tertiary)]">HS Code & Thuế XNK</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={handleNewChat} className="claude-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Cuộc trò chuyện mới
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto"
        onClick={(e) => {
          const item = (e.target as HTMLElement).closest('.followup-item')
          if (item && !loading) {
            e.preventDefault()
            const text = (item.textContent || '').replace(/^[""\u201C\u201D]+|[""\u201C\u201D]+$/g, '').trim()
            if (text) { setInput(text); setTimeout(() => inputRef.current?.focus(), 50) }
          }
        }}
      >
        {/* Empty State — Claude style */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4 animate-fadeIn">
            <div className="max-w-2xl w-full text-center">
              <div className="mb-8">
                <div className="w-12 h-12 rounded-full bg-[#d97757] flex items-center justify-center mx-auto mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.9"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Xin chào! Tôi có thể giúp gì?</h2>
                <p className="text-[var(--text-secondary)] text-[15px]">Tra cứu mã HS, thuế suất, quy định hải quan Việt Nam — 11,871 mã HS & biểu thuế 2026</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {SUGGESTED_PROMPTS.map((item, i) => (
                  <button key={i} onClick={() => sendMessage(item.query)}
                    className="claude-prompt-card text-left p-4 rounded-2xl transition-all group">
                    <div className="text-lg mb-2">{item.icon}</div>
                    <div className="text-[13px] font-medium text-[var(--text-primary)] mb-0.5">{item.title}</div>
                    <div className="text-[12px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.map((msg, i) => (
              <div key={i} className="claude-message animate-fadeIn mb-2">
                {msg.role === 'user' ? (
                  <div className="claude-msg-user py-4">
                    <div className="flex gap-3">
                      <UserAvatar />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Bạn</div>
                        {msg.file && <div className="mb-2"><FilePreview file={msg.file} /></div>}
                        <div className="text-[15px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="claude-msg-assistant py-4">
                    <div className="flex gap-3">
                      <ClaudeAvatar />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">WA26</div>
                        {i === streamingIdx ? (
                          <StreamingText content={msg.content} onComplete={() => setStreamingIdx(-1)} scrollRef={messagesEndRef} />
                        ) : (
                          <div className="chat-content text-[15px] leading-[1.7] text-[var(--text-primary)]" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                        )}

                        {i !== streamingIdx && (
                          <div className="flex items-center gap-1 mt-3">
                            <button onClick={() => navigator.clipboard.writeText(msg.content)} className="claude-action-btn p-1.5 rounded-lg" title="Sao chép">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                            <button onClick={() => handleRetry(i)} className="claude-action-btn p-1.5 rounded-lg" title="Thử lại">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            </button>
                            <button onClick={() => sendFeedback(i, 'up')} className="claude-action-btn p-1.5 rounded-lg" title="Tốt">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                            </button>
                            <button onClick={() => sendFeedback(i, 'down')} className="claude-action-btn p-1.5 rounded-lg" title="Chưa tốt">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                            </button>
                          </div>
                        )}

                        {i !== streamingIdx && msg.debug && <DebugPanel debug={msg.debug} />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {loading && (
              <div className="claude-message animate-fadeIn mb-2">
                <div className="claude-msg-assistant py-4">
                  <div className="flex gap-3">
                    <ClaudeAvatar />
                    <div className="flex-1 pt-0.5">
                      <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">WA26</div>
                      <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm">
                        <div className="claude-thinking-dots flex gap-1">
                          <span /><span /><span />
                        </div>
                        <span className="text-[13px]">Đang suy nghĩ...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area — Claude style centered */}
      <div className="shrink-0 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          {attachedFile && (
            <div className="mb-2"><FilePreview file={attachedFile} onRemove={removeFile} /></div>
          )}
          <div className="claude-input-container">
            <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.mp3,.wav,.ogg,.m4a" onChange={handleFileSelect} className="hidden" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px' }}
              placeholder="Nhắn tin cho WA26..."
              rows={1}
              disabled={loading}
              className="claude-textarea"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}
                className="claude-action-btn p-2 rounded-lg" title="Đính kèm file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <div className="flex-1" />
              <button
                onClick={() => sendMessage()}
                disabled={!canSubmit}
                className={`p-2 rounded-xl transition-all ${canSubmit ? 'bg-[var(--accent-primary)] text-white hover:opacity-90' : 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]'}`}
                title="Gửi"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] text-center mt-2">WA26 sử dụng Gemini 2.0 Flash + HS Knowledge API. Kết quả mang tính tham khảo.</p>
        </div>
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
    <div className={`chat-content text-[15px] leading-[1.7] text-[var(--text-primary)] ${!done ? 'streaming' : ''}`}
      dangerouslySetInnerHTML={{ __html: formatMessage(displayed) }} />
  )
}
