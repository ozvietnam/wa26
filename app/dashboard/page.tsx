'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface SearchHistoryItem {
  id: string
  query: string
  result_codes: string[]
  created_at: string
}

interface Stats {
  total_hs_codes: number
  total_searches: number
  total_regulations: number
  popular_queries: { query: string; count: number }[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="text-3xl font-bold text-primary">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    // Get current user email
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })

    // Fetch stats (public endpoint)
    fetch(`${API_URL}/api/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false))

    // Fetch user history (requires auth)
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) {
        setLoadingHistory(false)
        return
      }
      fetch(`${API_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoadingHistory(false))
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/dang-nhap'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {userEmail && (
            <p className="text-gray-500 text-sm mt-1">{userEmail}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 border px-3 py-1.5 rounded-lg transition-colors"
        >
          Đăng xuất
        </button>
      </div>

      {/* Stats */}
      <h2 className="text-lg font-semibold mb-3">Thống kê hệ thống</h2>
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Mã HS trong hệ thống" value={stats.total_hs_codes} />
          <StatCard label="Lượt tra cứu" value={stats.total_searches} />
          <StatCard label="Quy định XNK" value={stats.total_regulations} />
        </div>
      ) : null}

      {/* Popular queries */}
      {stats && stats.popular_queries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Từ khoá phổ biến</h2>
          <div className="flex gap-2 flex-wrap">
            {stats.popular_queries.map((pq, i) => (
              <span
                key={i}
                className="bg-blue-50 text-primary px-3 py-1 rounded-full text-sm"
              >
                {pq.query}
                <span className="ml-1 text-xs text-gray-400">×{pq.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* User search history */}
      <h2 className="text-lg font-semibold mb-3">Lịch sử tra cứu của bạn</h2>
      {loadingHistory ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">🔍</div>
          <p>Bạn chưa có lịch sử tra cứu nào.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Từ khoá</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kết quả</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.query}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.result_codes.length > 0
                      ? item.result_codes.slice(0, 3).join(', ') +
                        (item.result_codes.length > 3 ? ` +${item.result_codes.length - 3}` : '')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
