# AGENTS.md - Đảo Đèn Lồng (Day 12)

Game 3D góc nhìn thứ ba. Cá nhân, 4 phase, tag `phase-1..4`, Release `v1.0.0`. Yêu cầu: PRD-0 / Ticket trên lab board; **Test Contract trong `game.contract.json` + `docs/notes/assumptions-phaseN.md` là luật**.

## Lệnh
- Cài: `npm install` · Chạy game: `npm start` (http://localhost:8080)
- Test: `npm test` (phải xanh trước khi kết thúc; hook Stop sẽ chặn nếu đỏ)
- Bằng chứng: `npm run proof -- docs/proof/phaseN` (xem skill `verify-headless`)
- Headless: `node src/headless/cli.js --seed N --night 1 --ticks N --out f.jsonl [--scenario f] [--inputs f]`
- Docker: `docker build -t ddl . && docker run --rm -p 8080:8080 ddl`

## Cấu trúc và quy ước
- Node 22, JS ESM. Dependency duy nhất: `three` (chỉ cho render).
- `src/core/`: logic thuần, tất định, **không import render/Node API, không Math.random/Date** (dùng `rng.js`). 60 tick/giây.
- `src/headless/`: CLI theo Test Contract. `src/render/` + `web/`: bản giao diện, chỉ ĐỌC state từ core.
- Mọi con số tuning ở `game.contract.json` và game đọc thẳng từ đó. Không hard-code số trùng tên tuning trong code.
- Tính năng/sáng tạo mới không được đổi đầu ra headless.
- Mỗi yêu cầu chính có case trong `scenarios/cases.mjs` (dùng cho test + proof). `check` không bao giờ được luôn đạt.

## Cấm
- Không commit `.env`, key, token. Không xóa file harness. Không force push sau khi tag.
- Không ghi "đạt" khi chưa chạy thật; không sửa tay `docs/proof/`.
- Asset ngoài chỉ CC0/CC-BY/MIT hoặc tự tạo; ghi vào `CREDITS.md`.
- Chỉ commit khi người dùng đã duyệt thông điệp commit.

## Bài học đã rút (cập nhật khi agent sai lặp lại)
- PowerShell 5.1: `Set-Content -Encoding utf8` thêm BOM, pipe vào native có BOM → dùng `[IO.File]::WriteAllText` với `UTF8Encoding($false)`.
- Three.js: `mesh.position` chỉ đọc, dùng `.position.set()`, không `Object.assign`.
- `node --test` (không thêm thư mục) trên Node 22.

## Ghi chép
- Giả định: `docs/notes/assumptions-phaseN.md` · Checkpoint: `docs/notes/cpN-checklist.md` · Nhật ký AI + token: `docs/notes/ai-log.md` · Retro: `docs/notes/retro.md`