import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BieuThueViewer } from '@/components/bieu-thue/BieuThueViewer'

export const metadata: Metadata = {
  title: 'Biểu thuế XNK 2026 | WA26',
  description:
    'Tra cứu biểu thuế xuất nhập khẩu 2026 — 11,871 mã HS, 19 FTA, chú giải nguyên văn, SEN 2022, TB-TCHQ. Tất cả trên một giao diện.',
  openGraph: {
    title: 'Biểu thuế XNK 2026 | WA26',
    description:
      'Biểu thuế XNK 2026 chuyên nghiệp — chú giải, SEN, tiền lệ phân loại, KTCN. Hiển thị tốt trên điện thoại.',
  },
}

export default function BieuThuePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Dang tai...</div>}>
      <BieuThueViewer />
    </Suspense>
  )
}
