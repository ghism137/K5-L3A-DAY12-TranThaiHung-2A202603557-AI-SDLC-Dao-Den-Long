# Bằng chứng Phase 1 (sinh tự động)

Sinh bởi `npm run proof` từ mã ở commit hiện tại. Máy: Windows_NT 10.0.26300, 11th Gen Intel(R) Core(TM) i3-1115G4 @ 3.00GHz, Node v22.22.1.

| Case | Yêu cầu kiểm chứng | Output thật | Kết quả | Ghi chú |
|---|---|---|---|---|
| c01_pickup | Nhặt đom đóm trong 1.0 m: sự kiện mote_picked; điểm chỉ tính khi NẠP (Δ so với Phase 1) | `c01_pickup/out.jsonl` | đạt | sha256 e3a82073c0c8 |
| c02_deposit_light | Nạp đủ 10 đom đóm thì thắp đèn: deposit rồi lantern_lit; +10 mỗi đom đóm nạp, +100 mỗi đèn | `c02_deposit_light/out.jsonl` | đạt | sha256 361db989fbbd |
| c03_partial_deposit_remembers | Đèn nhớ tiến độ: nạp thêm vào đèn đã có 4, không thắp khi chưa đủ 10 | `c03_partial_deposit_remembers/out.jsonl` | đạt | sha256 bd8108d41165 |
| c04_win_all_lit | Thắp hết đèn thì thắng (all_lit); thưởng floor(giây còn lại)×2 + 50×flame còn lại | `c04_win_all_lit/out.jsonl` | đạt | sha256 b02ea4431ad6 |
| c05_lose_no_flames | Hết Ngọn Lửa thì thua (no_flames) | `c05_lose_no_flames/out.jsonl` | đạt | sha256 231cc93d8213 |
| c06_hit_drop_invuln_recoil | Bị chạm: −1 flame, rơi floor(mang/2) quanh Mây (dropped, TTL), bất tử 90 tick, Bóng Mực lùi (recoil) | `c06_hit_drop_invuln_recoil/out.jsonl` | đạt | sha256 2798aab23675 |
| c06b_recoil_distance | Bóng Mực gây hit lùi đúng 2 m trong 60 tick rồi đuổi lại | `c06b_recoil_distance/out.jsonl` | đạt | sha256 b9f7eff66a6a |
| c07_pulse_stun_push | Tỏa Sáng: −3 đom đóm, choáng đúng 120 tick, đẩy 4 m trong 15 tick, +5 điểm, hồi chiêu 3 s | `c07_pulse_stun_push/out.jsonl` | đạt | sha256 e5a0abc1efca |
| c08_pulse_refresh | Pulse lại làm mới choáng và đẩy lùi, tính điểm mỗi lần, kể cả con đang choáng | `c08_pulse_refresh/out.jsonl` | đạt | sha256 f781f8bddcb7 |
| c09_pulse_needs_light_and_cooldown | Không đủ 3 đom đóm thì không kích hoạt; đang hồi chiêu (3 s) thì không kích hoạt | `c09_pulse_needs_light_and_cooldown/out.jsonl` | đạt | sha256 32a1775a6006 |
| c09b_pulse_cooldown | Bấm Tỏa Sáng khi còn hồi chiêu thì bị bỏ qua | `c09b_pulse_cooldown/out.jsonl` | đạt | sha256 aa773d3f430c |
| c10_safe_radius | Bóng Mực không vào vùng an toàn 6 m quanh đèn đã sáng (bị chặn ở mép) | `c10_safe_radius/out.jsonl` | đạt | sha256 994c2bc9734e |
| c11_safe_push_on_light | Đèn vừa thắp: Bóng Mực bên trong bị đẩy ra mép trong ≤ 30 tick và không gây sát thương trong lúc đó | `c11_safe_push_on_light/out.jsonl` | đạt | sha256 2369161a5da7 |
| c12_dawn | Hết giờ thì thua (dawn); --ticks dừng khi game kết thúc | `c12_dawn/out.jsonl` | đạt | sha256 eb53f238cffb |
| c13_win_on_last_tick | Thắng kể cả đúng tick hết giờ (all_lit ưu tiên hơn dawn) | `c13_win_on_last_tick/out.jsonl` | đạt | sha256 0b476f10bc82 |
| c14_scenario_no_score | Dựng scenario không phát sự kiện, không cộng điểm (đèn lit:true) | `c14_scenario_no_score/out.jsonl` | đạt | sha256 96551598552e |
| c15_random_deterministic | Cùng seed + scenario + inputs => output giống hệt (kể cả id tự sinh); seed khác thì khác | `c15_random_deterministic/out.jsonl` | đạt | sha256 0a9b936c9903; chạy lần 2 GIỐNG HỆT |
| c16_move_stop_normalize_yaw | Chạy 6 m/s, move [1,1] được chuẩn hóa, dừng ngay (≤ 0.1 s), cam_yaw_deg xoay hướng | `c16_move_stop_normalize_yaw/out.jsonl` | đạt | sha256 d0d37ba6bb30 |
| c16b_cam_yaw | cam_yaw_deg=90, move [0,1] -> đi theo +X (công thức xoay trong contract) | `c16b_cam_yaw/out.jsonl` | đạt | sha256 3593f161bed0 |
| c17_jump_grounded_only | Nhảy 7 m/s, chỉ nhảy khi chạm đất (bấm khi đang bay bị bỏ qua) | `c17_jump_grounded_only/out.jsonl` | đạt | sha256 d0d999fab50c |
| c18_dash | Lướt 14 m/s trong 0.2 s theo hướng mặt khi đứng yên, hồi chiêu 1.5 s tính từ lúc bắt đầu, bấm khi hồi chiêu bị bỏ qua | `c18_dash/out.jsonl` | đạt | sha256 025fe1569774 |
| c18c_dash_cooldown_boundary | Hồi chiêu lướt đúng 90 tick: bấm ở k=89 thì chưa được | `c18c_dash_cooldown_boundary/out.jsonl` | đạt | sha256 fe08fa74ec58 |
| c18d_dash_cooldown_exact | Bấm lướt đúng lúc hết hồi chiêu (k=90) thì lướt ở tick 91 | `c18d_dash_cooldown_exact/out.jsonl` | đạt | sha256 8f5e3dcea1f3 |
| c18b_dash_air_keeps_height | Lướt trên không giữ nguyên độ cao | `c18b_dash_air_keeps_height/out.jsonl` | đạt | sha256 502e75da931f |
| c19_fall_respawn | Rơi khỏi đảo (Y < −10): đúng 1 lần, −1 flame, mất hết đom đóm, chờ 60 tick rồi hồi sinh bất tử 90 tick tại điểm xuất phát | `c19_fall_respawn/out.jsonl` | đạt | sha256 c542205679c0 |
| c20_fall_last_flame | Rơi khi còn 1 Ngọn Lửa thì thua ngay (no_flames), không hồi sinh | `c20_fall_last_flame/out.jsonl` | đạt | sha256 fe34d2ae878f |
| c21_pad_night2 | Đêm 2, bục nhảy (20,0,18): bắn Y 14 m/s, ngang 24 m/s về đảo B, phím di chuyển không ghi đè, đáp trong đảo đích | `c21_pad_night2/out.jsonl` | đạt | sha256 bb242a5c5e94 |
| c22_pad_night3_tier2 | Đêm 3, bục (0,3,13): bắn Y 12, ngang 8 hướng −Z, đáp lên tầng 2 (Y=6) | `c22_pad_night3_tier2/out.jsonl` | đạt | sha256 58e2651a7adc |
| c23_ramp_climb | Đêm 3: đi lên dốc 30° từ Y=0 tới tầng 1 (Y=3) | `c23_ramp_climb/out.jsonl` | đạt | sha256 ad5bc65bcaa0 |
| c24_cliff_blocks | Đêm 3: vách đứng của tầng 1 không đi lên được | `c24_cliff_blocks/out.jsonl` | đạt | sha256 afb68300aedc |
| c25_tower_blocks | Đêm 3: tháp chuông (trụ r=2) không leo được | `c25_tower_blocks/out.jsonl` | đạt | sha256 1f50d74db6e4 |
| c26_step_off_tier | Đêm 3: bước ra mép tầng thì rơi xuống tầng dưới (không phạt rơi khỏi đảo) | `c26_step_off_tier/out.jsonl` | đạt | sha256 1c45449e3865 |
| c27_mote_schedule | Đêm 1: 20 đom đóm tại 20 điểm khác nhau; +1 mỗi 240 tick tại điểm trống; hết điểm (24) thì bỏ lượt | `c27_mote_schedule/out.jsonl` | đạt | sha256 af8562e3ed44 |
| c27b_mote_not_early | Chưa sinh thêm đom đóm trước tick 240 | `c27b_mote_not_early/out.jsonl` | đạt | sha256 61b9d2cbc0f7 |
| c28_dropped_ttl | Đom đóm rơi tồn tại 480 tick rồi biến mất | `c28_dropped_ttl/out.jsonl` | đạt | sha256 d1ad5a82c572 |
| c29_charm | Bùa Gió: nhặt → charm_picked, hiệu lực 600 tick, hồi bùa 2700 tick | `c29_charm/out.jsonl` | đạt | sha256 5576bf67234a |
| c29b_charm_respawn_exact | Bùa xuất hiện lại đúng sau 2700 tick (có ở tick 2701) | `c29b_charm_respawn_exact/out.jsonl` | đạt | sha256 bfe240b58c5c |
| c29c_charm_not_early | Bùa chưa xuất hiện lại ở tick 2700 | `c29c_charm_not_early/out.jsonl` | đạt | sha256 5b09b83c817f |
| c30_charm_speed_dash | Có bùa: chạy 7.2 m/s, lướt không hồi chiêu (vẫn phải nhấn lại) | `c30_charm_speed_dash/out.jsonl` | đạt | sha256 8fa597729c67 |
| c31_wind_night3 | Đêm 3: gió 5 s mỗi 30 s đẩy Mây 2 m/s theo dir_deg; snapshot wind {active, dir_deg} | `c31_wind_night3/out.jsonl` | đạt | sha256 13f07ec96e12 |
| c32_shade_schedule | Đêm 1: 2 Bóng Mực tại tick 300 (id S1,S2), rồi 1 con mỗi 480 tick; ban đầu ở spawning | `c32_shade_schedule/out.jsonl` | đạt | sha256 244d15e6fa89 |
| c33_shade_cap | Đêm 1: tối đa 6 Bóng Mực | `c33_shade_cap/out.jsonl` | đạt | sha256 56904a8a2fb7 |
| c34_detect_giveup | Phát hiện 12 m, bỏ đuổi 18 m (chase giữa 12–18 vẫn giữ) | `c34_detect_giveup/out.jsonl` | đạt | sha256 1416f0eb8f16 |
| c35_shade_speed_per_night | Bóng Mực 4.0 m/s (Đêm 1) | `c35_shade_speed_per_night/out.jsonl` | đạt | sha256 14955b4364a7 |
| c35b_shade_speed_night3 | Bóng Mực 4.5 m/s (Đêm 3) | `c35b_shade_speed_night3/out.jsonl` | đạt | sha256 ecb137afb78c |
| c36_spawning_harmless | Bóng Mực đang spawning không gây hại; chuyển wander sau 30 tick | `c36_spawning_harmless/out.jsonl` | đạt | sha256 8a5aae8b63f6 |
| c37_invulnerable_no_effect | Bóng chạm lúc Mây bất tử không làm gì (không recoil, không mất lửa) | `c37_invulnerable_no_effect/out.jsonl` | đạt | sha256 bc67fd2b74a3 |
| c38_one_hit_per_tick | Tối đa 1 lần mất Ngọn Lửa mỗi tick; xét theo id tăng dần | `c38_one_hit_per_tick/out.jsonl` | đạt | sha256 04810a650516 |
| c39_pulse_3d_range | Tỏa Sáng chỉ trúng Bóng Mực trong 5 m (3D tới tâm = chân + 0.8) | `c39_pulse_3d_range/out.jsonl` | đạt | sha256 d87da5acb8cd |
| c40_win_priority | Sau mỗi tick: hết Ngọn Lửa luôn thua (no_flames), kể cả khi tất cả đèn đã sáng | `c40_win_priority/out.jsonl` | đạt | sha256 fc4da276a581 |
| c41_drifter_steal_flee | Gió Lạc: idle→chase khi mang ≥5 và ≤15 m; chạm ≤1.2 m cướp min(3, mang); flee 240 tick rồi biến mất | `c41_drifter_steal_flee/out.jsonl` | đạt | sha256 ca1bf0d2ccef |
| c42_drifter_idle | Mang < 5 hoặc xa > 15 m thì Gió Lạc không đuổi | `c42_drifter_idle/out.jsonl` | đạt | sha256 ed973b686de6 |
| c43_pulse_drifter_chase | Tỏa Sáng trúng Gió Lạc đang chase: chuyển flee, không cướp | `c43_pulse_drifter_chase/out.jsonl` | đạt | sha256 47eac213e2be |
| c44_pulse_drifter_drop | Tỏa Sáng trúng Gió Lạc đang flee có đồ: drifter_drop, thành đom đóm rơi, nó biến mất sau 120 tick | `c44_pulse_drifter_drop/out.jsonl` | đạt | sha256 963181cfc2ec |
| c45_drifter_schedule | Đêm 2: Gió Lạc sinh tại tick 1200, 2400 (tối đa 2), id D1, D2 | `c45_drifter_schedule/out.jsonl` | đạt | sha256 43a402de556b |
| c45b_drifter_not_early | Gió Lạc chưa xuất hiện trước tick 1200 | `c45b_drifter_not_early/out.jsonl` | đạt | sha256 05ce7108e3b7 |
| c46_pause | Tạm dừng: tick tăng, sim_tick/thời gian/vị trí đứng yên, snapshot state=paused, sự kiện paused/resumed | `c46_pause/out.jsonl` | đạt | sha256 42a702d7241b |
| c47_night1_layout | Đêm 1: 5 đèn ở tọa độ chuẩn, 300 s, xuất phát (0,0,0), điểm đom đóm theo 8+16 điểm chuẩn, night_start | `c47_night1_layout/out.jsonl` | đạt | sha256 67698af036bb |
| c48_night2_layout | Đêm 2: 6 đèn chuẩn (id L1–L6), 330 s, hai đảo, bùa C1 ở (35,0,0), điểm đom đóm 4+8 mỗi đảo | `c48_night2_layout/out.jsonl` | đạt | sha256 f6395e58849e |
| c49_night3_layout | Đêm 3: 7 đèn chuẩn (L1 trên tầng 2), 360 s, 2 bùa, 30 điểm đom đóm ba tầng, gió bật | `c49_night3_layout/out.jsonl` | đạt | sha256 26c28685ee95 |
| c50_scenario_replaces_lists | Scenario: mảng drifters, charms thay thế danh sách mặc định; random_*:false tắt sinh | `c50_scenario_replaces_lists/out.jsonl` | đạt | sha256 43ba21a8fdc8 |

Tổng: 61/61 đạt.
