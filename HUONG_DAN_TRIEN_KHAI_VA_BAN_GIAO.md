# TÀI LIỆU HƯỚNG DẪN TRIỂN KHAI & BÀN GIAO GÓI 1
## NỀN TẢNG TUYÊN TRUYỀN & THI ĐUA CÔNG DÂN SỐ CƠ SỞ (GÓI 1)

> **Mục tiêu:** Giúp bạn triển khai một dự án hoàn chỉnh cho khách hàng (UBND xã, Công an xã, Đoàn thanh niên, Trường học...) chỉ trong **15 - 20 phút** với chi phí vận hành **0 VNĐ**, thu về từ **3.500.000đ – 6.900.000đ/đơn vị**.

---

### PHẦN 1: CẤU TRÚC BỘ MÃ NGUỒN (TRONG THƯ MỤC `goi1-congdanso`)

1. **`Code.gs`**: Mã nguồn Backend chạy trên Google Apps Script. Tự động khởi tạo cơ sở dữ liệu trên Google Sheets, tính điểm, xếp hạng thôn buôn và cấp mã chứng nhận số.
2. **`index.html`**: Giao diện ứng dụng web di động (Mobile-First Web App). Tích hợp sẵn bộ trắc nghiệm 10 câu, Canvas vẽ **Giấy chứng nhận Công dân số** trực tiếp trên điện thoại, Bảng vàng thi đua theo Thôn và thư viện cẩm nang.
3. **`cloudflare-worker.js`**: Đoạn mã chạy trên Cloudflare (miễn phí) để gán **Tên miền riêng** (ví dụ: `kongang.congdanso.vn`), xóa bỏ thanh cảnh báo của Google.

---

### PHẦN 2: QUY TRÌNH TRIỂN KHAI 5 BƯỚC CHO KHÁCH HÀNG

#### Bước 1: Tạo Bảng tính Google Sheets & Mở Apps Script
1. Truy cập [Google Sheets](https://sheets.new) tạo một bảng tính mới. Đặt tên, ví dụ: `DuLieu_CongDanSo_XaKonGang`.
2. Trên thanh menu, chọn: **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.

#### Bước 2: Dán mã nguồn vào Apps Script
1. Tại file `Mã.gs` (hoặc `Code.gs`): Xóa toàn bộ mã mặc định và dán toàn bộ nội dung từ file **`goi1-congdanso/Code.gs`** vào.
2. Bấm nút dấu cộng `+` bên cạnh mục "Tệp" $\rightarrow$ Chọn **HTML** $\rightarrow$ Đặt tên chính xác là `index` (Apps Script sẽ tự tạo `index.html`).
3. Dán toàn bộ nội dung từ file **`goi1-congdanso/index.html`** vào file `index.html` vừa tạo.
4. Bấm biểu tượng **Lưu (Save - Ctrl+S)**.

#### Bước 3: Khởi tạo dữ liệu tự động (Chỉ 1 click)
1. Tại thanh menu của Apps Script, ở ô chọn hàm chạy, chọn hàm **`setupDatabase`**.
2. Bấm nút **Chạy (Run)**.
3. Google sẽ hiện hộp thoại yêu cầu cấp quyền truy cập bảng tính $\rightarrow$ Bấm *Xem xét quyền* $\rightarrow$ Chọn tài khoản Google của bạn $\rightarrow$ Bấm *Nâng cao (Advanced)* $\rightarrow$ Bấm *Đi tới dự án (Không an toàn)* $\rightarrow$ Bấm **Cho phép (Allow)**.
4. Khi chạy xong, quay lại trang Google Sheets, bạn sẽ thấy hệ thống đã **tự động tạo 4 sheet chuyên nghiệp**:
   * `CauHinh`: Cấu hình tên đơn vị, hotline, slogan, danh sách thôn, màu sắc.
   * `CauHoi`: Ngân hàng 50 câu hỏi chuẩn hóa kèm đáp án và lời giải.
   * `KetQua`: Lưu kết quả người dân làm bài thi đua.
   * `TinTuc`: Thư viện 8 bài cẩm nang chuẩn.

#### Bước 4: Triển khai (Deploy) thành Web App
1. Ở góc trên bên phải màn hình Apps Script, bấm nút **Triển khai (Deploy)** $\rightarrow$ Chọn **Tùy chọn triển khai mới (New deployment)**.
2. Bấm vào biểu tượng bánh răng ⚙️ $\rightarrow$ Chọn **Ứng dụng web (Web app)**.
3. Điền các thông tin:
   * **Mô tả:** `Phiên bản 1.0`
   * **Thực thi dưới dạng (Execute as):** `Tôi (Email của bạn)`
   * **Ai có quyền truy cập (Who has access):** **`Bất kỳ ai (Anyone)`** *(Bắt buộc chọn Anyone để người dân không cần đăng nhập Google vẫn thi được)*.
4. Bấm **Triển khai (Deploy)**.
5. Sao chép lại **URL của ứng dụng web** (có dạng `https://script.google.com/macros/s/AKfycb.../exec`).

#### Bước 5: Cấu hình Tên miền riêng qua Cloudflare (Khuyên dùng)
1. Đăng nhập [Cloudflare.com](https://dash.cloudflare.com/) (miễn phí).
2. Vào mục **Workers & Pages** $\rightarrow$ Bấm **Create application** $\rightarrow$ **Create Worker**.
3. Dán nội dung từ file **`cloudflare-worker.js`** vào.
4. Thay thế biến `GOOGLE_SCRIPT_EXEC_URL` bằng đường link bạn vừa copy ở Bước 4.
5. Bấm **Deploy**.
6. Vào mục **Settings** của Worker $\rightarrow$ **Triggers** $\rightarrow$ **Custom Domains** $\rightarrow$ Thêm subdomain mong muốn (ví dụ: `kongang.congdanso.vn`).
7. **Xong!** Bây giờ người dân chỉ cần truy cập `https://kongang.congdanso.vn` là vào ngay trang web siêu nhanh và chuyên nghiệp.

---

### PHẦN 3: HƯỚNG DẪN DÀNH CHO CÁN BỘ QUẢN LÝ (BÀN GIAO CHO KHÁCH)

Khi bàn giao, bạn chia sẻ quyền chỉnh sửa file Google Sheet cho cán bộ xã/đơn vị và hướng dẫn họ:

1. **Cách đổi thông tin đơn vị:**
   * Vào Sheet `CauHinh`: Muốn đổi số điện thoại hotline, tên đơn vị, hoặc danh sách thôn buôn, chỉ cần gõ vào cột B. Web sẽ tự cập nhật ngay.
   * Đổi màu sắc giao diện: Ở dòng `THEME_MAU_SAC`, gõ `cand` (Công an: Xanh/Vàng), `doanthanhnien` (Đoàn: Xanh dương), hoặc `chinhquyen` (Đảng/UBND: Đỏ/Vàng).
2. **Cách thêm bớt câu hỏi trắc nghiệm:**
   * Vào Sheet `CauHoi`: Thêm dòng mới, điền nội dung câu hỏi, 3-4 phương án, đáp án đúng (A, B, C hoặc D) và lời giải thích.
3. **Cách xuất báo cáo gửi lãnh đạo:**
   * Vào Sheet `KetQua`: Bấm `Tệp` $\rightarrow$ `Tải xuống` $\rightarrow$ `Microsoft Excel (.xlsx)` để nộp báo cáo phong trào thi đua tuần/tháng.

---

### PHẦN 4: KỊCH BẢN CHÀO HÀNG & BỘ ẤN PHẨM TẶNG KÈM

Để khách hàng sẵn sàng ký hợp đồng **5 - 7 triệu VNĐ**, bạn nên đóng gói trọn gói gồm:

1. **Trang Web ứng dụng Công dân số** (chạy trên tên miền riêng).
2. **01 Mã QR Code vector chất lượng cao** (để dán tại bàn tiếp dân, bộ phận một cửa).
3. **Tặng kèm 01 - 02 Standee cuốn nhôm (kích thước 60x160cm)**: Chi phí bạn đi in chỉ khoảng 150.000đ/cây nhưng khách hàng thấy sản phẩm rất trực quan và có thể dùng được ngay tại trụ sở xã.
4. **Bài viết mẫu phát thanh / đăng Zalo OA:**
   > *"UBND/Công an xã... phát động phong trào 'Bình dân học vụ số': Mời toàn thể bà con nhân dân truy cập địa chỉ [Tên_Miền] hoặc quét mã QR tại nhà văn hóa thôn để tham gia thử thách 10 câu hỏi kỹ năng an toàn số và nhận Giấy chứng nhận Công dân số điện tử!"*
