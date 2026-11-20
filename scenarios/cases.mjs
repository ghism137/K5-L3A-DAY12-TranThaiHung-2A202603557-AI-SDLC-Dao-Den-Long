// Bộ scenario headless của tôi. Mỗi case: yêu cầu nào, đầu vào, kiểm tra gì.
// Dùng chung cho tests/scenarios.test.js và scripts/proof.mjs (bằng chứng Phase 1).
// check(out) nhận { events, snaps, end } và trả về mảng lỗi (rỗng = đạt).

const base = { random_motes: false, random_shades: false, motes: [], shades: [] };
const ev = (o, name) => o.events.filter((e) => e.name === name);
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const snapAt = (o, t) => o.snaps.find((s) => s.tick === t);

export const cases = [
  {
    name: "c01_pickup",
    req: "Nhặt đom đóm trong pickup_radius, sự kiện + điểm",
    seed: 1,
    ticks: 60,
    scenario: { ...base, motes: [[0, 0, 5]] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check(o) {
      const e = ev(o, "mote_picked");
      const errs = [];
      if (e.length !== 1) errs.push(`mong 1 mote_picked, có ${e.length}`);
      else {
        if (e[0].data.carried !== 1) errs.push("carried phải là 1");
        if (e[0].tick < 34 || e[0].tick > 37) errs.push(`tick nhặt ${e[0].tick} ngoài 34..37`);
      }
      if (o.end.score !== 10) errs.push(`điểm ${o.end.score} != 10`);
      return errs;
    },
  },
  {
    name: "c02_deposit_light",
    req: "Nạp đủ đom đóm thì thắp đèn: deposit rồi lantern_lit, +per_lantern",
    seed: 1,
    ticks: 5,
    scenario: { ...base, player: { pos: [0, 0, 24], carried: 5, flames: 3 } },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check(o) {
      const errs = [];
      const d = ev(o, "deposit")[0];
      if (!d || d.data.lantern_id !== "L1" || d.data.amount !== 5 || d.data.deposited !== 5) errs.push("deposit sai");
      if (ev(o, "lantern_lit").length !== 1) errs.push("thiếu lantern_lit");
      const names = o.events.map((e) => e.name).join(",");
      if (names !== "deposit,lantern_lit") errs.push(`thứ tự sự kiện: ${names}`);
      if (o.end.score !== 100) errs.push(`điểm ${o.end.score} != 100`);
      if (o.end.state !== "playing") errs.push("chưa thắng, state phải là playing");
      return errs;
    },
  },
  {
    name: "c03_partial_deposit",
    req: "Nạp một phần: không thắp, deposited tích lũy",
    seed: 1,
    ticks: 5,
    scenario: { ...base, player: { pos: [0, 0, 24], carried: 3, flames: 3 } },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(o) {
      const d = ev(o, "deposit")[0];
      const errs = [];
      if (!d || d.data.amount !== 3 || d.data.deposited !== 3) errs.push("deposit một phần sai");
      if (ev(o, "lantern_lit").length) errs.push("không được thắp");
      return errs;
    },
  },
  {
    name: "c04_win_all_lit",
    req: "Thắp hết đèn thì thắng (all_lit), điểm thưởng giây + flame còn lại",
    seed: 1,
    ticks: 10,
    scenario: {
      ...base,
      player: { pos: [0, 0, 0], carried: 1, flames: 3 },
      lanterns: [
        { id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }, { id: "L4", lit: true },
        { id: "L5", pos: [0, 0, 2], deposited: 4 },
      ],
      time_left_s: 300,
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check(o) {
      const errs = [];
      const go = ev(o, "game_over")[0];
      if (!go || go.data.result !== "won" || go.data.reason !== "all_lit") errs.push("thiếu game_over won all_lit");
      if (o.end.state !== "won") errs.push("end.state phải là won");
      if (o.end.ticks !== 1) errs.push(`end.ticks ${o.end.ticks} != 1 (dừng ngay khi thắng)`);
      // 100 (đèn) + 299 (floor 299.98 s) + 3 * 50
      if (o.end.score !== 549) errs.push(`điểm ${o.end.score} != 549`);
      return errs;
    },
  },
  {
    name: "c05_lose_no_flames",
    req: "Hết flame thì thua (no_flames)",
    seed: 1,
    ticks: 20,
    scenario: { ...base, player: { pos: [0, 0, 0], carried: 0, flames: 1 }, shades: [{ pos: [0.5, 0, 0] }] },
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
    name: "c06_hit_drop_invuln",
    req: "Bị chạm: mất 1 flame, rơi floor(carried*ratio), bất tử invuln_s",
    seed: 1,
    ticks: 100,
    scenario: { ...base, player: { pos: [0, 0, 0], carried: 5, flames: 3 }, shades: [{ pos: [0.5, 0, 0] }] },
    check(o) {
      const hits = ev(o, "player_hit");
      const errs = [];
      if (hits.length !== 2) return [`mong 2 lần chạm trong 100 tick, có ${hits.length}`];
      if (hits[0].tick !== 1 || hits[1].tick !== 91) errs.push(`tick chạm ${hits[0].tick},${hits[1].tick} != 1,91`);
      if (hits[0].data.flames !== 2 || hits[0].data.dropped !== 2) errs.push("lần 1: flames 2, dropped 2");
      if (hits[1].data.flames !== 1 || hits[1].data.dropped !== 1) errs.push("lần 2: flames 1, dropped 1");
      return errs;
    },
  },
  {
    name: "c07_pulse_stun_push",
    req: "Pulse: trừ pulse_cost, choáng + đẩy Bóng Mực, +per_stun, hết choáng sau pulse_stun_s",
    seed: 1,
    ticks: 200,
    scenario: { ...base, player: { pos: [0, 0, 0], carried: 2, flames: 3 }, shades: [{ pos: [5, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check(o) {
      const errs = [];
      const p = ev(o, "pulse")[0];
      if (!p || p.data.stunned_ids.join() !== "S1") errs.push("pulse.stunned_ids phải là [S1]");
      const s10 = snapAt(o, 10);
      if (s10.player.carried !== 1) errs.push("carried phải còn 1 sau pulse");
      if (s10.shades[0].state !== "stunned") errs.push("S1 phải stunned ở tick 10");
      if (!near(s10.shades[0].pos[0], 8)) errs.push(`S1 bị đẩy tới x=${s10.shades[0].pos[0]} != 8`);
      if (snapAt(o, 170).shades[0].state !== "stunned") errs.push("S1 vẫn stunned ở tick 170");
      if (snapAt(o, 190).shades[0].state !== "chase") errs.push("S1 phải chase lại ở tick 190");
      if (o.end.score !== 20) errs.push(`điểm ${o.end.score} != 20`);
      return errs;
    },
  },
  {
    name: "c08_pulse_no_light",
    req: "Không đủ ánh sáng (carried < pulse_cost) thì pulse không có hiệu lực",
    seed: 1,
    ticks: 20,
    scenario: { ...base, player: { pos: [0, 0, 0], carried: 0, flames: 3 }, shades: [{ pos: [30, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check: (o) => (ev(o, "pulse").length === 0 ? [] : ["không được có sự kiện pulse"]),
  },
  {
    name: "c09_safe_radius",
    req: "Bóng Mực không vào safe_radius quanh đèn đã sáng",
    seed: 1,
    ticks: 600,
    snapshotEvery: 1,
    scenario: {
      ...base,
      player: { pos: [0, 0, 22], carried: 0, flames: 3 },
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true }],
      shades: [{ pos: [0, 0, 0] }],
    },
    check(o) {
      const errs = [];
      const min = Math.min(...o.snaps.map((s) => Math.hypot(s.shades[0].pos[0] - 0, s.shades[0].pos[2] - 25)));
      if (min < 5.999) errs.push(`Bóng Mực vào vùng an toàn: khoảng cách nhỏ nhất ${min}`);
      if (ev(o, "player_hit").length) errs.push("không được bị chạm trong vùng an toàn");
      return errs;
    },
  },
  {
    name: "c10_dawn",
    req: "Hết giờ thì thua (dawn); --ticks dừng khi game kết thúc",
    seed: 1,
    ticks: 1000,
    scenario: { ...base, time_left_s: 1 },
    check(o) {
      const go = ev(o, "game_over")[0];
      const errs = [];
      if (!go || go.data.reason !== "dawn") errs.push("thiếu game_over dawn");
      if (o.end.ticks !== 60) errs.push(`end.ticks ${o.end.ticks} != 60`);
      return errs;
    },
  },
  {
    name: "c11_jump",
    req: "Nhảy: y > 0 giữa chừng và quay về 0",
    seed: 1,
    ticks: 70,
    scenario: { ...base },
    inputs: { frames: [{ tick: 0, jump: true }] },
    check(o) {
      const errs = [];
      if (!(snapAt(o, 10).player.pos[1] > 0)) errs.push("tick 10 phải đang trên không");
      if (snapAt(o, 60).player.pos[1] !== 0) errs.push("tick 60 phải chạm đất");
      return errs;
    },
  },
  {
    name: "c12_move_normalize",
    req: "move dài hơn 1 được chuẩn hóa: [1,1] vẫn đi 6 m/s",
    seed: 1,
    ticks: 60,
    scenario: { ...base },
    inputs: { frames: [{ tick: 0, move: [1, 1] }] },
    check(o) {
      const [x, , z] = snapAt(o, 60).player.pos;
      return near(Math.hypot(x, z), 6) ? [] : [`quãng đường ${Math.hypot(x, z)} != 6`];
    },
  },
  {
    name: "c13_cam_yaw",
    req: "cam_yaw_deg=90, move [0,1] -> đi theo +X (công thức xoay trong contract)",
    seed: 1,
    ticks: 60,
    scenario: { ...base },
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] },
    check(o) {
      const [x, , z] = snapAt(o, 60).player.pos;
      return near(x, 6) && near(z, 0) ? [] : [`vị trí (${x}, ${z}) != (6, 0)`];
    },
  },
  {
    name: "c14_scenario_no_score",
    req: "Dựng scenario không phát sự kiện, không cộng điểm (đèn lit:true)",
    seed: 1,
    ticks: 1,
    scenario: { ...base, lanterns: [{ id: "L1", lit: true }] },
    check(o) {
      const errs = [];
      if (snapAt(o, 0).score !== 0) errs.push("điểm tick 0 phải là 0");
      if (o.events.length) errs.push("không được có sự kiện");
      if (!snapAt(o, 0).lanterns[0].lit) errs.push("L1 phải sáng");
      return errs;
    },
  },
  {
    name: "c15_random_deterministic",
    req: "Cùng seed + scenario + inputs => output giống hệt (kể cả id tự sinh); sinh Bóng Mực theo seed",
    seed: 42,
    ticks: 1300,
    scenario: {},
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 200, move: [0, -1] }, { tick: 400, pulse: true }] },
    determinism: true,
    check(o) {
      const sp = ev(o, "shade_spawned");
      const errs = [];
      if (!sp.length || sp[0].tick !== 600 || sp[0].data.id !== "S1") errs.push("thiếu shade_spawned S1 ở tick 600");
      if (snapAt(o, 0).motes_active !== 20) errs.push("mặc định phải có 20 đom đóm");
      return errs;
    },
  },
];
