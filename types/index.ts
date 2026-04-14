export interface HSCode {
  id: number
  code: string
  description_vi: string
  description_en?: string
  unit?: string
  tax_rate_normal?: number
  tax_rate_preferential?: number
  tax_rate_special?: number
  notes?: string
}

export interface Regulation {
  id: number
  category?: string
  title: string
  content_vi?: string
  effective_date?: string
  source_document?: string
  tags: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
}

export interface SearchHistoryItem {
  id: number
  query: string
  result_codes: string[]
  created_at: string
}
