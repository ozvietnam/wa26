import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-800">
          WA26
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/tra-cuu-hs" className="hover:text-blue-700 transition-colors">
            Tra cứu HS
          </Link>
          <Link href="/chat" className="hover:text-blue-700 transition-colors">
            Chatbot AI
          </Link>
          <Link href="/quy-dinh" className="hover:text-primary transition-colors">
            Quy định
          </Link>
          <Link
            href="/dang-nhap"
            className="bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </nav>
  )
}
