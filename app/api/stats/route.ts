import { NextResponse } from 'next/server'
import { getCacheStats, resetCacheStats } from '@/lib/hsApi'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const reset = searchParams.get('reset')

  if (reset === '1') {
    resetCacheStats()
    return NextResponse.json({ message: 'Cache stats reset', stats: getCacheStats() })
  }

  return NextResponse.json({ stats: getCacheStats() })
}
