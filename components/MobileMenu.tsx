'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ href: string; label: string }>;
}

export function MobileMenu({ isOpen, onClose, items }: MobileMenuProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[1300] lg:hidden animate-fadeIn"
        onClick={onClose}
        role="presentation"
      />

      {/* Menu Overlay */}
      <div className="fixed top-0 right-0 bottom-0 w-[280px] bg-white shadow-xl z-[1400] animate-slideInRight lg:hidden overflow-y-auto">
        {/* Header with close button */}
        <div className="p-4 border-b border-[#f0ece4] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#d97757]">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#5a5a5a] hover:bg-[#f0ece4] rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`block px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-[#f0ece4] text-[#d97757] font-semibold border-l-4 border-[#d97757]'
                  : 'text-[#5a5a5a] hover:bg-[#f9f7f3]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Login Button */}
        <div className="p-4 border-t border-[#f0ece4]">
          <Link
            href="/dang-nhap"
            onClick={onClose}
            className="block w-full text-center bg-[#d97757] text-white px-4 py-3 rounded-lg hover:bg-[#c4694d] transition-colors font-medium"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </>
  );
}
