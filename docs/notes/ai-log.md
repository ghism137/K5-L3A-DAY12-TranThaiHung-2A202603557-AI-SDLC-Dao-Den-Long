# Nhật ký dùng AI

Công cụ: Claude Code (VS Code), model Sonnet 5.5. Token/chi phí: **chưa đo được từ trong phiên**, điền số thật từ thống kê của Claude Code (`/cost` hoặc usage) trước khi nộp. Không bịa số.

| Phase | Việc giao cho AI | Cách tiết kiệm token | AI sai ở đâu + cách phát hiện + chỉnh harness |
|---|---|---|---|
| CP0 | Dựng khung repo, harness, CI, Docker | Đọc 6 file tài liệu một lần, stack không dependency | `node --test tests/` thất bại trên Node 22 (coi thư mục là file): phát hiện khi chạy thật → dùng `node --test`; ghi vào AGENTS.md |
| 1 | Đọc PRD-0, viết giả định A1-A22, lõi mô phỏng, CLI, 22 test, 15 scenario, render Three.js, hook, skill | Chốt giả định + kế hoạch trước khi code; viết scenario/kiểm chứng trước khi tin code; không sinh asset | (1) Render lần đầu lỗi `Cannot assign to read only property 'position'`: **chỉ lộ khi chạy trình duyệt thật** (Edge headless, đọc console), test Node không thấy → thêm bước chụp ảnh UI vào bằng chứng và dòng trong AGENTS.md. (2) 22 test xanh ngay lần đầu nên nghi ngờ: chạy mutation (5 đột biến), phát hiện test `floor/ceil` chưa đủ chặt (carried=4 cho cùng kết quả) → đổi sang carried=5, đột biến bị bắt. (3) Hook Stop sai khi stdin có BOM (PowerShell pipe) → bỏ BOM trong hook, kiểm cả hai nhánh `stop_hook_active`. (4) Mã tool tự thêm BOM khi ghi bằng `Set-Content` → ghi bằng UTF-8 không BOM |