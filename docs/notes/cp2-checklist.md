# Checkpoint 2 - Phase 2 (Ticket-02 "Ba hòn đảo", Contract v1.1)

Cập nhật: 2026-11-20. Spec + tiêu chí nghiệm thu: [spec-phase2.md](spec-phase2.md). Giả định: [assumptions-phase2.md](assumptions-phase2.md). Bằng chứng: [../proof/phase2/](../proof/phase2/). Máy: Windows 11, Intel i3-1115G4 + UHD Graphics, Node 22.22, Edge headless.

## Tự kiểm theo CHECKPOINTS.md

| Việc | Trạng thái | Bằng chứng |
|---|---|---|
| Đọc ticket, so với giả định Phase 1, cập nhật | [x] | assumptions-phase2.md mục 1 (bảng Δ) và mục 2 (B1–B33) |
| Kế hoạch kiểm chứng phần mới trước khi code | [x] | spec-phase2.md (mỗi tính năng có tiêu chí + case); case viết trước/cùng lúc với luật, kiểm bằng đột biến |
| Chạy lại toàn bộ kiểm chứng Phase 1 sau khi tích hợp | [x] | c01–c15 chạy lại với số chuẩn (xem "Thay đổi test Phase 1"); 72/72 test, 61/61 case |
| Rà soát harness (agent sai lặp lại?) | [x] | AGENTS.md (bài học mới), skill verify-headless cập nhật + skill verify-ui mới, `npm run mutate`, CI |
| Phần mới có bằng chứng, phần cũ không hỏng | [x] | REPORT.md 61/61; `npm run smoke` 24/24; fps.json |
| Gắn tag `phase-2` và push | [x] | commit đã duyệt 2026-11-20; xem `git tag` và GitHub |

## Kết quả đã chạy thật
- `npm test`: **72/72** (contract v1.1, CLI, định dạng, bảng màu, 61 scenario headless, hiệu năng một Đêm).
- `npm run proof`: **61/61** case, mỗi case có scenario/inputs/out.jsonl và sha256 (docs/proof/phase2/REPORT.md); c15 chạy hai lần giống hệt.
- `npm run mutate`: **22 đột biến, 0 sống sót** (2 mutant tương đương đã chứng minh). Ban đầu 7 sống sót, siết lại 5 test rồi mới bắt hết (xem ai-log).
- `npm run smoke`: **24/24** kiểm tra giao diện bằng bot (phím + chuột thật): chuỗi menu→giới thiệu→chơi, tạm dừng, cài đặt lưu lại, thua→chơi lại, thắng Đêm 1→Đêm 2, thắng Đêm 3→Bình Minh, HUD.
- `npm run fps`: **60 FPS trung bình** ở 1280×720 cả 3 Đêm (Intel UHD thật, vsync 60). `min = 4` là khung hình đầu khi tải trang (biên dịch shader), không phải giật khi chơi.
- Một Đêm headless đầy đủ: ~0.1 s (yêu cầu ≤ 30 s).

## Thay đổi test Phase 1 (ghi lý do, không tắt âm thầm)

| Case cũ | Đổi gì | Lý do |
|---|---|---|
| c01 nhặt | bán kính 1.5→1.0; điểm +10 khi nhặt → 0 (chỉ +10 khi nạp) | số chuẩn Phần 1 |
| c02/c03/c04 nạp, thắp, thắng | sức chứa/giá đèn 5→10; điểm +10/đom đóm nạp; thắng 858 điểm thay 549 | số chuẩn, điểm chuẩn hóa |
| c05/c06 chạm | thêm recoil, bất tử 90 tick tính theo bộ đếm đầu tick (lần chạm thứ hai ở tick 91) | thứ tự tick bắt buộc |
| c07 pulse | tốn 3, bán kính 5 (3D), choáng 120 tick, đẩy 4 m/15 tick, +5 điểm | số chuẩn |
| c09/c10/c11 | hồi chiêu 3 s; vùng an toàn có "đẩy ra ≤ 30 tick" | số chuẩn, luật vùng an toàn mới |
| c10 cũ (Bóng Mực ở 22 m) | Bóng Mực đặt ở 5 m | luật bỏ đuổi 18 m: ở 22 m nó chuyển wander (lỗi thiết kế test của tôi, phát hiện khi chạy) |
| c12 dawn, c13, c14, c15 | c14/c15 lọc `night_start`; c15 spawn 2 con ở tick 300 | contract v1.1 |
| c40 mới (thay "thắp đèn cùng tick Bóng chạm") | kiểm "hết lửa thắng mọi thứ" bằng scenario lửa = 0 | thắp đèn đẩy Bóng ra khỏi vùng 6 m nên không thể bị chạm cùng tick: hành vi đúng của luật, không phải lỗi |
| Bỏ | luật `fall_enabled: false`, vòng đèn 25 m tự sinh, sinh Bóng Mực ở giây 10 mỗi 20 s | bị Ticket-02 thay thế |

## Chưa đạt / hạn chế (trung thực)
1. **Âm thanh và Bùa Gió: kiểm tay, không có test tự động.** Người dùng đã chơi thử và xác nhận âm thanh và Bùa Gió hoạt động đúng (2026-11-20). Phần headless của Bùa Gió có case riêng (c29–c30).
2. **Lá bay báo gió, rung màn hình, hiệu ứng hình** chỉ kiểm bằng ảnh/đọc code, không có test tự động.
3. **Các giả định ❓ chưa hỏi trợ giảng** (B7, B8, B9, B12, B21, B23, B25, B27, B28, B29). Đã giữ giả định và đánh dấu; nếu giảng viên khác, sửa tại `src/core/sim.js` rồi chạy lại `npm run mutate`.
4. Bot UI chỉ chạy được trên Windows + Edge/Chrome đã kiểm; chưa chạy trên macOS/Linux (CI để `continue-on-error`).
5. `min FPS = 4` ở khung hình đầu (xem trên).
6. Token/chi phí: gói Pro không có số tiền; xem ai-log.md.
7. Màu ảnh chụp bị ánh sáng (ambient 0.15 ở đầu Đêm) làm tối hơn mã hex; mã hex chuẩn nằm trong code và được test.

## Đánh giá nhanh
- Đạt: toàn bộ luật headless có case; chuỗi 3 Đêm chơi được bằng phím thật (bot thắng Đêm 1 và Đêm 3).
- AI sai: bug id Bóng Mực nhảy số (S2, S4, S6) do tăng bộ đếm hai lần; test c40 thiết kế sai; trình duyệt headless không chạy rAF khi trang không ở foreground; helper PowerShell `R` trùng alias `Invoke-History` nên không có sửa nào được áp dụng.
- Chỉnh harness: `npm run mutate` làm bước bắt buộc; skill verify-ui; AGENTS.md thêm bài học PowerShell alias và headless focus.