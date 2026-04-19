'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, Badge, Button } from '@/components/common';

interface SearchHistoryItem {
  id: string;
  query: string;
  result_codes: string[];
  created_at: string;
}

interface Stats {
  total_hs_codes: number;
  total_searches: number;
  total_regulations: number;
  popular_queries: { query: string; count: number }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get current user email
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    // Fetch stats (public endpoint)
    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));

    // Fetch user history (requires auth)
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        setLoadingHistory(false);
        return;
      }
      fetch(`${API_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/dang-nhap';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1a1a1a]">Dashboard</h1>
          {userEmail && <p className="text-[#5a5a5a] text-sm mt-2">{userEmail}</p>}
        </div>
        <Button variant="ghost" size="md" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>

      {/* Stats Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-4">Thống kê hệ thống</h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#f0ece4] rounded-lg h-24 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card variant="hover">
              <CardContent className="text-center py-6">
                <div className="text-4xl font-bold text-[#d97757]">{stats.total_hs_codes.toLocaleString()}</div>
                <div className="text-sm text-[#5a5a5a] mt-2">Mã HS trong hệ thống</div>
              </CardContent>
            </Card>
            <Card variant="hover">
              <CardContent className="text-center py-6">
                <div className="text-4xl font-bold text-[#d97757]">{stats.total_searches.toLocaleString()}</div>
                <div className="text-sm text-[#5a5a5a] mt-2">Lượt tra cứu</div>
              </CardContent>
            </Card>
            <Card variant="hover">
              <CardContent className="text-center py-6">
                <div className="text-4xl font-bold text-[#d97757]">{stats.total_regulations.toLocaleString()}</div>
                <div className="text-sm text-[#5a5a5a] mt-2">Quy định XNK</div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* Popular Queries */}
      {stats && stats.popular_queries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-4">Từ khoá phổ biến</h2>
          <div className="flex gap-3 flex-wrap">
            {stats.popular_queries.map((pq, i) => (
              <Badge key={i} variant="primary">
                {pq.query}
                <span className="font-semibold">×{pq.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      <div>
        <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-4">Lịch sử tra cứu của bạn</h2>
        {loadingHistory ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-[#f0ece4] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-[#5a5a5a]">Bạn chưa có lịch sử tra cứu nào.</p>
            <p className="text-[#9a9a9a] text-sm mt-2">Bắt đầu tra cứu để xem lịch sử của bạn ở đây</p>
          </div>
        ) : (
          <Card variant="default" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f9f7f3] border-b border-[#f0ece4]">
                    <th className="px-4 py-3 text-left font-semibold text-[#1a1a1a]">Từ khoá</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1a1a1a]">Kết quả</th>
                    <th className="px-4 py-3 text-right font-semibold text-[#1a1a1a] whitespace-nowrap">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-[#f0ece4] last:border-0 hover:bg-[#f9f7f3] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1a1a1a]">{item.query}</td>
                      <td className="px-4 py-3 text-[#5a5a5a]">
                        {item.result_codes.length > 0
                          ? item.result_codes.slice(0, 3).join(', ') +
                            (item.result_codes.length > 3 ? ` +${item.result_codes.length - 3}` : '')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#9a9a9a] whitespace-nowrap">
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
          </Card>
        )}
      </div>
    </div>
  );
}
