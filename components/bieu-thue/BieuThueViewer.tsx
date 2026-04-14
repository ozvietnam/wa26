'use client'

import { useState, useMemo, useRef, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import type { BieuThueRow, NoteData } from '@/lib/bieu-thue-types'
import { CHAPTERS } from '@/lib/bieu-thue-types'
import { transformChapterRecords, transformSearchResults } from '@/lib/bieu-thue-transform'

const HS_API = process.env.NEXT_PUBLIC_HS_API_URL || 'https://hs-knowledge-api.vercel.app'

// ── Exact Excel colors ──
const C = {
  headerBg: '#4e8c42',
  headerText: '#ffffff',
  headingBg: '#fdf6e3',
  subBg: '#edf5e8',
  rowWhite: '#ffffff',
  rowAlt: '#f8faf6',
  chapterBg: '#d6e8d0',
  border: '#b8b8b8',
  borderLight: '#d4d4d4',
  ink: '#1a1a1a',
  ink2: '#4a4a4a',
  ink3: '#808080',
  green: '#2e6b28',
  acftaHeader: '#b71c1c',
}

// ── Overlay context ──
interface OverlayState {
  setPanel: (p: PanelData | null) => void
  setModal: (m: ModalData | null) => void
}
interface PanelData extends NoteData { type: string; title: string }
interface ModalData extends NoteData { title: string }

const OvCtx = createContext<OverlayState>({ setPanel: () => {}, setModal: () => {} })

function OverlayProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelData | null>(null)
  const [modal, setModal] = useState<ModalData | null>(null)

  return (
    <OvCtx.Provider value={{ setPanel, setModal }}>
      {children}

      {/* LEFT PANEL — Chú giải */}
      {panel && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-black/35" onClick={() => setPanel(null)} />
          <div className="relative w-full max-w-[520px] h-full bg-white shadow-xl flex flex-col animate-slide-in-left">
            <div className="p-3 text-white flex justify-between items-center shrink-0" style={{ background: C.headerBg }}>
              <div>
                <div className="text-[10px] font-mono" style={{ color: '#b8dbb4' }}>{panel.type}</div>
                <div className="text-[13px] font-bold mt-0.5">{panel.title}</div>
              </div>
              <button onClick={() => setPanel(null)} className="border-none bg-white/20 text-white rounded px-3 py-1 cursor-pointer text-xs font-semibold">
                Dong
              </button>
            </div>
            {panel.summary && (
              <div className="p-2.5 border-b shrink-0" style={{ background: '#f4f9f2', borderColor: '#d6e8d0' }}>
                <div className="text-[9px] font-bold uppercase" style={{ color: C.green }}>TOM TAT</div>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: C.ink }}>{panel.summary}</p>
              </div>
            )}
            <div className="flex-1 overflow-auto p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="text-[9px] font-bold uppercase text-gray-400 mb-1.5">TOAN VAN</div>
              {panel.full.map((l, i) => (
                <p key={i} className="text-[13.5px] leading-[1.8]" style={{ margin: i ? '5px 0 0' : '0', paddingLeft: l.startsWith('  ') ? 14 : 0, whiteSpace: 'pre-wrap', color: C.ink }}>
                  {l}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CENTER MODAL — SEN */}
      {modal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/45" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-[480px] max-h-[85vh] bg-white rounded-lg shadow-2xl flex flex-col animate-fade-up">
            <div className="p-3 text-white rounded-t-lg shrink-0" style={{ background: '#1a5276' }}>
              <div className="text-[10px] font-mono" style={{ color: '#85c1e9' }}>SEN 2022 — GIAI THICH BO SUNG</div>
              <div className="text-[13px] font-bold mt-0.5">{modal.title}</div>
            </div>
            {modal.summary && (
              <div className="p-2.5 border-b shrink-0" style={{ background: '#eaf2f8', borderColor: '#d4e6f1' }}>
                <div className="text-[9px] font-bold uppercase" style={{ color: '#1a5276' }}>TOM TAT</div>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: C.ink }}>{modal.summary}</p>
              </div>
            )}
            <div className="flex-1 overflow-auto p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="text-[9px] font-bold uppercase text-gray-400 mb-1.5">TOAN VAN</div>
              {modal.full.map((l, i) => (
                <p key={i} className="text-[13px] leading-[1.7]" style={{ margin: i ? '4px 0 0' : '0', paddingLeft: l.startsWith('  ') ? 14 : 0, whiteSpace: 'pre-wrap' }}>
                  {l}
                </p>
              ))}
            </div>
            <button onClick={() => setModal(null)} className="p-2.5 border-t border-gray-200 bg-gray-50 rounded-b-lg cursor-pointer text-[13px] font-bold" style={{ color: '#1a5276' }}>
              Da doc — Dong
            </button>
          </div>
        </div>
      )}
    </OvCtx.Provider>
  )
}

// ── HS Code with bold last 2 digits ──
function HSCode({ code, q }: { code: string; q: string }) {
  if (!code) return null
  const s = String(code)

  if (s.length <= 4) {
    return (
      <span className="font-mono font-bold" style={{ fontSize: s.length <= 2 ? 13 : 12, color: C.green }}>
        <HL text={s} q={q} />
      </span>
    )
  }

  const prefix = s.slice(0, -2)
  const suffix = s.slice(-2)

  return (
    <span className="font-mono text-[11.5px]" style={{ color: C.ink }}>
      <HL text={prefix} q={q} />
      <span className="font-extrabold"><HL text={suffix} q={q} /></span>
    </span>
  )
}

// ── Highlight search match ──
function HL({ text, q }: { text: string; q: string }) {
  if (!q || q.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded-sm px-px">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

// ── Search in loaded data ──
function getLocalMatches(q: string, data: BieuThueRow[]): Set<number> {
  if (!q || q.length < 2) return new Set()
  const s = q.toLowerCase()
  const m = new Set<number>()
  data.forEach((r, i) => {
    if ((r.code && r.code.includes(s)) || r.desc.toLowerCase().includes(s)) m.add(i)
  })
  return m
}

// ── Shared cell style ──
const bdr = `1px solid ${C.border}`
const bdrL = `1px solid ${C.borderLight}`

// ── Tax cell ──
function TaxCell({ val, isAcfta }: { val?: string; isAcfta?: boolean }) {
  const z = val === '0'
  return (
    <td
      className="px-1 py-[3px] align-top text-center font-mono"
      style={{
        fontSize: 11,
        borderBottom: bdrL,
        borderRight: bdrL,
        width: isAcfta ? 50 : 44,
        color: z ? '#0a7a00' : isAcfta ? '#b71c1c' : C.ink,
        fontWeight: z ? 700 : isAcfta ? 700 : 400,
        background: z ? '#e8f5e9' : isAcfta ? '#fff8f8' : 'transparent',
      }}
    >
      {val || ''}
    </td>
  )
}

// ── Table row — matches Excel screenshot exactly ──
function TableRow({ row, idx, q, hit }: { row: BieuThueRow; idx: number; q: string; hit: boolean }) {
  const { setPanel, setModal } = useContext(OvCtx)

  // CHAPTER — full-width green band
  if (row.type === 'chapter') {
    return (
      <tr data-idx={idx} style={{ background: C.chapterBg }}>
        <td colSpan={8} className="px-2 py-[5px] font-bold leading-snug" style={{ fontSize: 12, borderBottom: `2px solid ${C.headerBg}`, color: C.green }}>
          <span className="font-mono mr-1.5" style={{ fontSize: 13 }}>{'Ch\u01b0\u01a1ng'} {row.code}</span>
          <HL text={row.desc} q={q} />
          {row.note && (
            <button
              onClick={() => setPanel({ type: `Chu giai Chuong ${row.code}`, title: `Chuong ${row.code} — ${row.desc}`, ...row.note! })}
              className="ml-1 border rounded-sm px-0.5 cursor-pointer font-semibold align-middle"
              style={{ fontSize: 9, borderColor: '#c8e6c9', color: C.green, background: '#edf5e8' }}
            >{"📜"}</button>
          )}
        </td>
      </tr>
    )
  }

  // HEADING (4-digit) — V empty | code | desc spans rest
  if (row.type === 'heading') {
    return (
      <tr data-idx={idx} style={{ background: C.headingBg }}>
        <td className="px-1 py-[3px] align-top" style={{ borderBottom: bdr, borderRight: bdrL, width: 24 }} />
        <td className="px-1 py-[3px] align-top whitespace-nowrap" style={{ borderBottom: bdr, borderRight: bdrL }}>
          <HSCode code={row.code} q={q} />
        </td>
        <td colSpan={6} className="px-1.5 py-[3px] align-top leading-snug" style={{ fontSize: 11, borderBottom: bdr, color: C.ink, fontWeight: 600 }}>
          <HL text={row.desc} q={q} />
          {row.note && (
            <button
              onClick={() => setPanel({ type: `Chu giai nhom ${row.code}`, title: row.desc.slice(0, 80), ...row.note! })}
              className="ml-1 border rounded-sm px-0.5 cursor-pointer font-semibold align-middle"
              style={{ fontSize: 9, borderColor: '#c8e6c9', color: C.green, background: '#edf5e8' }}
            >{"📜"}</button>
          )}
        </td>
      </tr>
    )
  }

  // SUB (6-digit or desc-only) — V | code | desc spans rest
  if (row.type === 'sub') {
    return (
      <tr data-idx={idx} style={{ background: row.v === 1 ? C.subBg : '#fff' }}>
        <td className="px-1 py-[3px] align-top text-center font-mono" style={{ fontSize: 10, borderBottom: bdrL, borderRight: bdrL, width: 24, color: C.ink3 }}>
          {row.v && row.v > 0 ? row.v : ''}
        </td>
        <td className="px-1 py-[3px] align-top whitespace-nowrap" style={{ borderBottom: bdrL, borderRight: bdrL }}>
          <HSCode code={row.code} q={q} />
        </td>
        <td colSpan={6} className="px-1.5 py-[3px] align-top leading-snug" style={{ fontSize: 11, borderBottom: bdrL, fontWeight: row.v === 1 ? 600 : 400, color: C.ink }}>
          <HL text={row.desc} q={q} />
        </td>
      </tr>
    )
  }

  // ITEM (8-digit) — all columns
  const isAlt = idx % 2 === 1
  const bg = hit ? '#fffff0' : isAlt ? C.rowAlt : C.rowWhite
  const bl = hit ? '3px solid #c8a800' : '3px solid transparent'

  return (
    <tr data-idx={idx} style={{ background: bg, borderLeft: bl }}>
      {/* V */}
      <td className="px-1 py-[3px] align-top text-center font-mono" style={{ fontSize: 10, borderBottom: bdrL, borderRight: bdrL, width: 24, color: C.ink3 }}>
        {row.v && row.v > 0 ? row.v : ''}
      </td>
      {/* Mã hàng */}
      <td className="px-1 py-[3px] align-top whitespace-nowrap" style={{ borderBottom: bdrL, borderRight: bdrL }}>
        <HSCode code={row.code} q={q} />
        {row.mucCanhBao && (
          <span className={`ml-0.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${
            row.mucCanhBao === 'RED' ? 'bg-red-500' :
            row.mucCanhBao === 'ORANGE' ? 'bg-orange-400' :
            'bg-yellow-400'
          }`} title={row.mucCanhBao} />
        )}
      </td>
      {/* Mô tả */}
      <td className="px-1.5 py-[3px] align-top leading-snug" style={{ fontSize: 11, borderBottom: bdrL, borderRight: bdrL, color: C.ink }}>
        <HL text={row.desc} q={q} />
        {row.sen && (
          <sup
            onClick={() => setModal({ title: `Ma ${row.code}`, ...row.sen! })}
            className="cursor-pointer font-mono font-bold ml-0.5"
            style={{ fontSize: 8, color: '#1a5276' }}
          >(SEN)</sup>
        )}
      </td>
      {/* ĐVT */}
      <td className="px-1 py-[3px] align-top text-center" style={{ fontSize: 10, borderBottom: bdrL, borderRight: bdrL, color: C.ink3, width: 42 }}>{row.unit}</td>
      {/* Tax columns */}
      <TaxCell val={row.nkud} />
      <TaxCell val={row.vat} />
      <TaxCell val={row.acfta} isAcfta />
      {/* Chính sách */}
      <td className="px-1 py-[3px] align-top text-center" style={{ fontSize: 10, borderBottom: bdrL, width: 28 }}>
        {row.policies?.map((p, i) => (
          <span key={i} title={p} className="cursor-help">{"⚠️"}</span>
        ))}
      </td>
    </tr>
  )
}

// ── Landing hero ──
function LandingHero({ onSelectChapter, onFocusSearch }: { onSelectChapter: (ch: number) => void; onFocusSearch: () => void }) {
  const marqueeItems = [
    { icon: '📊', old: 'Mo file Excel 200MB, cuon tim ma', now: 'Go ma HS, ket qua 1 giay' },
    { icon: '📜', old: 'Mo file chu giai rieng, tra cuu thu cong', now: 'Nhan 📜 xem chu giai nguyen van ngay tai dong' },
    { icon: '📘', old: 'Tim SEN 2022 trong tai lieu 800 trang', now: 'Nhan SEN — popup giai thich bo sung lien ma' },
    { icon: '📋', old: 'Tim TB-TCHQ tren website Hai quan', now: '4,390 tien le phan loai gan san vao tung ma HS' },
    { icon: '📱', old: 'File Excel khong doc duoc tren dien thoai', now: 'Giao dien toi uu cho mobile, tablet, desktop' },
    { icon: '🔍', old: 'Khong biet ma HS, khong tim duoc', now: 'Tim theo ten hang hoa tieng Viet, ket qua thong minh' },
    { icon: '⚠️', old: 'Khong biet hang co can kiem tra chuyen nganh', now: 'Canh bao KTCN tu dong — 7,365 ma, 9 bo nganh' },
    { icon: '📈', old: 'So sanh thue FTA phai mo nhieu bang', now: '19 bieu thue uu dai tren 1 giao dien' },
  ]

  const popularChapters = [
    { ch: 84, label: 'Ch.84 — May moc' },
    { ch: 85, label: 'Ch.85 — Dien tu' },
    { ch: 39, label: 'Ch.39 — Plastic' },
    { ch: 72, label: 'Ch.72 — Sat thep' },
    { ch: 87, label: 'Ch.87 — Xe co' },
    { ch: 73, label: 'Ch.73 — SP sat thep' },
    { ch: 61, label: 'Ch.61 — May mac' },
    { ch: 90, label: 'Ch.90 — Quang hoc' },
  ]

  return (
    <div className="bg-gradient-to-b from-green-50 to-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {"Bieu thue XNK 2026"}
        </h1>
        <p className="text-gray-500 text-sm md:text-base mb-1">
          {"11,871 ma HS • 19 bieu thue FTA • Chu giai • SEN 2022 • TB-TCHQ"}
        </p>
        <p className="text-gray-400 text-xs mb-6">
          {"ND 144/2024/ND-CP • TT 31/2022/TT-BTC • Co hieu luc 06/01/2026"}
        </p>

        {/* CTA buttons */}
        <div className="flex gap-3 justify-center flex-wrap mb-8">
          <button
            onClick={onFocusSearch}
            className="px-5 py-2.5 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition text-sm"
          >
            {"🔍 Tim ma HS"}
          </button>
          <button
            onClick={() => onSelectChapter(85)}
            className="px-5 py-2.5 border border-green-700 text-green-700 rounded-lg font-medium hover:bg-green-50 transition text-sm"
          >
            {"📋 Duyet theo chuong"}
          </button>
        </div>
      </div>

      {/* Scrolling comparison ticker */}
      <div className="overflow-hidden border-y border-green-200 bg-green-50/50 py-3">
        <div className="animate-marquee flex gap-12 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <div key={i} className="inline-flex items-center gap-3 text-sm">
              <span className="text-lg">{item.icon}</span>
              <span className="text-gray-400 line-through text-xs">{item.old}</span>
              <span className="text-green-600">{"→"}</span>
              <span className="text-green-800 font-medium text-xs">{item.now}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Popular chapters quick access */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Chuong pho bien</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {popularChapters.map(({ ch, label }) => (
            <button
              key={ch}
              onClick={() => onSelectChapter(ch)}
              className="text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition text-sm text-gray-700"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Chapter selector dropdown ──
function ChapterSelector({ selected, onSelect }: { selected: number | null; onSelect: (ch: number) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50"
      >
        <span className="text-green-700 font-semibold">
          {selected ? `Ch.${String(selected).padStart(2, '0')}` : 'Chon chuong'}
        </span>
        <svg className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 max-h-[60vh] overflow-auto bg-white border rounded-lg shadow-xl z-[100]">
          {CHAPTERS.map(ch => (
            <button
              key={ch.chapter}
              onClick={() => { onSelect(ch.chapter); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-green-50 border-b border-gray-100 transition ${
                selected === ch.chapter ? 'bg-green-100 font-semibold' : ''
              }`}
            >
              <span className="font-mono font-bold text-green-700 mr-2">{String(ch.chapter).padStart(2, '0')}</span>
              <span className="text-gray-700">{ch.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Main export ──
export function BieuThueViewer() {
  const params = useSearchParams()
  const hsParam = params.get('hs')

  const [view, setView] = useState<'landing' | 'table'>('landing')
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [data, setData] = useState<BieuThueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchRaw, setSearchRaw] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchMode, setSearchMode] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const tbRef = useRef<HTMLTableElement>(null)

  // Debounce local search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearchQ(searchRaw.trim()), 200)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchRaw])

  const localMatched = useMemo(() => getLocalMatches(searchQ, data), [searchQ, data])

  // Auto-scroll to first match
  useEffect(() => {
    if (localMatched.size > 0 && tbRef.current) {
      const first = Array.from(localMatched)[0]
      const row = tbRef.current.querySelector(`tr[data-idx="${first}"]`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [localMatched])

  // Load chapter
  const loadChapter = useCallback(async (ch: number) => {
    setLoading(true)
    setError(null)
    setSearchMode(false)
    setSearchRaw('')
    try {
      const res = await fetch(`${HS_API}/api/chapter?chapter=${ch}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      const chInfo = CHAPTERS.find(c => c.chapter === ch)
      const rows = transformChapterRecords(json.records || [], ch, chInfo?.title || `Chuong ${ch}`)
      setData(rows)
      setSelectedChapter(ch)
      setView('table')
    } catch {
      setError('Khong the tai du lieu chuong. Vui long thu lai.')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  // API search
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchRaw.trim()
    if (!q) return

    // If in table view with data loaded, just use local filter
    if (data.length > 0 && !searchMode) {
      setSearchQ(q)
      return
    }

    // Otherwise do API search
    setLoading(true)
    setError(null)
    setSearchMode(true)
    try {
      const res = await fetch(`${HS_API}/api/search?q=${encodeURIComponent(q)}&limit=30`)
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const json = await res.json()
      const rows = transformSearchResults(json.results || {})
      setData(rows)
      setSelectedChapter(null)
      setView('table')
    } catch {
      setError('Tim kiem that bai. Vui long thu lai.')
    } finally {
      setLoading(false)
    }
  }, [searchRaw, data.length, searchMode])

  // Handle hs param from URL
  useEffect(() => {
    if (hsParam) {
      const code = hsParam.replace(/\./g, '')
      setSearchRaw(code)
      // Determine chapter from code
      const ch = parseInt(code.slice(0, 2))
      if (ch >= 1 && ch <= 97) {
        loadChapter(ch)
      }
    }
  }, [hsParam, loadChapter])

  const handleSelectChapter = useCallback((ch: number) => {
    loadChapter(ch)
  }, [loadChapter])

  const handleFocusSearch = useCallback(() => {
    setView('table')
    setSearchMode(true)
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  const thStyle: React.CSSProperties = { borderBottom: `2px solid ${C.green}`, borderRight: '1px solid #3d7a42', fontSize: 10.5, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', padding: '5px 3px' }
  const thBase = 'text-center whitespace-nowrap'

  return (
    <OverlayProvider>
      <div className="min-h-screen" style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}>

        {view === 'landing' && (
          <LandingHero onSelectChapter={handleSelectChapter} onFocusSearch={handleFocusSearch} />
        )}

        {view === 'table' && (
          <div style={{ background: '#e8e8e8' }}>
            {/* Header bar */}
            <div className="px-2.5 py-2 text-white flex justify-between items-center" style={{ background: C.headerBg }}>
              <div className="flex items-center gap-3">
                <button onClick={() => { setView('landing'); setData([]); setSelectedChapter(null); setSearchMode(false); setSearchRaw('') }} className="text-white/80 hover:text-white text-sm">
                  {"← Trang chinh"}
                </button>
                <div>
                  <div className="text-[13px] font-bold">BIEU THUE XNK 2026</div>
                  <div className="text-[9px] font-mono" style={{ color: '#b8dbb4' }}>ND 144/2024 . TT 31/2022 . SEN 2022</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChapterSelector selected={selectedChapter} onSelect={handleSelectChapter} />
                <div className="text-[8px] text-right leading-relaxed hidden md:block" style={{ color: '#c8e6c9' }}>
                  <span className="bg-blue-50 text-blue-900 px-1 rounded-sm font-bold font-mono">SEN</span> nhan = modal
                  <br />{"📜 nhan = panel trai"}
                </div>
              </div>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="sticky top-0 z-50 bg-white px-2.5 py-1.5 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-xs text-gray-400">{"🔍"}</span>
              <input
                ref={searchRef}
                value={searchRaw}
                onChange={e => setSearchRaw(e.target.value)}
                placeholder={data.length > 0 && !searchMode ? 'Loc trong chuong...' : 'Ma HS hoac ten hang hoa...'}
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm outline-none bg-gray-50 focus:border-green-400 focus:ring-1 focus:ring-green-200"
              />
              {searchRaw && (
                <button type="button" onClick={() => { setSearchRaw(''); setSearchQ('') }} className="border-none bg-transparent text-gray-400 text-base cursor-pointer">
                  {"✕"}
                </button>
              )}
              {(searchMode || data.length === 0) && (
                <button type="submit" disabled={loading || !searchRaw.trim()} className="px-3 py-1.5 bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50">
                  {loading ? 'Dang tim...' : 'Tim'}
                </button>
              )}
            </form>

            {/* Search result count */}
            {searchQ && data.length > 0 && !searchMode && (
              <div
                className="px-2.5 py-0.5 text-[11px] font-mono"
                style={{
                  color: localMatched.size > 0 ? C.green : '#c00',
                  background: localMatched.size > 0 ? '#f4f9f2' : '#fff5f5',
                  borderBottom: `1px solid ${C.borderLight}`,
                }}
              >
                {localMatched.size > 0 ? `${localMatched.size} ket qua` : 'Khong tim thay trong chuong nay'}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm text-center">{error}</div>
            )}

            {/* Loading */}
            {loading && (
              <div className="p-12 text-center text-gray-400">
                <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-green-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Dang tai du lieu...
              </div>
            )}

            {/* Empty state */}
            {!loading && data.length === 0 && !error && (
              <div className="p-12 text-center text-gray-400">
                <div className="text-4xl mb-3">{"📋"}</div>
                <p className="font-medium mb-1">Chon chuong hoac tim kiem de bat dau</p>
                <p className="text-xs">97 chuong . 11,871 ma HS . Du lieu bieu thue 2026</p>
              </div>
            )}

            {/* Table */}
            {!loading && data.length > 0 && (
              <div className="bg-white">
                <table ref={tbRef} className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    {/* Main header */}
                    <tr style={{ background: C.headerBg, color: C.headerText }}>
                      <th className={thBase} style={{ ...thStyle, width: 24 }}>V</th>
                      <th className={thBase} style={{ ...thStyle, textAlign: 'left', paddingLeft: 6 }}>{"M\u00e3 h\u00e0ng"}</th>
                      <th className={thBase} style={{ ...thStyle, textAlign: 'left', paddingLeft: 6 }}>{"M\u00f4 t\u1ea3 h\u00e0ng ho\u00e1 - Ti\u1ebfng Vi\u1ec7t"}</th>
                      <th className={thBase} style={{ ...thStyle, width: 42 }}>{"ĐVT"}</th>
                      <th className={thBase} style={{ ...thStyle, width: 50 }}>{"NK \u01b0u \u0111\u00e3i"}</th>
                      <th className={thBase} style={{ ...thStyle, width: 38 }}>VAT</th>
                      <th className={thBase} style={{ ...thStyle, width: 50, background: C.acftaHeader, fontWeight: 800 }}>ACFTA</th>
                      <th className={thBase} style={{ ...thStyle, width: 28, borderRight: 'none' }}>{"⚠"}</th>
                    </tr>
                    {/* Sub-header A, B, C */}
                    <tr style={{ background: C.headerBg, color: '#c8e6c9' }}>
                      <td style={{ borderBottom: `1px solid ${C.green}`, borderRight: '1px solid #3d7a42', padding: '1px 3px', fontSize: 9, fontStyle: 'italic', textAlign: 'center' }}>A</td>
                      <td style={{ borderBottom: `1px solid ${C.green}`, borderRight: '1px solid #3d7a42', padding: '1px 6px', fontSize: 9, fontStyle: 'italic' }}>B</td>
                      <td style={{ borderBottom: `1px solid ${C.green}`, borderRight: '1px solid #3d7a42', padding: '1px 6px', fontSize: 9, fontStyle: 'italic' }}>C</td>
                      <td colSpan={5} style={{ borderBottom: `1px solid ${C.green}`, padding: '1px 3px', fontSize: 9, fontStyle: 'italic', textAlign: 'center' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <TableRow key={`${row.code}-${idx}`} row={row} idx={idx} q={searchQ} hit={localMatched.has(idx)} />
                    ))}
                  </tbody>
                </table>

                <div className="p-2 text-[9px] text-gray-400 font-mono text-center bg-gray-100">
                  WA26 . Bieu thue XNK 2026 . {data.filter(r => r.type === 'item').length} dong du lieu . 2 so cuoi ma 8 so in dam
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-slide-in-left { animation: slide-in-left 0.18s ease-out; }
        .animate-fade-up { animation: fade-up 0.18s ease-out; }
        .animate-marquee { animation: marquee 60s linear infinite; }
      `}</style>
    </OverlayProvider>
  )
}
