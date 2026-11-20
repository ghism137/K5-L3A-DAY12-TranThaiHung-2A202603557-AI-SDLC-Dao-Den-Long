---
name: verify-headless
description: Chạy kiểm chứng Đảo Đèn Lồng (test + scenario headless + tất định) và lưu bằng chứng vào docs/proof/. Dùng sau khi sửa src/core, scenarios hoặc game.contract.json, và trước khi gắn tag phase.
---

# Kiểm chứng headless

1. `npm test` — phải xanh. Test đỏ thì sửa code (không sửa test cho khớp) trừ khi yêu cầu mới thay luật; khi đó ghi lý do vào `docs/notes/assumptions-phaseN.md`.
2. `npm run proof -- docs/proof/phaseN` — chạy CLI thật cho từng case trong `scenarios/cases.mjs`, lưu `out.jsonl`, sinh `REPORT.md`. Thoát mã 1 nếu có case chưa đạt.
3. Case mới: thêm vào `scenarios/cases.mjs` (tên, yêu cầu, scenario, inputs, `check`). Không bao giờ viết `check` luôn trả `[]`.
4. Kiểm tra mutation nhanh cho logic mới: đổi một điều kiện trong `src/core/sim.js`, `npm test` phải đỏ, rồi hoàn lại.
5. Không sửa tay file trong `docs/proof/`. Chỉ sinh lại bằng lệnh trên.
6. Output phải khớp mã ở tag: chạy lại ở đúng commit rồi so `sha256` trong REPORT.md.
