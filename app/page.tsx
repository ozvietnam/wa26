import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">
          WA26 — Tra cứu HS Code & Thuế XNK
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Tìm kiếm mã HS, thuế suất, quy định hải quan Việt Nam
        </p>
        <p className="text-sm text-gray-400 mb-8">
          11,871 mã HS • 4,390 TB-TCHQ • 7,365 KTCN • Biểu thuế 2026
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/tra-cuu-hs" className="px-6 py-3 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition">
            Tra cứu HS Code
          </Link>
          <Link href="/chat" className="px-6 py-3 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition">
            Chatbot AI
          </Link>
          <Link href="/quy-dinh" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
            Quy định XNK
          </Link>
        </div>
      </div>
    </div>
  )
}
