# Đảo Đèn Lồng

> **Video demo:** _chưa quay (Checkpoint 5). Link sẽ đặt ở đây._
> Tài liệu gốc của lab: [docs/LAB-README.md](docs/LAB-README.md) · Bài cá nhân Day 12 AI SDLC · MSSV 2A202603557 · Trần Thái Hưng

Game 3D góc nhìn thứ ba. Bạn là **Mây**, người giữ đèn nhỏ tuổi (nón lá, khăn đỏ, đèn lồng nhỏ). Sương đen đã nuốt ánh sáng của ba hòn đảo. Đèn lồng thắp rồi vẫn có thể **cạn dầu và tắt**: nhiệm vụ của bạn là **giữ đảo sáng tới bình minh**, gom **đom đóm** để thắp và châm dầu, né **Bóng Mực** (chúng hút dầu đèn yếu) và **Gió Lạc**. Qua 3 Đêm: **Đảo Bến → Đảo Cau → Đảo Chuông**.

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
| E | Ở đèn chưa sáng: nạp đom đóm để thắp. Ở đèn đang sáng chưa đầy: **châm dầu** (trong 2 m) |
| Q (hoặc F) | Tỏa sáng: choáng và đẩy Bóng Mực trong 5 m, tốn 3 đom đóm (hồi chiêu 3 s) |
| Kéo chuột | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

Cài đặt (được lưu): âm lượng, độ nhạy chuột, **Bảng màu dễ phân biệt** (chế độ mù màu).

## Luật chơi (Ticket-03 "Đèn cạn dầu")

- **Thắng**: còn sống khi **hết giờ (bình minh)** và số đèn đang sáng ≥ 60% tổng làm tròn lên: **3/5** (Đêm 1, 240 s), **4/6** (Đêm 2, 270 s), **5/7** (Đêm 3, 300 s). Thắp đủ đèn **không** kết thúc Đêm sớm. **Thua**: hết Ngọn Lửa, hoặc hết giờ mà thiếu đèn.
- **Nhiên liệu đèn**: đèn mới thắp đầy 100, hao 1/giây, hết dầu thì **tắt**. Châm dầu bằng E: mỗi đom đóm +10. Đèn đã từng sáng chỉ cần **5** đom đóm để thắp lại (đèn chưa từng sáng cần 10).
- **Bóng Mực hút dầu**: đèn dưới 30 dầu **mất vùng an toàn**; Bóng Mực đi tới hút 5 dầu/giây (nhiều con cộng dồn). Châm dầu lên ≥ 30 thì chúng bị đẩy ra. Mây lại gần hoặc Tỏa Sáng cũng làm chúng buông đèn.
- Sức chứa đom đóm **10 + 2 × số lần thắp thành công** trong Đêm (tối đa 20).
- 3 Ngọn Lửa, hồi đầy đầu mỗi Đêm. Bóng Mực chạm: −1 lửa, rơi một nửa đom đóm, bất tử 1.5 s. Rơi khỏi đảo (Y < −10): −1 lửa, mất hết đom đóm, hồi sinh sau 1 s.
- **Gió Lạc** (Đêm 2, 3) cướp tối đa 3 đom đóm khi bạn mang ≥ 5. **Bùa Gió** (lá bùa đỏ): 10 s chạy 7.2 m/s và lướt không hồi chiêu.
- Đêm 2: hai đảo nối cầu tre và bục nhảy. Đêm 3: ba tầng, dốc, tháp chuông, gió mạnh mỗi 30 s.

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn (thắp mới, thắp lại, châm dầu) | +5 |
| Thắp đèn lần đầu | +100 |
| Thắp lại | +40 |
| Mỗi lần Tỏa Sáng trúng một Bóng Mực | +5 (+15 nếu nó đang hút đèn) |
| Bình minh (chỉ khi thắng): mỗi đèn đang sáng | +50 + phần nguyên của dầu còn lại |
| Bình minh (chỉ khi thắng): mỗi Ngọn Lửa còn lại | +50 |

Không có thưởng thời gian. Tổng điểm game = tổng điểm các Đêm đã thắng. Mọi con số nằm trong [game.contract.json](game.contract.json) và game đọc thẳng từ file này, nên khai báo không thể lệch với thực tế.

## Chế độ headless (Test Contract v1.2)

```bash
node src/headless/cli.js --seed 1 --night 2 --ticks 600 --out out.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

Không cần GPU/cửa sổ, 60 tick/giây, tất định theo seed, một Đêm đầy đủ chạy ~0.1 s. Mã thoát: 0 bình thường, 2 nếu inputs/scenario sai định dạng, 1 cho lỗi khác. Snapshot mỗi đèn có `fuel`, `ever_lit`, `relit_count`; `player.capacity`; Bóng Mực có trạng thái `drain`. Sự kiện mới: `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit.relight`; lý do kết thúc `dawn_survived`. Docker: `docker run --rm -v "$PWD:/out" ddl node src/headless/cli.js --seed 1 --night 3 --ticks 600 --out /out/o.jsonl`.

- Quyết định thiết kế (mô hình trạng thái đèn, luật thắng): [docs/adr/0001-lantern-fuel-and-dawn-win.md](docs/adr/0001-lantern-fuel-and-dawn-win.md)
- Thay đổi phá vỡ tương thích: [CHANGELOG.md](CHANGELOG.md)
- Giả định ticket để ngỏ: [docs/notes/assumptions-phase3.md](docs/notes/assumptions-phase3.md) · tiêu chí nghiệm thu: [docs/notes/spec-phase3.md](docs/notes/spec-phase3.md)

## Kiểm chứng

```bash
npm test                                # 112 test: contract v1.2, CLI, định dạng, bảng màu, 99 scenario headless, hiệu năng
npm run proof -- docs/proof/phase3      # chạy CLI thật cho 99 case, lưu output + REPORT.md (sha256)
npm run mutate                          # phá cố ý 46 luật; test phải bắt hết (0 sống sót)
npm run smoke                           # bot bấm phím/chuột thật trong trình duyệt: 32 kiểm tra giao diện
npm run fps                             # đo FPS 1280×720 mỗi Đêm
```

Bằng chứng Phase 3: [docs/proof/phase3/REPORT.md](docs/proof/phase3/REPORT.md), [ui-smoke.txt](docs/proof/phase3/ui-smoke.txt), [mutate.txt](docs/proof/phase3/mutate.txt), [fps.json](docs/proof/phase3/fps.json) (60 FPS trung bình, Intel UHD), ảnh `ui-*.png`. Bằng chứng Phase 1, 2 giữ ở `docs/proof/phase1`, `docs/proof/phase2` (khớp mã ở tag tương ứng, không sinh lại). Phần **chưa kiểm tự động**: âm thanh, nhấp nháy, rung màn hình (xem [cp3-checklist](docs/notes/cp3-checklist.md)).

## Sáng tạo của tôi

Chỉ có ở bản giao diện, **không đổi đầu ra headless** (toàn bộ test headless chạy `src/core` không import render):

- **Ông Đăng**, người dẫn truyện ở mỗi Đêm và ở Bình Minh (lời thoại do tôi viết, gợi ý mục tiêu và cơ chế của từng đảo).
- Nhạc nền đêm sinh bằng WebAudio (ngũ cung chậm), âm hiệu ứng riêng cho bùa, bị cướp, châm dầu, đèn tắt.
- Đảo sáng dần theo tiến độ, tia hút dầu nối Bóng Mực với đèn, Bóng Mực đổi sắc khi bị choáng, lá bay báo trước gió, đèn cầm tay Mây đỏ khi có Bùa Gió, thanh dầu nhấp nháy khi đèn sắp tắt.

## Harness AI

[AGENTS.md](AGENTS.md) (CLAUDE.md trỏ tới) · skill [verify-headless](.claude/skills/verify-headless/SKILL.md) và [verify-ui](.claude/skills/verify-ui/SKILL.md) · hook Stop [chặn kết thúc khi test đỏ](.claude/settings.json) · `npm run mutate` · CI [.github/workflows/ci.yml](.github/workflows/ci.yml). Ghi chép: [docs/notes/](docs/notes/).

Giấy phép: MIT ([LICENSE](LICENSE)). Nguồn: [CREDITS.md](CREDITS.md).