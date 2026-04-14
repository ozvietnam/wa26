import { NextRequest, NextResponse } from 'next/server'
import { classifyIntent } from '@/lib/agents/router'
import { handleCustoms } from '@/lib/agents/customsAgent'
import { handleCare } from '@/lib/agents/careAgent'
import { handlePricing } from '@/lib/agents/pricingAgent'
import { handleRegulation } from '@/lib/agents/regulationAgent'
import { saveMessages } from '@/lib/stores/sessionStore'

const RATE_LIMIT = new Map<string, { count: number; reset: number }>()
const MAX_REQUESTS = 100
const RATE_WINDOW = 3600000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = RATE_LIMIT.get(ip)
  if (!entry || now > entry.reset) {
    RATE_LIMIT.set(ip, { count: 1, reset: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}


const AGENTS: Record<string, (args: any) => Promise<{ reply: string; debug: any }>> = {
  customs: handleCustoms,
  care: handleCare,
  pricing: handlePricing,
  regulation: handleRegulation,
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { message, history, sessionId, file } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Tin nhắn không hợp lệ' }, { status: 400 })
    }
    if (message.length > 10000) {
      return NextResponse.json({ error: 'Tin nhắn quá dài (tối đa 10,000 ký tự)' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const startTime = Date.now()

    // Classify intent
    const routing = await classifyIntent(message, apiKey, history)

    // Route to agent
    const handler = AGENTS[routing.intent] || AGENTS.customs
    const result = await handler({ message, history, file, apiKey })

    const duration = Date.now() - startTime

    // Save to session (non-blocking)
    if (sessionId) {
      saveMessages(sessionId, message, result.reply, routing.intent).catch(() => {})
    }

    return NextResponse.json({
      reply: result.reply,
      debug: {
        routing: { intent: routing.intent, confidence: routing.confidence, method: routing.method },
        duration: `${duration}ms`,
        ...result.debug,
      },
    })
  } catch (err) {
    console.error('[chat] Error:', err)
    return NextResponse.json({
      reply: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
      debug: { error: (err as Error).message },
    }, { status: 500 })
  }
}
