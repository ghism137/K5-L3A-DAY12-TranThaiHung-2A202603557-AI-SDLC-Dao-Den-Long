# CHANGELOG

Quy ước: **BREAKING** = thay đổi phá vỡ tương thích với phase trước (đầu ra headless, luật hoặc contract khác đi).

## Phase 4: "Bình minh" (tag `phase-4`, Release `v1.0.0`, Contract v1.3)

Không có thay đổi phá vỡ: **đầu ra headless của 99 case giống hệt từng byte so với Phase 3** ([docs/proof/phase4/regression.txt](docs/proof/phase4/regression.txt)). Contract v1.3 chỉ thêm `bench_cmd` và `soak_cmd`.

### Added
- **Benchmark**: `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`. Cảnh chuẩn (200 Bóng Mực wander, 100 đom đóm, 3 đèn sáng, camera quỹ đạo 15 s/vòng), 3 s khởi động, 1280×720, vsync tắt bằng cờ trình duyệt, `bench.json` đủ trường (avg, p1 low, p95 nearest-rank, frames, load_ms, peak_mem_mb, vsync_off, renderer, os).
- **Soak test**: `node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json`: 10 Đêm liên tiếp một tiến trình, input ngẫu nhiên theo seed, `crashes`, `mem_start_mb`, `mem_end_mb`.
- **Bảng xếp hạng cục bộ**: tên 3–12 ký tự (chữ, số, `_`, có Unicode), top 10, điểm giảm dần rồi ai đạt trước, lưu `data/leaderboard.json`, màn hình trong menu, `--export-leaderboard out.json`.
- **Dễ tiếp cận**: đổi phím (2 ô/hành động, báo trùng, khôi phục mặc định, lưu), chỉ báo hình ảnh (Bóng Mực xuất hiện kèm mũi tên mép màn hình, gió, 10 giây cuối, dầu < 30), giảm chuyển động, chữ ≥ 18 px, "Chữ lớn" ×1.25.
- **Đóng gói**: `npm run package` tạo `dao-den-long-v1.0.0.zip` chạy được (start.bat / start.sh, chỉ cần Node ≥ 22); README đầy đủ, CREDITS, LICENSE, retro.
- Cờ `bench` của `createGame` (chỉ cảnh benchmark dùng, không với tới được từ CLI).
- 74 đột biến trong `npm run mutate` (thêm 28), 154 test, bot giao diện 57 kiểm tra.

### Changed
- Render: Bóng Mực vẽ bằng InstancedMesh, đom đóm bằng Points + shader, tư thế cập nhật tại chỗ; mô phỏng tính nhóm mục tiêu một lần mỗi tick. FPS cảnh benchmark từ 62–98 (p1 low ~18) lên ~260 (p1 low ~58) trên máy phát triển. Hành vi không đổi.
- `npm test` chạy tuần tự (`--test-concurrency=1`) vì test soak đo bộ nhớ và test benchmark mở trình duyệt nhiễu nhau khi chạy song song.
- Máy chủ cục bộ có danh sách file được phép phục vụ, `/api/leaderboard`, giới hạn body 4 KB (413).

## Phase 3: "Đèn cạn dầu" (tag `phase-3`, Contract v1.2)

Quyết định thiết kế: [docs/adr/0001-lantern-fuel-and-dawn-win.md](docs/adr/0001-lantern-fuel-and-dawn-win.md).

### Breaking changes
- **BREAKING: không còn thắng sớm.** Thắp đủ đèn không kết thúc Đêm. Lý do kết thúc `all_lit` bị bỏ; thắng là `dawn_survived`, thua là `dawn` hoặc `no_flames`.
- **BREAKING: luật thắng mới.** Thắng khi còn sống lúc hết giờ và số đèn sáng ≥ ceil(0.6 × tổng): Đêm 1 cần 3/5, Đêm 2 cần 4/6, Đêm 3 cần 5/7. Hết Ngọn Lửa luôn thua `no_flames` trước.
- **BREAKING: đèn có thể tắt.** Đèn sáng hao 1 fuel/s, hết dầu (fuel ≤ 0) thì tắt, `deposited = 0`, phát `lantern_out`; đèn nhớ `ever_lit`. Trước đây đèn sáng mãi.
- **BREAKING: thời lượng Đêm** 300/330/360 s → **240/270/300 s** (`night1/2/3_duration_s`).
- **BREAKING: công thức điểm thay hoàn toàn.** Cũ: +10/đom đóm nạp, +100/đèn, +5/stun, +2/giây còn lại, +50/lửa. Mới: +5/đom đóm nạp (thắp mới, thắp lại, châm dầu), +100 thắp đầu, +40 thắp lại, +5 mỗi Bóng trúng Tỏa Sáng (+15 nếu nó đang `drain`), bình minh thắng: mỗi đèn sáng +50+floor(fuel), mỗi lửa +50. **Bỏ thưởng thời gian.**
- **BREAKING: vùng an toàn có điều kiện.** Chỉ đèn sáng có fuel ≥ 30 mới có vùng an toàn 6 m (trước đây mọi đèn sáng). Đèn fuel < 30 không chặn Bóng Mực.
- **BREAKING: hết choáng về `wander`** (trước đây chọn chase/wander theo khoảng cách ngay lúc hết choáng).
- **BREAKING: hành vi `wander`.** Bóng Mực wander đi tới đèn yếu gần nhất, rồi đèn tắt gần nhất (trước đây chỉ lang thang ngẫu nhiên).
- **BREAKING: `tuning`.** Thêm `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`; `score` đổi giá trị và thêm `per_relight`, `per_stun_drain`, `per_lit_lantern_dawn` (`per_second_left` = 0).
- **BREAKING: snapshot.** Mỗi đèn thêm `fuel`, `ever_lit`, `relit_count`; `player.capacity`; `shades[].state` có thêm `drain`; thêm `shades[].target_lantern_id`.
- **BREAKING: scenario.** Đèn nhận `fuel`, `ever_lit` (`lit:true` không ghi `fuel` thì 100); `player.successful_lights`; `shades[].target_lantern_id`, `state: "drain"`.
- **BREAKING: sự kiện.** Thêm `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` thêm `relight`.
- **BREAKING: sức chứa** 10 cố định → `min(20, 10 + 2 × successful_lights)`.

### Added
- Nhiên liệu đèn, châm dầu (E ở đèn đang sáng), thắp lại (5 đom đóm), Bóng Mực `drain` hút 5 fuel/s cộng dồn, sự kiện `fuel_drain` mỗi 60 tick.
- Đẩy Bóng Mực khỏi vùng 6 m khi đèn được châm qua 30.
- Chế độ "Bảng màu dễ phân biệt" (lưu): viền/mắt Bóng Mực #00B3FF, cảnh báo UI #FFFFFF + ⚠; đèn tắt xẹp 20% có vết rách; thanh dầu và đèn nhấp nháy 1 Hz khi fuel < 30; tia hút dầu.
- `npm run mutate` có 46 đột biến (thêm 25 cho luật dầu/hút/thắng, bỏ 1 của luật thắng sớm); bot UI 32 kiểm tra.

### Removed
- Lý do kết thúc `all_lit`; thưởng thời gian; vùng an toàn vô điều kiện.

### Test cũ bị thay hoặc sửa (lý do ở docs/notes/cp3-checklist.md)
c02, c03, c04 (→ `c04_dawn_win_three_lit`), c13 (→ `c13_no_early_win_all_lit`), c46, c47, c48, c49, test contract, bot UI "thắng". Không có test nào bị skip.

## Phase 2: "Ba hòn đảo" (tag `phase-2`, Contract v1.1)
Ba Đêm, lướt, rơi khỏi đảo, bục nhảy, Bóng Mực 5 trạng thái, Gió Lạc, Bùa Gió, gió mạnh, tạm dừng, giao diện đầy đủ, số liệu chuẩn thay số tự chọn của Phase 1.

## Phase 1: "Đêm 1 - Đảo Bến" (tag `phase-1`, Contract v1.0)
Lõi mô phỏng tất định, chế độ headless, giao diện Three.js đơn giản.