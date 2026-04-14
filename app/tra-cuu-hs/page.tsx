'use client'

import { useState, useCallback } from 'react'

const HS_API = process.env.NEXT_PUBLIC_HS_API_URL || 'https://hs-knowledge-api.vercel.app'

interface HSResult {
  hs: string
  vn?: string
  en?: string
  dvt?: string
  score?: number
  muc_canh_bao?: string
  fact_layer?: {
    vn?: string
    en?: string
    dvt?: string
    rates?: {
      mfn?: number | string
      acfta?: number | string
      atiga?: number | string
      vat?: number | string
      bvmt?: number | string
      ttdb?: number | string
    }
    chinh_sach?: string
    canh_bao_cs?: boolean
  }
  legal_layer?: {
    chu_giai_chuong?: string
    chu_giai_nhom?: string
    bao_gom?: string[]
    khong_bao_gom?: string[]
    sen?: string
  }
}

function DetailModal({ item, onClose }: { item: HSResult; onClose: () => void }) {
  const [detail, setDetail] = useState<HSResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function loadDetail() {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`${HS_API}/api/hs?hs=${encodeURIComponent(item.hs)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found !== false) setDetail(data)
      }
    } catch { /* skip */ }
    setLoading(false)
    setLoaded(true)
  }

  // Load detail on mount
  if (!loaded && !loading) loadDetail()

  const rates = detail?.fact_layer?.rates || {}
  const legal = detail?.legal_layer
  const formatted = `${item.hs.slice(0,4)}.${item.hs.slice(4,6)}.${item.hs.slice(6,8)}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="font-mono text-xl font-bold text-blue-700">{formatted}</span>
            {item.muc_canh_bao && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                item.muc_canh_bao === 'RED' ? 'bg-red-100 text-red-700' :
                item.muc_canh_bao === 'ORANGE' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{item.muc_canh_bao}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <h2 className="text-lg font-semibold mb-1">{detail?.fact_layer?.vn || item.vn || item.hs}</h2>
        {(detail?.fact_layer?.en || item.en) && (
          <p className="text-gray-500 text-sm mb-4 italic">{detail?.fact_layer?.en || item.en}</p>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">Đang tải chi tiết 9 tầng...</div>
        ) : (
          <>
            {/* Tax rates */}
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">Thuế NK (MFN)</div>
                <div className="font-bold text-lg">{rates.mfn != null ? `${rates.mfn}%` : '—'}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">ACFTA (TQ)</div>
                <div className="font-bold text-lg text-blue-700">{rates.acfta != null ? `${rates.acfta}%` : '—'}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">VAT</div>
                <div className="font-bold text-lg text-emerald-700">{rates.vat != null ? `${rates.vat}%` : '—'}</div>
              </div>
              {rates.atiga != null && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">ATIGA (ASEAN)</div>
                  <div className="font-bold text-lg text-purple-700">{rates.atiga}%</div>
                </div>
              )}
              {rates.ttdb != null && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">TTĐB</div>
                  <div className="font-bold text-lg text-amber-700">{rates.ttdb}%</div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">ĐVT</div>
                <div className="font-semibold">{detail?.fact_layer?.dvt || item.dvt || '—'}</div>
              </div>
            </div>

            {/* Policy warning */}
            {detail?.fact_layer?.chinh_sach && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <span className="font-medium">Chính sách: </span>{detail.fact_layer.chinh_sach}
              </div>
            )}

            {/* Legal layer */}
            {legal && (
              <div className="space-y-3 text-sm">
                {legal.chu_giai_chuong && (
                  <details className="group">
                    <summary className="font-medium text-gray-700 cursor-pointer hover:text-blue-700">📋 Chú giải chương</summary>
                    <div className="mt-1 pl-4 text-gray-600 text-xs leading-relaxed max-h-40 overflow-y-auto">{String(legal.chu_giai_chuong).substring(0, 800)}</div>
                  </details>
                )}
                {legal.bao_gom && legal.bao_gom.length > 0 && (
                  <details className="group">
                    <summary className="font-medium text-gray-700 cursor-pointer hover:text-blue-700">✅ Bao gồm ({legal.bao_gom.length})</summary>
                    <ul className="mt-1 pl-6 text-gray-600 text-xs space-y-0.5 list-disc">{legal.bao_gom.slice(0, 10).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  </details>
                )}
                {legal.khong_bao_gom && legal.khong_bao_gom.length > 0 && (
                  <details className="group">
                    <summary className="font-medium text-gray-700 cursor-pointer hover:text-blue-700">❌ Không bao gồm ({legal.khong_bao_gom.length})</summary>
                    <ul className="mt-1 pl-6 text-gray-600 text-xs space-y-0.5 list-disc">{legal.khong_bao_gom.slice(0, 10).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  </details>
                )}
                {legal.sen && (
                  <details className="group">
                    <summary className="font-medium text-gray-700 cursor-pointer hover:text-blue-700">📌 SEN AHTN 2022</summary>
                    <div className="mt-1 pl-4 text-gray-600 text-xs leading-relaxed max-h-40 overflow-y-auto">{String(legal.sen).substring(0, 600)}</div>
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function TraCuuHSPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HSResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<HSResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await fetch(`${HS_API}/api/search?q=${encodeURIComponent(q)}&limit=20`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()

      // Flatten results from all sources
      const all: HSResult[] = []
      const seen = new Set<string>()
      if (data.results) {
        for (const [, sourceData] of Object.entries(data.results)) {
          const items = (sourceData as { items?: HSResult[] })?.items || (Array.isArray(sourceData) ? sourceData as HSResult[] : [])
          for (const item of items) {
            const code = item.hs || (item as unknown as Record<string, string>).ma_hs || (item as unknown as Record<string, string>).hs_code
            if (code && !seen.has(code)) {
              seen.add(code)
              all.push({ ...item, hs: code })
            }
          }
        }
      }
      setResults(all)
    } catch {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query])

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Tra cứu biểu thuế 2026</h1>
      <p className="text-gray-500 mb-6">
        Tìm kiếm trong 11,871 mã HS — 4 nguồn: biểu thuế, TB-TCHQ, SEN, conflict
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="VD: cảm biến nhiệt độ, máy bơm nước, 8517..."
          className="flex-1 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          autoFocus />
        <button type="submit" disabled={loading || !query.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              Đang tìm...
            </span>
          ) : 'Tìm kiếm'}
        </button>
      </form>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

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
            Tìm thấy <strong>{results.length}</strong> kết quả. Nhấn vào hàng để xem chi tiết 9 tầng.
          </p>
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mã HS</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mô tả hàng hoá</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Cảnh báo</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map(item => {
                  const formatted = item.hs.length === 8
                    ? `${item.hs.slice(0,4)}.${item.hs.slice(4,6)}.${item.hs.slice(6,8)}`
                    : item.hs
                  return (
                    <tr key={item.hs}
                      className="border-b last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => setSelected(item)}>
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">{formatted}</td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="truncate">{item.vn || (item as unknown as Record<string, string>).ten_vn || (item as unknown as Record<string, string>).mo_ta || item.hs}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.muc_canh_bao ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.muc_canh_bao === 'RED' ? 'bg-red-100 text-red-700' :
                            item.muc_canh_bao === 'ORANGE' ? 'bg-orange-100 text-orange-700' :
                            item.muc_canh_bao === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{item.muc_canh_bao}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.score != null ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.score > 0.3 ? 'bg-green-100 text-green-700' : item.score > 0.15 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                          }`}>{(item.score * 100).toFixed(0)}%</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
