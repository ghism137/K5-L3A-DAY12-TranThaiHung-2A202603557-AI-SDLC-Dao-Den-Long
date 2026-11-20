# AGENTS.md - Đảo Đèn Lồng (Day 12)

Game 3D góc nhìn thứ ba. Cá nhân, 4 phase, tag `phase-1..4`, Release `v1.0.0`. Phase hiện tại: **3 (Ticket-03 "Đèn cạn dầu", Contract v1.2: nhiên liệu đèn, Bóng Mực hút dầu, thắng khi sống tới bình minh)**. Quyết định thiết kế: `docs/adr/`. Thay đổi phá vỡ: `CHANGELOG.md`.
Luật = `game.contract.json` + `docs/notes/assumptions-phaseN.md` + `docs/notes/spec-phaseN.md`. Yêu cầu gốc nằm trên lab board, không có trong repo.

## Lệnh
- Cài: `npm install` · Chạy game: `npm start` (http://localhost:8080)
- Test (phải xanh trước khi kết thúc; hook Stop chặn nếu đỏ): `npm test`
- Bằng chứng headless: `npm run proof -- docs/proof/phaseN` (skill `verify-headless`)
- Đột biến (bắt buộc sau khi đổi luật trong src/core): `npm run mutate` (phải 0 sống sót, trừ mutant tương đương có giải thích)
- Giao diện: `npm run smoke` (bot bấm phím/chuột thật, 32 kiểm tra) · `npm run fps` (đo FPS 1280×720) (skill `verify-ui`)
- Headless: `node src/headless/cli.js --seed N --night 1|2|3 --ticks N --out f.jsonl [--scenario f] [--inputs f] [--snapshot-every N]`
- Docker: `docker build -t ddl . && docker run --rm -p 8080:8080 ddl`

## Cấu trúc và quy ước
- Node 22, JS ESM. Dependency duy nhất: `three` (chỉ render).
- `src/core/`: logic thuần, tất định, **không import render/Node API, không Math.random/Date** (dùng `rng.js`). 60 tick/giây.
  - Dầu của đèn là **số nguyên đơn vị 1/60** (`fuel = U/60`); chỉ chia khi xuất ra. Không dùng số thực cho dầu.
  - `rules.js` hằng số luật chuẩn không nằm trong tuning; `levels.js` ba Đêm dạng dữ liệu; `terrain.js` địa hình (đĩa, vành, dốc, cầu, tháp); `sim.js` luật + đúng thứ tự các bước của ticket; `validate.js` định dạng input/scenario.
- `src/headless/`: CLI theo Test Contract. `src/render/` + `web/`: giao diện, chỉ ĐỌC state từ core (world.js cảnh 3D, ui.js DOM, audio.js, settings.js, palette.js bảng màu chuẩn + bảng mù màu, main.js vòng lặp).
- Số tuning chuẩn ở `game.contract.json`, game đọc thẳng từ đó. Không hard-code số trùng tên tuning.
- Tính năng/sáng tạo mới không được đổi đầu ra headless (tắt khi chạy headless).
- Mỗi yêu cầu có case trong `scenarios/cases.mjs` (dùng cho test + proof). `check` không bao giờ được luôn đạt: chứng minh bằng `npm run mutate`.
- Bộ đếm giảm ở **đầu** tick (bước 2): "N tick" = giá trị đặt N, có hiệu lực tới khi về 0. Kiểm tra biên ±1 tick bằng snapshot mỗi tick.
- Phase đổi luật (Change Request): ghi ADR trong `docs/adr/`, test cũ bị thay phải sửa/xóa kèm lý do trong `docs/notes/cpN-checklist.md`, breaking changes vào `CHANGELOG.md`. Không `skip` test.

## Cấm
- Không commit `.env`, key, token, hay file trang lab tải về (`*Lab.html`, `*Lab_files/`). Không xóa file harness. Không force push sau khi tag.
- Không ghi "đạt" khi chưa chạy thật; không sửa tay `docs/proof/`.
- Asset ngoài chỉ CC0/CC-BY/MIT hoặc tự tạo; ghi vào `CREDITS.md`.
- Chỉ commit khi người dùng đã duyệt thông điệp commit.

## Bài học đã rút (cập nhật khi agent sai lặp lại)
- PowerShell 5.1: `Set-Content -Encoding utf8` thêm BOM → dùng `[IO.File]::WriteAllText` với `UTF8Encoding($false)`.
- PowerShell: **không đặt tên hàm trùng alias** (`R` = Invoke-History, `Sub`...). Dùng tên Verb-Noun (`Update-Part`). Nếu sửa file mà không thấy đổi gì, kiểm tra lại.
- PowerShell: **dấu backtick trong chuỗi nháy kép là ký tự thoát** (`` `r `` thành CR, `` `f `` thành form feed) nên làm hỏng nội dung markdown có mã trong dấu backtick. Sửa nội dung có backtick bằng công cụ Edit/Write hoặc file .mjs, không bằng `.Replace("...")` nháy kép.
- PowerShell chặn cả lệnh nếu có chuỗi trông như đường dẫn nguy hiểm hoặc ngoặc không cân trong `node -e`/chuỗi: đưa logic phức tạp vào file .mjs rồi chạy bằng `node`. Tham số chuỗi rỗng bị bỏ khi gọi chương trình ngoài: dùng ký tự giữ chỗ.
- Three.js: `mesh.position` chỉ đọc, dùng `.position.set()`, không `Object.assign`.
- `node --test` (không thêm thư mục) trên Node 22.
- Test xanh ngay lần đầu thì nghi ngờ: chạy `npm run mutate`. Lần đầu có 7/22 (Phase 2) và 4/25 (Phase 3) mutant sống sót vì test chưa kiểm biên.
- Trình duyệt headless không chạy requestAnimationFrame khi trang không ở foreground: bot UI phải `Page.bringToFront` + `Emulation.setFocusEmulationEnabled` + các cờ `--disable-*-backgrounding`.
- Thắp đèn đẩy Bóng Mực ra khỏi vùng 6 m nên không thể bị chạm cùng tick: đừng thiết kế test mâu thuẫn với luật.
- Bước 2 trừ dầu (hao + hút) TRƯỚC bước 5 châm dầu: `refuel.fuel` luôn tính sau hao; kỳ vọng test phải tính cả 1 đơn vị hao. Một Bóng `drain` chỉ tồn tại khi đèn đích còn yếu (fuel < 30).
- Cơ chế dần dần (đẩy ≤ 30 tick): test phải kiểm giữa chừng, không chỉ trạng thái cuối, nếu không đột biến "dịch chuyển tức thời" vẫn qua.

## Ghi chép
- Giả định: `docs/notes/assumptions-phaseN.md` · Spec/tiêu chí: `docs/notes/spec-phaseN.md` · Checkpoint: `docs/notes/cpN-checklist.md` · Nhật ký AI: `docs/notes/ai-log.md` · Retro: `docs/notes/retro.md` · ADR: `docs/adr/`
