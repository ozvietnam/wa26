# WA26 — Hệ thống Tra cứu HS Code & Chatbot Tư vấn Hải quan Việt Nam 2026

> Nền tảng tra cứu mã HS, thuế suất xuất nhập khẩu và tư vấn hải quan thông minh cho Việt Nam, được hỗ trợ bởi AI đa nhà cung cấp.

---

## Giới thiệu

WA26 là webapp hải quan chuyên nghiệp, cung cấp:

- **Tra cứu HS Code** — 11,871 mã HS 8 số theo biểu thuế 2026
- **Chatbot AI tư vấn** — phân loại hàng hóa, tra thuế suất, đối chiếu tiền lệ TB-TCHQ
- **Biểu thuế XNK 2026** — giao diện dạng bảng Excel với đầy đủ cột thuế FTA
- **Quy định hải quan** — tổng hợp văn bản pháp luật, thông tư, nghị định

### Dữ liệu tích hợp

| Nguồn | Số lượng | Mô tả |
|-------|----------|-------|
| Biểu thuế 2026 | 11,871 mã HS | Mã HS 8 số, thuế MFN, 19 FTA |
| TB-TCHQ tiền lệ | 4,390 văn bản | Tiền lệ phân loại 2014–2025 |
| KTCN | 7,365 mã | Kiểm tra chuyên ngành (9 bộ ngành) |
| SEN | 8,203 entries | Phạm vi bao gồm / không bao gồm |

---

## Tính năng chính

### 1. Chatbot AI tư vấn HS Code (`/chat`)

Chatbot phân loại hàng hóa theo quy trình 2 pha:

- **Pha 1 — Expert Verdict**: LLM phán đoán mã HS dựa trên 6 quy tắc GIR, chú giải HS, và tiền lệ TB-TCHQ
- **Pha 2 — Data Lookup**: Tra cứu song song 5 công cụ dữ liệu thực (search, lookup, chapter, precedent, ktcn)
- **Pha 3 — Respond**: Tổng hợp phán đoán + data thực → trả lời có cấu trúc với thuế suất MFN, ACFTA, VAT

**Hỗ trợ đính kèm file**: ảnh sản phẩm (PNG/JPEG/WebP), PDF, audio (tối đa 15MB)

**4 agent chuyên biệt**:
- `customs` — phân loại HS, thuế suất, C/O, ECUS
- `regulation` — văn bản pháp luật, thông tư, nghị định
- `pricing` — báo giá dịch vụ, cước tàu, phí ủy thác
- `care` — chào hỏi, hướng dẫn sử dụng

### 2. Tra cứu HS Code (`/tra-cuu-hs`)

Tìm kiếm full-text với hiển thị chi tiết 9 tầng dữ liệu:
- Tên hàng hóa (tiếng Việt + tiếng Anh)
- Thuế suất: MFN, ACFTA, ATIGA, VAT, BVMT, TTDB
- Chú giải chương, chú giải nhóm
- SEN (phạm vi bao gồm / không bao gồm)
- Chính sách quản lý, cảnh báo

### 3. Biểu thuế XNK 2026 (`/bieu-thue-2026`)

Giao diện dạng bảng Excel với:
- Đủ cột thuế: MFN, ACFTA (TQ), ATIGA, AIFTA, AKFTA, VKFTA, EVFTA, CPTPP, UKVFTA...
- SEN superscript, sub-header phân cấp
- Tìm kiếm nhanh theo mã HS hoặc mô tả hàng hóa

### 4. Quy định XNK (`/quy-dinh`)

Tổng hợp văn bản pháp luật hải quan Việt Nam, hỗ trợ tìm kiếm và tra cứu.

---

## Kiến trúc kỹ thuật

### Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS |
| Language | TypeScript |
| Auth / DB | Supabase |
| Cache | Upstash Redis |
| Deploy | Vercel / Docker |

### Multi-Provider LLM Engine

WA26 sử dụng engine LLM đa nhà cung cấp với 2 tier:

```
┌─────────────┬───────────────────────┬──────────────────────────┐
│ Tier        │ Primary               │ Fallback                 │
├─────────────┼───────────────────────┼──────────────────────────┤
│ FAST        │ Groq llama-3.1-8b     │ Gemini 2.5 Flash         │
│ (router,    │ $0.05/M, ~100ms       │                          │
│  care)      │ 3 keys round-robin    │                          │
├─────────────┼───────────────────────┼──────────────────────────┤
│ HEAVY       │ Gemini 2.5 Flash      │ OpenRouter Gemini         │
│ (verdict,   │ $0.15/M, VN tốt      │ → Groq llama-3.3-70b     │
│  respond)   │ 4 keys round-robin    │                          │
└─────────────┴───────────────────────┴──────────────────────────┘
```

- **Key rotation**: tự động xoay vòng giữa nhiều API key, cooldown khi gặp lỗi 429
- **Fallback chain**: tự động chuyển nhà cung cấp khi một bên lỗi
- **Thinking budget**: Gemini 2.5 Flash với thinking mode cho câu hỏi phức tạp

### HS Knowledge API

Backend dữ liệu HS Code chạy tại `https://hs-knowledge-api.vercel.app`, tích hợp:
- **Redis cache** (Upstash) + **Memory cache** (LRU 500 entries, TTL 1h)
- **5 endpoint**: search, lookup, chapter, precedent, ktcn

### Rate Limiting

- 100 request/giờ/IP
- Validation: tối đa 10,000 ký tự/tin nhắn

---

## Cài đặt & Chạy

### Yêu cầu

- Node.js >= 20
- npm

### Biến môi trường

Tạo file `.env.local`:

```env
# LLM Providers (hỗ trợ nhiều key, phân cách bằng dấu phẩy)
GEMINI_API_KEY=key1,key2,key3,key4
GROQ_API_KEY=gsk_xxx,gsk_yyy,gsk_zzz
OPENROUTER_API_KEY=sk-or-v1-xxx,sk-or-v1-yyy

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Upstash Redis (tuỳ chọn — cache HS API)
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx

# HS Knowledge API (tuỳ chọn — mặc định dùng public endpoint)
NEXT_PUBLIC_HS_API_URL=https://hs-knowledge-api.vercel.app
```

### Chạy development

```bash
npm install
npm run dev
# Mở http://localhost:3000
```

### Build & Deploy

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t wa26 .
docker run -p 3000:3000 --env-file .env.local wa26
```

---

## Cấu trúc thư mục

```
wa26/
├── app/
│   ├── api/
│   │   ├── chat/          # Chat API endpoint (POST)
│   │   ├── feedback/      # Feedback API
│   │   └── stats/         # Thống kê sử dụng
│   ├── bieu-thue-2026/    # Biểu thuế XNK 2026
│   ├── chat/              # Chatbot UI
│   ├── tra-cuu-hs/        # Tra cứu HS Code
│   ├── quy-dinh/          # Quy định hải quan
│   ├── dashboard/         # Dashboard quản trị
│   └── dang-nhap/         # Đăng nhập
├── components/
│   ├── bieu-thue/         # BieuThueViewer component
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/
│   ├── agents/
│   │   ├── shared.ts      # Multi-provider LLM engine
│   │   ├── router.ts      # Intent classifier (keyword + LLM)
│   │   ├── customsAgent.ts # Agent phân loại HS (2-phase)
│   │   ├── regulationAgent.ts
│   │   ├── pricingAgent.ts
│   │   └── careAgent.ts
│   ├── stores/
│   │   ├── sessionStore.ts # Lưu lịch sử hội thoại
│   │   └── knowledgeStore.ts # Knowledge base tích lũy
│   ├── hsApi.ts           # Client HS Knowledge API
│   └── data/              # Cấu hình router, FAQ, pricing
└── types/
    └── index.ts
```

---

## API

### POST `/api/chat`

```json
// Request
{
  "message": "Mã HS của máy bơm nước dân dụng?",
  "history": [{ "role": "user", "content": "..." }],
  "sessionId": "ses_xxx",
  "file": { "mimeType": "image/jpeg", "data": "base64..." }
}

// Response
{
  "reply": "🎯 8413.70.90 — Máy bơm nước...",
  "debug": {
    "routing": { "intent": "customs", "confidence": 0.95, "method": "keyword" },
    "duration": "1234ms"
  }
}
```

---

## Giấy phép

Dự án nội bộ — WA26 © 2026
