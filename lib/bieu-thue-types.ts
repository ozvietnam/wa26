// ============================================================
// BIEU THUE XNK 2026 — Type definitions
// Matching Excel layout + HS Knowledge API 9-layer structure
// ============================================================

export interface NoteData {
  summary: string;
  full: string[];
}

export interface BieuThueRow {
  type: "chapter" | "heading" | "sub" | "item";
  v?: number;           // V level: 0=nhóm 4 số, 1=6 số, 2=8 số, 3=deeper
  code: string;         // Mã HS: "96", "9601", "960110", "96011010"
  desc: string;         // Mô tả hàng hoá - Tiếng Việt
  descEn?: string;      // Mô tả tiếng Anh
  unit?: string;        // Đơn vị tính
  // Tax rates
  nkud?: string;        // NK ưu đãi (MFN)
  nktt?: string;        // NK thông thường
  vat?: string;         // VAT
  acfta?: string;       // ACFTA (Trung Quốc)
  atiga?: string;       // ATIGA (ASEAN)
  evfta?: string;       // EVFTA (EU)
  cptpp?: string;       // CPTPP
  rcep?: string;
  vkfta?: string;       // VKFTA (Hàn Quốc)
  ajcep?: string;
  vjepa?: string;       // VJEPA (Nhật Bản)
  akfta?: string;
  aanzfta?: string;
  aifta?: string;
  ukvfta?: string;      // UKVFTA (Anh)
  ahkfta?: string;
  vcfta?: string;
  eaeu?: string;
  ttdb?: string;        // Tiêu thụ đặc biệt
  bvmt?: string;        // Bảo vệ môi trường
  xk?: string;          // Thuế xuất khẩu
  // Annotations
  note?: NoteData;      // Chú giải chương/nhóm/phân nhóm
  sen?: NoteData;       // SEN 2022
  policies?: string[];  // Chính sách quản lý (KTCN)
  mucCanhBao?: string;  // RED | ORANGE | YELLOW
  // Raw API layers (for detail view)
  _raw?: Record<string, unknown>;
}

// Chapter metadata
export interface ChapterInfo {
  chapter: number;
  title: string;
  titleEn?: string;
}

// Search result from API
export interface SearchMatch {
  index: number;
  code: string;
  desc: string;
}

// All 97 chapters
export const CHAPTERS: ChapterInfo[] = [
  { chapter: 1, title: "Động vật sống" },
  { chapter: 2, title: "Thịt và phụ phẩm dạng thịt ăn được sau giết mổ" },
  { chapter: 3, title: "Cá và động vật giáp xác, động vật thân mềm" },
  { chapter: 4, title: "Sữa và sản phẩm sữa; trứng chim và trứng gia cầm" },
  { chapter: 5, title: "Sản phẩm gốc động vật, chưa được chi tiết hoặc ghi ở nơi khác" },
  { chapter: 6, title: "Cây sống và các loại cây trồng khác; củ, rễ; hoa cắt và lá trang trí" },
  { chapter: 7, title: "Rau và một số loại củ, thân củ và rễ ăn được" },
  { chapter: 8, title: "Quả và quả hạch ăn được; vỏ quả thuộc họ cam quýt hoặc các loại dưa" },
  { chapter: 9, title: "Cà phê, chè, chè Paraguay và các loại gia vị" },
  { chapter: 10, title: "Ngũ cốc" },
  { chapter: 11, title: "Sản phẩm xay xát; malt; tinh bột; inulin; gluten lúa mì" },
  { chapter: 12, title: "Hạt và quả có dầu; các loại ngũ cốc, hạt và quả khác" },
  { chapter: 13, title: "Nhựa cánh kiến đỏ; gôm, nhựa và các chất nhựa và các loại chiết xuất thực vật khác" },
  { chapter: 14, title: "Vật liệu thực vật dùng để tết bện; các sản phẩm thực vật chưa được chi tiết" },
  { chapter: 15, title: "Mỡ và dầu động vật hoặc thực vật; sáp động vật hoặc thực vật" },
  { chapter: 16, title: "Các chế phẩm từ thịt, cá hoặc động vật giáp xác, thân mềm" },
  { chapter: 17, title: "Đường và các loại kẹo đường" },
  { chapter: 18, title: "Ca cao và các chế phẩm từ ca cao" },
  { chapter: 19, title: "Chế phẩm từ ngũ cốc, bột, tinh bột hoặc sữa; bánh" },
  { chapter: 20, title: "Chế phẩm từ rau, quả, quả hạch hoặc các phần khác của cây" },
  { chapter: 21, title: "Các chế phẩm ăn được khác" },
  { chapter: 22, title: "Đồ uống, rượu và giấm" },
  { chapter: 23, title: "Phế liệu và phế thải từ ngành công nghiệp thực phẩm; thức ăn gia súc" },
  { chapter: 24, title: "Thuốc lá và các sản phẩm thay thế thuốc lá" },
  { chapter: 25, title: "Muối; lưu huỳnh; đất và đá; thạch cao, vôi và xi măng" },
  { chapter: 26, title: "Quặng, xỉ và tro" },
  { chapter: 27, title: "Nhiên liệu khoáng, dầu khoáng; sáp khoáng chất" },
  { chapter: 28, title: "Hóa chất vô cơ; hợp chất hữu cơ hay vô cơ của kim loại quý" },
  { chapter: 29, title: "Hóa chất hữu cơ" },
  { chapter: 30, title: "Dược phẩm" },
  { chapter: 31, title: "Phân bón" },
  { chapter: 32, title: "Các chất chiết xuất thuộc da hoặc nhuộm; tanin; thuốc nhuộm, bột màu" },
  { chapter: 33, title: "Tinh dầu và các chất tựa nhựa; nước hoa, mỹ phẩm" },
  { chapter: 34, title: "Xà phòng, chất hoạt động bề mặt hữu cơ; sáp nhân tạo" },
  { chapter: 35, title: "Các chất chứa albumin; các dạng tinh bột biến tính; keo; enzym" },
  { chapter: 36, title: "Chất nổ; các sản phẩm pháo; diêm; hợp kim tự cháy" },
  { chapter: 37, title: "Vật liệu ảnh và điện ảnh" },
  { chapter: 38, title: "Các sản phẩm hóa chất khác" },
  { chapter: 39, title: "Plastic và các sản phẩm bằng plastic" },
  { chapter: 40, title: "Cao su và các sản phẩm bằng cao su" },
  { chapter: 41, title: "Da sống (trừ da lông) và da thuộc" },
  { chapter: 42, title: "Các sản phẩm bằng da thuộc; yên cương; túi xách" },
  { chapter: 43, title: "Da lông thú và da lông nhân tạo; các sản phẩm làm từ da lông" },
  { chapter: 44, title: "Gỗ và các mặt hàng bằng gỗ; than từ gỗ" },
  { chapter: 45, title: "Lie và các sản phẩm bằng lie" },
  { chapter: 46, title: "Sản phẩm làm từ rơm, cỏ giấy hoặc vật liệu tết bện khác" },
  { chapter: 47, title: "Bột giấy từ gỗ hoặc từ nguyên liệu xơ sợi xenlulô khác" },
  { chapter: 48, title: "Giấy và bìa; các sản phẩm làm bằng bột giấy, bằng giấy hoặc bằng bìa" },
  { chapter: 49, title: "Sách, báo, tranh ảnh và các sản phẩm khác của công nghiệp in" },
  { chapter: 50, title: "Tơ tằm" },
  { chapter: 51, title: "Lông cừu, lông động vật loại mịn hoặc loại thô; sợi từ lông đuôi ngựa" },
  { chapter: 52, title: "Bông" },
  { chapter: 53, title: "Xơ sợi dệt gốc thực vật khác; sợi giấy và vải dệt thoi từ sợi giấy" },
  { chapter: 54, title: "Sợi filament nhân tạo; dải và các dạng tương tự từ nguyên liệu dệt nhân tạo" },
  { chapter: 55, title: "Xơ sợi staple nhân tạo" },
  { chapter: 56, title: "Mền xơ, phớt và các sản phẩm không dệt; các loại sợi đặc biệt" },
  { chapter: 57, title: "Thảm và các loại hàng dệt trải sàn khác" },
  { chapter: 58, title: "Các loại vải dệt đặc biệt; vải dệt chần sợi xù; đăng ten; thảm trang trí" },
  { chapter: 59, title: "Các loại vải dệt đã ngâm tẩm, tráng, phủ hoặc ép lớp" },
  { chapter: 60, title: "Các loại vải dệt kim hoặc móc" },
  { chapter: 61, title: "Quần áo và hàng may mặc phụ trợ, dệt kim hoặc móc" },
  { chapter: 62, title: "Quần áo và hàng may mặc phụ trợ, không dệt kim hoặc móc" },
  { chapter: 63, title: "Các sản phẩm dệt đã hoàn thiện khác; bộ vải; quần áo cũ" },
  { chapter: 64, title: "Giày, dép, ghệt và các sản phẩm tương tự; các bộ phận của chúng" },
  { chapter: 65, title: "Mũ và các vật đội đầu khác và các bộ phận của chúng" },
  { chapter: 66, title: "Ô, dù, ba toong, gậy tay cầm, roi điều khiển súc vật" },
  { chapter: 67, title: "Lông vũ và lông tơ chế biến; hoa nhân tạo; sản phẩm từ tóc người" },
  { chapter: 68, title: "Sản phẩm làm bằng đá, thạch cao, xi măng, amiăng, mica" },
  { chapter: 69, title: "Sản phẩm gốm sứ" },
  { chapter: 70, title: "Thủy tinh và các sản phẩm bằng thủy tinh" },
  { chapter: 71, title: "Ngọc trai tự nhiên hoặc nuôi cấy, đá quý, kim loại quý" },
  { chapter: 72, title: "Sắt và thép" },
  { chapter: 73, title: "Các sản phẩm bằng sắt hoặc thép" },
  { chapter: 74, title: "Đồng và các sản phẩm bằng đồng" },
  { chapter: 75, title: "Niken và các sản phẩm bằng niken" },
  { chapter: 76, title: "Nhôm và các sản phẩm bằng nhôm" },
  { chapter: 77, title: "(Dự phòng cho việc sử dụng trong tương lai)" },
  { chapter: 78, title: "Chì và các sản phẩm bằng chì" },
  { chapter: 79, title: "Kẽm và các sản phẩm bằng kẽm" },
  { chapter: 80, title: "Thiếc và các sản phẩm bằng thiếc" },
  { chapter: 81, title: "Kim loại cơ bản khác; gốm kim loại; các sản phẩm của chúng" },
  { chapter: 82, title: "Dụng cụ, đồ nghề, dao kéo, thìa và dĩa làm bằng kim loại cơ bản" },
  { chapter: 83, title: "Hàng tạp hóa làm bằng kim loại cơ bản" },
  { chapter: 84, title: "Lò phản ứng hạt nhân, nồi hơi, máy và thiết bị cơ khí; các bộ phận" },
  { chapter: 85, title: "Máy điện và thiết bị điện; thiết bị ghi và phát âm thanh, hình ảnh" },
  { chapter: 86, title: "Đầu máy xe lửa, xe điện và phương tiện chạy trên đường xe lửa hoặc xe điện" },
  { chapter: 87, title: "Xe cộ trừ phương tiện chạy trên đường sắt; các bộ phận và phụ kiện" },
  { chapter: 88, title: "Phương tiện bay, tàu vũ trụ và các bộ phận của chúng" },
  { chapter: 89, title: "Tàu thuyền và các kết cấu nổi" },
  { chapter: 90, title: "Dụng cụ quang học, nhiếp ảnh, đo lường, kiểm tra, y tế hoặc phẫu thuật" },
  { chapter: 91, title: "Đồng hồ thời gian và các bộ phận của chúng" },
  { chapter: 92, title: "Nhạc cụ; các bộ phận và phụ kiện của chúng" },
  { chapter: 93, title: "Vũ khí và đạn; các bộ phận và phụ kiện của chúng" },
  { chapter: 94, title: "Đồ nội thất; bộ đồ giường, đệm, khung đệm, nệm" },
  { chapter: 95, title: "Đồ chơi, dụng cụ dùng cho giải trí hoặc thể thao" },
  { chapter: 96, title: "Các sản phẩm khác" },
  { chapter: 97, title: "Các tác phẩm nghệ thuật, đồ sưu tầm và đồ cổ" },
];
