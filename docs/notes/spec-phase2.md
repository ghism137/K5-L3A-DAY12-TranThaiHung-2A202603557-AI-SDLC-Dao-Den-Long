# Spec Phase 2 (Ticket-02 "Ba hòn đảo", Contract v1.1): tiêu chí nghiệm thu

Giả định chi tiết: [assumptions-phase2.md](assumptions-phase2.md). Bằng chứng sinh tự động: [../proof/phase2/REPORT.md](../proof/phase2/REPORT.md) (61 case headless), [../proof/phase2/ui-smoke.txt](../proof/phase2/ui-smoke.txt) (24 kiểm tra giao diện bằng bot), [../proof/phase2/fps.json](../proof/phase2/fps.json).

Cột **Kiểm chứng**: `cNN` = case trong `scenarios/cases.mjs`; `UI:` = kiểm tra trong `scripts/ui-smoke.mjs`; `thủ công` = cần người xem/nghe (chưa tự động hóa được).

## Phần 1: số liệu chuẩn

| Mục | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| Di chuyển | Chạy 6.0 m/s; move dài hơn 1 được chuẩn hóa; dừng ≤ 0.1 s; điều khiển trên không đầy đủ | c16, c16b |
| Nhảy | 7.0 m/s, trọng lực 20, chỉ nhảy khi chạm đất | c17 |
| Lướt | 14 m/s trong 12 tick, hồi chiêu 90 tick từ lúc bắt đầu, hướng = hướng di chuyển hoặc hướng mặt, trên không giữ độ cao, bấm khi đang hồi bị bỏ qua | c18, c18b, c18c, c18d |
| Đom đóm | Sức chứa 10; nhặt ≤ 1.0 m và chênh cao ≤ 1.5; 20 con lúc đầu tại 20 điểm khác nhau; +1 mỗi 240 tick, trần 30, bỏ lượt khi hết điểm trống | c01, c27, c27b |
| Đèn lồng | Giá 10, nạp nhiều lần, đèn nhớ tiến độ, bán kính 2.0 m, nạp min(mang, thiếu), chọn đèn chưa sáng gần nhất (hòa: id nhỏ) | c02, c03 |
| Vùng an toàn | Bóng bị chặn ở mép 6 m; Bóng đang trong vùng lúc đèn vừa thắp bị đẩy ra ≤ 30 tick và không gây hại | c10, c11 |
| Tỏa Sáng | Tốn 3; tâm = chân + 0.8; trúng nếu 3D ≤ 5 m; choáng 120 tick; đẩy 4 m trong 15 tick; làm mới khi pulse lại; hồi chiêu 180 tick; không đủ đom đóm thì không kích hoạt | c07, c08, c09, c09b, c39 |
| Bóng Mực | 4.0 m/s (Đêm 3: 4.5); phát hiện 12 m, bỏ đuổi 18 m; 5 trạng thái spawning/wander/chase/recoil/stunned | c34, c35, c35b, c36 |
| Chạm | XZ ≤ 1.0 và chênh cao ≤ 1.5; tối đa 1 lần mất lửa mỗi tick; recoil 2 m trong 60 tick; chạm lúc Mây bất tử không làm gì | c05, c06, c06b, c37, c38 |
| Lịch sinh Bóng Mực | 2 con tại tick 300 rồi 1 con mỗi 480/420/360 tick (Đêm 1/2/3); trần 6/8/10; id S1, S2, … | c32, c33 |
| Bị đánh | −1 lửa; rơi floor(mang/2) vành 1.5–2.5 m, TTL 480 tick; bất tử 90 tick | c06, c28 |
| Rơi khỏi đảo | Y < −10 đúng 1 lần: −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh bất tử 90 tick; hết lửa thì thua ngay | c19, c20 |
| Thắng/thua | Hết lửa → thua (ưu tiên); tất cả đèn sáng → thắng (kể cả tick hết giờ); hết giờ → dawn | c04, c12, c13, c40 |
| Điểm | +10/đom đóm nạp, +100/đèn, +5/lần trúng Tỏa Sáng, thắng +floor(giây)×2 + 50×lửa | c02, c04, c07, c08 |
| Thứ tự tick | 12 bước theo đúng ticket (`src/core/sim.js` ghi chú đầu file) | toàn bộ case; mutate.mjs (22 đột biến) |

## Phần 2: bản đồ chuẩn

| Mục | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| Đêm 1 | 5 đèn đúng tọa độ, 300 s, xuất phát (0,0,0), 8+16 điểm đom đóm | c47 |
| Đêm 2 | Hai đảo r=28 + cầu tre; 6 đèn L1–L6; 330 s; bục (20,0,18) và (50,0,−18) bắn sang đảo kia (Y 14, ngang 24 m/s, phím không ghi đè, đáp trong đảo đích); điểm đom đóm 4+8 mỗi đảo | c48, c21 |
| Đêm 3 | 3 tầng, vách đứng, 2 dốc 3 m, bục (0,3,13) đáp tầng 2, tháp chuông r=2 không leo được; 7 đèn; 360 s; 30 điểm đom đóm ba tầng | c49, c22, c23, c24, c25, c26 |
| Gió mạnh (Đêm 3) | Mỗi 30 s một cơn 5 s theo hướng theo seed, đẩy 2 m/s; báo trước 2 s bằng lá bay và âm thanh | c31 (đẩy); UI: lá bay thủ công |

## Phần 3: tính năng mới (tiêu chí nghiệm thu từng mục)

| Mục | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|
| **Gió Lạc** | (1) Đêm 2, 3; tối đa 2, sinh tại tick 1200, 2400, …, id D1, D2. (2) idle→chase khi Mây mang ≥ 5 và cách ≤ 15 m; mất điều kiện thì về idle. (3) Chạm ≤ 1.2 m: cướp min(3, đang mang), phát `drifter_steal`, flee 240 tick rồi biến mất cùng đồ. (4) Tỏa Sáng trúng lúc chase: flee, không cướp. (5) Trúng lúc flee có đồ: `drifter_drop`, đồ thành đom đóm rơi tại chỗ, biến mất sau 120 tick. (6) Không làm mất Ngọn Lửa; vùng an toàn không chặn nó | c41, c42, c43, c44, c45, c45b |
| **Bùa Gió** | (1) Nhặt theo luật đom đóm → `charm_picked`. (2) 600 tick, nhặt lại làm mới. (3) Chạy 7.2 m/s; lướt không hồi chiêu nhưng vẫn phải nhấn lại. (4) Hồi bùa 2700 tick. (5) Vị trí: Đêm 2 (35,0,0); Đêm 3 (30,0,25), (−30,0,25) | c29, c29b, c29c, c30, c48, c49 |
| **Chuỗi 3 Đêm** | Menu → giới thiệu (tên đảo, lời Ông Đăng) → chơi → kết quả → Đêm kế tiếp. Thắng Đêm 3 → Bình Minh với tổng điểm. Thua → chơi lại Đêm đó. Tổng điểm = tổng điểm các Đêm đã thắng | UI: 6 kiểm tra chuỗi (thua→chơi lại, thắng Đêm 1→Đêm 2, thắng Đêm 3→Bình Minh) |
| **Tạm dừng** | Esc/P dừng logic hoàn toàn; menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. Headless: input `pause`, `sim_tick` đứng yên, snapshot `paused` | c46; UI: "Tạm dừng: logic đứng yên", menu đủ 4 nút |
| **Cài đặt** | Âm lượng và độ nhạy chuột; lưu giữa các lần mở game | UI: lưu localStorage, còn nguyên sau khi tải lại trang |
| **Âm thanh** | Nhạc nền đêm; hiệu ứng: nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối (thêm: bùa, bị cướp, UI) | thủ công (nghe). Đã nối sự kiện: `src/render/main.js` hàm `onEvent`; nhạc/âm thanh sinh bằng WebAudio |
| **HUD** | Ngọn Lửa trên trái; mm:ss trên giữa, đỏ và nhấp nháy khi ≤ 30 s; đèn k/n và điểm trên phải; thanh đom đóm 10 ô dưới giữa; biểu tượng hồi chiêu Lướt, Tỏa Sáng dưới phải; nhắc "E — Nạp ánh sáng (x/10)"; mũi tên tới đèn chưa sáng gần nhất khi ngoài màn hình | UI: 4 kiểm tra HUD (đồng hồ đỏ, 3 lửa/10 ô/2 biểu tượng/đèn/điểm, mũi tên, nhắc nạp đèn); vị trí từng thành phần: ảnh `ui-night*.png` |
| **Bảng màu chuẩn** | Mã hex đúng (≤ 10%/kênh) cho trời/sương, cỏ/cát/gỗ/biển mây, đèn, đom đóm, Bóng Mực, Mây, vàng, Gió Lạc, UI; ánh sáng môi trường = 0.15 + 0.55×(sáng/tổng) | tests/palette.test.js (hex + công thức); thủ công: ảnh |

## Contract v1.1 và hiệu năng

| Mục | Tiêu chí | Kiểm chứng |
|---|---|---|
| Contract | `contract_version "1.1"`, tuning đúng số chuẩn + 5 khóa mới, `--night 1/2/3` | tests/contract.test.js |
| Snapshot | Thêm `night`, `wind`, `player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}`, mảng `motes` (kind, ttl_s), `drifters`, `charms` | tests/contract.test.js |
| Sự kiện mới | dash, charm_picked, drifter_steal, drifter_drop, night_start, paused, resumed; player_hit by "fall" có `lost` | c18, c19, c29, c41, c44, c46, c47 |
| Scenario/Input mới | `player.*_ticks`, `shades[].state/state_ticks_left`, `drifters`, `charms`, `random_drifters`, `wind_enabled`; input `dash`, `pause`; sai định dạng → mã 2 | tests/contract.test.js |
| Một Đêm đầy đủ ≤ 30 s | Mỗi Đêm chạy đủ thời lượng trong ≤ 30 s | tests/contract.test.js (thực tế ~0.1 s) |
| ≥ 30 FPS 1280×720 | FPS trung bình ≥ 30 | `npm run fps` → fps.json (60 FPS trên Intel UHD, i3-1115G4) |
