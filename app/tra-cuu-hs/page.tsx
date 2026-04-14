'use client'

import { useState, useCallback } from 'react'

interface HSCodeResult {
  id: string
  code: string
  description_vi: string
  description_en: string | null
  unit: string | null
  tax_rate_normal: number | null
  tax_rate_preferential: number | null
  tax_rate_special: number | null
  notes: string | null
  similarity_score: number | null
}

interface SearchResponse {
  results: HSCodeResult[]
  total: number
  query: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function DetailModal({
  item,
  onClose,
}: {
  item: HSCodeResult
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="font-mono text-lg font-bold text-primary">{item.code}</span>
            {item.similarity_score !== null && (
              <span className="ml-2 text-xs text-gray-400">
                độ khớp {(item.similarity_score * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <h2 className="text-xl font-semibold mb-1">{item.description_vi}</h2>
        {item.description_en && (
          <p className="text-gray-500 text-sm mb-4 italic">{item.description_en}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500 mb-1">Thuế MFN</div>
            <div className="font-semibold text-lg">
              {item.tax_rate_normal !== null ? `${item.tax_rate_normal}%` : '—'}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-gray-500 mb-1">Thuế ưu đãi (ACFTA)</div>
            <div className="font-semibold text-lg text-primary">
              {item.tax_rate_preferential !== null ? `${item.tax_rate_preferential}%` : '—'}
            </div>
          </div>
          {item.tax_rate_special !== null && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-gray-500 mb-1">Thuế đặc biệt</div>
              <div className="font-semibold text-lg text-amber-700">
                {item.tax_rate_special}%
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500 mb-1">Đơn vị tính</div>
            <div className="font-semibold">{item.unit ?? '—'}</div>
          </div>
        </div>

        {item.notes && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
            <span className="font-medium">Ghi chú: </span>
            {item.notes}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TraCuuHSPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HSCodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<HSCodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const q = query.trim()
      if (!q) return

      setLoading(true)
      setError(null)
      setSearched(true)

      try {
        const res = await fetch(
          `${API_URL}/api/hs-codes/search?q=${encodeURIComponent(q)}&limit=20`
        )
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data: SearchResponse = await res.json()
        setResults(data.results)
      } catch (err) {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [query]
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Tra cứu mã HS</h1>
      <p className="text-gray-500 mb-6">
        Tìm kiếm mã HS code theo tên hàng hoá (tiếng Việt) hoặc mã số
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="VD: điện thoại, máy tính, thép, 8517..."
          className="flex-1 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-base"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang tìm...
            </span>
          ) : (
            'Tìm kiếm'
          )}
        </button>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🔍</div>
          <p>Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Thử từ khoá khác hoặc nhập trực tiếp mã HS</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Tìm thấy <strong>{results.length}</strong> kết quả. Nhấn vào hàng để xem chi tiết.
          </p>
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mã HS</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mô tả hàng hoá</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">Thuế MFN</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">ACFTA</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">ĐVT</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Khớp</th>
                </tr>
              </thead>
              <tbody>
                {results.map(item => (
                  <tr
                    key={item.code}
                    className="border-b last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(item)}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-primary whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="truncate">{item.description_vi}</div>
                      {item.description_en && (
                        <div className="text-xs text-gray-400 truncate">{item.description_en}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.tax_rate_normal !== null ? `${item.tax_rate_normal}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary font-medium">
                      {item.tax_rate_preferential !== null ? `${item.tax_rate_preferential}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.unit ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.similarity_score !== null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.similarity_score > 0.3
                              ? 'bg-green-100 text-green-700'
                              : item.similarity_score > 0.15
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {(item.similarity_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
