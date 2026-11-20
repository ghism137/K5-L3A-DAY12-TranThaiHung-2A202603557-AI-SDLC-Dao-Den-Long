# AGENTS.md - Đảo Đèn Lồng (Day 12)

Game 3D góc nhìn thứ ba. Cá nhân, 4 phase, tag `phase-1..4`, Release `v1.0.0`. Phase hiện tại: **2 (Ticket-02, Contract v1.1, 3 Đêm)**.
Luật = `game.contract.json` + `docs/notes/assumptions-phaseN.md` + `docs/notes/spec-phaseN.md`. Yêu cầu gốc nằm trên lab board, không có trong repo.

## Lệnh
- Cài: `npm install` · Chạy game: `npm start` (http://localhost:8080)
- Test (phải xanh trước khi kết thúc; hook Stop chặn nếu đỏ): `npm test`
- Bằng chứng headless: `npm run proof -- docs/proof/phaseN` (skill `verify-headless`)
- Đột biến (bắt buộc sau khi đổi luật trong src/core): `npm run mutate` (phải 0 sống sót)
- Giao diện: `npm run smoke` (bot bấm phím/chuột thật, 24 kiểm tra) · `npm run fps` (đo FPS 1280×720) (skill `verify-ui`)
- Headless: `node src/headless/cli.js --seed N --night 1|2|3 --ticks N --out f.jsonl [--scenario f] [--inputs f] [--snapshot-every N]`
- Docker: `docker build -t ddl . && docker run --rm -p 8080:8080 ddl`

## Cấu trúc và quy ước
- Node 22, JS ESM. Dependency duy nhất: `three` (chỉ render).
- `src/core/`: logic thuần, tất định, **không import render/Node API, không Math.random/Date** (dùng `rng.js`). 60 tick/giây.
  - `rules.js` hằng số luật chuẩn không nằm trong tuning; `levels.js` ba Đêm dạng dữ liệu; `terrain.js` địa hình (đĩa, vành, dốc, cầu, tháp); `sim.js` luật + đúng thứ tự 12 bước của ticket; `validate.js` định dạng input/scenario.
- `src/headless/`: CLI theo Test Contract. `src/render/` + `web/`: giao diện, chỉ ĐỌC state từ core (world.js cảnh 3D, ui.js DOM, audio.js, settings.js, palette.js bảng màu chuẩn, main.js vòng lặp).
- Số tuning chuẩn ở `game.contract.json`, game đọc thẳng từ đó. Không hard-code số trùng tên tuning.
- Tính năng/sáng tạo mới không được đổi đầu ra headless (tắt khi chạy headless).
- Mỗi yêu cầu có case trong `scenarios/cases.mjs` (dùng cho test + proof). `check` không bao giờ được luôn đạt: chứng minh bằng `npm run mutate`.
- Bộ đếm giảm ở **đầu** tick (bước 2): "N tick" = giá trị đặt N, có hiệu lực tới khi về 0. Kiểm tra biên ±1 tick bằng snapshot mỗi tick.

## Cấm
- Không commit `.env`, key, token, hay file trang lab tải về (`*Lab.html`, `*Lab_files/`). Không xóa file harness. Không force push sau khi tag.
- Không ghi "đạt" khi chưa chạy thật; không sửa tay `docs/proof/`.
- Asset ngoài chỉ CC0/CC-BY/MIT hoặc tự tạo; ghi vào `CREDITS.md`.
- Chỉ commit khi người dùng đã duyệt thông điệp commit.

## Bài học đã rút (cập nhật khi agent sai lặp lại)
- PowerShell 5.1: `Set-Content -Encoding utf8` thêm BOM → dùng `[IO.File]::WriteAllText` với `UTF8Encoding($false)`.
- PowerShell: **không đặt tên hàm trùng alias** (`R` = Invoke-History, `Sub`...). Dùng tên Verb-Noun (`Update-Part`). Nếu sửa file mà không thấy đổi gì, kiểm tra lại.
- Three.js: `mesh.position` chỉ đọc, dùng `.position.set()`, không `Object.assign`.
- `node --test` (không thêm thư mục) trên Node 22.
- Test xanh ngay lần đầu thì nghi ngờ: chạy `npm run mutate`. Lần đầu có 7/22 mutant sống sót vì test chưa kiểm biên.
- Trình duyệt headless không chạy requestAnimationFrame khi trang không ở foreground: bot UI phải `Page.bringToFront` + `Emulation.setFocusEmulationEnabled` + các cờ `--disable-*-backgrounding`.
- Thắp đèn đẩy Bóng Mực ra khỏi vùng 6 m nên không thể bị chạm cùng tick: đừng thiết kế test mâu thuẫn với luật.

## Ghi chép
- Giả định: `docs/notes/assumptions-phaseN.md` · Spec/tiêu chí: `docs/notes/spec-phaseN.md` · Checkpoint: `docs/notes/cpN-checklist.md` · Nhật ký AI: `docs/notes/ai-log.md` · Retro: `docs/notes/retro.md`