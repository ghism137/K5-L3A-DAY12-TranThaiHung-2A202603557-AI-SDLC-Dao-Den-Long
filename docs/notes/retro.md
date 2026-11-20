# Retro: Đảo Đèn Lồng (Day 12, cá nhân)

Trần Thái Hưng · 2A202603557 · Công cụ: Claude Code (VS Code), Sonnet 5.5, gói Pro.

## Bốn phase nhìn lại
| Phase | Kết quả | Khó nhất |
|---|---|---|
| 1 Đêm 1 | Lõi tất định 60 tick/s, CLI headless, giao diện Three.js | Dựng harness và chốt giả định trước khi code |
| 2 Ba hòn đảo | Viết lại lõi: địa hình, 3 Đêm, lướt, Gió Lạc, bùa, gió | Nhiều luật tương tác; 7/22 mutant sống sót |
| 3 Đèn cạn dầu | Đổi luật (Change Request): nhiên liệu, hút dầu, thắng ở bình minh | Bảo toàn phần cũ, 9 test cũ phải sửa có lý do |
| 4 Bình minh | Benchmark, soak, bảng xếp hạng, tiếp cận, đóng gói v1.0.0 | Hiệu năng: baseline chỉ 62–98 FPS |

## Điều hiệu quả
- **Chốt giả định và kế hoạch trước khi code**, người duyệt từng phase: ít phải viết lại.
- **Kiểm chứng độc lập với code**: scenario + proof (sha256), mutation, bot UI. Mutation là công cụ có giá trị nhất: bắt 7/22, 4/25 rồi 28 mutant mới ở Phase 4, mỗi lần chỉ ra test lỏng.
- **So sánh sha256 với phase trước** để chứng minh Phase 4 không đổi hành vi (99/99 giống hệt) dù đã tối ưu mô phỏng.
- **Đo trước khi tối ưu**: benchmark chuẩn cho thấy ~1200 draw call; instancing + Points đưa avg từ ~62–98 lên ~260 FPS, p1 low từ ~18 lên ~58.
- Harness tốt nhất: **hook Stop chạy `npm test`** (không kết thúc khi đỏ) và **skill verify-headless/verify-ui** (quy trình lặp lại được).

## AI sai ở đâu và phát hiện thế nào
- Lỗi chỉ lộ khi chạy trình duyệt thật (read-only `position`, camera ngược hướng, CSS mù màu mất khi viết lại, rAF không chạy khi không foreground) → thêm bot UI và ảnh chụp vào bằng chứng.
- Test do AI viết thiết kế mâu thuẫn luật hoặc quá lỏng (c10, c40, c66) → mutation lộ ra; sửa test, không sửa luật.
- Số đo gây hiểu nhầm: `peak_mem_mb` null, RSS soak dao động ±10 MB, việc lấy mẫu làm nhiễu FPS → đọc kỹ file kết quả thay vì tin "chạy xong".
- Máy chủ trả 413 bằng cách hủy socket (client thấy "fetch failed") → test server.
- Công cụ PowerShell: hàm trùng alias, backtick làm hỏng markdown, tham số rỗng bị bỏ → ghi vào AGENTS.md, chuyển sang script .mjs.

## Token và chi phí
**Không có số token hay chi phí cho bài này.** Tôi dùng gói Pro (thuê bao) nên `/cost` không áp dụng; `/usage` là phần trăm hạn mức chung của cả tài khoản và tôi dùng cùng tài khoản cho nhiều việc khác ngoài bài này, nên không tách được phần của riêng bài. Tôi không tìm được phép đo thay thế phù hợp và không ghi số ước tính (chi tiết ở [ai-log.md](ai-log.md)). Cảm nhận, không phải số đo: Phase 2 và 4 nặng nhất. Cách tiết kiệm đã dùng: chốt kế hoạch trước khi code, bot/script sinh bằng chứng thay vì hỏi lại AI, vá nhiều chỗ bằng một script có kiểm marker, tái dùng proof/mutate/smoke, đọc ticket một lần.

## Sẽ đổi nếu làm lại
- Viết benchmark và scene chuẩn **từ Phase 1** để hiệu năng không thành nợ dồn tới cuối.
- Hỏi TA sớm các giả định ❓ (vsync, p95, seed, achieved_at) thay vì tự chọn.
- Dựng bot UI và hook sớm hơn; dùng tài khoản riêng cho lab để có thể đo token/chi phí.
- Thử giao diện với người thật (độ rõ chỉ báo, trình đọc màn hình): hiện mới kiểm bằng máy.
