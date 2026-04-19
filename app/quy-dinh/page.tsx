'use client'

import { useState, useEffect } from 'react'
import { Button, Badge, ErrorMessage, Card, CardContent } from '@/components/common'

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

const CATEGORY_BADGE_VARIANTS: Record<string, 'primary' | 'warning' | 'error' | 'success' | 'info'> = {
  'thu-tuc': 'info',
  'chung-tu': 'primary',
  'thue': 'success',
  'kiem-tra': 'warning',
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
      <h1 className="text-3xl font-bold mb-2 text-[#1a1a1a]">Quy định Xuất Nhập Khẩu</h1>
      <p className="text-[#5a5a5a] mb-6">
        Các quy định, thủ tục và chính sách XNK Việt Nam – Trung Quốc
      </p>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(cat => (
          <Button
            key={cat.value}
            variant={category === cat.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-[#9a9a9a]">
          <div className="animate-pulse text-2xl mb-2">⏳</div>
          <p>Đang tải...</p>
        </div>
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {!loading && !error && regulations.length === 0 && (
        <div className="text-center py-12 text-[#9a9a9a]">
          <div className="text-4xl mb-2">📋</div>
          <p>Chưa có quy định nào trong danh mục này.</p>
        </div>
      )}

      {!loading && regulations.length > 0 && (
        <div className="space-y-3">
          {regulations.map(reg => (
            <Card
              key={reg.id}
              variant="hover"
              className="overflow-hidden cursor-pointer"
              onClick={() => setExpanded(expanded === reg.id ? null : reg.id)}
            >
              <button className="w-full text-left px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {reg.category && (
                      <Badge variant={CATEGORY_BADGE_VARIANTS[reg.category] ?? 'primary'}>
                        {CATEGORIES.find(c => c.value === reg.category)?.label ?? reg.category}
                      </Badge>
                    )}
                    {reg.effective_date && (
                      <span className="text-xs text-[#9a9a9a]">
                        Hiệu lực: {reg.effective_date}
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-base text-[#1a1a1a]">{reg.title}</h2>
                  {reg.source_document && (
                    <p className="text-xs text-[#9a9a9a] mt-0.5">{reg.source_document}</p>
                  )}
                </div>
                <span className="text-[#9a9a9a] mt-1 flex-shrink-0">
                  {expanded === reg.id ? '▲' : '▼'}
                </span>
              </button>

              {expanded === reg.id && reg.content_vi && (
                <div className="px-5 pb-4 border-t border-[#f0ece4] bg-[#f9f7f3]">
                  <p className="text-sm text-[#5a5a5a] whitespace-pre-wrap pt-3">
                    {reg.content_vi}
                  </p>
                  {reg.tags && reg.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3">
                      {reg.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-white border border-[#e8e4dc] rounded-full px-2 py-0.5 text-[#5a5a5a]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
