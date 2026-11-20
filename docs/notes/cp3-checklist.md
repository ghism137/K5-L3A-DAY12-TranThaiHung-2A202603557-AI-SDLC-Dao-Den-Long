# Checkpoint 3 - Phase 3 (Ticket-03 "Đèn cạn dầu", Change Request, Contract v1.2)

Cập nhật: 2026-11-20. ADR: [../adr/0001-lantern-fuel-and-dawn-win.md](../adr/0001-lantern-fuel-and-dawn-win.md) · CHANGELOG: [../../CHANGELOG.md](../../CHANGELOG.md) · Spec: [spec-phase3.md](spec-phase3.md) · Giả định: [assumptions-phase3.md](assumptions-phase3.md) · Bằng chứng: [../proof/phase3/](../proof/phase3/). Máy: Windows 11, Intel i3-1115G4 + UHD Graphics, Node 22.22, Edge headless.

## Tự kiểm theo CHECKPOINTS.md

| Việc | Trạng thái | Bằng chứng |
|---|---|---|
| Đọc kỹ chỗ ticket thay luật cũ; liệt kê test, tài liệu, giả định bị ảnh hưởng | [x] | assumptions-phase3.md mục 1 (bảng luật bị thay + test bị ảnh hưởng) |
| Ghi lý do đổi hướng thiết kế (ADR) | [x] | docs/adr/0001-lantern-fuel-and-dawn-win.md |
| Test cũ bị luật mới làm sai: sửa hoặc bỏ **kèm lý do**, không bỏ qua âm thầm | [x] | bảng "Thay đổi test" bên dưới; không có `skip` nào |
| Chạy lại tất cả kiểm chứng còn hiệu lực | [x] | 112/112 test, 99/99 case, 46 đột biến (0 sống sót), bot UI 32/32 |
| Changelog liệt kê breaking changes | [x] | CHANGELOG.md mục Phase 3 |
| Đã gắn tag `phase-3` và push | [x] | commit đã duyệt 2026-11-20; xem `git tag` và GitHub |

## Kết quả đã chạy thật
- `npm test`: **112/112** (Phase 2 còn lại 63 test **không phải sửa**; 9 test bị luật mới thay, 40 test mới).
- `npm run proof`: **99/99** case, scenario/inputs/out.jsonl/sha256 (docs/proof/phase3/REPORT.md); c15 tất định chạy hai lần giống hệt.
- `npm run mutate`: **46 đột biến, 0 sống sót** (3 tương đương, giải thích trong script). Lần đầu 4 sống sót, siết 4 test mới bắt hết (xem ai-log).
- `npm run smoke`: **32/32** (bot bấm phím/chuột thật): thắng bằng sống tới bình minh, không thắng sớm, thua khi thiếu đèn, châm dầu bằng phím E, đèn hết dầu tắt, HUD sức chứa, mù màu được lưu và áp dụng.
- `npm run fps`: **60 FPS trung bình** 1280×720 cả 3 Đêm (Intel UHD thật). `min = 4` là khung đầu khi tải trang.

## Thay đổi test (lý do, không tắt âm thầm)

| Test cũ | Đổi gì | Lý do |
|---|---|---|
| c02 nạp thắp đèn | điểm 200 → 150 (10×5 + 100); thêm kiểm `relight:false`, `state` còn `playing` | điểm mới; không còn thắng sớm |
| c03 nạp dở | điểm 30 → 15 | +5/đom đóm |
| c04 `win_all_lit` | **thay** bằng `c04_dawn_win_three_lit` (thắng ở bình minh, 3/5 đèn, 597 điểm) | luật "thắng ngay khi tất cả đèn sáng" bị thay thế |
| c13 `win_on_last_tick` | **thay** bằng `c13_no_early_win_all_lit` (đủ 5/5 vẫn chơi tới 180 tick, 885 điểm) | không còn thắng sớm / `all_lit` |
| c46 pause | `time_left_s` 299 → 239 | Đêm 1 còn 240 s |
| c47, c48, c49 layout | thời lượng 300/330/360 → 240/270/300 | contract v1.2 |
| tests/contract.test.js | contract 1.2, tuning + score mới, snapshot/scenario/sự kiện mới | contract v1.2 |
| ui-smoke "thắng Đêm 1, Đêm 3" | từ "đi tới đèn cuối bấm E" thành "sống tới bình minh với đủ đèn" | thắng không còn là thắp đủ đèn |
| mutate.mjs | bỏ 1 mutant của luật thắng sớm (`all_lit`, "thắng đúng tick hết giờ"), thêm 25 mutant luật dầu/hút/thắng | luật đã bị thay |
| Không đổi | c01, c05–c12, c14–c50 (không sửa một dòng nào) | hồi quy đạt nguyên vẹn |

Ghi chú c10/c11 (vùng an toàn): vẫn đạt không sửa vì đèn có fuel 100 và chỉ chạy tối đa 10 giây (hao 10, vẫn ≥ 30).

## Chưa đạt / hạn chế (trung thực)
1. **Các giả định ❓ chưa hỏi trợ giảng**: D6 (tên khóa điểm trong `tuning.score`), D9 (wander tới đèn tắt "như trước"), D10 (tốc độ tới đích), D13 (nhịp `fuel_drain`), D17–D18 (`target_lantern_id`). Giữ giả định và ghi rõ; nếu giảng viên đáp khác, sửa `src/core/sim.js` rồi chạy lại `npm run mutate`.
2. "Đèn đầy dầu (used = 0) không được chọn": trong luật này đèn bị hao trước khi người chơi tương tác nên đèn thường không bao giờ đầy ở bước 5. Tôi cài lọc `fuel < 100` đúng ticket nhưng **không có case riêng** vì không thể dựng được trạng thái đó; giải thích trong ADR mục 3.
3. Mutant "drain không thoát khi fuel ≥ 30" là tương đương (mọi đường làm fuel ≥ 30 đã đẩy drain → wander qua `startPush`).
4. Nhấp nháy 1 Hz, thanh dầu, tia hút, đèn xẹp 20% + vết rách, âm thanh mới (`refuel`, `lantern_out`, `fuel_drain`): **chỉ kiểm bằng ảnh và đọc code**, chưa nghe/xem trong thực tế. Cần bạn chơi thử.
5. Token/chi phí: gói Pro không có số tiền; xem ai-log.md.

## Đánh giá nhanh
- Đạt: luật mới có case ở từng biên (30, 100, tick 6000, ngưỡng thắng 3/5, 4/6, 5/7, tick cuối); hồi quy Phase 2 đạt không sửa test.
- AI sai: kỳ vọng c64 và c66 viết sai vì quên thứ tự bước 2 (hút) trước bước 5 (châm) và vì Bóng chỉ `drain` khi đèn còn yếu; c66 ban đầu quá lỏng (đẩy dần và dịch chuyển tức thời đều qua); c56/c56b hỏi snapshot ở tick không có; PowerShell hai lần chặn lệnh vì ký tự trong chuỗi.
- Chỉnh harness: `scripts/mutate.mjs` thêm mutant cho biên; AGENTS.md thêm bài học; skill verify-headless nhắc kiểm thứ tự bước.