# Đảo Đèn Lồng

> **Video demo:** _chưa quay (Checkpoint 5). Link sẽ đặt ở đây._
> Tài liệu gốc của lab: [docs/LAB-README.md](docs/LAB-README.md) · Bài cá nhân Day 12 AI SDLC · MSSV 2A202603557 · Trần Thái Hưng

Game 3D góc nhìn thứ ba. Bạn là **Mây**, người giữ đèn nhỏ tuổi (nón lá, khăn đỏ, đèn lồng nhỏ). Sương đen đã nuốt ánh sáng của ba hòn đảo: gom **đom đóm**, mang về **thắp các Đèn Lồng Lớn**, né **Bóng Mực** và **Gió Lạc**. Qua 3 Đêm: **Đảo Bến → Đảo Cau → Đảo Chuông**, rồi đón Bình Minh.

## Cài đặt và chạy (3 lệnh)

Cần Node ≥ 22.

```bash
git clone https://github.com/ghism137/K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long && cd K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long
npm install
npm start          # mở http://localhost:8080
```

Hoặc Docker (macOS/Linux/Windows): `docker build -t ddl . && docker run --rm -p 8080:8080 ddl`

## Điều khiển

| Phím | Tác dụng |
|---|---|
| W A S D / mũi tên | Đi |
| Space | Nhảy (chỉ khi chạm đất) |
| Shift | Lướt 14 m/s trong 0.2 s (hồi chiêu 1.5 s) |
| E | Nạp đom đóm vào đèn chưa sáng gần nhất (trong 2 m) |
| Q (hoặc F) | Tỏa sáng: choáng và đẩy Bóng Mực trong 5 m, tốn 3 đom đóm (hồi chiêu 3 s) |
| Kéo chuột | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

## Luật chơi (số liệu chuẩn Ticket-02)

- Mang tối đa 10 đom đóm (nhặt tự động trong 1.0 m). Mỗi đèn cần 10 đom đóm, nạp nhiều lần được, đèn nhớ tiến độ.
- 3 Ngọn Lửa (máu), hồi đầy đầu mỗi Đêm. **Bóng Mực** chạm vào: −1 lửa, rơi một nửa đom đóm đang mang, bất tử 1.5 s. Đèn đã sáng tạo vùng an toàn 6 m mà Bóng Mực không vào được.
- **Gió Lạc** (Đêm 2, 3): khi bạn mang ≥ 5 đom đóm nó đuổi theo và cướp tối đa 3 con; Tỏa Sáng đuổi nó đi, trúng lúc nó đang chạy với đồ thì đồ rơi lại.
- **Bùa Gió** (lá bùa đỏ viền vàng): 10 s chạy nhanh 7.2 m/s và lướt không hồi chiêu.
- Rơi khỏi đảo (Y < −10): −1 lửa, mất hết đom đóm, hồi sinh sau 1 s.
- Đêm 1 Đảo Bến (300 s, 5 đèn) · Đêm 2 Đảo Cau (330 s, 6 đèn, hai đảo nối cầu tre, bục nhảy) · Đêm 3 Đảo Chuông (360 s, 7 đèn, ba tầng, dốc, tháp chuông, gió mạnh mỗi 30 s).
- Thắng khi mọi đèn sáng. Thua khi hết lửa hoặc hết giờ. Thua thì chơi lại Đêm đó.

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn | +10 |
| Thắp một đèn | +100 |
| Mỗi lần Tỏa Sáng trúng một Bóng Mực | +5 |
| Thắng: mỗi giây còn lại | +2 |
| Thắng: mỗi ngọn lửa còn lại | +50 |

Tổng điểm game = tổng điểm các Đêm đã thắng. Mọi con số nằm trong [game.contract.json](game.contract.json) và game đọc thẳng từ file này, nên khai báo không thể lệch với thực tế.

## Chế độ headless (Test Contract v1.1)

```bash
node src/headless/cli.js --seed 1 --night 2 --ticks 600 --out out.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

Không cần GPU/cửa sổ, 60 tick/giây, tất định theo seed, một Đêm đầy đủ chạy ~0.1 s. Mã thoát: 0 bình thường, 2 nếu inputs/scenario sai định dạng, 1 cho lỗi khác. Input có thêm `dash`, `pause`; scenario có thêm `drifters`, `charms`, `shades[].state`, `player.*_ticks`, `random_drifters`, `wind_enabled`. Docker: `docker run --rm -v "$PWD:/out" ddl node src/headless/cli.js --seed 1 --night 3 --ticks 600 --out /out/o.jsonl`.

Các chỗ ticket để ngỏ và giả định của tôi (kèm lý do): [docs/notes/assumptions-phase2.md](docs/notes/assumptions-phase2.md). Tiêu chí nghiệm thu từng tính năng: [docs/notes/spec-phase2.md](docs/notes/spec-phase2.md).

## Kiểm chứng

```bash
npm test                                # 72 test: contract v1.1, CLI, định dạng, bảng màu, 61 scenario headless, hiệu năng
npm run proof -- docs/proof/phase2      # chạy CLI thật cho 61 case, lưu output + REPORT.md (sha256)
npm run mutate                          # phá cố ý 22 luật; test phải bắt hết (0 sống sót)
npm run smoke                           # bot bấm phím/chuột thật trong trình duyệt: 24 kiểm tra giao diện
npm run fps                             # đo FPS 1280×720 mỗi Đêm
```

Bằng chứng Phase 2: [docs/proof/phase2/REPORT.md](docs/proof/phase2/REPORT.md), [ui-smoke.txt](docs/proof/phase2/ui-smoke.txt), [fps.json](docs/proof/phase2/fps.json) (60 FPS trung bình, Intel UHD), ảnh `ui-*.png`. Phase 1 (tag `phase-1`) giữ bằng chứng riêng ở `docs/proof/phase1` (khớp mã ở tag đó, không sinh lại). Phần **chưa kiểm tự động**: âm thanh, lá gió, rung màn hình (xem [cp2-checklist](docs/notes/cp2-checklist.md)).

## Sáng tạo của tôi

Chỉ có ở bản giao diện, **không đổi đầu ra headless** (toàn bộ test headless chạy `src/core` không import render):

- **Ông Đăng**, người dẫn truyện ở mỗi Đêm và ở Bình Minh (lời thoại do tôi viết, gợi ý cơ chế của từng đảo).
- Nhạc nền đêm sinh bằng WebAudio (ngũ cung chậm), âm hiệu ứng riêng cho bùa và khi bị Gió Lạc cướp.
- Đảo sáng dần theo tiến độ (ánh sáng môi trường, quầng đèn, vòng vùng an toàn), Bóng Mực có viền tím và đổi sắc khi bị choáng, lá bay báo trước gió, đèn cầm tay Mây đỏ khi có Bùa Gió.

## Harness AI

[AGENTS.md](AGENTS.md) (CLAUDE.md trỏ tới) · skill [verify-headless](.claude/skills/verify-headless/SKILL.md) và [verify-ui](.claude/skills/verify-ui/SKILL.md) · hook Stop [chặn kết thúc khi test đỏ](.claude/settings.json) · `npm run mutate` · CI [.github/workflows/ci.yml](.github/workflows/ci.yml). Ghi chép: [docs/notes/](docs/notes/).

Giấy phép: MIT ([LICENSE](LICENSE)). Nguồn: [CREDITS.md](CREDITS.md).