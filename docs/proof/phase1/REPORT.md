# Bằng chứng Phase 1 (sinh tự động)

Sinh bởi `npm run proof` từ mã ở commit hiện tại. Máy: Windows_NT 10.0.26300, 11th Gen Intel(R) Core(TM) i3-1115G4 @ 3.00GHz, Node v22.22.1.

| Case | Yêu cầu kiểm chứng | Output thật | Kết quả | Ghi chú |
|---|---|---|---|---|
| c01_pickup | Nhặt đom đóm trong pickup_radius, sự kiện + điểm | `c01_pickup/out.jsonl` | đạt | sha256 0b9a300b1414 |
| c02_deposit_light | Nạp đủ đom đóm thì thắp đèn: deposit rồi lantern_lit, +per_lantern | `c02_deposit_light/out.jsonl` | đạt | sha256 9b0e1bb3123b |
| c03_partial_deposit | Nạp một phần: không thắp, deposited tích lũy | `c03_partial_deposit/out.jsonl` | đạt | sha256 1939e095d829 |
| c04_win_all_lit | Thắp hết đèn thì thắng (all_lit), điểm thưởng giây + flame còn lại | `c04_win_all_lit/out.jsonl` | đạt | sha256 3e50f89da193 |
| c05_lose_no_flames | Hết flame thì thua (no_flames) | `c05_lose_no_flames/out.jsonl` | đạt | sha256 e125007be952 |
| c06_hit_drop_invuln | Bị chạm: mất 1 flame, rơi floor(carried*ratio), bất tử invuln_s | `c06_hit_drop_invuln/out.jsonl` | đạt | sha256 9cb24af232c5 |
| c07_pulse_stun_push | Pulse: trừ pulse_cost, choáng + đẩy Bóng Mực, +per_stun, hết choáng sau pulse_stun_s | `c07_pulse_stun_push/out.jsonl` | đạt | sha256 08814c44129e |
| c08_pulse_no_light | Không đủ ánh sáng (carried < pulse_cost) thì pulse không có hiệu lực | `c08_pulse_no_light/out.jsonl` | đạt | sha256 7df52466ce68 |
| c09_safe_radius | Bóng Mực không vào safe_radius quanh đèn đã sáng | `c09_safe_radius/out.jsonl` | đạt | sha256 0aa3afc8c528 |
| c10_dawn | Hết giờ thì thua (dawn); --ticks dừng khi game kết thúc | `c10_dawn/out.jsonl` | đạt | sha256 59fbeb4445b0 |
| c11_jump | Nhảy: y > 0 giữa chừng và quay về 0 | `c11_jump/out.jsonl` | đạt | sha256 1428ae65cd9d |
| c12_move_normalize | move dài hơn 1 được chuẩn hóa: [1,1] vẫn đi 6 m/s | `c12_move_normalize/out.jsonl` | đạt | sha256 62afa3f48e37 |
| c13_cam_yaw | cam_yaw_deg=90, move [0,1] -> đi theo +X (công thức xoay trong contract) | `c13_cam_yaw/out.jsonl` | đạt | sha256 874edd00772f |
| c14_scenario_no_score | Dựng scenario không phát sự kiện, không cộng điểm (đèn lit:true) | `c14_scenario_no_score/out.jsonl` | đạt | sha256 dc0003f5cba6 |
| c15_random_deterministic | Cùng seed + scenario + inputs => output giống hệt (kể cả id tự sinh); sinh Bóng Mực theo seed | `c15_random_deterministic/out.jsonl` | đạt | sha256 1b98aef90e8b; chạy lần 2 GIỐNG HỆT |

Tổng: 15/15 đạt.
