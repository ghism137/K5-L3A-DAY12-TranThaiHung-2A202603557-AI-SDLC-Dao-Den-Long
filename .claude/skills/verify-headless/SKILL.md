---
name: verify-headless
description: Chạy kiểm chứng headless của Đảo Đèn Lồng (test, scenario, đột biến, tất định) và lưu bằng chứng vào docs/proof/. Dùng sau khi sửa src/core, scenarios hoặc game.contract.json, và trước khi gắn tag phase.
---

# Kiểm chứng headless

1. `npm test` — phải xanh. Test đỏ thì sửa code (không sửa test cho khớp) trừ khi yêu cầu mới thay luật; khi đó ghi lý do vào `docs/notes/cpN-checklist.md` mục "Thay đổi test".
2. `npm run mutate` — phá cố ý 22 luật trong `src/core`; **phải 0 sống sót** (mutant tương đương đã đánh dấu trong script). Mutant sống sót = test còn yếu: thêm case kiểm biên ±1 tick (snapshot mỗi tick) rồi chạy lại. Luật mới → thêm mutant mới vào `scripts/mutate.mjs`.
3. `npm run proof -- docs/proof/phaseN` — chạy CLI thật cho từng case trong `scenarios/cases.mjs`, lưu `out.jsonl` (và `out-run2.jsonl` cho case tất định), sinh `REPORT.md` kèm sha256. Thoát mã 1 nếu có case chưa đạt.
4. Case mới: thêm vào `scenarios/cases.mjs` (tên, yêu cầu, scenario, inputs, `check`, tùy chọn `night`, `snapshotEvery`, `determinism`). Dùng `mk()` để cô lập (không sinh ngẫu nhiên/gió/bùa). Không bao giờ viết `check` luôn trả `[]`. Giữ `snapshotEvery` lớn nếu chỉ cần vài mốc để file bằng chứng nhỏ.
5. Không sửa tay file trong `docs/proof/`. Chỉ sinh lại bằng lệnh trên. Bằng chứng phải khớp mã ở tag: chạy lại ở đúng commit rồi so `sha256` trong REPORT.md.
6. Phase sau thay luật: cập nhật case cũ kèm lý do, không tắt. Chạy lại toàn bộ.