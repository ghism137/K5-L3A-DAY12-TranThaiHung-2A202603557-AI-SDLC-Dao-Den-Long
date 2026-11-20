# CP4 checklist (Phase 4, Contract v1.3)

## Đã chạy thật
- [x] `npm test`: 154 pass, 0 fail, 0 skipped
- [x] `npm run mutate`: 74 đột biến, 0 sống sót (4 mutant tương đương có giải thích trong `scripts/mutate.mjs`)
- [x] Hồi quy: 99/99 case headless giống hệt Phase 3 theo sha256 (`docs/proof/phase4/regression.txt`)
- [x] `npm run smoke`: 57/57 (`ui-smoke.txt`)
- [x] Soak: crashes 0, 39.5 → 43.3 MB (1.10×)
- [x] Benchmark trên máy dev: avg 260.6, p1 low 58.5, p95 7 ms, load 1698 ms, vsync_off true
- [x] Bản đóng gói giải nén chạy độc lập (máy chủ trả 200, API, headless)

## Còn lại (người làm bài)
- [ ] Commit (duyệt thông điệp) → push → CI xanh → tag `phase-4`
- [ ] `npm run package` rồi tạo Release `v1.0.0` đính kèm zip (và video nếu < 100 MB)
- [ ] Quay video demo < 5 phút (.mp4), đặt link đầu README
- [ ] Điền bảng `/usage` trong ai-log.md; viết số/nhận xét cá nhân trong retro.md
- [ ] Clone thật repo công khai, chạy 3 lệnh trong README

## Hạn chế trung thực
- Số benchmark đo trên một máy (i3-1115G4, Intel UHD, nhiễu do VS Code/WebView); máy chấm có thể khác. vsync tắt bằng cờ trình duyệt, không ép được nếu trình duyệt bỏ qua.
- `peak_mem_mb` là working set cả cây tiến trình (cao hơn RSS thật), lấy mẫu ngoài cửa sổ đo.
- Soak dùng RSS, có khởi động nóng; input ngẫu nhiên nên cả 10 Đêm đều thua (không ảnh hưởng tiêu chí).
- Chưa kiểm bằng trình đọc màn hình; mức rõ của chỉ báo hình ảnh chưa thử với người dùng thật.
- Các giả định ❓ (vsync, p95, seed bảng xếp hạng, `achieved_at`, seed khởi đầu soak) chưa hỏi TA.
