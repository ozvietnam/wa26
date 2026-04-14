/**
 * Transform HS Knowledge API response → BieuThueRow[] for Excel-like table
 * API: hs-knowledge-api.vercel.app
 */

import type { BieuThueRow, NoteData } from './bieu-thue-types'

interface APIRecord {
  hs: string
  chapter: number
  heading: string
  subheading: string
  parent_hs: string | null
  fact_layer?: {
    vn?: string
    en?: string
    dvt?: string
    rates?: Record<string, string | number | null>
    chinh_sach?: string
    canh_bao_cs?: boolean
    muc_canh_bao?: string
    [key: string]: unknown
  }
  legal_layer?: {
    chu_giai_chuong?: string
    chu_giai_phan?: string
    chu_giai_nhom?: string
    chu_giai_dong?: string
    bao_gom?: string[]
    khong_bao_gom?: string[]
    sen?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

function rate(v: string | number | null | undefined): string {
  if (v == null || v === '' || v === 'null') return ''
  return String(v)
}

function buildNote(record: APIRecord, chapterTitle?: string): NoteData | undefined {
  const legal = record.legal_layer
  if (!legal) return undefined

  const parts: string[] = []
  let summary = ''

  if (legal.chu_giai_chuong && typeof legal.chu_giai_chuong === 'string') {
    summary = legal.chu_giai_chuong.slice(0, 200)
    parts.push('CHÚ GIẢI CHƯƠNG:', legal.chu_giai_chuong)
  }
  if (legal.chu_giai_nhom && typeof legal.chu_giai_nhom === 'string') {
    if (!summary) summary = legal.chu_giai_nhom.slice(0, 200)
    parts.push('', 'CHÚ GIẢI NHÓM:', legal.chu_giai_nhom)
  }
  if (legal.chu_giai_dong && typeof legal.chu_giai_dong === 'string') {
    parts.push('', 'CHÚ GIẢI DÒNG:', legal.chu_giai_dong)
  }
  if (legal.bao_gom && Array.isArray(legal.bao_gom) && legal.bao_gom.length > 0) {
    parts.push('', 'BAO GỒM:')
    legal.bao_gom.forEach(item => parts.push(`  — ${item}`))
  }
  if (legal.khong_bao_gom && Array.isArray(legal.khong_bao_gom) && legal.khong_bao_gom.length > 0) {
    parts.push('', 'KHÔNG BAO GỒM:')
    legal.khong_bao_gom.forEach(item => parts.push(`  — ${item}`))
  }

  if (parts.length === 0) return undefined
  return { summary, full: parts }
}

function buildSEN(record: APIRecord): NoteData | undefined {
  const sen = record.legal_layer?.sen
  if (!sen || typeof sen !== 'string' || sen.length < 10) return undefined
  return {
    summary: sen.slice(0, 200),
    full: sen.split('\n').filter(Boolean),
  }
}

function detectType(code: string): BieuThueRow['type'] {
  const len = code.length
  if (len <= 2) return 'chapter'
  if (len <= 4) return 'heading'
  if (len <= 6) return 'sub'
  return 'item'
}

function detectV(code: string, desc: string): number {
  const dashes = (desc.match(/^(–\s*)+/) || [''])[0].split('–').length - 1
  if (dashes > 0) return Math.min(dashes, 3)
  const len = code.length
  if (len <= 4) return 0
  if (len <= 6) return 1
  return 2
}

/**
 * Transform API chapter response records → BieuThueRow[]
 * Groups by heading, builds tree structure
 */
export function transformChapterRecords(
  records: APIRecord[],
  chapterNum: number,
  chapterTitle: string
): BieuThueRow[] {
  if (!records || records.length === 0) return []

  const rows: BieuThueRow[] = []
  const seenHeadings = new Set<string>()
  const seenSubheadings = new Set<string>()

  // Add chapter header
  const firstRecord = records[0]
  const chapterNote = buildNote(firstRecord, chapterTitle)
  rows.push({
    type: 'chapter',
    code: String(chapterNum).padStart(2, '0'),
    desc: chapterTitle,
    note: chapterNote,
  })

  for (const rec of records) {
    const code = rec.hs
    const fact = rec.fact_layer
    const legal = rec.legal_layer
    const desc = fact?.vn || code

    // Clean dash prefixes: "- - - -" or "– – –" or mixed
    const cleanDesc = (s: string) => s.replace(/^[\s–\-]+/, '').trim()

    // Insert heading row (4-digit) if not seen
    if (rec.heading && !seenHeadings.has(rec.heading)) {
      seenHeadings.add(rec.heading)
      const headingNote = buildNote(rec)
      // Use chu_giai_nhom first line as heading description
      const chuGiai = legal?.chu_giai_nhom
      const headingDesc = (chuGiai && typeof chuGiai === 'string')
        ? chuGiai.split('\n')[0].slice(0, 200)
        : cleanDesc(desc)
      rows.push({
        type: 'heading',
        code: rec.heading,
        desc: headingDesc,
        note: headingNote,
      })
    }

    // Insert subheading row (6-digit) if not seen
    if (rec.subheading && !seenSubheadings.has(rec.subheading) && rec.subheading !== rec.heading) {
      seenSubheadings.add(rec.subheading)
      if (rec.subheading.length > 4) {
        rows.push({
          type: 'sub',
          v: 1,
          code: rec.subheading,
          desc: '– ' + cleanDesc(desc),
        })
      }
    }

    // Add item row (8-digit)
    const rates = fact?.rates || {}
    const policies: string[] = []
    if (fact?.chinh_sach) policies.push(fact.chinh_sach)

    rows.push({
      type: 'item',
      v: detectV(code, desc),
      code,
      desc,
      descEn: fact?.en,
      unit: fact?.dvt || '',
      nkud: rate(rates.mfn),
      nktt: rate(rates.tt),
      vat: rate(rates.vat),
      acfta: rate(rates.acfta),
      atiga: rate(rates.atiga),
      evfta: rate(rates.evfta),
      cptpp: rate(rates.cptpp),
      vkfta: rate(rates.vkfta),
      ajcep: rate(rates.ajcep),
      vjepa: rate(rates.vjepa),
      akfta: rate(rates.akfta),
      aanzfta: rate(rates.aanzfta),
      aifta: rate(rates.aifta),
      ukvfta: rate(rates.ukvfta),
      ahkfta: rate(rates.ahkfta),
      vcfta: rate(rates.vcfta),
      eaeu: rate(rates.eaeu),
      ttdb: rate(rates.ttdb),
      bvmt: rate(rates.bvmt),
      xk: rate(rates.xk),
      sen: buildSEN(rec),
      policies: policies.length > 0 ? policies : undefined,
      mucCanhBao: fact?.muc_canh_bao,
      _raw: rec as unknown as Record<string, unknown>,
    })
  }

  return rows
}

/**
 * Transform search results → BieuThueRow[] (simplified)
 */
export function transformSearchResults(results: Record<string, { items?: APIRecord[] }>): BieuThueRow[] {
  const rows: BieuThueRow[] = []
  const seen = new Set<string>()

  for (const [, sourceData] of Object.entries(results)) {
    const items = sourceData?.items || (Array.isArray(sourceData) ? sourceData : [])
    for (const rec of items as APIRecord[]) {
      const code = rec.hs || (rec as Record<string, string>).ma_hs || (rec as Record<string, string>).hs_code
      if (!code || seen.has(code)) continue
      seen.add(code)

      const fact = rec.fact_layer
      const rates = fact?.rates || {}

      rows.push({
        type: 'item',
        v: 2,
        code,
        desc: fact?.vn || (rec as Record<string, string>).ten_vn || code,
        descEn: fact?.en,
        unit: fact?.dvt || '',
        nkud: rate(rates.mfn),
        vat: rate(rates.vat),
        acfta: rate(rates.acfta),
        mucCanhBao: fact?.muc_canh_bao,
        policies: fact?.chinh_sach ? [fact.chinh_sach] : undefined,
        sen: buildSEN(rec),
        _raw: rec as unknown as Record<string, unknown>,
      })
    }
  }

  return rows
}
