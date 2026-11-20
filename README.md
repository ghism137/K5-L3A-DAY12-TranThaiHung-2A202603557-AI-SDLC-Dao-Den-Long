# Đảo Đèn Lồng

> **Video demo:** _chưa quay (Checkpoint 5). Link sẽ đặt ở đây._
> Tài liệu gốc của lab: [docs/LAB-README.md](docs/LAB-README.md) · Bài cá nhân Day 12 AI SDLC · MSSV 2A202603557 · Trần Thái Hưng

Game 3D góc nhìn thứ ba. Bạn là **Mây**, người giữ đèn nhỏ tuổi (đội nón lá, treo đèn lồng nhỏ). Sương đen đã nuốt ánh sáng của đảo: hãy gom **đom đóm**, mang về **thắp 5 Đèn Lồng Lớn**, và né **Bóng Mực**. Thắp hết đèn thì thắng, hết ngọn lửa hoặc hết đêm thì thua.

## Cài đặt và chạy (3 lệnh)

Cần Node ≥ 22.

```bash
git clone https://github.com/ghism137/K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long && cd K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long
npm install
npm start          # mở http://localhost:8080
```

Hoặc bằng Docker (chạy được trên macOS/Linux/Windows): `docker build -t ddl . && docker run --rm -p 8080:8080 ddl`

## Điều khiển

| Phím | Tác dụng |
|---|---|
| W A S D / mũi tên | Đi |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất (trong 3 m) |
| Q (hoặc F) | Tỏa sáng: choáng và đẩy Bóng Mực trong 8 m, tốn 1 đom đóm |
| Kéo chuột | Xoay camera |
| R | Chơi lại |

## Luật chơi và cách tính điểm

- Đom đóm tự nhặt khi lại gần (≤ 1.5 m), mang tối đa 5. Mỗi đèn cần 5 đom đóm để sáng.
- Bóng Mực đuổi theo (chậm hơn Mây). Chạm vào: mất 1 ngọn lửa (có 3), rơi một nửa số đom đóm đang mang, bất tử 1.5 s.
- Vùng quanh **đèn đã sáng** (6 m) Bóng Mực không vào được.
- Thua khi hết ngọn lửa hoặc hết 5 phút (trời sáng).

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Làm choáng 1 Bóng Mực | +20 |
| Thắng: mỗi giây còn lại | +1 |
| Thắng: mỗi ngọn lửa còn lại | +50 |

Mọi con số nằm trong [game.contract.json](game.contract.json) và game đọc thẳng từ file này, nên khai báo không thể lệch với thực tế.

## Chế độ headless (Test Contract v1.0)

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario scenarios.json] [--inputs inputs.json] [--snapshot-every 10]
```

Không cần GPU/cửa sổ, 60 tick/giây, tất định theo seed. Mã thoát: 0 bình thường, 2 nếu inputs/scenario sai định dạng, 1 cho lỗi khác. Docker: `docker run --rm -v "$PWD:/out" ddl node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out /out/o.jsonl`.

Khác biệt so với một số chỗ contract để ngỏ (giả định và lý do): [docs/notes/assumptions-phase1.md](docs/notes/assumptions-phase1.md). Game không có "rơi khỏi đảo" (`fall_enabled: false`, đảo có rào), nên không bao giờ ghi `player_hit` với `by: "fall"`; không có `dash`.

## Kiểm chứng

```bash
npm test                              # 22 test: contract, CLI, định dạng, 15 scenario headless
npm run proof -- docs/proof/phase1    # chạy CLI thật, lưu output + REPORT.md
```

Bằng chứng Phase 1: [docs/proof/phase1/REPORT.md](docs/proof/phase1/REPORT.md) (mỗi yêu cầu, output thật, kết quả, sha256). Ảnh giao diện: `docs/proof/phase1/ui-*.png`. Phần **giao diện chỉ được kiểm bằng ảnh chụp và chơi thử bằng tay**, chưa có test tự động cho điều khiển bàn phím.

## Sáng tạo của tôi

Chỉ có ở bản giao diện, **không đổi đầu ra headless** (bằng chứng: toàn bộ test headless ở trên chạy `src/core` không import render):

- Âm chuông WebAudio theo sự kiện: nhặt (cao dần theo số đom đóm mang), thắp đèn (hợp âm 4 nốt), tỏa sáng, bị chạm.
- Đảo sáng dần: nền trời, sương và ánh sáng chung ấm lên theo số đèn đã thắp; vòng sáng thể hiện vùng an toàn của mỗi đèn.
- Bóng Mực đổi sắc xanh nhạt khi bị choáng.

## Harness AI

[AGENTS.md](AGENTS.md) (CLAUDE.md trỏ tới), skill [verify-headless](.claude/skills/verify-headless/SKILL.md), hook Stop [chặn kết thúc khi test đỏ](.claude/settings.json), CI [.github/workflows/ci.yml](.github/workflows/ci.yml). Ghi chép: [docs/notes/](docs/notes/).

Giấy phép: MIT ([LICENSE](LICENSE)). Nguồn: [CREDITS.md](CREDITS.md).
