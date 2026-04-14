import { NextRequest, NextResponse } from 'next/server'
import { saveFeedback } from '@/lib/stores/sessionStore'
import { saveLearningFromFeedback } from '@/lib/agents/customsAgent'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, messageIndex, rating, productName, hsCode } = await req.json()

    if (!sessionId || messageIndex === undefined || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await saveFeedback(sessionId, messageIndex, rating)

    // If thumbs up with HS code → save to knowledge base
    if (rating === 'up' && hsCode && productName) {
      await saveLearningFromFeedback(productName, hsCode)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[feedback] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
