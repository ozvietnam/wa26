'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  debug?: Record<string, unknown>
}

const SAMPLE_QUERIES = [
  'Cảm biến nhiệt độ công nghiệp',
  'Máy bơm nước ly tâm',
  'Pin mặt trời tấm panel',
  'Ốc vít thép không gỉ M8',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const [showDebug, setShowDebug] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    setInput('')
    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, sessionId }),
      })
      const data = await res.json()

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || 'Không nhận được phản hồi.',
        timestamp: new Date().toISOString(),
        debug: data.debug,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, đã xảy ra lỗi kết nối. Vui lòng thử lại.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendFeedback = async (msgIndex: number, rating: 'up' | 'down') => {
    const msg = messages[msgIndex]
    if (!msg) return

    // Extract HS code from response for learning
    const hsMatch = msg.content.match(/\b(\d{4})[.\s]?(\d{2})[.\s]?(\d{2})\b/)
    const hsCode = hsMatch ? hsMatch[1] + hsMatch[2] + hsMatch[3] : undefined

    // Extract product name from user message before this
    const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : undefined
    const productName = userMsg?.role === 'user' ? userMsg.content.substring(0, 100) : undefined

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messageIndex: msgIndex, rating, productName, hsCode }),
      })
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Chatbot Hải quan AI</h1>
          <p className="text-xs text-gray-500">Tra cứu mã HS, thuế suất, quy định — Powered by Gemini</p>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
        >
          {showDebug ? 'Ẩn debug' : 'Debug'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏛️</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Chào mừng bạn!</h2>
            <p className="text-gray-500 mb-6">Mô tả hàng hóa, tôi sẽ tra mã HS và thuế suất cho bạn.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 text-sm bg-white border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white border shadow-sm rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none text-gray-800">
                  <FormattedMessage content={msg.content} onFollowUp={sendMessage} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Feedback + Debug for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => sendFeedback(i, 'up')} className="text-gray-400 hover:text-green-500 text-sm" title="Hữu ích">👍</button>
                  <button onClick={() => sendFeedback(i, 'down')} className="text-gray-400 hover:text-red-500 text-sm" title="Chưa đúng">👎</button>
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="text-gray-400 hover:text-blue-500 text-sm ml-auto" title="Copy"
                  >📋</button>
                </div>
              )}

              {/* Debug panel */}
              {showDebug && msg.debug && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-gray-400">Debug info</summary>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-[10px] overflow-x-auto max-h-48">
                    {JSON.stringify(msg.debug, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mô tả hàng hóa cần tra cứu..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FORMATTED MESSAGE — render markdown-like response
// ============================================================
function FormattedMessage({ content, onFollowUp }: { content: string; onFollowUp: (text: string) => void }) {
  // Parse follow-up suggestions (lines starting with → or *)
  const lines = content.split('\n')
  const parts: React.ReactNode[] = []
  let currentBlock: string[] = []

  const flushBlock = () => {
    if (currentBlock.length > 0) {
      const text = currentBlock.join('\n')
      parts.push(
        <div key={parts.length} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
          __html: formatText(text)
        }} />
      )
      currentBlock = []
    }
  }

  for (const line of lines) {
    const followUpMatch = line.match(/^[→*]\s*["""](.+?)["""]/)
    if (followUpMatch) {
      flushBlock()
      const suggestion = followUpMatch[1]
      parts.push(
        <button
          key={parts.length}
          onClick={() => onFollowUp(suggestion)}
          className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition w-full"
        >
          → {suggestion}
        </button>
      )
    } else {
      currentBlock.push(line)
    }
  }
  flushBlock()

  return <>{parts}</>
}

function formatText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, title) => {
      const level = hashes.length
      const sizes = ['text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold']
      return `<div class="${sizes[level - 1] || sizes[2]} mt-2 mb-1">${title}</div>`
    })
    .replace(/\|(.+)\|/g, (match) => {
      // Simple table detection
      if (match.includes('---')) return match
      return match
    })
}
