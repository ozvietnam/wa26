export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-white mb-2">XNK Webapp</h3>
            <p className="text-sm">Tra cứu HS Code & Chatbot AI cho XNK Việt Nam – Trung Quốc</p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">Dịch vụ</h3>
            <ul className="text-sm space-y-1">
              <li><a href="/tra-cuu-hs" className="hover:text-white">Tra cứu mã HS</a></li>
              <li><a href="/chatbot" className="hover:text-white">Chatbot AI</a></li>
              <li><a href="/quy-dinh" className="hover:text-white">Quy định XNK</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">Liên hệ</h3>
            <p className="text-sm">thutucxuatnhapkhau.com</p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-6 pt-4 text-center text-sm">
          © 2026 XNK Webapp. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
