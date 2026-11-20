# Giả định Phase 2 (Ticket-02 "Ba hòn đảo", Contract v1.1)

Quy ước: **[B]** bắt buộc theo ticket, **[G]** giả định của tôi, **[Δ]** thay đổi so với Phase 1 (test/giả định cũ phải sửa kèm lý do), ❓ nên hỏi trợ giảng; nếu trả lời "chưa quy định" thì giữ giả định này.

## 1. Thay đổi so với Phase 1 [Δ] (số chuẩn thay mọi giá trị tự chọn)

| Khóa | Phase 1 (tự chọn) | Phase 2 (chuẩn) |
|---|---|---|
| carry_capacity | 5 | 10 |
| lantern_cost | 5 | 10 |
| pickup_radius | 1.5 | 1.0 (XZ) + chênh cao ≤ 1.5 |
| interact_radius | 3 | 2.0 |
| pulse_cost / radius / cooldown | 1 / 8 / 2 s | 3 / 5 (3D, tâm = chân + 0.8) / 3 s |
| pulse_stun_s / push | 3 s / 3 m | 2 s (120 tick) / 4 m trong 15 tick đầu |
| shade_speed | 4 | 4.0 (Đêm 3: 4.5) |
| fall_enabled | false | true (Y < −10) |
| invuln | 1.5 s (bước giảm đếm cuối bước) | 90 tick, bộ đếm giảm ở **đầu** tick (bước 2) |
| score | mote +10 khi **nhặt**, stun +20, thắng +1/giây | +10 khi **nạp**, stun +5, thắng ×2/giây, +50/flame |
| Đèn | vòng 25 m tự sinh | tọa độ chuẩn (Đêm 1 đổi L2..L5) |
| Bóng Mực | luôn đuổi | trạng thái spawning, wander, chase, recoil, stunned; phát hiện 12 m, bỏ đuổi 18 m |
| Sinh Bóng Mực | giây 10, mỗi 20 s | tick 300 (2 con), rồi theo lịch từng đêm |
| Sinh đom đóm | 20 con ngẫu nhiên, không hồi | 20 con tại điểm cố định, +1 mỗi 240 tick (trần 30) |
| `per_second_left` | 1 | 2 |

Hệ quả: case Phase 1 c01–c15 phải cập nhật số và kỳ vọng; ghi lý do trong `docs/notes/cp2-checklist.md`. Ba hành vi **giữ nguyên** và phải còn đúng: tick của sự kiện = k+1, dựng scenario không phát sự kiện/không cộng điểm, tất định theo seed.

## 2. Giả định cho chỗ ticket chưa nói rõ

| # | Chỗ mơ hồ | Giả định | Kiểm chứng |
|---|---|---|---|
| B1 | Tăng tốc/dừng "≤ 0.1 s" | Vận tốc ngang đổi **tức thời** (0 s ≤ 0.1 s); `vel` ghi trong snapshot | case di chuyển, dừng |
| B2 | Góc bản đồ | `x = r·cosθ`, `z = r·sinθ` (khớp L1 (0,0,25) = 90° và L2 (23.8,7.7) = 18° của ticket) | test tọa độ đèn |
| B3 | Hướng nhân vật | Mặc định +Z; cập nhật theo hướng di chuyển khác 0 | case dash khi đứng yên |
| B4 | Lướt | 12 tick, 14 m/s theo hướng di chuyển (không có thì hướng mặt), `vy = 0` suốt lúc lướt, hồi chiêu 90 tick tính từ lúc bắt đầu; nhấn khi đang lướt hoặc đang hồi bị bỏ qua. Sau lướt, vận tốc phóng của bục (nếu có) tiếp tục | case dash, cooldown |
| B5 | Nhặt nhiều con cùng tick | Nhặt **tất cả** con hợp lệ (gần nhất trước, hòa thì id nhỏ) tới khi đầy | case nhặt 2 con |
| B6 | Vị trí đom đóm / bùa | `pos.y` = mặt đất tại điểm đặt; "chênh cao" so với `player.y` | case đảo tầng |
| B7 | Vị trí "chạm" Bóng Mực | `pos.y` Bóng Mực = mặt đất + 1.0 (lơ lửng, khớp ví dụ snapshot v1.0); chênh cao = |player.y − mặt đất tại XZ Bóng Mực| ≤ 1.5 ❓ | case khác tầng không bị chạm |
| B8 | Điểm xuất phát Đêm 3 | (0,0,0) nằm **trong tháp** nên không dùng được. Chọn (0,0,−30) tầng 0, quay mặt +Z; hồi sinh sau khi rơi cũng về đây ❓ | test |
| B9 | Trạng thái `spawning` | 30 tick, đứng yên, không gây hại; sau đó `wander` ❓ | case spawn |
| B10 | `wander` | Đi 2 m/s theo hướng ngẫu nhiên (theo seed) đổi mỗi 120 tick, không ra khỏi đất; `chase` khi Mây trong 12 m, về `wander` khi > 18 m (trễ); scenario không ghi state thì `wander` rồi tự chuyển theo khoảng cách | case phát hiện |
| B11 | `recoil` | Sau khi gây hit: lùi 2 m trong 60 tick (ngược hướng Mây), không gây hại khi lùi. Bóng chạm lúc Mây bất tử: không làm gì | case hit/recoil |
| B12 | Đẩy khỏi vùng an toàn | Đèn vừa sáng: Bóng trong 6 m bị đẩy ra mép với tốc độ dồn đều trong ≤ 30 tick; trong thời gian đó không gây hại. Sau đó bị chặn ở mép (XZ) ❓ | case an toàn |
| B13 | Va chạm "vật cản" | Chỉ tháp chuông (trụ r=2, từ Y=6 tới 14) và vách tầng; Bóng Mực bay theo đường thẳng, không cần tìm đường, chỉ chặn bởi tháp | case tháp |
| B14 | Thời điểm sinh Bóng Mực | Tick 300: 2 con (S1, S2); sau đó 1 con ở tick 300 + k·T (T = 480 / 420 / 360 theo đêm; trần 6 / 8 / 10). Điểm hợp lệ: cách Mây ≥ 15 m, chưa bị chiếm, ngoài vùng an toàn; chọn ngẫu nhiên theo seed; hết điểm hợp lệ thì bỏ lượt | case lịch sinh |
| B15 | Sinh đom đóm | 20 con ở 20 điểm **khác nhau** theo seed; tick 240, 480, … thêm 1 ở điểm trống nếu tổng đom đóm (kể cả rơi) < 30. Nhặt xong thì điểm đó trống lại | case lịch sinh |
| B16 | Đom đóm rơi | Vành 1.5–2.5 m (góc theo seed, nếu không có đất thì rơi ngay tại chân), `kind: "dropped"`, TTL 480 tick, hết thì biến mất; nhặt được từ tick sau | case rơi, TTL |
| B17 | Rơi khỏi đảo | Y < −10: −1 flame, mất hết đom đóm (`player_hit {by:"fall", flames, dropped:0, lost:n}`); 60 tick không nhặt/không bị chạm; hồi sinh tại điểm xuất phát, vel 0, bất tử 90; flame = 0 thì thua ngay (no_flames), không hồi sinh; không lặp trong lúc chờ | case rơi |
| B18 | Bục nhảy | Chân trong 1 m (XZ) và |y − bục| ≤ 0.5 và chưa ở trạng thái phóng: đặt `vy` và vận tốc ngang; phím di chuyển bị bỏ qua tới khi chạm đất (vẫn lướt được) | case bục Đêm 2 và 3 (đáp đúng đảo/tầng) |
| B19 | Địa hình Đêm 3 | Tầng 0 đĩa r=45; tầng 1 vành 12–24 m ở z>0 (Y=3); tầng 2 đĩa r=8 (Y=6); dốc rộng 3 m ở 30° và 150°, r từ 30 (Y=0) tới 24 (Y=3) tuyến tính. Bước lên bề mặt cao hơn quá 0.35 m: bị chặn; bước ra mép: rơi xuống tầng dưới | case dốc, vách |
| B20 | Tương tác đèn | Khoảng cách XZ (như contract) | case nạp |
| B21 | Gió Lạc: điểm sương | Dùng cùng danh sách điểm sinh Bóng Mực ❓; bay ở độ cao +1.5; `idle→chase` theo XZ ≤ 15 m và mang ≥ 5, mất điều kiện về `idle` | case Gió Lạc |
| B22 | Gió Lạc cướp | XZ ≤ 1.2 (không xét độ cao); `drifter_steal {drifter_id, amount, carried}`; flee 240 tick rồi biến mất cùng đồ; Tỏa Sáng lúc `flee` có đồ: `drifter_drop {drifter_id, amount}`, đồ thành đom đóm rơi tại chỗ, nó biến mất sau 120 tick | case |
| B23 | `stunned_ids` của pulse | Chỉ Bóng Mực (Gió Lạc có trường riêng) ❓ | case |
| B24 | Bùa Gió | 600 tick, nhặt lại làm mới; tốc độ 7.2, lướt không hồi chiêu (vẫn phải nhấn lại); hồi bùa 2700 tick; `charm_picked {charm_id, charm_ticks}` | case bùa |
| B25 | Gió mạnh (Đêm 3) | Bắt đầu ở tick 1800k (k ≥ 1), kéo dài 300 tick, báo trước 120 tick; hướng chọn theo seed lúc báo; đẩy Mây 2 m/s; snapshot `wind {active, dir_deg}` (hướng sắp tới khi chưa hoạt động) ❓ | case gió |
| B26 | Tạm dừng | Input `pause` (false→true) bật/tắt; khi đang dừng `tick` tăng, `sim_tick`/thời gian/hồi chiêu/spawn/TTL đứng yên, snapshot `state:"paused"`; sự kiện `paused`, `resumed` | case pause |
| B27 | `night_start` | Phát ở bước 1 (tick = 1), vì dựng scenario không phát sự kiện ❓ | test |
| B28 | `invuln` trong snapshot | Số giây còn lại (tick / 60), `invuln_ticks` trong scenario ❓ | test |
| B29 | Scenario mới | `drifters[]` {id?, pos, state?, stolen?}; `charms[]` {id, pos, available?, respawn_ticks?}; `shades[].state/state_ticks_left`; `player.{invuln_ticks,dash_cd_ticks,pulse_cd_ticks,charm_ticks}`; `random_drifters`, `wind_enabled` ❓ | test định dạng |
| B30 | Định dạng sai | Giữ quy tắc Phase 1: mã 2 | test |
| B31 | Điểm tổng game | Chỉ ở giao diện: cộng điểm các Đêm đã thắng. Headless mỗi lần chạy một Đêm | thủ công + ảnh |
| B32 | Ông Đăng | Nhân vật dẫn truyện, lời thoại do tôi viết (nhãn "sáng tạo"), chỉ ở giao diện | thủ công |
| B33 | Hiệu năng | Một Đêm headless ≤ 30 s (đo bằng test); bản thường ≥ 30 FPS trung bình 1280×720 (đo bằng bộ đếm FPS, ghi cấu hình máy) | `npm run perf`, đo tay |

## 3. Quyết định triển khai bổ sung (phát hiện khi viết code, không làm đổi giả định đã duyệt)

| # | Quyết định | Lý do |
|---|---|---|
| C1 | `night_start` phát ở **bước gameplay đầu tiên** (tick 1 nếu không tạm dừng ngay) | B27; scenario không phát sự kiện |
| C2 | Bộ đếm giảm ở đầu tick: "đặt N" = có hiệu lực N tick tính cả tick đặt (choáng 120, bất tử 90 → chạm lại ở tick +90). Riêng recoil đặt 61 để đủ 60 bước di chuyển = 2.0 m (Bóng không di chuyển ở tick bị chạm) | thứ tự tick bắt buộc; đo bằng c06, c06b, c07 |
| C3 | Đèn vừa thắp luôn đẩy Bóng Mực trong 6 m ra, nên Bóng không thể gây hit cùng tick đó (khoảng tương tác 2 m + chạm 1 m < 6 m) | luật vùng an toàn; case c40 thiết kế lại |
| C4 | Hướng gió chọn bằng luồng ngẫu nhiên riêng theo (seed, k) để không phụ thuộc thứ tự các sự kiện khác | tất định |
| C5 | Bóng Mực wander đổi hướng mỗi 120 tick, quay đầu khi sắp ra khỏi đất; scenario không ghi `state` thì `wander` rồi tự đánh giá theo khoảng cách | B10 |
| C6 | Giao diện: yaw camera ban đầu 180° để máy quay nhìn cùng hướng +Z với Mây; W = đi tới trước màn hình | khớp công thức `cam_yaw_deg` |