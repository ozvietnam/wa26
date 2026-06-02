# 5 Test Cases — Khách Hàng Tra HS Code Thực Tế

**Live URL:** https://wa26.vercel.app/chat  
**Ngày test:** 2026-04-15  
**Mục đích:** Đánh giá chất lượng trả lời chatbot cho tra cứu HS code thực tế

---

## Test Case 1: Máy bơm nước dân dụng

**Khách hỏi:** "Em cần tra mã HS cho máy bơm nước gia đình dùng, công suất 0.75 KW, nhập khẩu từ Thái Lan. Thuế suất là bao nhiêu?"

**Kỳ vọng:**
- ✅ Định danh mã HS: **8413.70.90** (Máy bơm khác, không có bộ phận điều chỉnh mức nước)
- ✅ Thuế MFN: 5%
- ✅ ACFTA: 0% (hàng Thái Lan)
- ✅ VAT: 10%
- ✅ Tổng cộng: ~15% (MFN + VAT)

**Ghi nhận:**
- Thời gian trả lời: _____ giây
- Chính xác mã HS: [ ] Đúng [ ] Sai
- Thuế suất chính xác: [ ] Có [ ] Không
- Giải thích rõ ràng: [ ] Có [ ] Không
- Nhận xét khách: ___________________________________________________

---

## Test Case 2: Vải cotton in hoa (0.5 tấn)

**Khách hỏi:** "Mình muốn nhập khẩu 500 kg vải cotton in họa tiết từ Ấn Độ. Đây là vải dệt với sợi cotton 100%, chiều rộng 1.5m. Cần tra mã HS và xem có hạn chế nào không?"

**Kỳ vọng:**
- ✅ Định danh mã HS: **5210.51.00** (Dệt vải cotton, in hoa, khác)
- ✅ Thuế MFN: 10%
- ✅ ACFTA: 0% (hàng Ấn Độ qua AIFTA)
- ✅ Chính sách: Kiểm tra tiêu chuẩn hàng dệt
- ✅ SEN: Có phạm vi bao gồm / không bao gồm?

**Ghi nhận:**
- Thời gian trả lời: _____ giây
- Mã HS chính xác: [ ] Đúng [ ] Sai
- Cảnh báo/hạn chế: [ ] Có [ ] Không
- Độ chi tiết: [ ] Cao [ ] Trung bình [ ] Thấp
- Nhận xét khách: ___________________________________________________

---

## Test Case 3: Thiết bị điện tử (USB 3.0 Hub)

**Khách hỏi:** "Công ty tôi sản xuất USB hub 4 cổng, chuẩn USB 3.0, nguồn từ Trung Quốc. Mã HS là gì? Có cần sertifikat gì không?"

**Kỳ vọng:**
- ✅ Định danh mã HS: **8471.30.20** (Đơn vị xử lý dữ liệu - hub)
- ✅ Thuế MFN: 0-5% (tùy loại)
- ✅ ACFTA-China: 0%
- ✅ Yêu cầu: Chứng chỉ CE, FCC (nếu có yêu cầu)
- ✅ KTCN: Có

**Ghi nhận:**
- Thời gian trả lời: _____ giây
- Mã HS đúng: [ ] Đúng [ ] Sai
- Cảnh báo an toàn/sertifikat: [ ] Có [ ] Không
- Độ phức tạp xử lý: [ ] Tốt [ ] OK [ ] Yếu
- Nhận xét khách: ___________________________________________________

---

## Test Case 4: Nông sản — Cà phê nhân

**Khách hỏi:** "Tôi muốn nhập 10 tấn cà phê nhân (chưa rang) từ Lào. Dùng để rang và bán lẻ. Mã HS bao nhiêu? Có cơ chế gì để tối ưu thuế suất không?"

**Kỳ vọng:**
- ✅ Định danh mã HS: **0901.11.10** (Cà phê nhân, không xử lý khác)
- ✅ Thuế MFN: 5-10%
- ✅ ACFTA-Lào: 0-5% (quy tắc xuất xứ)
- ✅ Chính sách quản lý: Kiểm tra chất lượng, vệ sinh an toàn thực phẩm
- ✅ Gợi ý: C/O tiền lệ ACFTA

**Ghi nhận:**
- Thời gian trả lời: _____ giây
- Mã HS chính xác: [ ] Đúng [ ] Sai
- Gợi ý tối ưu: [ ] Có [ ] Không
- Quy tắc xuất xứ được giải thích: [ ] Có [ ] Không
- Nhận xét khách: ___________________________________________________

---

## Test Case 5: Hóa chất — Axit clohidric (HCl)

**Khách hỏi:** "Cần nhập 5 tấn axit clohidric 37% (muriatic acid) từ Hàn Quốc, dùng cho sản xuất. Mã HS là gì? Có những quy định vận chuyển nguy hiểm nào cần biết?"

**Kỳ vọng:**
- ✅ Định danh mã HS: **2807.00.10** (Axit clohidric)
- ✅ Thuế MFN: 3-5%
- ✅ AKFTA: 0% (hàng Hàn Quốc)
- ✅ **CẢNH BÁO:** Chất nguy hiểm - cần KTCN, giấy phép vận chuyển (IMDG/DOT)
- ✅ Quy định vệ sinh môi trường

**Ghi nhận:**
- Thời gian trả lời: _____ giây
- Mã HS chính xác: [ ] Đúng [ ] Sai
- **CẢNH BÁO NGUY HIỂM:** [ ] Có [ ] KHÔNG (❌ lỗi nếu không có)
- Quy định vận chuyển: [ ] Được nhắc [ ] Không nhắc
- Độ quan trọng cảnh báo: [ ] Tối đa [ ] Cao [ ] Bình thường
- Nhận xét khách: ___________________________________________________

---

## Đánh Giá Tổng Thể

| Tiêu chí | Đạt [ ] | Không [ ] | Ghi chú |
|----------|--------|-----------|---------|
| **Độ chính xác mã HS** | | | |
| **Thuế suất chính xác** | | | |
| **Cảnh báo hạn chế/nguy hiểm** | | | |
| **Thời gian phản hồi** | | | |
| **Giải thích rõ ràng** | | | |
| **Đề xuất tối ưu** | | | |

---

## Phần Kết Luận

**Tổng điểm:** _____ / 30  

**Kết luận:**
- ✅ Ready sản xuất: Nếu ≥ 27 điểm
- ⚠️ Cần cải thiện: Nếu 20-26 điểm
- ❌ Cần sửa lỗi: Nếu < 20 điểm

**Bugs/Issues tìm thấy:**
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

**Đề xuất cải thiện:**
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

**Ngày hoàn thành test:** _________________  
**Người test:** _________________  
**Ký tên:** _________________
