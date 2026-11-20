# Bằng chứng Phase 1 (sinh tự động)

Sinh bởi `npm run proof` từ mã ở commit hiện tại. Máy: Windows_NT 10.0.26300, 11th Gen Intel(R) Core(TM) i3-1115G4 @ 3.00GHz, Node v22.22.1.

| Case | Yêu cầu kiểm chứng | Output thật | Kết quả | Ghi chú |
|---|---|---|---|---|
| c01_pickup | Nhặt đom đóm trong 1.0 m: sự kiện mote_picked; điểm chỉ tính khi NẠP (Δ so với Phase 1) | `c01_pickup/out.jsonl` | đạt | sha256 6c6cadcb3025 |
| c02_deposit_light | [Ticket-03] Nạp đủ 10 đom đóm vào đèn chưa từng sáng thì thắp (relight=false); +5 mỗi đom đóm nạp, +100 thắp đầu | `c02_deposit_light/out.jsonl` | đạt | sha256 e7118132a281 |
| c03_partial_deposit_remembers | Đèn nhớ tiến độ: nạp thêm vào đèn đã có 4, không thắp khi chưa đủ 10; +5 mỗi đom đóm | `c03_partial_deposit_remembers/out.jsonl` | đạt | sha256 7ccdfda88e9e |
| c04_dawn_win_three_lit | [Ticket-03] Thắng khi còn sống lúc bình minh và đủ 3/5 đèn sáng (dawn_survived); thưởng mỗi đèn 50+floor(fuel), mỗi lửa 50, không thưởng thời gian | `c04_dawn_win_three_lit/out.jsonl` | đạt | sha256 f78603e59181 |
| c05_lose_no_flames | Hết Ngọn Lửa thì thua (no_flames) | `c05_lose_no_flames/out.jsonl` | đạt | sha256 fc59eea90def |
| c06_hit_drop_invuln_recoil | Bị chạm: −1 flame, rơi floor(mang/2) quanh Mây (dropped, TTL), bất tử 90 tick, Bóng Mực lùi (recoil) | `c06_hit_drop_invuln_recoil/out.jsonl` | đạt | sha256 0e325d5e7a63 |
| c06b_recoil_distance | Bóng Mực gây hit lùi đúng 2 m trong 60 tick rồi đuổi lại | `c06b_recoil_distance/out.jsonl` | đạt | sha256 c98db4cdc3a9 |
| c07_pulse_stun_push | Tỏa Sáng: −3 đom đóm, choáng đúng 120 tick, đẩy 4 m trong 15 tick, +5 điểm, hồi chiêu 3 s | `c07_pulse_stun_push/out.jsonl` | đạt | sha256 35d6ceb9b625 |
| c08_pulse_refresh | Pulse lại làm mới choáng và đẩy lùi, tính điểm mỗi lần, kể cả con đang choáng | `c08_pulse_refresh/out.jsonl` | đạt | sha256 b43a2a12866b |
| c09_pulse_needs_light_and_cooldown | Không đủ 3 đom đóm thì không kích hoạt; đang hồi chiêu (3 s) thì không kích hoạt | `c09_pulse_needs_light_and_cooldown/out.jsonl` | đạt | sha256 6a81d6eb6826 |
| c09b_pulse_cooldown | Bấm Tỏa Sáng khi còn hồi chiêu thì bị bỏ qua | `c09b_pulse_cooldown/out.jsonl` | đạt | sha256 a43fac2677c0 |
| c10_safe_radius | Bóng Mực không vào vùng an toàn 6 m quanh đèn đã sáng (bị chặn ở mép) | `c10_safe_radius/out.jsonl` | đạt | sha256 c0da63b5a9c8 |
| c11_safe_push_on_light | Đèn vừa thắp: Bóng Mực bên trong bị đẩy ra mép trong ≤ 30 tick và không gây sát thương trong lúc đó | `c11_safe_push_on_light/out.jsonl` | đạt | sha256 b285f771ca73 |
| c12_dawn | Hết giờ thì thua (dawn); --ticks dừng khi game kết thúc | `c12_dawn/out.jsonl` | đạt | sha256 1ec9fd3283c8 |
| c13_no_early_win_all_lit | [Ticket-03] Thắp đủ đèn không kết thúc Đêm: game_over chỉ ở bình minh | `c13_no_early_win_all_lit/out.jsonl` | đạt | sha256 f41c03cb1bcc |
| c14_scenario_no_score | Dựng scenario không phát sự kiện, không cộng điểm (đèn lit:true) | `c14_scenario_no_score/out.jsonl` | đạt | sha256 fae8d6fd353d |
| c15_random_deterministic | Cùng seed + scenario + inputs => output giống hệt (kể cả id tự sinh); seed khác thì khác | `c15_random_deterministic/out.jsonl` | đạt | sha256 83d0e7501cf5; chạy lần 2 GIỐNG HỆT |
| c16_move_stop_normalize_yaw | Chạy 6 m/s, move [1,1] được chuẩn hóa, dừng ngay (≤ 0.1 s), cam_yaw_deg xoay hướng | `c16_move_stop_normalize_yaw/out.jsonl` | đạt | sha256 de738a5f4f9d |
| c16b_cam_yaw | cam_yaw_deg=90, move [0,1] -> đi theo +X (công thức xoay trong contract) | `c16b_cam_yaw/out.jsonl` | đạt | sha256 b99500f5f8c5 |
| c17_jump_grounded_only | Nhảy 7 m/s, chỉ nhảy khi chạm đất (bấm khi đang bay bị bỏ qua) | `c17_jump_grounded_only/out.jsonl` | đạt | sha256 aa814d1571c6 |
| c18_dash | Lướt 14 m/s trong 0.2 s theo hướng mặt khi đứng yên, hồi chiêu 1.5 s tính từ lúc bắt đầu, bấm khi hồi chiêu bị bỏ qua | `c18_dash/out.jsonl` | đạt | sha256 290f18b9f083 |
| c18c_dash_cooldown_boundary | Hồi chiêu lướt đúng 90 tick: bấm ở k=89 thì chưa được | `c18c_dash_cooldown_boundary/out.jsonl` | đạt | sha256 5332c3b72cae |
| c18d_dash_cooldown_exact | Bấm lướt đúng lúc hết hồi chiêu (k=90) thì lướt ở tick 91 | `c18d_dash_cooldown_exact/out.jsonl` | đạt | sha256 3a5a39513b75 |
| c18b_dash_air_keeps_height | Lướt trên không giữ nguyên độ cao | `c18b_dash_air_keeps_height/out.jsonl` | đạt | sha256 7351e21d4db9 |
| c19_fall_respawn | Rơi khỏi đảo (Y < −10): đúng 1 lần, −1 flame, mất hết đom đóm, chờ 60 tick rồi hồi sinh bất tử 90 tick tại điểm xuất phát | `c19_fall_respawn/out.jsonl` | đạt | sha256 e8994b4eac07 |
| c20_fall_last_flame | Rơi khi còn 1 Ngọn Lửa thì thua ngay (no_flames), không hồi sinh | `c20_fall_last_flame/out.jsonl` | đạt | sha256 8fc5012866e0 |
| c21_pad_night2 | Đêm 2, bục nhảy (20,0,18): bắn Y 14 m/s, ngang 24 m/s về đảo B, phím di chuyển không ghi đè, đáp trong đảo đích | `c21_pad_night2/out.jsonl` | đạt | sha256 d788a1a55f0b |
| c22_pad_night3_tier2 | Đêm 3, bục (0,3,13): bắn Y 12, ngang 8 hướng −Z, đáp lên tầng 2 (Y=6) | `c22_pad_night3_tier2/out.jsonl` | đạt | sha256 aa84bbd11b75 |
| c23_ramp_climb | Đêm 3: đi lên dốc 30° từ Y=0 tới tầng 1 (Y=3) | `c23_ramp_climb/out.jsonl` | đạt | sha256 f21253eaa338 |
| c24_cliff_blocks | Đêm 3: vách đứng của tầng 1 không đi lên được | `c24_cliff_blocks/out.jsonl` | đạt | sha256 cb1f2de7d4c7 |
| c25_tower_blocks | Đêm 3: tháp chuông (trụ r=2) không leo được | `c25_tower_blocks/out.jsonl` | đạt | sha256 4a2a08b914b6 |
| c26_step_off_tier | Đêm 3: bước ra mép tầng thì rơi xuống tầng dưới (không phạt rơi khỏi đảo) | `c26_step_off_tier/out.jsonl` | đạt | sha256 7d9d5371e5a0 |
| c27_mote_schedule | Đêm 1: 20 đom đóm tại 20 điểm khác nhau; +1 mỗi 240 tick tại điểm trống; hết điểm (24) thì bỏ lượt | `c27_mote_schedule/out.jsonl` | đạt | sha256 4432a4093980 |
| c27b_mote_not_early | Chưa sinh thêm đom đóm trước tick 240 | `c27b_mote_not_early/out.jsonl` | đạt | sha256 3c772dd7047c |
| c28_dropped_ttl | Đom đóm rơi tồn tại 480 tick rồi biến mất | `c28_dropped_ttl/out.jsonl` | đạt | sha256 d03050d51144 |
| c29_charm | Bùa Gió: nhặt → charm_picked, hiệu lực 600 tick, hồi bùa 2700 tick | `c29_charm/out.jsonl` | đạt | sha256 1c9347d8403d |
| c29b_charm_respawn_exact | Bùa xuất hiện lại đúng sau 2700 tick (có ở tick 2701) | `c29b_charm_respawn_exact/out.jsonl` | đạt | sha256 a812944f4593 |
| c29c_charm_not_early | Bùa chưa xuất hiện lại ở tick 2700 | `c29c_charm_not_early/out.jsonl` | đạt | sha256 7db8b40ec7c2 |
| c30_charm_speed_dash | Có bùa: chạy 7.2 m/s, lướt không hồi chiêu (vẫn phải nhấn lại) | `c30_charm_speed_dash/out.jsonl` | đạt | sha256 5c72cea855c1 |
| c31_wind_night3 | Đêm 3: gió 5 s mỗi 30 s đẩy Mây 2 m/s theo dir_deg; snapshot wind {active, dir_deg} | `c31_wind_night3/out.jsonl` | đạt | sha256 abae662232b1 |
| c32_shade_schedule | Đêm 1: 2 Bóng Mực tại tick 300 (id S1,S2), rồi 1 con mỗi 480 tick; ban đầu ở spawning | `c32_shade_schedule/out.jsonl` | đạt | sha256 69ec692b8582 |
| c33_shade_cap | Đêm 1: tối đa 6 Bóng Mực | `c33_shade_cap/out.jsonl` | đạt | sha256 082824c0378b |
| c34_detect_giveup | Phát hiện 12 m, bỏ đuổi 18 m (chase giữa 12–18 vẫn giữ) | `c34_detect_giveup/out.jsonl` | đạt | sha256 ef93415224d1 |
| c35_shade_speed_per_night | Bóng Mực 4.0 m/s (Đêm 1) | `c35_shade_speed_per_night/out.jsonl` | đạt | sha256 4600266cb71d |
| c35b_shade_speed_night3 | Bóng Mực 4.5 m/s (Đêm 3) | `c35b_shade_speed_night3/out.jsonl` | đạt | sha256 feb3349372f2 |
| c36_spawning_harmless | Bóng Mực đang spawning không gây hại; chuyển wander sau 30 tick | `c36_spawning_harmless/out.jsonl` | đạt | sha256 a521f0e27682 |
| c37_invulnerable_no_effect | Bóng chạm lúc Mây bất tử không làm gì (không recoil, không mất lửa) | `c37_invulnerable_no_effect/out.jsonl` | đạt | sha256 a5156ef19f33 |
| c38_one_hit_per_tick | Tối đa 1 lần mất Ngọn Lửa mỗi tick; xét theo id tăng dần | `c38_one_hit_per_tick/out.jsonl` | đạt | sha256 3ada8510cb61 |
| c39_pulse_3d_range | Tỏa Sáng chỉ trúng Bóng Mực trong 5 m (3D tới tâm = chân + 0.8) | `c39_pulse_3d_range/out.jsonl` | đạt | sha256 6c7961098591 |
| c40_win_priority | Sau mỗi tick: hết Ngọn Lửa luôn thua (no_flames), kể cả khi tất cả đèn đã sáng | `c40_win_priority/out.jsonl` | đạt | sha256 402d79f49e9f |
| c41_drifter_steal_flee | Gió Lạc: idle→chase khi mang ≥5 và ≤15 m; chạm ≤1.2 m cướp min(3, mang); flee 240 tick rồi biến mất | `c41_drifter_steal_flee/out.jsonl` | đạt | sha256 489eb34e4cc4 |
| c42_drifter_idle | Mang < 5 hoặc xa > 15 m thì Gió Lạc không đuổi | `c42_drifter_idle/out.jsonl` | đạt | sha256 58784c148c79 |
| c43_pulse_drifter_chase | Tỏa Sáng trúng Gió Lạc đang chase: chuyển flee, không cướp | `c43_pulse_drifter_chase/out.jsonl` | đạt | sha256 0189f25137a3 |
| c44_pulse_drifter_drop | Tỏa Sáng trúng Gió Lạc đang flee có đồ: drifter_drop, thành đom đóm rơi, nó biến mất sau 120 tick | `c44_pulse_drifter_drop/out.jsonl` | đạt | sha256 2611c57d9c60 |
| c45_drifter_schedule | Đêm 2: Gió Lạc sinh tại tick 1200, 2400 (tối đa 2), id D1, D2 | `c45_drifter_schedule/out.jsonl` | đạt | sha256 05fbe85e6462 |
| c45b_drifter_not_early | Gió Lạc chưa xuất hiện trước tick 1200 | `c45b_drifter_not_early/out.jsonl` | đạt | sha256 cefac44553d1 |
| c46_pause | Tạm dừng: tick tăng, sim_tick/thời gian/vị trí đứng yên, snapshot state=paused, sự kiện paused/resumed | `c46_pause/out.jsonl` | đạt | sha256 a11268057fc1 |
| c47_night1_layout | Đêm 1: 5 đèn ở tọa độ chuẩn, 240 s, xuất phát (0,0,0), điểm đom đóm theo 8+16 điểm chuẩn, night_start | `c47_night1_layout/out.jsonl` | đạt | sha256 953dd771c446 |
| c48_night2_layout | Đêm 2: 6 đèn chuẩn (id L1–L6), 270 s, hai đảo, bùa C1 ở (35,0,0), điểm đom đóm 4+8 mỗi đảo | `c48_night2_layout/out.jsonl` | đạt | sha256 575e57b3fb2b |
| c49_night3_layout | Đêm 3: 7 đèn chuẩn (L1 trên tầng 2), 300 s, 2 bùa, 30 điểm đom đóm ba tầng, gió bật | `c49_night3_layout/out.jsonl` | đạt | sha256 e509b8b13841 |
| c50_scenario_replaces_lists | Scenario: mảng drifters, charms thay thế danh sách mặc định; random_*:false tắt sinh | `c50_scenario_replaces_lists/out.jsonl` | đạt | sha256 fc1466a0386c |
| c51_fuel_decay | Đèn đang sáng hao 1.0/giây (1/60 mỗi tick) | `c51_fuel_decay/out.jsonl` | đạt | sha256 ba709cfe538f |
| c52_fuel_out_exact | Hết dầu đúng tick 6000: đèn tắt, deposited=0, ever_lit=true, lantern_out | `c52_fuel_out_exact/out.jsonl` | đạt | sha256 017dfb655c33 |
| c53_fuel_scenario_and_out_soon | Scenario fuel nhỏ: đèn tắt ngay sau bước 2 khi fuel ≤ 0 (fuel 0.05 = 3 đơn vị → tắt ở tick 3); lit:true không ghi fuel mặc định 100 | `c53_fuel_scenario_and_out_soon/out.jsonl` | đạt | sha256 b79e14fef66c |
| c54a_refuel_formula | Châm dầu: used = min(mang, ceil((100−fuel)/10)), fuel = min(100, fuel+10×used) (ceil((100−54.98)/10)=5) | `c54a_refuel_formula/out.jsonl` | đạt | sha256 dfc716e997f9 |
| c54b_refuel_formula | Châm dầu: used = min(mang, ceil((100−fuel)/10)), fuel = min(100, fuel+10×used) (đèn đã hao 1 đơn vị ở bước 2 nên cần ceil(1.0017)=2) | `c54b_refuel_formula/out.jsonl` | đạt | sha256 5827af2428e0 |
| c54c_refuel_formula | Châm dầu: used = min(mang, ceil((100−fuel)/10)), fuel = min(100, fuel+10×used) (mang ít hơn cần: used = min(mang, cần)) | `c54c_refuel_formula/out.jsonl` | đạt | sha256 0e38e69bf12d |
| c54d_refuel_formula | Châm dầu: used = min(mang, ceil((100−fuel)/10)), fuel = min(100, fuel+10×used) (ceil(0.45)=1) | `c54d_refuel_formula/out.jsonl` | đạt | sha256 b399e04a3b48 |
| c55_refuel_picks_nearest_receivable | Chọn đèn nhận được gần nhất (chưa sáng, hoặc sáng chưa đầy); gần hơn thì được chọn dù là đèn tắt | `c55_refuel_picks_nearest_receivable/out.jsonl` | đạt | sha256 7d2c3282ce32 |
| c55b_refuel_picks_lit_when_nearer | Đèn sáng chưa đầy gần hơn đèn tắt thì được châm dầu | `c55b_refuel_picks_lit_when_nearer/out.jsonl` | đạt | sha256 90a2ef830a36 |
| c56_relight_cost_5 | Đèn từng sáng (ever_lit) chỉ cần 5 đom đóm để thắp lại: relight=true, fuel 100, relit_count+1, +5/đom đóm +40, sức chứa tăng | `c56_relight_cost_5/out.jsonl` | đạt | sha256 d743ecc9216b |
| c56b_first_light_needs_10 | Đèn chưa từng sáng vẫn cần 10: nạp 5 thì chưa thắp | `c56b_first_light_needs_10/out.jsonl` | đạt | sha256 b87340b187fa |
| c57_out_resets_deposit_then_relight | Đèn tắt: deposited=0 (nhớ tiến độ cũ bị xóa), thắp lại cần đủ 5 mới sáng lại | `c57_out_resets_deposit_then_relight/out.jsonl` | đạt | sha256 859c6bbcf046 |
| c58_capacity_growth | Sức chứa = 10 + 2×successful_lights, tối đa 20; nhặt dừng ở sức chứa; đèn đặt sẵn bằng scenario không tính | `c58_capacity_growth/out.jsonl` | đạt | sha256 172698cbaab0 |
| c58b_capacity_levels | capacity: 10 (0 lần), 18 (4 lần), 20 (6 lần, kẹp tối đa); đèn lit:true trong scenario không tăng sức chứa | `c58b_capacity_levels/out.jsonl` | đạt | sha256 df2ca70facfe |
| c58c_capacity_clamp | capacity kẹp ở 20 | `c58c_capacity_clamp/out.jsonl` | đạt | sha256 16865d579ee1 |
| c58d_capacity_base | capacity mặc định 10, đèn đặt sẵn không tính | `c58d_capacity_base/out.jsonl` | đạt | sha256 a340b2237e99 |
| c59_safe_zone_boundary_30 | Đèn có fuel đúng 30 vẫn còn vùng an toàn; xuống dưới 30 thì mất (kiểm biên từng tick) | `c59_safe_zone_boundary_30/out.jsonl` | đạt | sha256 6ec6c25daee8 |
| c60_weak_lantern_no_safe_zone | Đèn fuel 20 không có vùng an toàn: Bóng Mực tới sát Mây và gây sát thương | `c60_weak_lantern_no_safe_zone/out.jsonl` | đạt | sha256 4e87c2610d20 |
| c61_wander_targets_weak_lantern | Bóng Mực wander đi tới đèn yếu (fuel < 30) gần nhất, không phải đèn tắt gần nhất | `c61_wander_targets_weak_lantern/out.jsonl` | đạt | sha256 01ba760738f6 |
| c62_wander_goes_to_unlit_and_holds | Không có đèn yếu: đi tới đèn tắt gần nhất ('như trước'), dừng cách 2.0 m, vẫn wander | `c62_wander_goes_to_unlit_and_holds/out.jsonl` | đạt | sha256 a06bc88a48cb |
| c63_drain_rate_arrival_events | Tới đèn yếu ≤ 2 m: drain, đứng yên, hút 5/s (cộng hao 1/s = 6/s); fuel_drain mỗi 60 tick; đèn tắt thì Bóng về wander | `c63_drain_rate_arrival_events/out.jsonl` | đạt | sha256 106d6433391e |
| c64_drain_stacks | Nhiều Bóng Mực hút cộng dồn: 2 con + hao = 11 fuel/s; mỗi con phát fuel_drain | `c64_drain_stacks/out.jsonl` | đạt | sha256 40f19c878023 |
| c65_drain_exit_chase | drain → chase khi Mây vào trong 6 m | `c65_drain_exit_chase/out.jsonl` | đạt | sha256 4620eed80bde |
| c65b_drain_exit_far | drain → wander khi cách đèn > 2 m | `c65b_drain_exit_far/out.jsonl` | đạt | sha256 df4a98ae8d2a |
| c61b_weak_boundary_30 | Đèn yếu là fuel < 30 nghiêm ngặt: đèn đúng 30 chưa bị chọn làm đích (đi tới đèn tắt), xuống dưới 30 thì bị chọn | `c61b_weak_boundary_30/out.jsonl` | đạt | sha256 2fe092d1a6c1 |
| c65c_drain_exit_refilled | drain → wander khi fuel ≥ 30 (đèn đã được châm đủ, không qua tương tác trong tick) | `c65c_drain_exit_refilled/out.jsonl` | đạt | sha256 7d2f21bf5763 |
| c66_refuel_above_30_pushes_shades | Châm dầu lên ≥ 30 lúc Bóng Mực trong 6 m: drain → wander, bị đẩy ra mép ≤ 30 tick, không gây sát thương | `c66_refuel_above_30_pushes_shades/out.jsonl` | đạt | sha256 e23a67848426 |
| c67_pulse_drain_bonus | Tỏa Sáng trúng Bóng đang drain: tổng +15 (thay vì +5), trúng con khác +5; drain → stunned | `c67_pulse_drain_bonus/out.jsonl` | đạt | sha256 498bcfe94b8d |
| c68_stun_end_wander | Hết choáng về wander (rồi mới tự chuyển chase nếu Mây trong 12 m) | `c68_stun_end_wander/out.jsonl` | đạt | sha256 9fd5e4ee6a3c |
| c69a_win_threshold_n1_2lit | Bình minh: 2 đèn sáng → lost (Đêm 1 cần 3/5) | `c69a_win_threshold_n1_2lit/out.jsonl` | đạt | sha256 088ac4191daa |
| c69b_win_threshold_n2_3lit | Bình minh: 3 đèn sáng → lost (Đêm 2 cần 4/6) | `c69b_win_threshold_n2_3lit/out.jsonl` | đạt | sha256 9d1d7217b0b9 |
| c69c_win_threshold_n2_4lit | Bình minh: 4 đèn sáng → won (Đêm 2 cần 4/6) | `c69c_win_threshold_n2_4lit/out.jsonl` | đạt | sha256 24b8ce9c406b |
| c69d_win_threshold_n3_4lit | Bình minh: 4 đèn sáng → lost (Đêm 3 cần 5/7) | `c69d_win_threshold_n3_4lit/out.jsonl` | đạt | sha256 ee691173a6db |
| c69e_win_threshold_n3_5lit | Bình minh: 5 đèn sáng → won (Đêm 3 cần 5/7) | `c69e_win_threshold_n3_5lit/out.jsonl` | đạt | sha256 8bde89203f1d |
| c70_last_tick_out_counts | Đèn hết dầu đúng tick bình minh tắt ngay sau bước 2 nên không được tính (2/5 < 3/5 → thua dawn) | `c70_last_tick_out_counts/out.jsonl` | đạt | sha256 999c5e0494b5 |
| c70b_last_tick_still_lit_wins | Còn 1 đơn vị dầu sau bước 2 ở tick cuối thì vẫn sáng và được tính; thưởng floor(fuel) | `c70b_last_tick_still_lit_wins/out.jsonl` | đạt | sha256 d09bec387c5b |
| c71_no_flames_beats_dawn | Hết Ngọn Lửa ở tick bình minh luôn thua no_flames, kể cả khi đủ đèn | `c71_no_flames_beats_dawn/out.jsonl` | đạt | sha256 a963e84bc8e5 |
| c72_pause_stops_fuel | Tạm dừng: dầu không hao (sim đứng yên) | `c72_pause_stops_fuel/out.jsonl` | đạt | sha256 512d85e33c23 |

Tổng: 99/99 đạt.
