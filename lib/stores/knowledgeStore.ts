/**
 * Knowledge Store — Learned knowledge from conversations (WA26)
 * Uses Supabase REST API in production, in-memory for local dev
 */

const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY

function isSupaAvailable() { return !!(SUPA_URL && SUPA_KEY) }

function supaHeaders(): Record<string, string> {
  return {
    'apikey': SUPA_KEY!,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}


async function supaFetch(path: string, options: RequestInit = {}): Promise<any> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
      ...options,
      headers: { ...supaHeaders(), ...((options.headers as Record<string, string>) || {}) },
    })
    if (!res.ok) return null
    const text = await res.text()
    return text ? JSON.parse(text) : []
  } catch { return null }
}

interface KBItem {
  id: number
  type: string
  content: string
  hs_codes: string[]
  confidence: number
  source: string
  created_at: string
  used_count: number
}

const memKB: KBItem[] = []
let nextId = 1

export async function addKnowledgeItem({
  type, content, hsCodes = [], confidence = 0.5, source = 'extraction',
}: {
  type: string; content: string; hsCodes?: string[]; confidence?: number; source?: string
}): Promise<number | null> {
  if (isSupaAvailable()) {
    const result = await supaFetch('knowledge_items', {
      method: 'POST',
      body: JSON.stringify({ type, content, hs_codes: hsCodes, confidence, source }),
    })
    return result?.[0]?.id ?? null
  }
  const item: KBItem = {
    id: nextId++, type, content, hs_codes: hsCodes, confidence, source,
    created_at: new Date().toISOString(), used_count: 0,
  }
  memKB.push(item)
  return item.id
}

export async function searchByHSCodes(hsCodes: string[], limit = 5): Promise<KBItem[]> {
  if (isSupaAvailable() && hsCodes.length > 0) {
    const filter = hsCodes.map(c => `hs_codes.cs.{${c}}`).join(',')
    return (await supaFetch(`knowledge_items?or=(${filter})&order=used_count.desc,confidence.desc&limit=${limit}`)) || []
  }
  return memKB
    .filter(item => item.hs_codes.some(c => hsCodes.includes(c)))
    .sort((a, b) => (b.used_count - a.used_count) || (b.confidence - a.confidence))
    .slice(0, limit)
}

export async function trackUsage(itemIds: number[]): Promise<void> {
  if (!itemIds?.length) return
  if (isSupaAvailable()) {
    await supaFetch(`knowledge_items?id=in.(${itemIds.join(',')})`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' } as Record<string, string>,
      body: JSON.stringify({ used_count: 'used_count + 1' }),
    })
    return
  }
  for (const item of memKB) {
    if (itemIds.includes(item.id)) item.used_count++
  }
}
