# Spec Phase 4: tiêu chí chấp nhận → kiểm chứng

Nguồn: Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3) + [assumptions-phase4.md](assumptions-phase4.md) (G1–G24).

| # | Tiêu chí | Cách kiểm | Bằng chứng |
|---|---|---|---|
| 1 | Benchmark `--seed 42 --duration 30 --out bench.json`, cảnh chuẩn, 3 s khởi động, 1280×720, vsync tắt | `scripts/bench.mjs`; `tests/bench.test.js` (cảnh, thống kê, nearest-rank, sàn k=1), `tests/bench-cli.test.js` (chạy thật, đủ trường) | `docs/proof/phase4/bench.json`, `ui-bench-scene.png` |
| 2 | Ngưỡng: avg ≥ 60, p1 low ≥ 30, load ≤ 10000 ms | số đo thật trên máy dev (260.6 / 58.5 / 1698) | `bench.json` |
| 3 | Soak `--seed 7 --nights 10`: crashes 0, mem_end ≤ 1.2×mem_start | `tests/soak.test.js`, `scripts/soak.mjs` (mã thoát) | `soak.json` (39.5 → 43.3 MB) |
| 4 | Bảng xếp hạng: tên 3–12, top 10, điểm giảm dần rồi ai đạt trước, lưu đĩa, menu, `--export-leaderboard` | `tests/leaderboard.test.js`, `tests/server.test.js`, bot UI | `ui-smoke.txt` |
| 5 | Đổi phím + báo trùng + khôi phục + lưu | `tests/keymap.test.js`, bot UI (đổi phím thật rồi chơi) | `ui-smoke.txt` |
| 6 | Chỉ báo hình ảnh (Bóng Mực xuất hiện + mũi tên, gió, 10 s cuối, dầu < 30), giảm chuyển động, chữ ≥ 18 px, chữ lớn ×1.25 | bot UI đo DOM/computed style | `ui-smoke.txt` (57/57) |
| 7 | Contract v1.3 có `bench_cmd`, `soak_cmd` | `tests/contract.test.js` | test xanh |
| 8 | Phase 1–3 không hồi quy | 99 case headless, sha256 từng output so với Phase 3 | `regression.txt` |
| 9 | README, CHANGELOG 4 phase, CREDITS, LICENSE, retro | đọc tay + `npm run package` chạy bản giải nén | dist/ |
| 10 | Tag `phase-4`, Release `v1.0.0` (có bản chạy được), `bench.json`/`soak.json` đã commit, video < 5 phút | thao tác Git/GitHub | cp4-checklist |

Không kiểm tự động được (kiểm tay, ghi ở cp4-checklist): cảm nhận âm thanh và nhấp nháy, độ rõ của chỉ báo với người thật, trình đọc màn hình, video demo.
