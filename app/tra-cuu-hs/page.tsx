'use client'

import { useState, useCallback } from 'react'
import { Button, Input, Badge, Modal, ErrorMessage, Card, CardContent } from '@/components/common'

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

  const getWarningBadgeVariant = (level: string): 'error' | 'warning' | 'info' => {
    if (level === 'RED') return 'error'
    if (level === 'ORANGE') return 'warning'
    return 'info'
  }

  const getScoreBadgeVariant = (score: number): 'success' | 'warning' | 'info' => {
    if (score > 0.3) return 'success'
    if (score > 0.15) return 'warning'
    return 'info'
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-mono text-lg font-bold text-[#d97757]">{formatted}</span>
          {item.muc_canh_bao && (
            <span className="ml-3">
              <Badge variant={getWarningBadgeVariant(item.muc_canh_bao)}>
                {item.muc_canh_bao}
              </Badge>
            </span>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-1 text-[#1a1a1a]">{detail?.fact_layer?.vn || item.vn || item.hs}</h2>
      {(detail?.fact_layer?.en || item.en) && (
        <p className="text-[#5a5a5a] text-sm mb-4 italic">{detail?.fact_layer?.en || item.en}</p>
      )}

      {loading ? (
        <div className="text-center py-8 text-[#9a9a9a]">Đang tải chi tiết 9 tầng...</div>
      ) : (
        <>
          {/* Tax rates */}
          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            <Card variant="default">
              <CardContent className="p-3">
                <div className="text-[#5a5a5a] text-xs mb-1">Thuế NK (MFN)</div>
                <div className="font-bold text-lg text-[#d97757]">{rates.mfn != null ? `${rates.mfn}%` : '—'}</div>
              </CardContent>
            </Card>
            <Card variant="default">
              <CardContent className="p-3">
                <div className="text-[#5a5a5a] text-xs mb-1">ACFTA (TQ)</div>
                <div className="font-bold text-lg text-[#d97757]">{rates.acfta != null ? `${rates.acfta}%` : '—'}</div>
              </CardContent>
            </Card>
            <Card variant="default">
              <CardContent className="p-3">
                <div className="text-[#5a5a5a] text-xs mb-1">VAT</div>
                <div className="font-bold text-lg text-[#d97757]">{rates.vat != null ? `${rates.vat}%` : '—'}</div>
              </CardContent>
            </Card>
            {rates.atiga != null && (
              <Card variant="default">
                <CardContent className="p-3">
                  <div className="text-[#5a5a5a] text-xs mb-1">ATIGA (ASEAN)</div>
                  <div className="font-bold text-lg text-[#d97757]">{rates.atiga}%</div>
                </CardContent>
              </Card>
            )}
            {rates.ttdb != null && (
              <Card variant="default">
                <CardContent className="p-3">
                  <div className="text-[#5a5a5a] text-xs mb-1">TTĐB</div>
                  <div className="font-bold text-lg text-[#d97757]">{rates.ttdb}%</div>
                </CardContent>
              </Card>
            )}
            <Card variant="default">
              <CardContent className="p-3">
                <div className="text-[#5a5a5a] text-xs mb-1">ĐVT</div>
                <div className="font-semibold text-[#1a1a1a]">{detail?.fact_layer?.dvt || item.dvt || '—'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Policy warning */}
          {detail?.fact_layer?.chinh_sach && (
            <div className="mb-4 p-3 bg-[#fef3c7] border border-[#fcd34d] rounded-lg text-sm text-[#92400e]">
              <span className="font-medium">Chính sách: </span>{detail.fact_layer.chinh_sach}
            </div>
          )}

          {/* Legal layer */}
          {legal && (
            <div className="space-y-3 text-sm">
              {legal.chu_giai_chuong && (
                <details className="group">
                  <summary className="font-medium text-[#1a1a1a] cursor-pointer hover:text-[#d97757]">📋 Chú giải chương</summary>
                  <div className="mt-1 pl-4 text-[#5a5a5a] text-xs leading-relaxed max-h-40 overflow-y-auto">{String(legal.chu_giai_chuong).substring(0, 800)}</div>
                </details>
              )}
              {legal.bao_gom && legal.bao_gom.length > 0 && (
                <details className="group">
                  <summary className="font-medium text-[#1a1a1a] cursor-pointer hover:text-[#d97757]">✅ Bao gồm ({legal.bao_gom.length})</summary>
                  <ul className="mt-1 pl-6 text-[#5a5a5a] text-xs space-y-0.5 list-disc">{legal.bao_gom.slice(0, 10).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                </details>
              )}
              {legal.khong_bao_gom && legal.khong_bao_gom.length > 0 && (
                <details className="group">
                  <summary className="font-medium text-[#1a1a1a] cursor-pointer hover:text-[#d97757]">❌ Không bao gồm ({legal.khong_bao_gom.length})</summary>
                  <ul className="mt-1 pl-6 text-[#5a5a5a] text-xs space-y-0.5 list-disc">{legal.khong_bao_gom.slice(0, 10).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                </details>
              )}
              {legal.sen && (
                <details className="group">
                  <summary className="font-medium text-[#1a1a1a] cursor-pointer hover:text-[#d97757]">📌 SEN AHTN 2022</summary>
                  <div className="mt-1 pl-4 text-[#5a5a5a] text-xs leading-relaxed max-h-40 overflow-y-auto">{String(legal.sen).substring(0, 600)}</div>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
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

  const getWarningBadgeVariant = (level: string): 'error' | 'warning' | 'info' => {
    if (level === 'RED') return 'error'
    if (level === 'ORANGE') return 'warning'
    return 'info'
  }

  const getScoreBadgeVariant = (score: number): 'success' | 'warning' | 'info' => {
    if (score > 0.3) return 'success'
    if (score > 0.15) return 'warning'
    return 'info'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2 text-[#1a1a1a]">Tra cứu biểu thuế 2026</h1>
      <p className="text-[#5a5a5a] mb-6">
        Tìm kiếm trong 11,871 mã HS — 4 nguồn: biểu thuế, TB-TCHQ, SEN, conflict
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="VD: cảm biến nhiệt độ, máy bơm nước, 8517..."
          autoFocus
          className="flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          disabled={loading || !query.trim()}
          className="whitespace-nowrap"
        >
          {loading ? 'Đang tìm...' : 'Tìm kiếm'}
        </Button>
      </form>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {searched && !loading && results.length === 0 && !error && (
        <div className="text-center py-12 text-[#9a9a9a]">
          <div className="text-4xl mb-2">🔍</div>
          <p>Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Thử từ khoá khác hoặc nhập trực tiếp mã HS</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm text-[#5a5a5a] mb-3">
            Tìm thấy <strong>{results.length}</strong> kết quả. Nhấn vào hàng để xem chi tiết 9 tầng.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#e8e4dc] shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f9f7f3] border-b border-[#f0ece4]">
                  <th className="px-4 py-3 text-left font-semibold text-[#1a1a1a]">Mã HS</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#1a1a1a]">Mô tả hàng hoá</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#1a1a1a]">Cảnh báo</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#1a1a1a]">Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map(item => {
                  const formatted = item.hs.length === 8
                    ? `${item.hs.slice(0,4)}.${item.hs.slice(4,6)}.${item.hs.slice(6,8)}`
                    : item.hs
                  return (
                    <tr
                      key={item.hs}
                      className="border-b border-[#f0ece4] last:border-0 hover:bg-[#f9f7f3] cursor-pointer transition-colors"
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-[#d97757] whitespace-nowrap">{formatted}</td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="truncate text-[#5a5a5a]">{item.vn || (item as unknown as Record<string, string>).ten_vn || (item as unknown as Record<string, string>).mo_ta || item.hs}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.muc_canh_bao ? (
                          <Badge variant={getWarningBadgeVariant(item.muc_canh_bao)}>
                            {item.muc_canh_bao}
                          </Badge>
                        ) : (
                          <span className="text-[#9a9a9a]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.score != null ? (
                          <Badge variant={getScoreBadgeVariant(item.score)}>
                            {(item.score * 100).toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-[#9a9a9a]">—</span>
                        )}
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
