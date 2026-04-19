'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MobileMenu } from './MobileMenu';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/bieu-thue-2026', label: 'Biểu thuế 2026' },
    { href: '/tra-cuu-hs', label: 'Tra cứu HS' },
    { href: '/chat', label: 'Chatbot AI' },
    { href: '/quy-dinh', label: 'Quy định' },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <nav className="bg-white border-b border-[#e8e4dc] shadow-sm sticky top-0 z-[1100]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-[#d97757] hover:text-[#c4694d] transition-colors">
            WA26
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex gap-6 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors font-medium ${
                  isActive(item.href)
                    ? 'text-[#d97757] border-b-2 border-[#d97757]'
                    : 'text-[#5a5a5a] hover:text-[#d97757]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dang-nhap"
              className="bg-[#d97757] text-white px-4 py-2 rounded-lg hover:bg-[#c4694d] transition-colors font-medium"
            >
              Đăng nhập
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-[#5a5a5a] hover:text-[#d97757] hover:bg-[#f0ece4] rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} items={navItems} />
    </>
  );
}
