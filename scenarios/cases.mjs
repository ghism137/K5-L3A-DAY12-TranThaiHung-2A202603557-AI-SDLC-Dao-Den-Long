// Bộ scenario headless (Contract v1.1, số chuẩn Ticket-02). Mỗi case: yêu cầu nào, đầu vào, kiểm tra gì.
// Dùng chung cho tests/scenarios.test.js và scripts/proof.mjs. check(o) nhận { events, snaps, end } và trả về mảng lỗi (rỗng = đạt).
// c01–c15 là các case Phase 1 đã được cập nhật theo số chuẩn (lý do trong docs/notes/cp2-checklist.md).

// Môi trường cô lập: không sinh ngẫu nhiên, không gió, không đom đóm/Bóng Mực/Gió Lạc/bùa mặc định.
const mk = (extra = {}) => ({ random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [], ...extra });
const pl = (pos, extra = {}) => ({ pos, carried: 0, flames: 3, ...extra });
const mv = (tick, move, extra = {}) => ({ tick, move, ...extra });

const ev = (o, name) => o.events.filter((e) => e.name === name);
const gameEvents = (o) => o.events.filter((e) => e.name !== "night_start"); // night_start tự phát ở tick 1, không tính vào các kiểm tra "không có sự kiện"
const snap = (o, t) => o.snaps.find((s) => s.tick === t);
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const polar = (cx, cz, r, deg, y = 0) => [cx + r * Math.cos((deg * Math.PI) / 180), y, cz + r * Math.sin((deg * Math.PI) / 180)];
const ringPts = (cx, cz, r, start, step, n, y = 0) => Array.from({ length: n }, (_, i) => polar(cx, cz, r, start + i * step, y));
const inSet = (pos, pts, eps = 0.01) => pts.some((p) => Math.hypot(pos[0] - p[0], pos[1] - p[1], pos[2] - p[2]) <= eps);

const win1 = {
  // Đêm 1, 4 đèn sáng, L5 ngay cạnh Mây còn thiếu 1 đom đóm
  lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", pos: [0, 0, 1.5], deposited: 9 }],
};

export const cases = [
  // ---------------- Phase 1 (đã cập nhật theo số chuẩn) ----------------
  {
    name: "c01_pickup",
    req: "Nhặt đom đóm trong 1.0 m: sự kiện mote_picked; điểm chỉ tính khi NẠP (Δ so với Phase 1)",
    seed: 1, ticks: 60,
    scenario: mk({ player: pl([0, 0, 0]), motes: [[0, 0, 5]] }),
    inputs: { frames: [mv(0, [0, 1])] },
    check(o) {
      const e = ev(o, "mote_picked");
      const errs = [];
      if (e.length !== 1) return [`mong 1 mote_picked, có ${e.length}`];
      if (e[0].data.carried !== 1) errs.push("carried phải là 1");
      if (e[0].tick < 40 || e[0].tick > 41) errs.push(`tick nhặt ${e[0].tick} ngoài 40..41 (bán kính 1.0 m)`);
      if (o.end.score !== 0) errs.push(`điểm ${o.end.score} != 0 (chưa nạp)`);
      return errs;
    },
  },
  {
    name: "c02_deposit_light",
    req: "[Ticket-03] Nạp đủ 10 đom đóm vào đèn chưa từng sáng thì thắp (relight=false); +5 mỗi đom đóm nạp, +100 thắp đầu",
    seed: 1, ticks: 5,
    scenario: mk({ player: pl([0, 0, 24], { carried: 10 }) }),
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check(o) {
      const errs = [];
      const d = ev(o, "deposit")[0];
      if (!d || d.data.lantern_id !== "L1" || d.data.amount !== 10 || d.data.deposited !== 10) errs.push("deposit sai");
      const names = gameEvents(o).map((e) => e.name).join(",");
      if (names !== "deposit,lantern_lit") errs.push(`thứ tự sự kiện: ${names}`);
      if (ev(o, "lantern_lit")[0]?.data.relight !== false) errs.push("lantern_lit.relight phải là false");
      if (o.end.score !== 150) errs.push(`điểm ${o.end.score} != 150 (10×5 + 100)`);
      if (o.end.state !== "playing") errs.push("không còn thắng sớm: state phải là playing");
      return errs;
    },
  },
  {
    name: "c03_partial_deposit_remembers",
    req: "Đèn nhớ tiến độ: nạp thêm vào đèn đã có 4, không thắp khi chưa đủ 10; +5 mỗi đom đóm",
    seed: 1, ticks: 5,
    scenario: mk({ player: pl([0, 0, 24], { carried: 3 }), lanterns: [{ id: "L1", deposited: 4 }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(o) {
      const d = ev(o, "deposit")[0];
      const errs = [];
      if (!d || d.data.amount !== 3 || d.data.deposited !== 7) errs.push("deposit phải là amount 3, deposited 7");
      if (ev(o, "lantern_lit").length) errs.push("không được thắp");
      if (o.end.score !== 15) errs.push(`điểm ${o.end.score} != 15`);
      return errs;
    },
  },
  {
    name: "c04_dawn_win_three_lit",
    req: "[Ticket-03] Thắng khi còn sống lúc bình minh và đủ 3/5 đèn sáng (dawn_survived); thưởng mỗi đèn 50+floor(fuel), mỗi lửa 50, không thưởng thời gian",
    seed: 1, ticks: 100,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }], player: pl([0, 0, 0]), time_left_s: 1 }),
    check(o) {
      const go = ev(o, "game_over")[0];
      const errs = [];
      if (!go || go.data.result !== "won" || go.data.reason !== "dawn_survived") errs.push("thiếu game_over won dawn_survived");
      if (o.end.ticks !== 60) errs.push(`end.ticks ${o.end.ticks} != 60`);
      // 3 đèn × (50 + floor(99)) + 3 lửa × 50
      if (o.end.score !== 597) errs.push(`điểm ${o.end.score} != 597`);
      return errs;
    },
  },
  {
    name: "c05_lose_no_flames",
    req: "Hết Ngọn Lửa thì thua (no_flames)",
    seed: 1, ticks: 20,
    scenario: mk({ player: pl([0, 0, 0], { flames: 1 }), shades: [{ pos: [0.5, 0, 0], state: "chase" }] }),
    check(o) {
      const errs = [];
      const h = ev(o, "player_hit")[0];
      if (!h || h.data.by !== "shade" || h.data.flames !== 0 || h.data.dropped !== 0) errs.push("player_hit sai");
      const go = ev(o, "game_over")[0];
      if (!go || go.data.result !== "lost" || go.data.reason !== "no_flames") errs.push("thiếu game_over lost no_flames");
      if (o.end.state !== "lost") errs.push("end.state phải là lost");
      return errs;
    },
  },
  {
    name: "c06_hit_drop_invuln_recoil",
    req: "Bị chạm: −1 flame, rơi floor(mang/2) quanh Mây (dropped, TTL), bất tử 90 tick, Bóng Mực lùi (recoil)",
    seed: 1, ticks: 100, snapshotEvery: 10,
    scenario: mk({ player: pl([0, 0, 0], { carried: 5 }), shades: [{ pos: [0.5, 0, 0], state: "chase" }] }),
    check(o) {
      const hits = ev(o, "player_hit");
      const errs = [];
      if (hits.length !== 2) return [`mong 2 lần chạm trong 100 tick, có ${hits.length}`];
      if (hits[0].tick !== 1 || hits[1].tick !== 91) errs.push(`tick chạm ${hits[0].tick},${hits[1].tick} != 1,91`);
      if (hits[0].data.flames !== 2 || hits[0].data.dropped !== 2) errs.push("lần 1: flames 2, dropped 2");
      if (hits[1].data.flames !== 1 || hits[1].data.dropped !== 1) errs.push("lần 2: flames 1, dropped 1");
      const s10 = snap(o, 10);
      const dropped = s10.motes.filter((m) => m.kind === "dropped");
      if (dropped.length !== 2) errs.push(`phải có 2 đom đóm rơi, có ${dropped.length}`);
      for (const m of dropped) {
        const r = d2(m.pos, s10.player.pos);
        if (r < 1.49 || r > 2.51) errs.push(`đom đóm rơi cách Mây ${r} ngoài 1.5–2.5`);
        if (m.ttl_s > 8 || m.ttl_s < 7.8) errs.push(`ttl_s ${m.ttl_s} không ~8`);
      }
      if (s10.shades[0].state !== "recoil") errs.push("Bóng Mực phải ở recoil sau khi gây hit");
      if (snap(o, 30).player.invuln <= 0) errs.push("Mây phải đang bất tử ở tick 30");
      return errs;
    },
  },
  {
    name: "c06b_recoil_distance",
    req: "Bóng Mực gây hit lùi đúng 2 m trong 60 tick rồi đuổi lại",
    seed: 1, ticks: 70, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0], { flames: 99 }), shades: [{ pos: [0.5, 0, 0], state: "chase" }] }),
    check(o) {
      const errs = [];
      const x = (t) => snap(o, t).shades[0].pos[0];
      if (!near(x(61) - x(1), 2, 0.005)) errs.push(`lùi ${x(61) - x(1)} != 2.0 m`);
      if (snap(o, 61).shades[0].state !== "recoil") errs.push("tick 61 vẫn recoil (60 bước lùi)");
      if (snap(o, 62).shades[0].state !== "chase") errs.push("tick 62 phải chase lại");
      return errs;
    },
  },
  {
    name: "c07_pulse_stun_push",
    req: "Tỏa Sáng: −3 đom đóm, choáng đúng 120 tick, đẩy 4 m trong 15 tick, +5 điểm, hồi chiêu 3 s",
    seed: 1, ticks: 200, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0], { carried: 4 }), shades: [{ pos: [3, 0, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check(o) {
      const errs = [];
      const p = ev(o, "pulse")[0];
      if (!p || p.data.stunned_ids.join() !== "S1" || p.tick !== 1) errs.push("pulse.stunned_ids phải là [S1] ở tick 1");
      const s10 = snap(o, 10);
      if (s10.player.carried !== 1) errs.push("carried phải còn 1 sau pulse");
      if (s10.shades[0].state !== "stunned") errs.push("S1 phải stunned ở tick 10");
      if (!near(s10.player.pulse_cd_s, 2.85)) errs.push(`pulse_cd_s ${s10.player.pulse_cd_s} != 2.85 ở tick 10`);
      if (!near(snap(o, 20).shades[0].pos[0], 7)) errs.push(`S1 bị đẩy tới x=${snap(o, 20).shades[0].pos[0]} != 7`);
      if (snap(o, 120).shades[0].state !== "stunned") errs.push("S1 vẫn stunned ở tick 120 (đủ 120 tick tính từ lúc kích hoạt)");
      if (snap(o, 121).shades[0].state !== "chase") errs.push("S1 phải chase lại ở tick 121");
      if (!near(snap(o, 15).shades[0].pos[0], 7) || !near(snap(o, 14).shades[0].pos[0], 6.733, 0.01)) errs.push("đẩy lùi phải đều 4/15 m mỗi tick trong 15 tick");
      if (o.end.score !== 5) errs.push(`điểm ${o.end.score} != 5`);
      return errs;
    },
  },
  {
    name: "c08_pulse_refresh",
    req: "Pulse lại làm mới choáng và đẩy lùi, tính điểm mỗi lần, kể cả con đang choáng",
    seed: 1, ticks: 400,
    scenario: mk({ player: pl([0, 0, 0], { carried: 6, flames: 9 }), shades: [{ pos: [3, 0, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 180, pulse: true }, { tick: 181, pulse: false }] },
    check(o) {
      const ps = ev(o, "pulse");
      const errs = [];
      if (ps.length !== 2) return [`mong 2 pulse, có ${ps.length}`];
      if (ps.some((p) => p.data.stunned_ids.join() !== "S1")) errs.push("cả hai pulse phải trúng S1");
      if (ps[1].tick !== 181) errs.push(`pulse thứ hai ở tick ${ps[1].tick} != 181 (hồi chiêu đúng 180 tick)`);
      if (o.end.score !== 10) errs.push(`điểm ${o.end.score} != 10`);
      return errs;
    },
  },
  {
    name: "c09_pulse_needs_light_and_cooldown",
    req: "Không đủ 3 đom đóm thì không kích hoạt; đang hồi chiêu (3 s) thì không kích hoạt",
    seed: 1, ticks: 300,
    scenario: mk({ player: pl([0, 0, 0], { carried: 2 }), shades: [{ pos: [30, 0, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check(o) {
      const errs = [];
      if (ev(o, "pulse").length) errs.push("carried 2 < 3: không được có pulse");
      if (snap(o, 10).player.carried !== 2) errs.push("carried phải giữ nguyên 2");
      return errs;
    },
  },
  {
    name: "c09b_pulse_cooldown",
    req: "Bấm Tỏa Sáng khi còn hồi chiêu thì bị bỏ qua",
    seed: 1, ticks: 300,
    scenario: mk({ player: pl([0, 0, 0], { carried: 9 }), shades: [{ pos: [30, 0, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 179, pulse: true }, { tick: 180, pulse: false }] },
    check: (o) => (ev(o, "pulse").length === 1 && snap(o, 200).player.carried === 6 ? [] : ["chỉ được 1 pulse (bấm ở k=179 còn hồi chiêu), carried còn 6"]),
  },
  {
    name: "c10_safe_radius",
    req: "Bóng Mực không vào vùng an toàn 6 m quanh đèn đã sáng (bị chặn ở mép)",
    seed: 1, ticks: 600, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 22]), lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true }], shades: [{ pos: [0, 0, 5], state: "chase" }] }),
    check(o) {
      const errs = [];
      const min = Math.min(...o.snaps.map((s) => d2(s.shades[0].pos, [0, 0, 25])));
      if (min < 5.999) errs.push(`Bóng Mực vào vùng an toàn: khoảng cách nhỏ nhất ${min}`);
      if (min > 6.05) errs.push(`Bóng Mực phải áp sát mép 6 m, nhỏ nhất ${min}`);
      if (ev(o, "player_hit").length) errs.push("không được bị chạm trong vùng an toàn");
      return errs;
    },
  },
  {
    name: "c11_safe_push_on_light",
    req: "Đèn vừa thắp: Bóng Mực bên trong bị đẩy ra mép trong ≤ 30 tick và không gây sát thương trong lúc đó",
    seed: 1, ticks: 40, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 24], { carried: 1 }), lanterns: [{ id: "L1", pos: [0, 0, 25], deposited: 9 }], shades: [{ pos: [0, 0, 23.5], state: "chase" }] }),
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check(o) {
      const errs = [];
      if (ev(o, "lantern_lit").length !== 1) errs.push("đèn phải sáng");
      if (ev(o, "player_hit").length) errs.push("không được gây sát thương khi đang bị đẩy (shade chạm Mây ở 0.5 m)");
      const dist = (t) => d2(snap(o, t).shades[0].pos, [0, 0, 25]);
      if (!(dist(10) > 2 && dist(10) < 5.9)) errs.push(`tick 10 phải đang bị đẩy, khoảng cách ${dist(10)}`);
      if (dist(30) < 5.999) errs.push(`tick 30 phải ở ngoài mép, khoảng cách ${dist(30)}`);
      return errs;
    },
  },
  {
    name: "c12_dawn",
    req: "Hết giờ thì thua (dawn); --ticks dừng khi game kết thúc",
    seed: 1, ticks: 1000,
    scenario: mk({ time_left_s: 1 }),
    check(o) {
      const go = ev(o, "game_over")[0];
      const errs = [];
      if (!go || go.data.reason !== "dawn") errs.push("thiếu game_over dawn");
      if (o.end.ticks !== 60) errs.push(`end.ticks ${o.end.ticks} != 60`);
      return errs;
    },
  },
  {
    name: "c13_no_early_win_all_lit",
    req: "[Ticket-03] Thắp đủ đèn không kết thúc Đêm: game_over chỉ ở bình minh",
    seed: 1, ticks: 400, snapshotEvery: 60,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", lit: true }], player: pl([0, 0, 0]), time_left_s: 3 }),
    check(o) {
      const errs = [];
      const go = ev(o, "game_over");
      if (go.length !== 1 || go[0].tick !== 180 || go[0].data.reason !== "dawn_survived") errs.push(`game_over: ${JSON.stringify(go)}`);
      if (snap(o, 120).state !== "playing") errs.push("tick 120 phải còn playing dù đủ 5/5 đèn");
      if (o.end.score !== 885) errs.push(`điểm ${o.end.score} != 885 (5×(50+97) + 150)`);
      return errs;
    },
  },
  {
    name: "c14_scenario_no_score",
    req: "Dựng scenario không phát sự kiện, không cộng điểm (đèn lit:true)",
    seed: 1, ticks: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }] }),
    check(o) {
      const errs = [];
      if (snap(o, 0).score !== 0) errs.push("điểm tick 0 phải là 0");
      if (gameEvents(o).length) errs.push("không được có sự kiện (ngoài night_start)");
      if (!snap(o, 0).lanterns[0].lit) errs.push("L1 phải sáng");
      return errs;
    },
  },
  {
    name: "c15_random_deterministic",
    req: "Cùng seed + scenario + inputs => output giống hệt (kể cả id tự sinh); seed khác thì khác",
    seed: 42, ticks: 1300,
    scenario: { player: { pos: [0, 0, 0], flames: 99 } },
    inputs: { frames: [mv(0, [1, 0]), mv(200, [0, -1]), { tick: 400, pulse: true }] },
    determinism: true,
    check(o) {
      const sp = ev(o, "shade_spawned");
      const errs = [];
      if (sp.length < 2 || sp[0].tick !== 300 || sp[0].data.id !== "S1" || sp[1].data.id !== "S2") errs.push("thiếu shade_spawned S1,S2 ở tick 300");
      if (snap(o, 0).motes_active !== 20) errs.push("mặc định phải có 20 đom đóm");
      return errs;
    },
  },

  // ---------------- Phase 2: di chuyển ----------------
  {
    name: "c16_move_stop_normalize_yaw",
    req: "Chạy 6 m/s, move [1,1] được chuẩn hóa, dừng ngay (≤ 0.1 s), cam_yaw_deg xoay hướng",
    seed: 1, ticks: 80, snapshotEvery: 10,
    scenario: mk(),
    inputs: { frames: [mv(0, [1, 1]), mv(60, [0, 0])] },
    check(o) {
      const [x, , z] = snap(o, 60).player.pos;
      const errs = [];
      if (!near(Math.hypot(x, z), 6)) errs.push(`quãng đường ${Math.hypot(x, z)} != 6`);
      if (!near(snap(o, 70).player.vel[0], 0) || !near(snap(o, 70).player.vel[2], 0)) errs.push("phải dừng trong ≤ 0.1 s");
      if (!near(snap(o, 80).player.pos[0], x)) errs.push("không được trôi sau khi dừng");
      return errs;
    },
  },
  {
    name: "c16b_cam_yaw",
    req: "cam_yaw_deg=90, move [0,1] -> đi theo +X (công thức xoay trong contract)",
    seed: 1, ticks: 60,
    scenario: mk(),
    inputs: { frames: [mv(0, [0, 1], { cam_yaw_deg: 90 })] },
    check(o) {
      const [x, , z] = snap(o, 60).player.pos;
      return near(x, 6) && near(z, 0) ? [] : [`vị trí (${x}, ${z}) != (6, 0)`];
    },
  },
  {
    name: "c17_jump_grounded_only",
    req: "Nhảy 7 m/s, chỉ nhảy khi chạm đất (bấm khi đang bay bị bỏ qua)",
    seed: 1, ticks: 60, snapshotEvery: 5,
    scenario: mk(),
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, jump: true }, { tick: 11, jump: false }] },
    check(o) {
      const errs = [];
      const s10 = snap(o, 10).player;
      if (!(s10.pos[1] > 0.8 && !s10.grounded)) errs.push("tick 10 phải đang trên không");
      if (!snap(o, 50).player.grounded || snap(o, 50).player.pos[1] !== 0) errs.push("tick 50 phải đã chạm đất (nhảy lần hai phải bị bỏ qua)");
      return errs;
    },
  },
  {
    name: "c18_dash",
    req: "Lướt 14 m/s trong 0.2 s theo hướng mặt khi đứng yên, hồi chiêu 1.5 s tính từ lúc bắt đầu, bấm khi hồi chiêu bị bỏ qua",
    seed: 1, ticks: 120, snapshotEvery: 1,
    scenario: mk(),
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 91, dash: true }, { tick: 92, dash: false }] },
    check(o) {
      const ds = ev(o, "dash").map((e) => e.tick);
      const errs = [];
      if (ds.join() !== "1,92") errs.push(`dash ở tick ${ds.join()} != 1,92`);
      if (!near(snap(o, 12).player.pos[2], 2.8)) errs.push(`sau 12 tick lướt z=${snap(o, 12).player.pos[2]} != 2.8`);
      if (!near(snap(o, 20).player.pos[2], 2.8)) errs.push("phải dừng sau khi lướt xong");
      if (!near(snap(o, 10).player.dash_cd_s, 1.35)) errs.push(`dash_cd_s ${snap(o, 10).player.dash_cd_s} != 1.35`);
      return errs;
    },
  },
  {
    name: "c18c_dash_cooldown_boundary",
    req: "Hồi chiêu lướt đúng 90 tick: bấm ở k=89 thì chưa được",
    seed: 1, ticks: 100,
    scenario: mk(),
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 89, dash: true }, { tick: 90, dash: false }] },
    check: (o) => (ev(o, "dash").map((e) => e.tick).join() === "1" ? [] : [`dash ở tick ${ev(o, "dash").map((e) => e.tick)} != 1 (k=89 phải bị bỏ qua)`]),
  },
  {
    name: "c18d_dash_cooldown_exact",
    req: "Bấm lướt đúng lúc hết hồi chiêu (k=90) thì lướt ở tick 91",
    seed: 1, ticks: 100,
    scenario: mk(),
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 90, dash: true }, { tick: 91, dash: false }] },
    check: (o) => (ev(o, "dash").map((e) => e.tick).join() === "1,91" ? [] : [`dash ở tick ${ev(o, "dash").map((e) => e.tick)} != 1,91`]),
  },
  {
    name: "c18b_dash_air_keeps_height",
    req: "Lướt trên không giữ nguyên độ cao",
    seed: 1, ticks: 40, snapshotEvery: 1,
    scenario: mk(),
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, dash: true }, { tick: 11, dash: false }] },
    check(o) {
      const y12 = snap(o, 12).player.pos[1];
      const y22 = snap(o, 22).player.pos[1];
      return y12 > 0.5 && near(y12, y22, 1e-6) ? [] : [`độ cao khi lướt phải giữ nguyên: ${y12} vs ${y22}`];
    },
  },
  {
    name: "c19_fall_respawn",
    req: "Rơi khỏi đảo (Y < −10): đúng 1 lần, −1 flame, mất hết đom đóm, chờ 60 tick rồi hồi sinh bất tử 90 tick tại điểm xuất phát",
    seed: 1, ticks: 400, snapshotEvery: 1,
    scenario: mk({ player: pl([39, 0, 0], { carried: 4 }) }),
    inputs: { frames: [mv(0, [1, 0]), mv(30, [0, 0])] },
    check(o) {
      const falls = ev(o, "player_hit").filter((e) => e.data.by === "fall");
      const errs = [];
      if (falls.length !== 1) return [`mong đúng 1 lần rơi, có ${falls.length}`];
      const f = falls[0];
      if (f.data.flames !== 2 || f.data.dropped !== 0 || f.data.lost !== 4) errs.push(`dữ liệu rơi sai: ${JSON.stringify(f.data)}`);
      const after = o.snaps.filter((s) => s.tick > f.tick && s.player.pos[1] >= 0)[0];
      if (!after) return ["không thấy hồi sinh"];
      if (after.tick - f.tick !== 60) errs.push(`hồi sinh sau ${after.tick - f.tick} tick != 60`);
      if (after.player.pos.join() !== "0,0,0" || after.player.carried !== 0 || !near(after.player.invuln, 1.5)) errs.push("hồi sinh sai vị trí/đom đóm/bất tử");
      return errs;
    },
  },
  {
    name: "c20_fall_last_flame",
    req: "Rơi khi còn 1 Ngọn Lửa thì thua ngay (no_flames), không hồi sinh",
    seed: 1, ticks: 400,
    scenario: mk({ player: pl([39, 0, 0], { flames: 1 }) }),
    inputs: { frames: [mv(0, [1, 0])] },
    check(o) {
      const go = ev(o, "game_over")[0];
      const f = ev(o, "player_hit")[0];
      return go && go.data.reason === "no_flames" && f && f.data.by === "fall" && go.tick === f.tick && o.end.state === "lost" ? [] : ["phải thua no_flames ngay tick rơi"];
    },
  },

  // ---------------- Phase 2: địa hình ----------------
  {
    name: "c21_pad_night2",
    req: "Đêm 2, bục nhảy (20,0,18): bắn Y 14 m/s, ngang 24 m/s về đảo B, phím di chuyển không ghi đè, đáp trong đảo đích",
    seed: 1, ticks: 110, snapshotEvery: 1, night: 2,
    scenario: mk({ player: pl([20, 0, 18]) }),
    inputs: { frames: [mv(0, [-1, 0])] },
    check(o) {
      const errs = [];
      const land = o.snaps.find((s) => s.tick > 5 && s.player.grounded);
      if (!land || land.tick < 84 || land.tick > 85) errs.push(`đáp ở tick ${land?.tick} ngoài 84..85 (bay ~1.4 s, chỉ bắn một lần)`);
      const v = snap(o, 20).player.vel;
      if (!near(Math.hypot(v[0], v[2]), 24, 0.05)) errs.push(`vận tốc ngang ${Math.hypot(v[0], v[2])} != 24`);
      const e = snap(o, 110).player;
      if (!(e.pos[0] > 48 && e.pos[0] < 56 && e.pos[2] > 4 && e.pos[2] < 9)) errs.push(`đáp tại ${e.pos} không nằm trong đảo B ~ (52, 6.5)`);
      if (!e.grounded || e.pos[1] !== 0) errs.push("phải đã chạm đất");
      if (ev(o, "player_hit").length) errs.push("không được rơi");
      return errs;
    },
  },
  {
    name: "c22_pad_night3_tier2",
    req: "Đêm 3, bục (0,3,13): bắn Y 12, ngang 8 hướng −Z, đáp lên tầng 2 (Y=6)",
    seed: 1, ticks: 100, snapshotEvery: 10, night: 3,
    scenario: mk({ player: pl([0, 3, 13]) }),
    check(o) {
      const e = snap(o, 100).player;
      const errs = [];
      if (!(e.pos[1] === 6 && e.grounded)) errs.push(`phải đứng trên tầng 2 (Y=6), thực tế Y=${e.pos[1]}`);
      if (!(e.pos[2] > 5.5 && e.pos[2] < 7.2)) errs.push(`z=${e.pos[2]} không ~6.2`);
      if (ev(o, "player_hit").length) errs.push("không được rơi");
      return errs;
    },
  },
  {
    name: "c23_ramp_climb",
    req: "Đêm 3: đi lên dốc 30° từ Y=0 tới tầng 1 (Y=3)",
    seed: 1, ticks: 90, snapshotEvery: 10, night: 3,
    scenario: mk({ player: pl([31 * Math.cos(Math.PI / 6), 0, 31 * Math.sin(Math.PI / 6)]) }),
    inputs: { frames: [mv(0, [-Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6)])] },
    check(o) {
      const e = snap(o, 90).player;
      return near(e.pos[1], 3) && e.grounded ? [] : [`phải lên tầng 1, Y=${e.pos[1]}`];
    },
  },
  {
    name: "c24_cliff_blocks",
    req: "Đêm 3: vách đứng của tầng 1 không đi lên được",
    seed: 1, ticks: 60, night: 3,
    scenario: mk({ player: pl([0, 0, 26]) }),
    inputs: { frames: [mv(0, [0, -1])] },
    check(o) {
      const e = snap(o, 60).player;
      return e.pos[1] === 0 && e.pos[2] >= 23.99 ? [] : [`bị vách chặn: z=${e.pos[2]} y=${e.pos[1]}`];
    },
  },
  {
    name: "c25_tower_blocks",
    req: "Đêm 3: tháp chuông (trụ r=2) không leo được",
    seed: 1, ticks: 60, night: 3,
    scenario: mk({ player: pl([0, 6, 6]) }),
    inputs: { frames: [mv(0, [0, -1])] },
    check(o) {
      const e = snap(o, 60).player;
      return e.pos[2] >= 1.99 && e.pos[2] < 2.2 && e.pos[1] === 6 ? [] : [`phải đứng sát tháp: z=${e.pos[2]} y=${e.pos[1]}`];
    },
  },
  {
    name: "c26_step_off_tier",
    req: "Đêm 3: bước ra mép tầng thì rơi xuống tầng dưới (không phạt rơi khỏi đảo)",
    seed: 1, ticks: 80, night: 3,
    scenario: mk({ player: pl([0, 3, 23]) }),
    inputs: { frames: [mv(0, [0, 1])] },
    check(o) {
      const e = snap(o, 80).player;
      const errs = [];
      if (!(e.pos[1] === 0 && e.pos[2] > 24 && e.grounded)) errs.push(`phải đứng ở tầng 0 ngoài vành: ${e.pos}`);
      if (ev(o, "player_hit").length) errs.push("không được phạt rơi");
      return errs;
    },
  },

  // ---------------- Phase 2: đom đóm, bùa, gió ----------------
  {
    name: "c27_mote_schedule",
    req: "Đêm 1: 20 đom đóm tại 20 điểm khác nhau; +1 mỗi 240 tick tại điểm trống; hết điểm (24) thì bỏ lượt",
    seed: 3, ticks: 1200, snapshotEvery: 240,
    scenario: { random_shades: false, wind_enabled: false },
    check(o) {
      const errs = [];
      const pts = [...ringPts(0, 0, 12, 0, 45, 8), ...ringPts(0, 0, 33, 0, 22.5, 16)];
      const s0 = snap(o, 0);
      if (s0.motes_active !== 20) errs.push("tick 0 phải có 20");
      if (new Set(s0.motes.map((m) => m.pos.join())).size !== 20) errs.push("20 điểm phải khác nhau");
      if (!s0.motes.every((m) => m.kind === "random" && m.ttl_s === null && inSet(m.pos, pts))) errs.push("mote phải nằm đúng điểm sinh chuẩn, kind random");
      for (const [t, n] of [[240, 21], [480, 22], [720, 23], [960, 24], [1200, 24]]) if (snap(o, t).motes_active !== n) errs.push(`tick ${t}: ${snap(o, t).motes_active} != ${n}`);
      return errs;
    },
  },
  {
    name: "c27b_mote_not_early",
    req: "Chưa sinh thêm đom đóm trước tick 240",
    seed: 3, ticks: 239, snapshotEvery: 239,
    scenario: { random_shades: false, wind_enabled: false },
    check: (o) => (snap(o, 239).motes_active === 20 ? [] : [`tick 239 có ${snap(o, 239).motes_active} != 20`]),
  },
  {
    name: "c28_dropped_ttl",
    req: "Đom đóm rơi tồn tại 480 tick rồi biến mất",
    seed: 1, ticks: 500, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0], { carried: 2, flames: 99 }), shades: [{ pos: [0.5, 0, 0], state: "chase" }] }),
    check(o) {
      const n = (t) => snap(o, t).motes.filter((m) => m.kind === "dropped").length;
      return n(480) === 1 && n(481) === 0 ? [] : [`tick 480 có ${n(480)} (mong 1), tick 481 có ${n(481)} (mong 0)`];
    },
  },
  {
    name: "c29_charm",
    req: "Bùa Gió: nhặt → charm_picked, hiệu lực 600 tick, hồi bùa 2700 tick",
    seed: 1, ticks: 700, snapshotEvery: 1, night: 2,
    scenario: mk({ player: pl([34.5, 0, 0]), charms: [{ id: "C1" }] }),
    inputs: { frames: [mv(5, [-1, 0]), mv(60, [0, 0])] }, // đi ra khỏi bùa để không nhặt lại ngay khi nó xuất hiện
    check(o) {
      const errs = [];
      const c = ev(o, "charm_picked")[0];
      if (!c || c.data.charm_id !== "C1" || c.data.charm_ticks !== 600 || c.tick !== 1) errs.push("charm_picked sai");
      if (!near(snap(o, 10).player.charm_s, 9.85)) errs.push(`charm_s ${snap(o, 10).player.charm_s} != 9.85`);
      if (!(snap(o, 600).player.charm_s > 0) || snap(o, 601).player.charm_s !== 0) errs.push("bùa phải hiệu lực đúng 600 tick (hết ở tick 601)");
      if (snap(o, 10).charms[0].available) errs.push("bùa phải biến mất sau khi nhặt");
      return errs;
    },
  },
  {
    name: "c29b_charm_respawn_exact",
    req: "Bùa xuất hiện lại đúng sau 2700 tick (có ở tick 2701)",
    seed: 1, ticks: 2701, snapshotEvery: 2701, night: 2,
    scenario: mk({ player: pl([34.5, 0, 0]), charms: [{ id: "C1" }] }),
    inputs: { frames: [mv(5, [-1, 0]), mv(60, [0, 0])] },
    check: (o) => (snap(o, 2701).charms[0].available ? [] : ["bùa phải xuất hiện lại ở tick 2701"]),
  },
  {
    name: "c29c_charm_not_early",
    req: "Bùa chưa xuất hiện lại ở tick 2700",
    seed: 1, ticks: 2700, snapshotEvery: 2700, night: 2,
    scenario: mk({ player: pl([34.5, 0, 0]), charms: [{ id: "C1" }] }),
    inputs: { frames: [mv(5, [-1, 0]), mv(60, [0, 0])] },
    check: (o) => (!snap(o, 2700).charms[0].available ? [] : ["bùa chưa được xuất hiện lại ở tick 2700"]),
  },
  {
    name: "c30_charm_speed_dash",
    req: "Có bùa: chạy 7.2 m/s, lướt không hồi chiêu (vẫn phải nhấn lại)",
    seed: 1, ticks: 80, snapshotEvery: 10, night: 2,
    scenario: mk({ player: pl([0, 0, 0], { charm_ticks: 600 }) }),
    inputs: { frames: [mv(0, [1, 0], { dash: true }), { tick: 1, dash: false }, { tick: 20, dash: true }, { tick: 21, dash: false }] },
    check(o) {
      const errs = [];
      if (ev(o, "dash").map((e) => e.tick).join() !== "1,21") errs.push("phải lướt được liên tiếp khi có bùa");
      if (snap(o, 10).player.dash_cd_s !== 0) errs.push("dash_cd_s phải là 0 khi có bùa");
      if (!near(snap(o, 80).player.vel[0], 7.2)) errs.push(`tốc độ ${snap(o, 80).player.vel[0]} != 7.2`);
      return errs;
    },
  },
  {
    name: "c31_wind_night3",
    req: "Đêm 3: gió 5 s mỗi 30 s đẩy Mây 2 m/s theo dir_deg; snapshot wind {active, dir_deg}",
    seed: 5, ticks: 2200, snapshotEvery: 10, night: 3,
    scenario: mk({ wind_enabled: true }),
    check(o) {
      const errs = [];
      const a = snap(o, 1790);
      const w = snap(o, 1810).wind;
      if (a.wind.active) errs.push("trước 1800 gió chưa hoạt động");
      if (!w.active) errs.push("tick 1810 gió phải hoạt động");
      if (snap(o, 2110).wind.active) errs.push("sau 300 tick gió phải tắt");
      const b = snap(o, 2100);
      const dx = b.player.pos[0] - a.player.pos[0];
      const dz = b.player.pos[2] - a.player.pos[2];
      // 1790 → 2100 gồm 300 tick gió (từ tick 1800) = 10 m
      const want = [10 * Math.cos((w.dir_deg * Math.PI) / 180), 10 * Math.sin((w.dir_deg * Math.PI) / 180)];
      if (Math.hypot(dx - want[0], dz - want[1]) > 0.5) errs.push(`gió đẩy (${dx.toFixed(2)}, ${dz.toFixed(2)}) != (${want[0].toFixed(2)}, ${want[1].toFixed(2)})`);
      return errs;
    },
  },

  // ---------------- Phase 2: Bóng Mực ----------------
  {
    name: "c32_shade_schedule",
    req: "Đêm 1: 2 Bóng Mực tại tick 300 (id S1,S2), rồi 1 con mỗi 480 tick; ban đầu ở spawning",
    seed: 9, ticks: 800, snapshotEvery: 10,
    scenario: mk({ player: pl([0, 0, 0], { flames: 99 }), random_shades: true }),
    check(o) {
      const sp = ev(o, "shade_spawned");
      const errs = [];
      if (sp.map((e) => `${e.data.id}@${e.tick}`).join() !== "S1@300,S2@300,S3@780") errs.push(`lịch sinh: ${sp.map((e) => `${e.data.id}@${e.tick}`).join()}`);
      if (!snap(o, 310).shades.every((s) => s.state === "spawning")) errs.push("tick 310 phải đang spawning");
      if (snap(o, 340).shades.some((s) => s.state === "spawning")) errs.push("tick 340 hết spawning");
      return errs;
    },
  },
  {
    name: "c33_shade_cap",
    req: "Đêm 1: tối đa 6 Bóng Mực",
    seed: 9, ticks: 3200, snapshotEvery: 100,
    scenario: mk({ player: pl([0, 0, 0], { flames: 9999 }), random_shades: true }),
    check: (o) => (ev(o, "shade_spawned").length === 6 && snap(o, 3200).shades.length === 6 ? [] : [`số Bóng Mực ${ev(o, "shade_spawned").length}, mong 6`]),
  },
  {
    name: "c34_detect_giveup",
    req: "Phát hiện 12 m, bỏ đuổi 18 m (chase giữa 12–18 vẫn giữ)",
    seed: 1, ticks: 2, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0]), shades: [{ pos: [13, 0, 0], state: "wander" }, { pos: [0, 0, 20], state: "chase" }, { pos: [-15, 0, 0], state: "chase" }, { pos: [0, 0, -10], state: "wander" }] }),
    check(o) {
      const st = snap(o, 1).shades.map((s) => s.state).join();
      return st === "wander,wander,chase,chase" ? [] : [`trạng thái ${st} != wander,wander,chase,chase`];
    },
  },
  {
    name: "c35_shade_speed_per_night",
    req: "Bóng Mực 4.0 m/s (Đêm 1)",
    seed: 1, ticks: 30, snapshotEvery: 30,
    scenario: mk({ player: pl([0, 0, 0]), shades: [{ pos: [10, 0, 0], state: "chase" }] }),
    check: (o) => (near(d2(snap(o, 30).shades[0].pos, [0, 0, 0]), 8, 0.02) ? [] : [`khoảng cách ${d2(snap(o, 30).shades[0].pos, [0, 0, 0])} != 8.0`]),
  },
  {
    name: "c35b_shade_speed_night3",
    req: "Bóng Mực 4.5 m/s (Đêm 3)",
    seed: 1, ticks: 30, snapshotEvery: 30, night: 3,
    scenario: mk({ player: pl([0, 0, -30]), shades: [{ pos: [0, 0, -20], state: "chase" }] }),
    check: (o) => (near(d2(snap(o, 30).shades[0].pos, [0, 0, -30]), 7.75, 0.02) ? [] : [`khoảng cách ${d2(snap(o, 30).shades[0].pos, [0, 0, -30])} != 7.75`]),
  },
  {
    name: "c36_spawning_harmless",
    req: "Bóng Mực đang spawning không gây hại; chuyển wander sau 30 tick",
    seed: 1, ticks: 40, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0]), shades: [{ pos: [0.5, 0, 0], state: "spawning", state_ticks_left: 30 }] }),
    check(o) {
      const h = ev(o, "player_hit")[0];
      return h && h.tick === 30 && snap(o, 29).shades[0].state === "spawning" ? [] : [`lần chạm đầu ở tick ${h && h.tick}, mong 30`];
    },
  },
  {
    name: "c37_invulnerable_no_effect",
    req: "Bóng chạm lúc Mây bất tử không làm gì (không recoil, không mất lửa)",
    seed: 1, ticks: 110, snapshotEvery: 10,
    scenario: mk({ player: pl([0, 0, 0], { invuln_ticks: 100 }), shades: [{ pos: [0.5, 0, 0], state: "chase" }] }),
    check(o) {
      const errs = [];
      if (ev(o, "player_hit")[0]?.tick !== 100) errs.push(`lần chạm đầu ở tick ${ev(o, "player_hit")[0]?.tick} != 100`);
      if (snap(o, 50).shades[0].state !== "chase") errs.push("khi Mây bất tử Bóng Mực không được recoil");
      return errs;
    },
  },
  {
    name: "c38_one_hit_per_tick",
    req: "Tối đa 1 lần mất Ngọn Lửa mỗi tick; xét theo id tăng dần",
    seed: 1, ticks: 20, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0]), shades: [{ pos: [0.5, 0, 0], state: "chase" }, { pos: [-0.5, 0, 0], state: "chase" }] }),
    check(o) {
      const errs = [];
      if (ev(o, "player_hit").length !== 1) errs.push(`số lần chạm ${ev(o, "player_hit").length} != 1`);
      if (snap(o, 2).shades.map((s) => s.state).join() !== "recoil,chase") errs.push("S1 (id nhỏ) phải gây hit, S2 không");
      return errs;
    },
  },
  {
    name: "c39_pulse_3d_range",
    req: "Tỏa Sáng chỉ trúng Bóng Mực trong 5 m (3D tới tâm = chân + 0.8)",
    seed: 1, ticks: 5,
    scenario: mk({ player: pl([0, 0, 0], { carried: 3 }), shades: [{ pos: [4.5, 0, 0] }, { pos: [0, 0, 5.2] }, { pos: [3, 5, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check: (o) => (ev(o, "pulse")[0]?.data.stunned_ids.join() === "S1" ? [] : [`stunned_ids ${ev(o, "pulse")[0]?.data.stunned_ids} (S3 cao 5 m: 3D = 5.16 > 5 nên không trúng)`]),
  },
  {
    name: "c40_win_priority",
    req: "Sau mỗi tick: hết Ngọn Lửa luôn thua (no_flames), kể cả khi tất cả đèn đã sáng",
    seed: 1, ticks: 10,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", lit: true }], player: pl([0, 0, 0], { flames: 0 }) }),
    check(o) {
      const go = ev(o, "game_over")[0];
      return go && go.data.result === "lost" && go.data.reason === "no_flames" && o.end.score === 0 ? [] : [`kết quả ${JSON.stringify(go)} điểm ${o.end.score}`];
    },
  },

  // ---------------- Phase 2: Gió Lạc ----------------
  {
    name: "c41_drifter_steal_flee",
    req: "Gió Lạc: idle→chase khi mang ≥5 và ≤15 m; chạm ≤1.2 m cướp min(3, mang); flee 240 tick rồi biến mất",
    seed: 1, ticks: 400, snapshotEvery: 10, night: 2,
    scenario: mk({ player: pl([0, 0, 0], { carried: 6 }), drifters: [{ id: "D1", pos: [10, 0, 0], state: "idle" }] }),
    check(o) {
      const errs = [];
      const s = ev(o, "drifter_steal")[0];
      if (!s || s.data.drifter_id !== "D1" || s.data.amount !== 3 || s.data.carried !== 3) errs.push(`drifter_steal sai: ${JSON.stringify(s?.data)}`);
      if (s && (s.tick < 74 || s.tick > 78)) errs.push(`tick cướp ${s.tick} ngoài 74..78`);
      if (snap(o, 100).drifters[0]?.state !== "flee" || snap(o, 100).drifters[0]?.stolen !== 3) errs.push("phải flee mang 3");
      if (snap(o, 330).drifters.length !== 0) errs.push("phải biến mất sau 240 tick flee");
      if (o.end.state !== "playing" || snap(o, 400).player.flames !== 3) errs.push("Gió Lạc không được làm mất Ngọn Lửa");
      return errs;
    },
  },
  {
    name: "c42_drifter_idle",
    req: "Mang < 5 hoặc xa > 15 m thì Gió Lạc không đuổi",
    seed: 1, ticks: 200, snapshotEvery: 10, night: 2,
    scenario: mk({ player: pl([0, 0, 0], { carried: 4 }), drifters: [{ id: "D1", pos: [10, 0, 0], state: "idle" }, { id: "D2", pos: [20, 0, 0], state: "idle" }] }),
    check: (o) => (!ev(o, "drifter_steal").length && snap(o, 200).drifters.every((d) => d.state === "idle") ? [] : ["không được cướp/đuổi khi mang 4"]),
  },
  {
    name: "c43_pulse_drifter_chase",
    req: "Tỏa Sáng trúng Gió Lạc đang chase: chuyển flee, không cướp",
    seed: 1, ticks: 60, snapshotEvery: 10, night: 2,
    scenario: mk({ player: pl([0, 0, 0], { carried: 6 }), drifters: [{ id: "D1", pos: [8, 0, 0], state: "chase" }] }),
    inputs: { frames: [{ tick: 30, pulse: true }, { tick: 31, pulse: false }] },
    check(o) {
      const errs = [];
      if (ev(o, "drifter_steal").length) errs.push("không được cướp");
      if (snap(o, 40).drifters[0]?.state !== "flee") errs.push("phải flee sau Tỏa Sáng");
      if (snap(o, 40).player.carried !== 3) errs.push("carried phải còn 3");
      return errs;
    },
  },
  {
    name: "c44_pulse_drifter_drop",
    req: "Tỏa Sáng trúng Gió Lạc đang flee có đồ: drifter_drop, thành đom đóm rơi, nó biến mất sau 120 tick",
    seed: 1, ticks: 140, snapshotEvery: 10, night: 2,
    scenario: mk({ player: pl([0, 0, 0], { carried: 3 }), drifters: [{ id: "D1", pos: [3, 0, 0], state: "flee", stolen: 3, state_ticks_left: 240 }] }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check(o) {
      const errs = [];
      const d = ev(o, "drifter_drop")[0];
      if (!d || d.data.drifter_id !== "D1" || d.data.amount !== 3) errs.push("drifter_drop sai");
      const dropped = snap(o, 10).motes.filter((m) => m.kind === "dropped");
      if (dropped.length !== 3) errs.push(`phải có 3 đom đóm rơi, có ${dropped.length}`);
      if (snap(o, 130).drifters.length !== 0) errs.push("Gió Lạc phải biến mất sau 120 tick");
      return errs;
    },
  },
  {
    name: "c45_drifter_schedule",
    req: "Đêm 2: Gió Lạc sinh tại tick 1200, 2400 (tối đa 2), id D1, D2",
    seed: 4, ticks: 2400, snapshotEvery: 1200, night: 2,
    scenario: { random_motes: false, random_shades: false, wind_enabled: false, charms: [] },
    check: (o) => (snap(o, 1200).drifters.map((d) => d.id).join() === "D1" && snap(o, 2400).drifters.map((d) => d.id).join() === "D1,D2" ? [] : ["Gió Lạc phải có D1 ở tick 1200 và D1,D2 ở tick 2400"]),
  },
  {
    name: "c45b_drifter_not_early",
    req: "Gió Lạc chưa xuất hiện trước tick 1200",
    seed: 4, ticks: 1199, snapshotEvery: 1199, night: 2,
    scenario: { random_motes: false, random_shades: false, wind_enabled: false, charms: [] },
    check: (o) => (snap(o, 1199).drifters.length === 0 ? [] : ["chưa được có Gió Lạc ở tick 1199"]),
  },

  // ---------------- Phase 2: tạm dừng, dữ liệu màn ----------------
  {
    name: "c46_pause",
    req: "Tạm dừng: tick tăng, sim_tick/thời gian/vị trí đứng yên, snapshot state=paused, sự kiện paused/resumed",
    seed: 1, ticks: 150, snapshotEvery: 10,
    scenario: mk(),
    inputs: { frames: [mv(0, [0, 1]), { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 100, pause: true }, { tick: 101, pause: false }] },
    check(o) {
      const errs = [];
      if (ev(o, "paused")[0]?.tick !== 11 || ev(o, "resumed")[0]?.tick !== 101) errs.push("paused/resumed phải ở tick 11 và 101");
      const a = snap(o, 20);
      const b = snap(o, 90);
      if (a.state !== "paused" || b.state !== "paused") errs.push("snapshot phải ghi paused");
      if (a.sim_tick !== 10 || b.sim_tick !== 10) errs.push(`sim_tick khi dừng ${a.sim_tick},${b.sim_tick} != 10`);
      if (a.time_left_s !== b.time_left_s || a.player.pos[2] !== b.player.pos[2]) errs.push("thời gian và vị trí phải đứng yên");
      const e = snap(o, 150);
      if (e.sim_tick !== 60 || e.state !== "playing" || !near(e.time_left_s, 239)) errs.push(`sau khi tiếp tục: sim_tick ${e.sim_tick}, time_left ${e.time_left_s}`);
      if (o.end.ticks !== 150) errs.push("end.ticks phải là 150 (kể cả lúc dừng)");
      return errs;
    },
  },
  {
    name: "c47_night1_layout",
    req: "Đêm 1: 5 đèn ở tọa độ chuẩn, 240 s, xuất phát (0,0,0), điểm đom đóm theo 8+16 điểm chuẩn, night_start",
    seed: 2, ticks: 2, night: 1,
    scenario: { random_shades: false, wind_enabled: false },
    check(o) {
      const errs = [];
      const want = { L1: [0, 0, 25], L2: [23.8, 0, 7.7], L3: [14.7, 0, -20.2], L4: [-14.7, 0, -20.2], L5: [-23.8, 0, 7.7] };
      const s = snap(o, 0);
      for (const l of s.lanterns) if (want[l.id].join() !== l.pos.join()) errs.push(`đèn ${l.id} ở ${l.pos}`);
      if (s.lanterns.length !== 5 || s.time_left_s !== 240 || s.night !== 1 || s.player.pos.join() !== "0,0,0") errs.push("số đèn/thời gian/đêm/xuất phát sai");
      if (!s.motes.every((m) => inSet(m.pos, [...ringPts(0, 0, 12, 0, 45, 8), ...ringPts(0, 0, 33, 0, 22.5, 16)]))) errs.push("điểm đom đóm sai");
      if (ev(o, "night_start").length !== 1 || ev(o, "night_start")[0].data.night !== 1) errs.push("thiếu night_start");
      return errs;
    },
  },
  {
    name: "c48_night2_layout",
    req: "Đêm 2: 6 đèn chuẩn (id L1–L6), 270 s, hai đảo, bùa C1 ở (35,0,0), điểm đom đóm 4+8 mỗi đảo",
    seed: 2, ticks: 2, night: 2,
    scenario: { random_shades: false, wind_enabled: false },
    check(o) {
      const errs = [];
      const want = [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]];
      const s = snap(o, 0);
      if (s.lanterns.map((l) => l.pos.join()).join("|") !== want.map((p) => p.join()).join("|")) errs.push("tọa độ đèn sai");
      if (s.time_left_s !== 270 || s.night !== 2) errs.push("thời gian/đêm sai");
      const pts = [...ringPts(0, 0, 10, 0, 90, 4), ...ringPts(0, 0, 22, 0, 45, 8), ...ringPts(70, 0, 10, 0, 90, 4), ...ringPts(70, 0, 22, 0, 45, 8)];
      if (!s.motes.every((m) => inSet(m.pos, pts))) errs.push("điểm đom đóm sai");
      if (s.charms.length !== 1 || s.charms[0].id !== "C1" || !s.charms[0].available) errs.push("bùa C1 phải có sẵn");
      return errs;
    },
  },
  {
    name: "c49_night3_layout",
    req: "Đêm 3: 7 đèn chuẩn (L1 trên tầng 2), 300 s, 2 bùa, 30 điểm đom đóm ba tầng, gió bật",
    seed: 2, ticks: 2, night: 3,
    scenario: { random_shades: false },
    check(o) {
      const errs = [];
      const want = [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]];
      const s = snap(o, 0);
      if (s.lanterns.map((l) => l.pos.join()).join("|") !== want.map((p) => p.join()).join("|")) errs.push("tọa độ đèn sai");
      if (s.time_left_s !== 300 || s.night !== 3 || s.player.pos.join() !== "0,0,-30") errs.push("thời gian/đêm/xuất phát sai");
      const pts = [...ringPts(0, 0, 34, 0, 20, 18, 0), ...ringPts(0, 0, 18, 20, 20, 8, 3), ...ringPts(0, 0, 5, 45, 90, 4, 6)];
      if (!s.motes.every((m) => inSet(m.pos, pts))) errs.push("điểm đom đóm sai (cả độ cao tầng)");
      if (s.charms.map((c) => c.id).join() !== "C1,C2") errs.push("phải có bùa C1, C2");
      return errs;
    },
  },
  {
    name: "c50_scenario_replaces_lists",
    req: "Scenario: mảng drifters, charms thay thế danh sách mặc định; random_*:false tắt sinh",
    seed: 1, ticks: 1,  night: 2,
    scenario: { drifters: [], charms: [], motes: [] },
    check: (o) => (snap(o, 0).charms.length === 0 && snap(o, 0).drifters.length === 0 && snap(o, 0).motes_active === 0 ? [] : ["danh sách phải rỗng"]),
  },
  // ---------------- Phase 3: nhiên liệu đèn ----------------
  {
    name: "c51_fuel_decay",
    req: "Đèn đang sáng hao 1.0/giây (1/60 mỗi tick)",
    seed: 1, ticks: 600, snapshotEvery: 60,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }], player: pl([0, 0, 0]) }),
    check: (o) => (snap(o, 0).lanterns[0].fuel === 100 && snap(o, 60).lanterns[0].fuel === 99 && snap(o, 600).lanterns[0].fuel === 90 ? [] : [`fuel: ${snap(o, 0).lanterns[0].fuel}, ${snap(o, 60).lanterns[0].fuel}, ${snap(o, 600).lanterns[0].fuel}`]),
  },
  {
    name: "c52_fuel_out_exact",
    req: "Hết dầu đúng tick 6000: đèn tắt, deposited=0, ever_lit=true, lantern_out",
    seed: 1, ticks: 6001, snapshotEvery: 6000,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, deposited: 10 }], player: pl([0, 0, 0]) }),
    check(o) {
      const out = ev(o, "lantern_out");
      const l = snap(o, 6000).lanterns[0];
      const errs = [];
      if (out.length !== 1 || out[0].tick !== 6000 || out[0].data.lantern_id !== "L1") errs.push(`lantern_out: ${JSON.stringify(out)}`);
      if (l.lit || l.fuel !== 0 || l.deposited !== 0 || !l.ever_lit || l.relit_count !== 0) errs.push(`trạng thái đèn: ${JSON.stringify(l)}`);
      if (snap(o, 0).lanterns[0].fuel !== 100) errs.push("tick 0 fuel phải 100");
      return errs;
    },
  },
  {
    name: "c53_fuel_scenario_and_out_soon",
    req: "Scenario fuel nhỏ: đèn tắt ngay sau bước 2 khi fuel ≤ 0 (fuel 0.05 = 3 đơn vị → tắt ở tick 3); lit:true không ghi fuel mặc định 100",
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 0.05 }, { id: "L2", lit: true }], player: pl([0, 0, 0]) }),
    check(o) {
      const out = ev(o, "lantern_out");
      const errs = [];
      if (out.length !== 1 || out[0].tick !== 3) errs.push(`lantern_out phải ở tick 3: ${JSON.stringify(out)}`);
      if (!snap(o, 2).lanterns[0].lit || snap(o, 3).lanterns[0].lit) errs.push("L1 phải sáng ở tick 2 và tắt ở tick 3");
      if (snap(o, 0).lanterns[1].fuel !== 100) errs.push("L2 mặc định fuel 100");
      return errs;
    },
  },
  ...[
    { n: "a", fuel: 55, carried: 7, used: 5, fuelAfter: 100, carriedAfter: 2, score: 25, note: "ceil((100−54.98)/10)=5" },
    { n: "b", fuel: 90, carried: 10, used: 2, fuelAfter: 100, carriedAfter: 8, score: 10, note: "đèn đã hao 1 đơn vị ở bước 2 nên cần ceil(1.0017)=2" },
    { n: "c", fuel: 20, carried: 3, used: 3, fuelAfter: 50, carriedAfter: 0, score: 15, note: "mang ít hơn cần: used = min(mang, cần)" },
    { n: "d", fuel: 95.5, carried: 10, used: 1, fuelAfter: 100, carriedAfter: 9, score: 5, note: "ceil(0.45)=1" },
  ].map((c) => ({
    name: `c54${c.n}_refuel_formula`,
    req: `Châm dầu: used = min(mang, ceil((100−fuel)/10)), fuel = min(100, fuel+10×used) (${c.note})`,
    seed: 1, ticks: 3,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 24], lit: true, fuel: c.fuel }], player: pl([0, 0, 23], { carried: c.carried }) }),
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(o) {
      const r = ev(o, "refuel")[0];
      const errs = [];
      if (!r || r.data.lantern_id !== "L1" || r.data.amount !== c.used || r.data.fuel !== c.fuelAfter) errs.push(`refuel: ${JSON.stringify(r?.data)} (mong amount ${c.used}, fuel ${c.fuelAfter})`);
      if (snap(o, 0).player.carried !== c.carried || o.end.score !== c.score) errs.push(`điểm ${o.end.score} != ${c.score}`);
      if (ev(o, "deposit").length || ev(o, "lantern_lit").length) errs.push("châm dầu không phát deposit/lantern_lit");
      return errs;
    },
  })),
  {
    name: "c55_refuel_picks_nearest_receivable",
    req: "Chọn đèn nhận được gần nhất (chưa sáng, hoặc sáng chưa đầy); gần hơn thì được chọn dù là đèn tắt",
    seed: 1, ticks: 3,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 24], lit: true, fuel: 50 }, { id: "L2", pos: [0, 0, 21.2] }], player: pl([0, 0, 22.5], { carried: 4 }) }),
    inputs: { frames: [{ tick: 0, interact: true }] },
    check: (o) => (ev(o, "deposit")[0]?.data.lantern_id === "L2" && !ev(o, "refuel").length ? [] : ["L2 (1.3 m, đèn tắt) phải được chọn thay vì L1 (1.5 m)"]),
  },
  {
    name: "c55b_refuel_picks_lit_when_nearer",
    req: "Đèn sáng chưa đầy gần hơn đèn tắt thì được châm dầu",
    seed: 1, ticks: 3,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 24], lit: true, fuel: 50 }, { id: "L2", pos: [0, 0, 20.7] }], player: pl([0, 0, 22.5], { carried: 4 }) }),
    inputs: { frames: [{ tick: 0, interact: true }] },
    check: (o) => (ev(o, "refuel")[0]?.data.lantern_id === "L1" && !ev(o, "deposit").length ? [] : ["L1 (1.5 m) phải được chọn thay vì L2 (1.8 m)"]),
  },
  {
    name: "c56_relight_cost_5",
    req: "Đèn từng sáng (ever_lit) chỉ cần 5 đom đóm để thắp lại: relight=true, fuel 100, relit_count+1, +5/đom đóm +40, sức chứa tăng",
    seed: 1, ticks: 5, snapshotEvery: 5,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 24], ever_lit: true }], player: pl([0, 0, 23], { carried: 5 }) }),
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(o) {
      const l = snap(o, 5);
      const errs = [];
      if (ev(o, "lantern_lit")[0]?.data.relight !== true) errs.push("lantern_lit.relight phải là true");
      if (!l.lanterns[0].lit || l.lanterns[0].relit_count !== 1 || !l.lanterns[0].ever_lit || l.lanterns[0].fuel < 99.9) errs.push(`đèn: ${JSON.stringify(l.lanterns[0])}`);
      if (o.end.score !== 65) errs.push(`điểm ${o.end.score} != 65 (5×5 + 40)`);
      if (l.player.capacity !== 12) errs.push(`capacity ${l.player.capacity} != 12`);
      return errs;
    },
  },
  {
    name: "c56b_first_light_needs_10",
    req: "Đèn chưa từng sáng vẫn cần 10: nạp 5 thì chưa thắp",
    seed: 1, ticks: 5, snapshotEvery: 5,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 24] }], player: pl([0, 0, 23], { carried: 5 }) }),
    inputs: { frames: [{ tick: 0, interact: true }] },
    check: (o) => (!ev(o, "lantern_lit").length && snap(o, 5).lanterns[0].deposited === 5 && !snap(o, 5).lanterns[0].lit ? [] : ["5 đom đóm không đủ thắp đèn chưa từng sáng"]),
  },
  {
    name: "c57_out_resets_deposit_then_relight",
    req: "Đèn tắt: deposited=0 (nhớ tiến độ cũ bị xóa), thắp lại cần đủ 5 mới sáng lại",
    seed: 1, ticks: 20, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 24], lit: true, fuel: 0.02, deposited: 10 }], player: pl([0, 0, 23], { carried: 5 }) }),
    inputs: { frames: [{ tick: 5, interact: true }, { tick: 6, interact: false }] },
    check(o) {
      const errs = [];
      if (ev(o, "lantern_out")[0]?.tick !== 1) errs.push("đèn phải tắt ở tick 1");
      if (snap(o, 2).lanterns[0].deposited !== 0) errs.push("deposited phải về 0 khi tắt");
      const d = ev(o, "deposit")[0];
      if (!d || d.data.amount !== 5 || d.tick !== 6) errs.push(`deposit: ${JSON.stringify(d)}`);
      if (ev(o, "lantern_lit")[0]?.data.relight !== true) errs.push("phải là thắp lại");
      return errs;
    },
  },
  {
    name: "c58_capacity_growth",
    req: "Sức chứa = 10 + 2×successful_lights, tối đa 20; nhặt dừng ở sức chứa; đèn đặt sẵn bằng scenario không tính",
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0], { carried: 19, successful_lights: 5 }), motes: [[0, 0, 0.5], [0, 0, 0.6], [0, 0, 0.7]] }),
    check(o) {
      const errs = [];
      if (snap(o, 0).player.capacity !== 20) errs.push("capacity (successful 5) phải là 20");
      if (snap(o, 5).player.carried !== 20) errs.push(`carried ${snap(o, 5).player.carried} phải dừng ở 20`);
      if (snap(o, 5).motes_active !== 2) errs.push("chỉ nhặt 1 con vì đầy");
      return errs;
    },
  },
  {
    name: "c58b_capacity_levels",
    req: "capacity: 10 (0 lần), 18 (4 lần), 20 (6 lần, kẹp tối đa); đèn lit:true trong scenario không tăng sức chứa",
    seed: 1, ticks: 1,
    scenario: mk({ player: pl([0, 0, 0], { successful_lights: 4 }), lanterns: [{ id: "L1", lit: true }] }),
    check: (o) => (snap(o, 0).player.capacity === 18 ? [] : [`capacity ${snap(o, 0).player.capacity} != 18`]),
  },
  {
    name: "c58c_capacity_clamp",
    req: "capacity kẹp ở 20",
    seed: 1, ticks: 1,
    scenario: mk({ player: pl([0, 0, 0], { successful_lights: 6 }) }),
    check: (o) => (snap(o, 0).player.capacity === 20 ? [] : [`capacity ${snap(o, 0).player.capacity} != 20`]),
  },
  {
    name: "c58d_capacity_base",
    req: "capacity mặc định 10, đèn đặt sẵn không tính",
    seed: 1, ticks: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }] }),
    check: (o) => (snap(o, 0).player.capacity === 10 ? [] : [`capacity ${snap(o, 0).player.capacity} != 10`]),
  },

  // ---------------- Phase 3: vùng an toàn theo dầu, Bóng Mực hút dầu ----------------
  {
    name: "c59_safe_zone_boundary_30",
    req: "Đèn có fuel đúng 30 vẫn còn vùng an toàn; xuống dưới 30 thì mất (kiểm biên từng tick)",
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 30 + 1 / 60 }], player: pl([0, 0, 30], { flames: 99 }), shades: [{ pos: [0, 0, 18.95], state: "chase" }] }),
    check(o) {
      const dist = (t) => d2(snap(o, t).shades[0].pos, [0, 0, 25]);
      const errs = [];
      if (snap(o, 1).lanterns[0].fuel !== 30) errs.push(`tick 1 fuel ${snap(o, 1).lanterns[0].fuel} != 30`);
      if (dist(1) < 5.999) errs.push(`tick 1 (fuel đúng 30) Bóng Mực không được vào: ${dist(1)}`);
      if (!(dist(2) < 5.99)) errs.push(`tick 2 (fuel < 30) Bóng Mực phải vào được: ${dist(2)}`);
      return errs;
    },
  },
  {
    name: "c60_weak_lantern_no_safe_zone",
    req: "Đèn fuel 20 không có vùng an toàn: Bóng Mực tới sát Mây và gây sát thương",
    seed: 1, ticks: 600, snapshotEvery: 10,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 20 }], player: pl([0, 0, 22], { flames: 99 }), shades: [{ pos: [0, 0, 8], state: "chase" }] }),
    check(o) {
      const errs = [];
      const min = Math.min(...o.snaps.map((s) => d2(s.shades[0].pos, [0, 0, 25])));
      if (!(min < 4.5)) errs.push(`Bóng Mực phải vào sâu trong 6 m, gần nhất ${min}`);
      if (!ev(o, "player_hit").length) errs.push("phải có sát thương");
      return errs;
    },
  },
  {
    name: "c61_wander_targets_weak_lantern",
    req: "Bóng Mực wander đi tới đèn yếu (fuel < 30) gần nhất, không phải đèn tắt gần nhất",
    seed: 1, ticks: 100, snapshotEvery: 10,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 20 }], player: pl([-20, 0, -20], { flames: 99 }), shades: [{ pos: [20, 0, 10], state: "wander" }] }),
    check(o) {
      const s = snap(o, 100).shades[0];
      const errs = [];
      if (!(s.pos[0] < 16)) errs.push(`phải đi về phía L1 (x giảm), x=${s.pos[0]}`);
      if (snap(o, 10).shades[0].target_lantern_id !== "L1") errs.push(`đích ${snap(o, 10).shades[0].target_lantern_id} != L1`);
      return errs;
    },
  },
  {
    name: "c62_wander_goes_to_unlit_and_holds",
    req: "Không có đèn yếu: đi tới đèn tắt gần nhất ('như trước'), dừng cách 2.0 m, vẫn wander",
    seed: 1, ticks: 700, snapshotEvery: 100,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true }, { id: "L5", lit: true }], player: pl([0, 0, -30], { flames: 99 }), shades: [{ pos: [-10, 0, 5], state: "wander" }] }),
    check(o) {
      const s = snap(o, 700).shades[0];
      const errs = [];
      const d = d2(s.pos, [23.8, 0, 7.7]);
      if (!near(d, 2, 0.02)) errs.push(`phải dừng cách L2 2.0 m, cách ${d}`);
      if (s.state !== "wander") errs.push(`state ${s.state} != wander`);
      if (ev(o, "fuel_drain").length) errs.push("đèn tắt không bị hút");
      return errs;
    },
  },
  {
    name: "c63_drain_rate_arrival_events",
    req: "Tới đèn yếu ≤ 2 m: drain, đứng yên, hút 5/s (cộng hao 1/s = 6/s); fuel_drain mỗi 60 tick; đèn tắt thì Bóng về wander",
    seed: 1, ticks: 1200, snapshotEvery: 30,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 20 }], player: pl([-25, 0, -25], { flames: 99 }), shades: [{ pos: [0, 0, 5], state: "wander" }] }),
    check(o) {
      const errs = [];
      const drain = o.snaps.filter((s) => s.shades[0].state === "drain");
      if (drain.length < 4) return [`phải có drain, chỉ thấy ${drain.length} snapshot`];
      if (d2(drain[0].shades[0].pos, [0, 0, 25]) > 2.01) errs.push("drain phải bắt đầu khi cách đèn ≤ 2 m");
      if (drain[0].shades[0].target_lantern_id !== "L1") errs.push("target_lantern_id phải là L1");
      for (let i = 1; i < drain.length; i++) {
        const dt = (drain[i].tick - drain[i - 1].tick) / 60;
        if (drain[i].tick - drain[i - 1].tick === 30 && !near(drain[i - 1].lanterns[0].fuel - drain[i].lanterns[0].fuel, 6 * dt, 0.12)) errs.push(`tốc độ mất dầu ${(drain[i - 1].lanterns[0].fuel - drain[i].lanterns[0].fuel) / dt}/s != 6/s`);
      }
      const fd = ev(o, "fuel_drain");
      if (fd.length < 2 || fd[1].tick - fd[0].tick !== 60 || fd[0].data.shade_id !== "S1" || fd[0].data.lantern_id !== "L1") errs.push(`fuel_drain: ${JSON.stringify(fd.slice(0, 2))}`);
      if (ev(o, "lantern_out").length !== 1) errs.push("đèn phải tắt vì bị hút");
      const last = o.snaps.at(-1);
      if (last.shades[0].state === "drain") errs.push("sau khi đèn tắt Bóng không được còn drain");
      return errs;
    },
  },
  {
    name: "c64_drain_stacks",
    req: "Nhiều Bóng Mực hút cộng dồn: 2 con + hao = 11 fuel/s; mỗi con phát fuel_drain",
    seed: 1, ticks: 60, snapshotEvery: 60,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 28 }], player: pl([-25, 0, -25], { flames: 99 }), shades: [{ id: "S1", pos: [0, 0, 24], state: "drain", target_lantern_id: "L1" }, { id: "S2", pos: [1, 0, 25], state: "drain", target_lantern_id: "L1" }] }),
    check(o) {
      const errs = [];
      if (!near(snap(o, 60).lanterns[0].fuel, 17, 0.05)) errs.push(`fuel ${snap(o, 60).lanterns[0].fuel} != 17.0 (28 − 11)`);
      const fd = ev(o, "fuel_drain");
      if (fd.length !== 2 || fd.map((e) => e.data.shade_id).join() !== "S1,S2" || fd[0].tick !== 60) errs.push(`fuel_drain: ${JSON.stringify(fd)}`);
      return errs;
    },
  },
  {
    name: "c65_drain_exit_chase",
    req: "drain → chase khi Mây vào trong 6 m",
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 20 }], player: pl([0, 0, 19.5], { flames: 99 }), shades: [{ pos: [0, 0, 24], state: "drain", target_lantern_id: "L1" }] }),
    check: (o) => (snap(o, 1).shades[0].state === "chase" ? [] : [`state ${snap(o, 1).shades[0].state} != chase`]),
  },
  {
    name: "c65b_drain_exit_far",
    req: "drain → wander khi cách đèn > 2 m",
    seed: 1, ticks: 2, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 20 }], player: pl([-25, 0, -25], { flames: 99 }), shades: [{ pos: [0, 0, 20], state: "drain", target_lantern_id: "L1" }] }),
    check: (o) => (snap(o, 1).shades[0].state === "wander" ? [] : [`state ${snap(o, 1).shades[0].state} != wander`]),
  },
  {
    name: "c61b_weak_boundary_30",
    req: "Đèn yếu là fuel < 30 nghiêm ngặt: đèn đúng 30 chưa bị chọn làm đích (đi tới đèn tắt), xuống dưới 30 thì bị chọn",
    seed: 1, ticks: 3, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 30 + 1 / 60 }], player: pl([-20, 0, -20], { flames: 99 }), shades: [{ pos: [20, 0, 10], state: "wander" }] }),
    check(o) {
      const errs = [];
      if (snap(o, 1).shades[0].target_lantern_id !== "L2") errs.push(`tick 1 (fuel đúng 30) đích phải là đèn tắt L2, thực tế ${snap(o, 1).shades[0].target_lantern_id}`);
      if (snap(o, 2).shades[0].target_lantern_id !== "L1") errs.push(`tick 2 (fuel < 30) đích phải là L1, thực tế ${snap(o, 2).shades[0].target_lantern_id}`);
      return errs;
    },
  },
  {
    name: "c65c_drain_exit_refilled",
    req: "drain → wander khi fuel ≥ 30 (đèn đã được châm đủ, không qua tương tác trong tick)",
    seed: 1, ticks: 2, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 50 }], player: pl([-25, 0, -25], { flames: 99 }), shades: [{ pos: [0, 0, 24], state: "drain", target_lantern_id: "L1" }] }),
    check: (o) => (snap(o, 1).shades[0].state === "wander" && snap(o, 1).lanterns[0].fuel === 50 ? [] : [`state ${snap(o, 1).shades[0].state}, fuel ${snap(o, 1).lanterns[0].fuel} (mong wander, 50: không bị hút vì fuel ≥ 30)`]),
  },
  {
    name: "c66_refuel_above_30_pushes_shades",
    req: "Châm dầu lên ≥ 30 lúc Bóng Mực trong 6 m: drain → wander, bị đẩy ra mép ≤ 30 tick, không gây sát thương",
    seed: 1, ticks: 40, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 25 }], player: pl([0, 0, 24.5], { carried: 2, flames: 99 }), shades: [{ pos: [0, 0, 24], state: "drain", target_lantern_id: "L1" }] }),
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check(o) {
      const errs = [];
      const r = ev(o, "refuel")[0];
      if (!r || r.data.amount !== 2 || r.data.fuel !== 44.9) errs.push(`refuel: ${JSON.stringify(r?.data)} (mong amount 2, fuel 44.9: dầu đã bị hao và hút ở bước 2 trước khi châm ở bước 5)`);
      if (snap(o, 1).shades[0].state !== "wander") errs.push("drain phải về wander khi fuel ≥ 30");
      if (ev(o, "player_hit").length) errs.push("không được gây sát thương khi đang bị đẩy");
      if (d2(snap(o, 30).shades[0].pos, [0, 0, 25]) < 5.999) errs.push("tick 30 Bóng phải ở ngoài mép 6 m");
      const d5 = d2(snap(o, 5).shades[0].pos, [0, 0, 25]);
      if (!(d5 > 1.5 && d5 < 5.5)) errs.push(`tick 5 Bóng phải đang bị đẩy dần (cách đèn ${d5}), không dịch chuyển tức thời ra mép`);
      return errs;
    },
  },
  {
    name: "c67_pulse_drain_bonus",
    req: "Tỏa Sáng trúng Bóng đang drain: tổng +15 (thay vì +5), trúng con khác +5; drain → stunned",
    seed: 1, ticks: 5, snapshotEvery: 1,
    scenario: mk({ lanterns: [{ id: "L1", lit: true, fuel: 20 }], player: pl([0, 0, 22], { carried: 3, flames: 99 }), shades: [{ id: "S1", pos: [0, 0, 24], state: "drain", target_lantern_id: "L1" }, { id: "S2", pos: [3, 0, 22], state: "wander" }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check(o) {
      const errs = [];
      if (o.end.score !== 20) errs.push(`điểm ${o.end.score} != 20 (15 + 5)`);
      if (snap(o, 1).shades.map((s) => s.state).join() !== "stunned,stunned") errs.push("cả hai phải stunned");
      return errs;
    },
  },
  {
    name: "c68_stun_end_wander",
    req: "Hết choáng về wander (rồi mới tự chuyển chase nếu Mây trong 12 m)",
    seed: 1, ticks: 4, snapshotEvery: 1,
    scenario: mk({ player: pl([0, 0, 0]), shades: [{ id: "S1", pos: [30, 0, 0], state: "stunned", state_ticks_left: 3 }, { id: "S2", pos: [6, 0, 0], state: "stunned", state_ticks_left: 3 }, { id: "S3", pos: [14, 0, 0], state: "stunned", state_ticks_left: 3 }] }),
    check(o) {
      const errs = [];
      if (snap(o, 2).shades.map((s) => s.state).join() !== "stunned,stunned,stunned") errs.push("tick 2 vẫn stunned");
      if (snap(o, 3).shades.map((s) => s.state).join() !== "wander,chase,wander") errs.push(`tick 3: ${snap(o, 3).shades.map((s) => s.state)} (mong wander,chase,wander; S3 ở 14 m phải về wander chứ không giữ chase)`);
      return errs;
    },
  },

  // ---------------- Phase 3: luật thắng mới ----------------
  ...[
    { n: "a", night: 1, lit: 2, result: "lost", reason: "dawn", note: "Đêm 1 cần 3/5" },
    { n: "b", night: 2, lit: 3, result: "lost", reason: "dawn", note: "Đêm 2 cần 4/6" },
    { n: "c", night: 2, lit: 4, result: "won", reason: "dawn_survived", note: "Đêm 2 cần 4/6" },
    { n: "d", night: 3, lit: 4, result: "lost", reason: "dawn", note: "Đêm 3 cần 5/7" },
    { n: "e", night: 3, lit: 5, result: "won", reason: "dawn_survived", note: "Đêm 3 cần 5/7" },
  ].map((c) => ({
    name: `c69${c.n}_win_threshold_n${c.night}_${c.lit}lit`,
    req: `Bình minh: ${c.lit} đèn sáng → ${c.result} (${c.note})`,
    seed: 1, ticks: 100, night: c.night,
    scenario: mk({ lanterns: Array.from({ length: c.lit }, (_, i) => ({ id: `L${i + 1}`, lit: true })), player: pl(c.night === 3 ? [0, 0, -30] : [0, 0, 0]), time_left_s: 1 }),
    check(o) {
      const go = ev(o, "game_over")[0];
      return go && go.data.result === c.result && go.data.reason === c.reason && o.end.ticks === 60 ? [] : [`game_over ${JSON.stringify(go?.data)} ticks ${o.end.ticks}`];
    },
  })),
  {
    name: "c70_last_tick_out_counts",
    req: "Đèn hết dầu đúng tick bình minh tắt ngay sau bước 2 nên không được tính (2/5 < 3/5 → thua dawn)",
    seed: 1, ticks: 5,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true, fuel: 1 / 60 }], player: pl([0, 0, 0]), time_left_s: 1 / 60 }),
    check(o) {
      const go = ev(o, "game_over")[0];
      return ev(o, "lantern_out").length === 1 && go?.data.result === "lost" && go.data.reason === "dawn" ? [] : [`kết quả ${JSON.stringify(go?.data)}`];
    },
  },
  {
    name: "c70b_last_tick_still_lit_wins",
    req: "Còn 1 đơn vị dầu sau bước 2 ở tick cuối thì vẫn sáng và được tính; thưởng floor(fuel)",
    seed: 1, ticks: 5,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true, fuel: 2 / 60 }], player: pl([0, 0, 0]), time_left_s: 1 / 60 }),
    check(o) {
      const go = ev(o, "game_over")[0];
      const errs = [];
      if (go?.data.result !== "won" || go.data.reason !== "dawn_survived") errs.push(`kết quả ${JSON.stringify(go?.data)}`);
      if (o.end.score !== 498) errs.push(`điểm ${o.end.score} != 498 (149+149+50 + 150)`);
      return errs;
    },
  },
  {
    name: "c71_no_flames_beats_dawn",
    req: "Hết Ngọn Lửa ở tick bình minh luôn thua no_flames, kể cả khi đủ đèn",
    seed: 1, ticks: 5,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }], player: pl([0, 0, 0], { flames: 1 }), shades: [{ pos: [0.5, 0, 0], state: "chase" }], time_left_s: 1 / 60 }),
    check(o) {
      const go = ev(o, "game_over")[0];
      return go?.data.result === "lost" && go.data.reason === "no_flames" && o.end.score === 0 ? [] : [`kết quả ${JSON.stringify(go?.data)} điểm ${o.end.score}`];
    },
  },
  {
    name: "c72_pause_stops_fuel",
    req: "Tạm dừng: dầu không hao (sim đứng yên)",
    seed: 1, ticks: 150, snapshotEvery: 10,
    scenario: mk({ lanterns: [{ id: "L1", lit: true }], player: pl([0, 0, 0]) }),
    inputs: { frames: [{ tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 100, pause: true }, { tick: 101, pause: false }] },
    check: (o) => (snap(o, 20).lanterns[0].fuel === snap(o, 90).lanterns[0].fuel && snap(o, 150).lanterns[0].fuel === 99 ? [] : ["dầu phải đứng yên khi tạm dừng, cuối cùng 99.0"]),
  },
];
