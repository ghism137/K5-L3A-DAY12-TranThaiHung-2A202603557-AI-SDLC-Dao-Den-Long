# Giả định Phase 1 (PRD-0, Test Contract v1.0)

Quy ước: **[B]** = bắt buộc theo contract, **[G]** = giả định của tôi (chỗ mơ hồ), **[S]** = số tự chọn, khai trong `game.contract.json`.
Các mục đánh dấu ❓ là câu nên hỏi trợ giảng trên lab board; nếu trả lời "chưa quy định" thì giữ giả định này.

## 1. Con số tự chọn (tuning)

| Khóa | Giá trị | Ghi chú |
|---|---|---|
| player_speed | 6 m/s | |
| carry_capacity | 5 | số đom đóm mang tối đa |
| lantern_cost | 5 | số đom đóm để thắp 1 đèn |
| lantern_count_night1 | 5 | [B] |
| pickup_radius | 1.5 m | nhặt tự động khi còn chỗ |
| interact_radius | 3 m | khoảng cách tới đèn để nạp |
| pulse_cost | 1 | trừ vào đom đóm đang mang |
| pulse_radius | 8 m | |
| night1_duration_s | 300 | |
| flames | 3 | "máu" của Mây |
| invuln_s | 1.5 | bất tử sau khi bị chạm |
| hit_drop_ratio | 0.5 | làm tròn xuống |
| pulse_stun_s | 3 | |
| pulse_push_m | 3 | |
| pulse_cooldown_s | 2 | |
| safe_radius | 6 m | quanh đèn đã sáng |
| shade_speed | 4 m/s | chậm hơn người chơi |
| shade_hit_radius | 1.0 m | |
| fall_enabled | false | đảo có rào chắn, không rơi |
| score | per_mote 10, per_lantern 100, per_stun 20, per_second_left 1, per_flame_left 50 | cộng giây/flame còn lại khi thắng |

## 2. Giả định cho chỗ mơ hồ

| # | Chỗ mơ hồ | Giả định | Cách kiểm chứng |
|---|---|---|---|
| A1 | "Ánh sáng" tốn khi tỏa sáng là gì | Chính là đom đóm đang mang (`carried`); pulse cần `carried >= pulse_cost` và trừ `pulse_cost` ❓ | Test: carried=0 thì pulse không có hiệu lực; carried=1 thì trừ còn 0 |
| A2 | Nạp đèn | Nhấn `interact` trong `interact_radius` của đèn: nạp `min(carried, lantern_cost - deposited)`; đủ `lantern_cost` thì `lantern_lit`. Chuỗi sự kiện: `deposit` rồi `lantern_lit` | Scenario nạp 5 con vào L1 |
| A3 | Nhặt đom đóm | Tự động khi trong `pickup_radius` và `carried < carry_capacity`, mỗi tick tối đa 1 con (con gần nhất, tie-break theo id) | Scenario đom đóm ở 1 m |
| A4 | `safe_radius` | Chỉ quanh đèn **đã sáng**; Bóng Mực không vào vùng đó (bị đẩy ra ngoài rìa) ❓ | Scenario: đèn `lit:true`, shade lao vào, kiểm tra khoảng cách ≥ safe_radius |
| A5 | Bóng Mực bị choáng | Đứng yên `pulse_stun_s`, bị đẩy `pulse_push_m` ra xa người chơi (không vào vùng safe) và không gây sát thương | Scenario pulse gần shade |
| A6 | Bị chạm | Khoảng cách XZ ≤ `shade_hit_radius`, shade không choáng, người chơi hết bất tử: trừ 1 flame, đánh rơi `floor(carried * hit_drop_ratio)` (đom đóm rơi xuống đất cạnh người chơi, nhặt lại được), bất tử `invuln_s`. Nhảy **không** né được vì khoảng cách chỉ tính theo XZ | Scenario shade chạm người chơi |
| A7 | Thắng / thua | `all_lit` khi 5 đèn sáng; `no_flames` khi flames = 0; `dawn` khi hết giờ. Thứ tự trong 1 bước: thua do flames kiểm tra trước, rồi thắng, rồi hết giờ ❓ | Scenario từng điều kiện |
| A8 | Sinh Bóng Mực | Khi `random_shades` không phải `false` (mặc định bật): sinh 1 con ở rìa đảo (góc theo seed) ở giây 10, rồi mỗi 20 s (tick 600, 1800, …), tối đa 4 con còn trên đảo; id `S{n}` không trùng id có sẵn; sự kiện `shade_spawned`. Bóng Mực liệt kê trong scenario có mặt ngay từ đầu ở trạng thái `chase` | Case c15 (tick 600, id S1) |
| A9 | Sinh đom đóm | `motes` có trong scenario thì thay thế danh sách ban đầu (kể cả `[]`). Nếu không có `motes` và `random_motes` không phải `false`: 20 con rải theo seed trong bán kính 38 m. Không hồi sinh trong lúc chơi (chỉ đom đóm bị đánh rơi thì xuất hiện lại) | c15 (20 con), c01 |
| A20 | Đèn lạ trong scenario | `lanterns[].id` không thuộc L1..L5 → coi là scenario sai định dạng, thoát mã 2 | tests/contract.test.js |
| A21 | Bóng Mực đang bị choáng | Không gây sát thương; choáng đúng `pulse_stun_s × 60` bước tính từ bước phát pulse (bước đó tính là bước choáng đầu tiên); pulse lại lên Bóng Mực đang choáng thì gia hạn và vẫn tính `per_stun` | c07 (tick 170 còn choáng, tick 190 đã chase) |
| A22 | Điểm thắng | `floor(time_left_s) × per_second_left + flames × per_flame_left` cộng một lần, cùng bước với `game_over` | c04 (549) |
| A10 | Hành vi Bóng Mực | Trạng thái: `chase` (đuổi người chơi theo đường thẳng), `stunned`. Không chạy vào vùng safe | Test trạng thái trong snapshot |
| A11 | Nhảy | Có `jump` (vận tốc đầu 7 m/s, trọng lực 20 m/s²); chỉ ảnh hưởng `pos.y`, không ảnh hưởng va chạm XZ | Test pos.y quay về 0 |
| A12 | Đảo | Tròn bán kính 40 m, giới hạn người chơi trong đảo; đèn L1..L5 rải đều bán kính 25 m, L1 = (0,0,25) theo ví dụ contract | Test clamp |
| A13 | Điểm | Cộng ngay khi sự kiện xảy ra (mote, lantern, stun); `per_second_left` và `per_flame_left` cộng một lần khi thắng. Dựng scenario không cộng điểm | Test điểm theo scenario |
| A14 | Thứ tự xử lý trong 1 bước | input → di chuyển người chơi → nhặt → interact/nạp → pulse → Bóng Mực di chuyển → va chạm → sinh → kiểm tra thắng/thua → giảm thời gian | Ghi trong code + test thứ tự |
| A15 | Tick của sự kiện | Sự kiện trong bước k ghi `tick = k+1` [B] | Test: nhặt ở bước đầu có tick 1 |
| A16 | Làm tròn | Toạ độ làm tròn 3 chữ số thập phân khi ghi output; mô phỏng nội bộ dùng số thực đầy đủ [B] | So sánh output |
| A17 | `--ticks` vượt quá khi game kết thúc | Dừng ngay, in dòng `end` [B] | Test thắng sớm |
| A18 | Mã thoát | Inputs/scenario sai định dạng → 2; lỗi khác → 1; bình thường → 0 [B] | Test file hỏng |
| A19 | Công nghệ | JS ESM, logic `src/core` thuần; bản có giao diện là web (Three.js) chạy bằng Docker/`npm`; Windows OK vì là web | Chạy bằng Docker |
