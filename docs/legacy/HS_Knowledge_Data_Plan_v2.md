# KẾ HOẠCH XÂY DATA — HS KNOWLEDGE SYSTEM v2

**Ngày: 09/04/2026 | CEO: Thang | Soạn bởi: AXÍT**
**Trạng thái: DRAFT — CHỜ PHẢN BIỆN**

---

## 1. TẦM NHÌN

Xây hệ thống tri thức phân loại HS code **sống, có timeline pháp lý, tự thông minh hơn mỗi ngày**.

Toàn bộ thế giới hàng hóa nằm gọn trong ~11,871 mã HS 8 số (VN, HS2022). Con số này sẽ tăng dần theo từng phiên bản HS mới (dự kiến HS2027: ~12,000-13,000 mã). Hệ thống phải thiết kế cho số mã tăng, không hardcode.

---

## 2. KIẾN TRÚC 3 TẦNG VẬN HÀNH

| Tầng | Việc | Ai làm | Hiện trạng |
|------|------|--------|------------|
| **Tầng 0 — Tìm mã** | User mô tả hàng → top ứng viên | Semantic search (FAISS + embedding) | ❌ CHƯA CÓ — đang dùng keyword match |
| **Tầng 1 — Tra thuế** | Mã 8 số → thuế + chính sách + KTCN | API lookup | ✅ Đang chạy tốt |
| **Tầng 2 — Suy luận** | Chú giải + GIR + TB-TCHQ → chốt mã | AI runtime (Claude/Gemini) | ✅ Skill v3.3 |

**Trọng tâm kế hoạch này: Xây tầng 0 + Nâng cấp data nền cho cả 3 tầng.**

---

## 3. KIẾN TRÚC DATA — 5 LAYER ĐỘC LẬP

```
┌──────────────────────────────────────────────┐
│              TEMPORAL LAYER                  │
│     HS2017 ↔ HS2022 ↔ HS2027 mapping        │
│     Mỗi mã có: hieu_luc_tu / hieu_luc_den   │
└──────────────────┬───────────────────────────┘
                   │
   ┌───────┬───────┼───────┬──────────┐
   ▼       ▼       ▼       ▼          ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────────┐
│ CORE ││LEGAL ││ FACT ││SEMAN-││PRECEDENT │
│      ││      ││      ││ TIC  ││          │
│11,871││chú   ││thuế  ││      ││ 6,000    │
│mã HS ││giải  ││suất  ││synon-││ TB-TCHQ  │
│cây   ││bao   ││MFN   ││yms   ││          │
│phân  ││gồm   ││ACFTA ││mô tả ││mã khai   │
│cấp   ││loại  ││VAT   ││VN/EN/││mã ấn định│
│2→4→  ││trừ   ││CS    ││TQ    ││lý do     │
│6→8   ││SEN   ││KTCN  ││embed-││bài học   │
│      ││      ││      ││ding  ││timeline  │
│      ││      ││      ││      ││          │
│ĐỔI   ││ĐỔI   ││ĐỔI   ││TĂNG  ││ TĂNG    │
│5 NĂM ││LIÊN  ││HÀNG  ││MỖI   ││ LIÊN TỤC│
│/LẦN  ││TỤC   ││NĂM   ││NGÀY  ││         │
└──────┘└──────┘└──────┘└──────┘└──────────┘
```

**Nguyên tắc thiết kế:**

- Mỗi layer **update độc lập** — không phá layer khác
- Mỗi entry có **timeline** (hiệu lực từ/đến)
- Data **chỉ thêm layer mới**, không ghi đè data cũ
- Có thể truy vấn trạng thái tại **bất kỳ thời điểm nào**

---

## 4. CHI TIẾT TỪNG LAYER

### 4.1 CORE LAYER — Xương sống biểu thuế

Cấu trúc cây phân cấp: Phần → Chương (2 số) → Nhóm (4 số) → Phân nhóm (6 số) → Mã VN (8 số)

```json
{
  "hs": "85094000",
  "level": 8,
  "parent": "850940",
  "ten_vn": "Máy nghiền, máy trộn thực phẩm; máy ép hoa quả",
  "ten_en": "Food grinders and mixers; fruit or vegetable juice extractors",
  "version": "HS2022",
  "hieu_luc_tu": "2022-01-01",
  "hieu_luc_den": null,
  "don_vi": "chiếc",
  "mapping_hs2017": "85094000"
}
```

### 4.2 LEGAL LAYER — Chú giải & Quy tắc pháp lý

```json
{
  "hs": "85094000",
  "chu_giai_chuong": "Chú giải chương 85: ...",
  "chu_giai_nhom": "Chú giải nhóm 8509: ...",
  "bao_gom": ["máy nghiền thực phẩm có motor dùng gia dụng", "..."],
  "khong_bao_gom": ["máy nghiền công nghiệp > 20kg → 8438"],
  "loai_tru": ["máy xay dùng trong CN thực phẩm → 8438"],
  "sen_ahtn": ["Thiết bị massage cơ thể", "Máy ép hoa quả gia dụng"],
  "nguon_phap_ly": "CV 1810/TCHQ-TXNK; CV 3866/TCHQ-TXNK",
  "van_ban_ap_dung": [
    {
      "so_hieu": "TT05/2022/TT-BTC",
      "hieu_luc_tu": "2022-01-01",
      "noi_dung_lien_quan": "Biểu thuế XNK hiện hành"
    }
  ],
  "cap_nhat_lan_cuoi": "2024-03-15"
}
```

### 4.3 FACT LAYER — Thuế suất & Chính sách (đang có, giữ nguyên)

```json
{
  "hs": "85094000",
  "rates": {
    "tt": "40%",
    "mfn": "25%",
    "acfta": "0%",
    "vat": "10%",
    "bvmt": null
  },
  "chinh_sach": "CS: Kiểm tra chất lượng theo TT15/2018",
  "canh_bao_cs": true,
  "hieu_luc_bieu_thue": "NĐ57/2020 sửa đổi bởi NĐ XX/2024"
}
```

### 4.4 SEMANTIC LAYER — "Bộ não" tìm kiếm (MỚI — cốt lõi kế hoạch)

```json
{
  "hs": "85094000",
  "synonyms": [
    "máy xay sinh tố", "máy ép trái cây", "blender",
    "máy xay thịt gia đình", "food processor",
    "máy nghiền thực phẩm gia dụng", "juicer",
    "máy xay đa năng nhà bếp"
  ],
  "mo_ta_tu_nhien": [
    "máy cắm điện để xay hoa quả uống",
    "thiết bị nhà bếp dùng motor xay nhuyễn thức ăn",
    "máy ép nước cam chanh bằng điện"
  ],
  "tu_khoa_TQ": ["搅拌机", "榨汁机", "料理机", "绞肉机"],
  "nganh": "gia dụng điện",
  "embedding": [0.023, -0.117, "...384 chiều"],
  "nguon_synonyms": "AI sinh + Thang review",
  "lan_cap_nhat": "2026-04-09",
  "so_lan_match": 0
}
```

**Đặc điểm quan trọng:**

- `synonyms` và `mo_ta_tu_nhien`: AI sinh ban đầu, Thang review, bổ sung liên tục từ case tư vấn thực tế
- `tu_khoa_TQ`: Tên gọi trên Alibaba/1688 — đúng ngữ cảnh hàng TQ-VN
- `so_lan_match`: Tracking mã nào hay được tìm → ưu tiên làm giàu data
- `embedding`: Sinh từ tổng hợp tất cả text fields, dùng multilingual model

### 4.5 PRECEDENT LAYER — 6,000 TB-TCHQ (MỚI — giá trị lớn nhất)

```json
{
  "so_hieu": "TB-TCHQ-4521",
  "nam": 2023,
  "ngay_ban_hanh": "2023-08-15",
  "con_hieu_luc": true,
  "bi_thay_the_boi": null,
  "thay_the_cho": "TB-TCHQ-2105/2019",

  "ten_san_pham": "Ghế massage toàn thân",
  "ten_ky_thuat": "Full body massage chair with motor",
  "ten_TQ": "全身按摩椅",
  "hang_san_xuat": "Xiaomi",
  "model": "RTMG01",
  "dac_tinh": ["có motor", "gia dụng", "điều khiển remote"],

  "ma_dn_khai": "9019.10.10",
  "ma_hq_an_dinh": "8509.80.90",
  "co_tranh_chap": true,
  "ly_do_phan_loai": "SEN 8509 liệt kê thiết bị massage gia dụng có motor...",
  "can_cu_phap_ly": ["Chú giải Ch.85", "SEN AHTN 2022", "GIR 3a"],
  "bai_hoc": "Motor + gia dụng → ưu tiên 8509 trước 9019",

  "hs_lien_quan": ["85098090", "90191010"],
  "tb_lien_quan": ["TB-TCHQ-3890"],
  "url_goc": "https://thuvienphapluat.vn/...",
  "nguon_data": "parse_pdf",

  "embedding": [0.045, -0.089, "...384 chiều"]
}
```

**Giá trị:** AI không chỉ phân loại theo lý thuyết — mà cảnh báo rủi ro dựa trên **tiền lệ thực tế**. Không chuyên gia nào nhớ hết 6,000 TB, nhưng semantic search tìm được trong 1 giây.

---

## 5. LUỒNG VẬN HÀNH KHI USER TRA CỨU

```
User: "ghế massage chạy điện có remote"
         │
    ═══ TẦNG 0: SEMANTIC SEARCH ═══
         │
    Search song song 2 index:
    ├─ Index A: 11,871 mã HS → top 10 mã ứng viên
    └─ Index B: 6,000 TB-TCHQ → top 5 case tương tự
         │
         ▼
    ═══ TẦNG 2: AI SUY LUẬN ═══
    LLM nhận: 10 mã + chú giải + 5 TB-TCHQ
    ├─ Áp GIR (6 quy tắc)
    ├─ Check bao gồm / loại trừ
    ├─ So sánh TB-TCHQ tiền lệ
    └─ Chốt mã + cảnh báo rủi ro
         │
         ▼
    ═══ TẦNG 1: LOOKUP ═══
    Mã 8 số → thuế MFN/ACFTA/VAT + CS + KTCN
         │
         ▼
    OUTPUT cho user
```

---

## 6. XỬ LÝ CONFLICT GIỮA CÁC NGUỒN

**Nguyên tắc: Hệ thống KHÔNG tự chọn nguồn thắng.**

Khi 2+ nguồn conflict, hệ thống trình đầy đủ:

- Nguồn nào nói gì
- Timeline: nguồn nào ra trước/sau
- Thứ bậc pháp lý: Luật > Nghị định > Thông tư > TB-TCHQ > Chú giải
- Phạm vi: TB-TCHQ (1 lô hàng cụ thể) vs Thông tư (toàn quốc)

**→ AI + chuyên gia (Thang) quyết định dựa trên bối cảnh cụ thể.**

Ví dụ:
```
Chú giải HS 2022: mặt hàng X → 9019
TB-TCHQ 4521/2023: mặt hàng X → 8509 (HQ ấn định)
Thông tư mới 2025: bổ sung SEN → X thuộc 9019

→ Hệ thống trình cả 3, ghi rõ timeline + thứ bậc
→ AI phân tích: TT mới (2025) > TB-TCHQ (2023) theo lex posterior
→ Nhưng cảnh báo: HQ thực tế từng ấn định 8509 → rủi ro vẫn có
```

---

## 7. DATA SỐNG — CƠ CHẾ TỰ THÔNG MINH

### 7.1 Thay đổi pháp lý = Event

```json
{
  "event_type": "thong_tu_moi",
  "van_ban": "TT-XX/2026/BTC",
  "ngay_hieu_luc": "2026-07-01",
  "tac_dong": [
    {
      "hs": "85094000",
      "thay_doi": "them_dieu_kien_ktcn",
      "noi_dung": "Bổ sung yêu cầu kiểm tra an toàn điện"
    }
  ]
}
```

### 7.2 Semantic layer tăng trưởng mỗi ngày

- Mỗi case tư vấn thật → thêm cách mô tả mới vào synonyms
- Tracking `so_lan_match` → mã nào hay tìm → ưu tiên làm giàu
- Re-embed định kỳ khi synonyms thay đổi đáng kể

### 7.3 Precedent layer tăng liên tục

- TB-TCHQ mới ban hành → parse + thêm vào
- TB cũ bị thay thế → cập nhật `con_hieu_luc` + `bi_thay_the_boi`

### 7.4 Khi HS mới ra đời (HS2027)

- Core layer: thêm record mới, record cũ đánh `hieu_luc_den`
- Mapping: mã cũ ↔ mã mới ↔ lý do tách/gộp
- Legal, Fact, Semantic: migrate theo mapping
- Precedent: giữ nguyên (TB-TCHQ vẫn có giá trị tham chiếu)

---

## 8. CÔNG NGHỆ

| Thành phần | Lựa chọn đề xuất | Lý do |
|-----------|-------------------|-------|
| Database | **Supabase (PostgreSQL)** | SQL + pgvector + REST API tự sinh + free 500MB + GUI quản lý |
| Vector search | **pgvector** (trong Supabase) hoặc **FAISS** (nếu self-host) | pgvector tích hợp sẵn, FAISS nhanh hơn |
| Embedding model | **paraphrase-multilingual-MiniLM-L12-v2** | Hỗ trợ tiếng Việt, 420MB, chạy local M4 |
| Sinh synonyms | **Claude Code / Ollama** batch | AI sinh, Thang review |
| Scrape TB-TCHQ | **Playwright + GitHub Actions** | Tự động, scheduled |
| Parse TB-TCHQ | **Python + LLM extract** | Structured data từ HTML/PDF |
| Deploy API | **Vercel** (hiện tại) hoặc **Supabase REST** | Free tier đủ dùng |
| Source of truth | **Supabase DB** | JSON trên GitHub = backup/version control |

**Ước tính dung lượng:**
- 12,000 mã × 5 layers × ~2KB/entry ≈ 120MB text
- 12,000 vectors × 384 dim × 4 bytes ≈ 18MB
- 6,000 TB-TCHQ × ~3KB/entry ≈ 18MB
- **Tổng: ~160MB — nằm trong Supabase free 500MB**

---

## 9. API PUBLIC

### Endpoints đề xuất:

```
GET /api/semantic?q={mô tả hàng}&top=10
  → Semantic search: top 10 mã ứng viên + score

GET /api/hs?hs={mã8số}
  → Tra đầy đủ 5 layers theo mã (giữ nguyên, nâng cấp)

GET /api/search?q={từ khóa}
  → Keyword search (giữ nguyên, backward compatible)

GET /api/precedent?q={mô tả hàng}&top=5
  → Semantic search TB-TCHQ liên quan

GET /api/precedent/{so_hieu}
  → Chi tiết 1 TB-TCHQ cụ thể

GET /api/timeline?hs={mã8số}
  → Lịch sử thay đổi pháp lý của 1 mã

GET /api/stats
  → Thống kê tổng quan (giữ nguyên)
```

**Kèm documentation + API key cho bên thứ 3.**

---

## 10. KẾ HOẠCH TRIỂN KHAI

### Phase 1 — Pilot chương 85 (2-3 tuần)
- AI sinh semantic profile cho ~800 mã chương 85
- Thang test 50 case thật → đo accuracy
- Build FAISS/pgvector index + endpoint `/api/semantic`
- Parse thêm TB-TCHQ liên quan chương 85

### Phase 2 — 10 chương phổ biến (1-2 tháng)
- Chương: 39, 48, 73, 76, 84, 85, 87, 90, 94, 96
- Chiếm ~70% hàng hóa TQ-VN
- Scraper pipeline cho TB-TCHQ tự động

### Phase 3 — Full 97 chương (2-3 tháng)
- Hoàn thiện 11,871 mã
- 6,000 TB-TCHQ
- Migrate sang Supabase nếu JSON không đủ

### Phase 4 — Tích hợp + Mở rộng
- Gemini chatbot (dự án B) dùng API
- API public + documentation
- Data tự tăng trưởng từ usage

---

## 11. CÂU HỎI CẦN PHẢN BIỆN

1. **Supabase hay giữ JSON trên GitHub?** Trade-off: GUI quản lý + vector search vs free forever + đơn giản
2. **Embedding model nào tốt nhất cho tiếng Việt hải quan?** Cần benchmark: multilingual-MiniLM vs PhoBERT vs bge-m3
3. **6,000 TB-TCHQ lấy từ đâu?** Thang có file sẵn? Hay phải scrape hết từ thuvienphapluat.vn?
4. **AI sinh synonyms đủ tốt không?** Cần pilot + đo: bao nhiêu % case tìm đúng mã trong top 5?
5. **Conflict resolution:** Trình đủ 2 nguồn + timeline có đủ không? Hay cần thêm scoring?
6. **Tốc độ:** pgvector trên Supabase free tier có đủ nhanh cho 3000 visitors/tháng?
7. **Bảo mật:** API public cần rate limit, API key, hay free truy cập?
8. **HS2027:** Khi nào cần bắt đầu chuẩn bị mapping? Timeline WCO?

---

*File này dùng để phản biện. Mọi quyết định kỹ thuật do Scout (AXÍT) thực hiện sau khi CEO duyệt hướng đi.*
