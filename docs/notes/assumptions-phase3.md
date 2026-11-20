# Giả định Phase 3 (Ticket-03 "Đèn cạn dầu", Change Request, Contract v1.2)

Quy ước: **[B]** bắt buộc theo ticket, **[G]** giả định của tôi, **[Δ]** thay thế luật cũ (test cũ phải sửa/xóa kèm lý do), ❓ nên hỏi trợ giảng.

## 1. Luật bị thay thế [Δ] và hệ quả

| Luật cũ (Phase 1–2) | Luật mới (Ticket-03) | Test cũ bị ảnh hưởng |
|---|---|---|
| Đèn đã sáng không nhận thêm đom đóm, sáng mãi | Mô hình nhiên liệu: `fuel` 0–100, hao 1/s, châm dầu, hết dầu thì tắt, thắp lại 5 đom đóm | c02, c03, c10, c11 (thêm hao dầu), mọi case có `lit:true` chạy dài |
| Bóng Mực không bao giờ vào vùng an toàn | Đèn có fuel < 30 mất vùng an toàn; Bóng Mực wander tới hút dầu (trạng thái `drain`) | c10, c11 |
| Thắng ngay khi mọi đèn sáng (`all_lit`) | Thắng khi còn sống lúc bình minh và đủ đèn sáng (≥ ceil(0.6×n)); `dawn_survived` | c04, c13, c40, ui-smoke (thắng Đêm 1, Đêm 3) |
| Thời gian Đêm 300 / 330 / 360 s | 240 / 270 / 300 s | c16, c46, c47–c49, contract test |
| Điểm: +10/đom đóm, +100/đèn, +5/stun, +2/giây, +50/lửa | +5/đom đóm nạp, +100 thắp đầu, +40 thắp lại, +5 (+15 nếu đang drain)/stun, bình minh +50+floor(fuel) mỗi đèn sáng và +50/lửa, bỏ thưởng thời gian | c02, c03, c04, c07, c08 |
| Sức chứa cố định 10 | 10 + 2 × successful_lights, tối đa 20 | c01, c27 (không đổi kết quả), thêm case mới |
| Hết choáng: chase/wander theo khoảng cách | Hết choáng về `wander` (sau đó vẫn tự chuyển chase nếu Mây trong 12 m) | c07 vẫn đúng (Mây cách 7 m) |

Giữ nguyên và phải còn đúng: tick của sự kiện, tick scenario không phát sự kiện, tất định, lướt/rơi/bục/gió/Gió Lạc/bùa, vùng an toàn khi fuel ≥ 30, chạm/recoil/bất tử, pause.

## 2. Giả định cho chỗ ticket chưa nói rõ

| # | Chỗ mơ hồ | Giả định | Kiểm chứng |
|---|---|---|---|
| D1 | Độ chính xác dầu | Lưu số nguyên đơn vị 1/60 (`U = fuel × 60`): hao 1 đơn vị/tick, hút 5 đơn vị/tick, châm +600/đom đóm. Xuất ra `fuel = U/60` làm tròn 1 chữ số; scenario `fuel` → `round(fuel × 60)` rồi kẹp [0, 6000] [B] | hết dầu đúng tick 6000 |
| D2 | Chọn đèn khi tương tác | Ứng viên: đèn chưa sáng, hoặc đang sáng mà fuel < 100; trong 2.0 m (XZ); gần nhất, hòa thì id nhỏ; chỉ hoạt động khi đang mang ≥ 1 đom đóm (như Phase 2); đèn đầy dầu không được chọn nên không phát sự kiện/điểm [B] | case chọn đèn |
| D3 | Châm dầu | `used = min(đang mang, ceil((6000 − U)/600))`, `U = min(6000, U + 600·used)`; sự kiện `refuel {lantern_id, amount: used, fuel}`; +5 mỗi đom đóm | case châm dầu |
| D4 | Thắp đèn tắt | Chi phí `relight_cost` (5) nếu `ever_lit`, ngược lại `lantern_cost` (10); nạp dần được, vẫn phát `deposit`; đủ thì `lantern_lit {lantern_id, relight}`, `fuel = 100`, `ever_lit = true`, `relit_count++` nếu là thắp lại, `successful_lights++` (cả thắp lại); hết dầu thì `deposited = 0` | case thắp/thắp lại |
| D5 | Điểm | +5 mỗi đom đóm nạp (thắp mới, thắp lại, châm dầu); +100 thắp đầu; +40 thắp lại; bình minh thắng: Σ đèn sáng (50 + floor(fuel)) + 50 × lửa còn lại | case điểm |
| D6 | Khóa điểm trong `tuning.score` | Ticket không nêu tên khóa mới: giữ tên cũ với giá trị mới (`per_mote` 5, `per_lantern` 100 = thắp đầu, `per_stun` 5, `per_flame_left` 50, `per_second_left` 0) và thêm `per_relight` 40, `per_stun_drain` 15, `per_lit_lantern_dawn` 50 ❓ | contract test |
| D7 | Vùng an toàn | Chỉ khi đèn sáng và `U ≥ 1800` (fuel ≥ 30; đúng 30 vẫn còn). Xét sau bước 2 của từng tick nên fuel đúng 30.0 chỉ quan sát được ở tick vừa hao tới đó | case biên 30 |
| D8 | Đèn yếu | Sáng và `U < 1800` (nghiêm ngặt) | case chọn đèn yếu |
| D9 | Wander chọn đích | Mỗi tick, Bóng Mực wander (Mây ngoài 12 m) chọn đèn yếu gần nhất theo XZ (hòa: id nhỏ); không có đèn yếu thì đèn **tắt** gần nhất ("như trước"); không có cả hai thì lang thang ngẫu nhiên 2 m/s như Phase 2 ❓. Chase không đổi mục tiêu | case chọn đích |
| D10 | Tốc độ tới đích | Tốc độ Bóng Mực chuẩn (4.0; Đêm 3: 4.5) ❓ | case tới đèn |
| D11 | Tới đèn | Cách đèn yếu đích ≤ 2.0 m (XZ): chuyển `drain`, đứng yên; hút bắt đầu từ bước 2 của tick kế tiếp. Tới đèn tắt: dừng cách 2.0 m, vẫn `wander` | case drain |
| D12 | Thoát `drain` | Ưu tiên: đèn tắt hoặc fuel ≥ 30 → `wander`; Mây trong 6 m (XZ) → `chase`; cách đèn > 2 m → `wander`; Tỏa Sáng → `stunned`; hết choáng → `wander` [B] | case thoát drain |
| D13 | `fuel_drain` | Mỗi Bóng Mực phát một sự kiện ở mỗi tick thứ 60, 120, … tính từ tick hút đầu tiên của nó; `fuel` là dầu sau khi hút, làm tròn 1 chữ số ❓ | case sự kiện |
| D14 | Châm dầu lên ≥ 30 | Bóng Mực trong 6 m (XZ) quanh đèn bị đẩy ra mép trong ≤ 30 tick và không gây sát thương (cơ chế như đèn vừa thắp); các con đang `drain` ở đèn đó về `wander` | case đẩy khi châm dầu |
| D15 | Tỏa Sáng trúng Bóng đang `drain` | +15 tổng (thay vì +5); trúng Gió Lạc không đổi | case điểm stun |
| D16 | Thắng/thua | Sau mọi cập nhật của tick: lửa = 0 → thua `no_flames`; còn lại, nếu hết giờ: đèn sáng ≥ ceil(0.6·n − 1e-9) → thắng `dawn_survived`, ngược lại thua `dawn`. Đèn có fuel ≤ 0 tắt ngay sau bước 2 nên tick cuối tính theo trạng thái sau khi tắt [B] | case ngưỡng 3/5, 4/6, 5/7 |
| D17 | Snapshot mới | `lanterns[].{fuel, ever_lit, relit_count}`, `player.capacity`, `shades[].state` có `drain`; thêm `shades[].target_lantern_id` (null nếu không có) cho tiện kiểm chứng ❓ | contract test |
| D18 | Scenario mới | Đèn: `lit`, `fuel`, `ever_lit` (`lit:true` mà thiếu `fuel` → 100; `ever_lit` mặc định = `lit`; `fuel` của đèn tắt coi là 0); `player.successful_lights`; `shades[].target_lantern_id` bắt buộc cho `drain` nếu muốn chỉ định, thiếu thì lấy đèn sáng gần nhất trong 2 m, không có thì `wander`; id lạ → mã 2 ❓ | contract test |
| D19 | Sức chứa | `min(capacity_max, carry_capacity + 2 × successful_lights)`; áp cho nhặt đom đóm và đom đóm rơi; đèn đặt sẵn bằng scenario không tính; không giảm lượng đang mang khi tính lại | case sức chứa |
| D20 | Thời gian Đêm | Đọc từ `night{1,2,3}_duration_s` trong contract (240/270/300) | contract test |
| D21 | Giao diện | Thanh dầu 3D trên đèn đang sáng, nhấp nháy 1 Hz khi fuel < 30; đèn tắt xẹp 20% + vết rách; Bóng `drain` có tia hút tới đèn; HUD hiển thị mang/sức chứa và "đèn sáng k/n (cần ≥ m)"; kết quả `dawn_survived` ghi rõ; lời Ông Đăng cập nhật mục tiêu mới | smoke, ảnh |
| D22 | Chế độ mù màu | Cài đặt "Bảng màu dễ phân biệt" lưu cùng cài đặt cũ, đổi ngay khi bật: viền/mắt Bóng Mực `#00B3FF`; cảnh báo UI `#FFFFFF` + ⚠ (đồng hồ ≤ 30 s, nhấp nháy khi bị đánh, cảnh báo gió) | smoke, test palette |
| D23 | Tổng điểm game | Không đổi: cộng điểm các Đêm đã thắng [B] | smoke |

## 3. Kế hoạch (8 bước, mỗi bước có test và đột biến)

1. Contract v1.2 (tuning, durations), validate scenario/inputs mới, snapshot/sự kiện mới.
2. Mô hình dầu: hao, hết dầu, châm dầu, thắp lại, ever_lit, điểm, sức chứa.
3. Vùng an toàn theo fuel, ngưỡng 30, đẩy khi châm dầu.
4. Bóng Mực: chọn đích, `drain`, thoát drain, hút dầu cộng dồn, sự kiện, điểm stun.
5. Luật thắng mới (không thắng sớm, bình minh, ngưỡng đèn, điểm bình minh), thứ tự tick.
6. Cập nhật/xóa test cũ kèm lý do, thêm case mới, mutant mới, chạy proof.
7. Giao diện: thanh dầu, nhấp nháy, đèn xẹp, tia hút, HUD sức chứa, mù màu, lời thoại, sửa bot UI (thắng bằng sống sót tới bình minh).
8. Tài liệu: ADR, CHANGELOG (breaking changes), spec/cp3, AGENTS.md/skill, bằng chứng, commit, tag `phase-3`.

## 4. Quyết định triển khai bổ sung (phát hiện khi viết code)

| # | Quyết định | Lý do |
|---|---|---|
| E1 | Dầu bị hao/hút ở bước 2 **trước** khi châm ở bước 5, nên `refuel.fuel` luôn tính sau hao. Ví dụ fuel 90, mang 10: used = 2 (vì đã hao còn 89.98) | đúng thứ tự bước ticket; ghi trong c54b |
| E2 | Bóng `drain` chỉ tồn tại khi đèn đích còn yếu (fuel < 30). Scenario đặt `drain` ở đèn fuel ≥ 30 thì về `wander` ngay | luật thoát drain; c65c |
| E3 | Đèn lit:true trong scenario có `ever_lit` mặc định true | đèn đã sáng thì đã từng sáng |
| E4 | `fuel_drain.fuel` là dầu của đèn sau khi mọi Bóng hút trong tick đó | nhiều con cộng dồn |
| E5 | Giao diện: `?lit=K&fuel=F&carry=C&sl=S&time=T&drain=1&cb=1` chỉ để kiểm thử/chụp ảnh, không đổi luật mặc định | skill verify-ui |