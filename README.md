# Phòng thực hành Tin học 3, 4, 5

Website học tập và thực hành Tin học tiểu học (lớp 3, 4, 5) bám sát bộ sách giáo khoa **Kết nối tri thức với cuộc sống**, tích hợp mô phỏng cây thư mục (File Explorer ảo), luyện gõ bàn phím 10 ngón, trò chơi theo kĩ năng, đố vui chấm phía máy chủ, quản lí lớp học/nhập Excel cho giáo viên và bảng thi đua thời gian thực qua SSE.

## 1. Tính năng đã triển khai (P0 → P1 → P2)

### Ba bài học hoàn chỉnh đầu cuối (Xem mẫu → Làm theo → Tự làm → Trò chơi → Đố vui)
1. **Lớp 4 · Bài 5: Thao tác với tệp và thư mục** (`L4-B5`, SGK tr. 24–27):
   - Mô phỏng File Explorer ảo hỗ trợ Tạo thư mục, Sao chép (giữ nguyên tệp gốc), Cắt (giữ tệp nguồn cho tới khi Dán thành công), Dán, Di chuyển đến (`Move to`), Đổi tên, Xóa (có hộp xác nhận & bảo vệ thư mục hệ thống `Windows (C:)`), Hoàn tác (`Undo`), phím tắt `Ctrl+C/X/V/Z`, `F2`, `Delete`.
   - Trò chơi **Bưu điện tệp tin** và **6 câu Đố vui** có lời giải.
2. **Lớp 3 · Bài 5: Sử dụng bàn phím** (`L3-B5`, SGK tr. 23–28):
   - Bàn phím 5 hàng có gờ nổi phím `F`, `J`, tô màu 10 ngón tay trái/phải, gõ bàn phím thật và chế độ chạm màn hình, 3 dãy luyện tập, trò chơi **Đom đóm tìm phím** (có Chế độ chậm), và **6 câu Đố vui** (gồm câu hỏi bấm vùng hàng phím & ghép ngón tay).
3. **Lớp 5 · Bài 4: Cây thư mục** (`L5-B4`, SGK tr. 18–23):
   - Mô phỏng cây thư mục có **Tìm kiếm giới hạn theo thư mục đang mở**, lệnh **Mở vị trí tệp** (`Open file location`), nhiệm vụ Tự làm phân loại cây thư mục, trò chơi **Thám tử tìm tệp**, và **6 câu Đố vui**.

### Danh mục 51 mục bài SGK & Cổng kiểm duyệt xuất bản
- Đủ 51 mục bài từ lớp 3 (16 mục, gồm nhánh `12A`/`12B`), lớp 4 (17 mục, gồm nhánh `12A`/`12B`), lớp 5 (18 mục, gồm nhánh `8A–9A`/`8B–9B`).
- Các bài thiếu trang SGK (`L3-B8`, `L4-B8`, `L5-B8A` và các bài chỉ có mục lục `toc_only`) bị khóa ở trạng thái `draft`, học sinh không xem được và giáo viên không thể xuất bản khi chưa bổ sung đủ nguồn.

### Xác thực, Phiên thiết bị, Giáo viên & Realtime SSE
- **Học sinh**: Đăng nhập bằng `Mã lớp + Mã học sinh + PIN 6 chữ số` (giữ số `0` đầu, băm Argon2id + salt + pepper, khóa tạm sau 5 lần sai). Hỗ trợ giữ phiên qua F5/đóng tab (máy chung 2h, máy riêng 7 ngày), **Đổi học sinh**, và hộp xác nhận **Đăng xuất** thu hồi phiên ngay.
- **Giáo viên**: Đăng nhập Email/Mật khẩu, phân quyền theo lớp được giao (`403` chéo lớp). Nhập Excel `.xlsx` / CSV UTF-8 có xem trước từng dòng, phát hiện lỗi mất số `0` đầu khi Excel lưu PIN dạng số, chặn formula injection (`=`, `+`, `-`, `@`), cấp lại PIN hiển thị 1 lần + in **Phiếu vào lớp**, xuất báo cáo Excel an toàn công thức, bật/tắt bảng thi đua (mặc định TẮT), đối soát bảng hạng, và **Chế độ trình chiếu** ẩn dữ liệu cá nhân.
- **XP & Realtime**: Chấm ở máy chủ bằng transaction + `xpLedger/{awardId}` chống cộng trùng XP khi retry/nộp đúp tab; đẩy tiến độ & bảng hạng biệt danh qua **SSE cùng origin** (`/api/sse/leaderboard`, `/api/sse/teacher-progress`).
- **Three.js & Chế độ 2D**: Tải lười hiệu ứng 3D (huy hiệu & sao chép kép) có `isSoftwareGl`, `afterDraw`, tự động chuyển sang 2D khi thiết bị không có WebGL, bật `prefers-reduced-motion`, hoặc người dùng bật **Chế độ 2D máy yếu**.

---

## 2. Lệnh chạy & Kiểm thử

```bash
# 1. Cài đặt phụ thuộc (nếu chưa cài)
npm install

# 2. Khởi tạo dữ liệu giả mẫu (.local-emulator-data/store.json) và tạo file mẫu seed/
npm run seed

# 3. Chạy kiểm thử đơn vị + tích hợp API
npm test

# 4. Kiểm tra kiểu TypeScript và build Vite
npm run lint
npm run build

# 5. Khởi động máy chủ Express + Vite trên cổng 3000
npm run dev
```

### Tài khoản mẫu trong dữ liệu seed (`npm run seed`)
- **Học sinh lớp 4A2**: Mã lớp `4A2` · `HS001` (`012345`), `HS002` (`004567`, đã có 20 XP), `HS003` (`089123`), `HS004` (`004404`), `HS005` (`050505`)
- **Học sinh lớp 3A1**: Mã lớp `3A1` · `HS301` (`024680`), `HS302` (`011223`), `HS303` (`033303`), `HS304` (`003304`)
- **Học sinh lớp 5A1 (Nhánh A)**: Mã lớp `5A1` · `HS501` (`055667`), `HS502` (`099001`), `HS503` (`055303`), `HS504` (`005504`)
- **Học sinh lớp 3B2**: Mã lớp `3B2` · `HS901` (`033445`), `HS902` (`090202`)
- **Học sinh lớp 5B1 (Nhánh B)**: Mã lớp `5B1` · `HS511` (`051100`), `HS512` (`051200`)
- **Giáo viên chính (quản lí 3A1, 4A2, 5A1)**: `giaovien@truongtieuhoc.edu.vn` / `GiaoVien@2026`
- **Giáo viên lớp 3B2**: `gv_lopkhac@truongtieuhoc.edu.vn` / `GiaoVien@2026`
- **Giáo viên lớp 5B1**: `gv_khoi5@truongtieuhoc.edu.vn` / `GiaoVien@2026`
- **File mẫu nhập danh sách**: `seed/mau-nhap-hoc-sinh.xlsx` và `seed/mau-nhap-hoc-sinh.csv`

---

## 3. Chạy với Firebase Emulator Suite & Cấu hình Staging/Production

### Chạy cùng Firebase Emulator Suite (trên máy có Java JDK 17+)
```bash
firebase emulators:start --only auth,firestore,database
```
Sau đó chạy seed & dev server với biến môi trường trỏ tới Emulator:
```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 \
npm run seed && \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 \
npm run dev
```
*(Lưu ý: Trong container không có Java/JVM, ứng dụng tự động dùng kho lưu trữ cục bộ bền vững `.local-emulator-data/store.json` với đầy đủ transaction, outbox `syncVersion`, session cookie và SSE).*

### Phần cần cấu hình thêm khi triển khai Firebase Staging / Production
1. Tạo dự án Firebase trên Google Cloud, bật **Firebase Authentication (Email/Password)**, **Cloud Firestore**, và **Firebase Realtime Database**.
2. Deploy security rules & composite indexes có sẵn trong repo:
   - `firestore.rules` (chặn đọc/ghi trực tiếp từ client SDK, buộc qua backend API)
   - `database.rules.json` (chặn đọc/ghi RTDB trực tiếp từ client SDK)
   - `firestore.indexes.json`
3. Cấu hình biến môi trường bảo mật trên Cloud Run / Server:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `SESSION_SECRET` (chuỗi ngẫu nhiên tối thiểu 32 byte)
   - `PIN_PEPPER` (chuỗi bí mật riêng cho Argon2id PIN)
   - Chạy dưới HTTPS để cookie `HttpOnly; Secure; SameSite=Lax` có hiệu lực.

---

## 4. Nội dung SGK còn thiếu để mở rộng sang 48 bài còn lại
Hiện tại 3 bài hoàn chỉnh (`L3-B5`, `L4-B5`, `L5-B4`) đã có đầy đủ trang SGK và bộ câu hỏi/mô phỏng. Để mở rộng xuất bản các bài khác từ trạng thái `draft`, cần bổ sung bản scan/PDF đầy đủ các trang còn thiếu:
- **Tin học 3**: Bài 1–4, 6–7, 9–16 (mục lục) và các trang 40+ của Bài 8 (`L3-B8` mới có tr. 37–39).
- **Tin học 4**: Bài 1–4, 6–7, 9–17 (mục lục) và các trang 40+ của Bài 8 (`L4-B8` mới có tr. 36–39).
- **Tin học 5**: Bài 1–3, 5–7, 8B–9B, 10–16 (mục lục) và các trang 39+ của Bài 8A (`L5-B8A` mới có tr. 36–38).
