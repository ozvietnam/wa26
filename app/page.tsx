import Link from 'next/link';
import { Button, Card, CardContent } from '@/components/common';

export default function HomePage() {
  const stats = [
    { label: 'Mã HS', value: '11,871' },
    { label: 'TB-TCHQ', value: '4,390' },
    { label: 'KTCN', value: '7,365' },
    { label: 'Biểu thuế', value: '2026' },
  ];

  return (
    <div className="bg-gradient-to-b from-[#f9f7f3] to-white min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-[#d97757] mb-6">
            WA26 — Tra cứu HS Code & Thuế XNK
          </h1>
          <p className="text-xl text-[#5a5a5a] mb-3">
            Tìm kiếm mã HS, thuế suất, quy định hải quan Việt Nam một cách nhanh chóng và chính xác
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-12">
            {stats.map((stat) => (
              <Card key={stat.label} variant="hover" className="text-center">
                <CardContent className="py-6">
                  <p className="text-3xl font-bold text-[#d97757]">{stat.value}</p>
                  <p className="text-sm text-[#5a5a5a] mt-2">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/tra-cuu-hs">
              <Button variant="primary" size="lg">
                Tra cứu HS Code
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="secondary" size="lg">
                Chatbot AI
              </Button>
            </Link>
            <Link href="/quy-dinh">
              <Button variant="outline" size="lg">
                Quy định XNK
              </Button>
            </Link>
          </div>

          {/* Info Text */}
          <p className="text-sm text-[#9a9a9a] mt-12">
            Hỗ trợ tra cứu dữ liệu hải quan Việt Nam từ Tổng cục Hải quan
          </p>
        </div>
      </div>
    </div>
  );
}
