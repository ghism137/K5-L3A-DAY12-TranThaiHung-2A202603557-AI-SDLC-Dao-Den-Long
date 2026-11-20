# CP4 checklist (Phase 4, Contract v1.3)

## Đã chạy thật
- [x] `npm test`: 154 pass, 0 fail, 0 skipped
- [x] `npm run mutate`: 74 đột biến, 0 sống sót (4 mutant tương đương có giải thích trong `scripts/mutate.mjs`)
- [x] Hồi quy: 99/99 case headless giống hệt Phase 3 theo sha256 (`docs/proof/phase4/regression.txt`)
- [x] `npm run smoke`: 57/57 (`ui-smoke.txt`)
- [x] Soak: crashes 0, 42.8 → 43.4 MB; trong Docker Linux 15/15 lần đạt (CI lần đầu đỏ vì RSS, đã sửa bằng MALLOC_ARENA_MAX=1 và khởi động nóng mỗi màn)
- [x] Benchmark trên máy dev: avg 260.6, p1 low 58.5, p95 7 ms, load 1698 ms, vsync_off true
- [x] Bản đóng gói giải nén chạy độc lập (máy chủ trả 200, API, headless)

## Còn lại (người làm bài)
- [ ] Commit (duyệt thông điệp) → push → CI xanh → tag `phase-4`
- [ ] `npm run package` rồi tạo Release `v1.0.0` đính kèm zip (và video nếu < 100 MB)
- [x] Video demo 4:15 (.mp4) đính kèm Release v1.0.0, link ở đầu README (283 MB, vượt giới hạn 100 MB của repo nên không commit)
- [x] Token/chi phí: ghi rõ là không có số đo (gói Pro dùng chung nhiều việc, không có phép đo thay thế phù hợp) ở ai-log.md và retro.md
- [ ] Clone thật repo công khai, chạy 3 lệnh trong README

## Hạn chế trung thực
- Số benchmark đo trên một máy (i3-1115G4, Intel UHD, nhiễu do VS Code/WebView); máy chấm có thể khác. vsync tắt bằng cờ trình duyệt, không ép được nếu trình duyệt bỏ qua.
- `peak_mem_mb` là working set cả cây tiến trình (cao hơn RSS thật), lấy mẫu ngoài cửa sổ đo.
- Soak dùng RSS, có khởi động nóng; input ngẫu nhiên nên cả 10 Đêm đều thua (không ảnh hưởng tiêu chí).
- Chưa kiểm bằng trình đọc màn hình; mức rõ của chỉ báo hình ảnh chưa thử với người dùng thật.
- Các giả định ❓ (vsync, p95, seed bảng xếp hạng, `achieved_at`, seed khởi đầu soak) chưa hỏi TA.
