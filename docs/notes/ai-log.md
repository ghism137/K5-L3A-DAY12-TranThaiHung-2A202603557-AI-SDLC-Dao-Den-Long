# Nhật ký dùng AI

Công cụ: Claude Code (VS Code), model Sonnet 5.5. Token/chi phí: **chưa đo được từ trong phiên**, điền số thật từ thống kê của Claude Code (`/cost` hoặc usage) trước khi nộp. Không bịa số.

| Phase | Việc giao cho AI | Cách tiết kiệm token | AI sai ở đâu + cách phát hiện + chỉnh harness |
|---|---|---|---|
| CP0 | Dựng khung repo, harness, CI, Docker | Đọc 6 file tài liệu một lần, stack không dependency | `node --test tests/` thất bại trên Node 22 (coi thư mục là file): phát hiện khi chạy thật → dùng `node --test`; ghi vào AGENTS.md |
| 1 | Đọc PRD-0, viết giả định A1-A22, lõi mô phỏng, CLI, 22 test, 15 scenario, render Three.js, hook, skill | Chốt giả định + kế hoạch trước khi code; viết scenario/kiểm chứng trước khi tin code; không sinh asset | (1) Render lần đầu lỗi `Cannot assign to read only property 'position'`: **chỉ lộ khi chạy trình duyệt thật** (Edge headless, đọc console), test Node không thấy → thêm bước chụp ảnh UI vào bằng chứng và dòng trong AGENTS.md. (2) 22 test xanh ngay lần đầu nên nghi ngờ: chạy mutation (5 đột biến), phát hiện test `floor/ceil` chưa đủ chặt (carried=4 cho cùng kết quả) → đổi sang carried=5, đột biến bị bắt. (3) Hook Stop sai khi stdin có BOM (PowerShell pipe) → bỏ BOM trong hook, kiểm cả hai nhánh `stop_hook_active`. (4) Mã tool tự thêm BOM khi ghi bằng `Set-Content` → ghi bằng UTF-8 không BOM || 2 | Đọc Ticket-02, 33 giả định, viết lại lõi (địa hình, 3 Đêm, lướt, rơi, bục, Bóng Mực 5 trạng thái, Gió Lạc, bùa, gió, tạm dừng), 61 case, mutate, giao diện (world/ui/audio/settings), bot UI, đo FPS | Chốt giả định trước khi code; một phiên nhưng chia 8 bước; sinh dữ liệu bản đồ từ công thức; test bằng bot thay vì kiểm tay; không dùng asset ngoài | (1) Id Bóng Mực nhảy số S2, S4, S6: phát hiện bằng case lịch sinh, nguyên nhân tăng bộ đếm hai lần. (2) Test c10 và c40 thiết kế mâu thuẫn với luật (Bóng ở 22 m bỏ đuổi; thắp đèn đẩy Bóng đi): sửa test, không sửa luật. (3) 7/22 mutant sống sót dù 63 test xanh: các biên ±1 tick, 3D vs 2D, bắn lại bục: siết 5 test. (4) Camera bắt đầu nhìn ngược hướng Mây: phát hiện qua ảnh chụp, đặt yaw 180. (5) Bot UI treo vì rAF không chạy khi trang không ở foreground. (6) PowerShell: hàm `R` trùng alias `Invoke-History` nên mọi sửa file không có tác dụng và không báo lỗi rõ: đã đưa vào AGENTS.md. |

## Token và chi phí

- Tôi dùng **gói Pro nên không có số tiền hay token chính xác cho bài này** (`/cost` không áp dụng cho thuê bao). Không ghi số bịa. Thay vào đó ghi mức dùng tương đối và việc làm tiết kiệm.
- Cách đo thay thế: ghi `/usage` (tỷ lệ phần trăm giới hạn phiên) trước và sau mỗi phase vào bảng dưới (người dùng điền; chưa có số thì để trống).

| Phase | `/usage` trước | `/usage` sau | Ghi chú |
|---|---|---|---|
| 1 | _chưa ghi_ | _chưa ghi_ | khung + lõi + giao diện đơn giản, ~1 phiên |
| 2 | _chưa ghi_ | _chưa ghi_ | lớn nhất: viết lại lõi + giao diện + bot UI, ~1 phiên dài |

Cách tiết kiệm: chốt giả định/kế hoạch trước khi code (tránh sửa lại), dùng bot/script sinh bằng chứng thay vì hỏi lại AI, `npm run mutate` thay vì đọc test thủ công, đọc ticket một lần.