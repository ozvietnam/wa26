const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function searchHSCodes(query: string, limit = 20) {
  const res = await fetch(
    `${API_URL}/api/hs-codes/search?q=${encodeURIComponent(query)}&limit=${limit}`
  )
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function getHSCode(code: string) {
  const res = await fetch(`${API_URL}/api/hs-codes/${code}`)
  if (!res.ok) throw new Error('Not found')
  return res.json()
}

export async function askChatbot(question: string, sessionId?: string, token?: string) {
  const res = await fetch(`${API_URL}/api/chatbot/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, session_id: sessionId }),
  })
  if (!res.ok) throw new Error('Chatbot request failed')
  return res.json()
}

export async function getRegulations(category?: string) {
  const url = new URL(`${API_URL}/api/regulations`)
  if (category) url.searchParams.set('category', category)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch regulations')
  return res.json()
}

export async function getStats() {
  const res = await fetch(`${API_URL}/api/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}
