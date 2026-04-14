'use client'

import { useState, useEffect } from 'react'

interface Regulation {
  id: string
  category: string | null
  title: string
  content_vi: string | null
  effective_date: string | null
  source_document: string | null
  tags: string[]
  created_at: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const CATEGORIES = [
  { value: '', label: 'Tất cả' },
  { value: 'thu-tuc', label: 'Thủ tục' },
  { value: 'chung-tu', label: 'Chứng từ' },
  { value: 'thue', label: 'Thuế' },
  { value: 'kiem-tra', label: 'Kiểm tra' },
]

const CATEGORY_COLORS: Record<string, string> = {
  'thu-tuc': 'bg-blue-100 text-blue-700',
  'chung-tu': 'bg-purple-100 text-purple-700',
  'thue': 'bg-green-100 text-green-700',
  'kiem-tra': 'bg-amber-100 text-amber-700',
}

export default function QuyDinhPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const url = new URL(`${API_URL}/api/regulations`)
    if (category) url.searchParams.set('category', category)

    fetch(url.toString())
      .then(r => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`)
        return r.json()
      })
      .then((data: Regulation[]) => setRegulations(data))
      .catch(() => setError('Không thể tải danh sách quy định.'))
      .finally(() => setLoading(false))
  }, [category])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Quy định Xuất Nhập Khẩu</h1>
      <p className="text-gray-500 mb-6">
        Các quy định, thủ tục và chính sách XNK Việt Nam – Trung Quốc
      </p>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-pulse text-2xl mb-2">⏳</div>
          <p>Đang tải...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && regulations.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <p>Chưa có quy định nào trong danh mục này.</p>
        </div>
      )}

      {!loading && regulations.length > 0 && (
        <div className="space-y-3">
          {regulations.map(reg => (
            <div
              key={reg.id}
              className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
                onClick={() => setExpanded(expanded === reg.id ? null : reg.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {reg.category && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          CATEGORY_COLORS[reg.category] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {CATEGORIES.find(c => c.value === reg.category)?.label ?? reg.category}
                      </span>
                    )}
                    {reg.effective_date && (
                      <span className="text-xs text-gray-400">
                        Hiệu lực: {reg.effective_date}
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-base">{reg.title}</h2>
                  {reg.source_document && (
                    <p className="text-xs text-gray-400 mt-0.5">{reg.source_document}</p>
                  )}
                </div>
                <span className="text-gray-400 mt-1 flex-shrink-0">
                  {expanded === reg.id ? '▲' : '▼'}
                </span>
              </button>

              {expanded === reg.id && reg.content_vi && (
                <div className="px-5 pb-4 border-t bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap pt-3">
                    {reg.content_vi}
                  </p>
                  {reg.tags && reg.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3">
                      {reg.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-white border rounded-full px-2 py-0.5 text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
