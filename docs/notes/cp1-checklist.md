# Checkpoint 1 - Phase 1 (PRD-0)

Cập nhật: 2026-11-20. Bằng chứng sinh bởi `npm run proof` (xem [docs/proof/phase1/REPORT.md](../proof/phase1/REPORT.md)). Máy: Windows 11, Node 22.22.

## Tự kiểm theo CHECKPOINTS.md

| Việc | Trạng thái | Bằng chứng |
|---|---|---|
| Đọc PRD-0 hai lần, gạch phần bắt buộc / mơ hồ | [x] | [assumptions-phase1.md](assumptions-phase1.md) (A1-A22; [B] = bắt buộc) |
| Giả định cho từng chỗ mơ hồ + con số tự chọn | [x] | cùng file, bảng tuning ở mục 1 |
| Tách logic khỏi hiển thị, chạy được headless | [x] | `src/core` không import render/Node; CLI ở `src/headless`; 18000 tick chạy ~0.1 s |
| Tự viết scenario nhỏ, kiểm định dạng đầu ra | [x] | `scenarios/cases.mjs` (15 case), `tests/contract.test.js` (7 test) |
| Chạy 2 lần cùng đầu vào, so sánh | [x] | case c15: output giống hệt, seed khác thì khác (sha256 trong REPORT.md) |
| Làm đúng các bàn giao PRD-0 | xem bảng dưới | |

## Bàn giao Phase 1 (PRD-0 mục 5)

| Bàn giao | Trạng thái | Ghi chú |
|---|---|---|
| Game chơi được Đêm 1 từ đầu tới thắng/thua | [~] (người dùng đã chơi thử, nhận xét ổn, hơi giật; đã sửa nội suy, chưa đo lại) | Logic thắng/thua đã kiểm bằng headless (c04, c05, c10). Giao diện chạy và chụp được; **chưa có người chơi trọn một ván bằng bàn phím** (xem Chưa đạt) |
| README (≤3 lệnh, điều khiển, cách tính điểm) | [x] | [README.md](../../README.md) |
| `game.contract.json` + headless Test Contract v1.0 | [x] | 7 test contract + 15 case; đúng mã thoát, tick, định dạng |
| Bằng chứng + ghi chép (giả định, nhật ký AI) | [x] | docs/proof/phase1, docs/notes |
| Harness AI | [x] | AGENTS.md, skill verify-headless, hook Stop, CI |

## Yêu cầu → bằng chứng

| Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|
| Nhân vật đi, nhảy | c11, c12, c13 | đạt |
| Đom đóm nhặt được | c01 | đạt |
| Nạp ánh sáng thắp đèn, 5 đèn | c02, c03, c04, contract.test | đạt |
| Bóng Mực đuổi, gây mất máu | c05, c06 | đạt |
| Tỏa sáng xua Bóng Mực, tốn ánh sáng | c07, c08 | đạt |
| Bóng Mực sợ đèn (safe_radius) | c09 | đạt |
| Thắng / thua / điểm | c02, c04, c05, c10 | đạt |
| Chơi lại sau thắng/thua | phím R gọi `reset()` ở `src/render/main.js` | **chưa kiểm tự động**, chỉ kiểm bằng đọc code |
| HUD | `docs/proof/phase1/ui-*.png` | đạt (ảnh) |
| Camera 3D, đảo sáng dần | `ui-start.png`, `ui-lit3.png` | đạt (ảnh) |
| Tất định, mã thoát 2, tick đúng | c15, contract.test | đạt |

## Chưa đạt / hạn chế (trung thực)
1. Chưa có test tự động cho điều khiển bàn phím và chơi lại trong giao diện; cần người chơi thử một ván.
2. Giả định ❓ (A1 ánh sáng = đom đóm mang, A4 safe_radius chỉ đèn đã sáng, A7 thứ tự thắng/thua) **chưa hỏi trợ giảng**; nếu đáp án khác, sửa tại `src/core/sim.js` và case tương ứng.
3. Không có `dash`, không có rơi khỏi đảo (`fall_enabled: false`).
4. Token/chi phí chưa đo, xem ai-log.md.
5. ~~Chưa tag~~ Đã commit `eb4e93f`, tag `phase-1` trỏ đúng commit này (kiểm bằng GitHub API), CI xanh, clone thật từ tag chạy được.

## Đánh giá nhanh
- Đạt: lõi headless đúng contract, có mutation test bắt được lỗi giả; hook Stop chặn khi test đỏ (đã thử).
- AI sai: lỗi API Three.js chỉ lộ khi chạy trình duyệt; test xanh ngay lần đầu cần nghi ngờ, mutation lộ một test yếu (floor/ceil).
- Chỉnh harness: thêm "bài học đã rút" vào AGENTS.md, thêm bước chụp UI vào bằng chứng.