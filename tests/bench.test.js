import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGame, TPS } from "../src/core/sim.js";
import { benchScenario, benchCamera, benchStats, spread, BENCH } from "../src/core/bench.js";

const tuning = JSON.parse(readFileSync(new URL("../game.contract.json", import.meta.url), "utf8")).tuning;
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test("benchStats: avg_fps = 1000·N/Σdt, p1_low = 1000/trung bình k dt lớn nhất, p95 nearest-rank", () => {
  const same = benchStats(Array(100).fill(10));
  assert.deepEqual(same, { frames: 100, avg_fps: 100, p1_low_fps: 100, frame_ms_p95: 10 });
  const ramp = benchStats(Array.from({ length: 100 }, (_, i) => i + 1)); // 1..100 ms
  assert.equal(ramp.avg_fps, Math.round((1000 * 100 / 5050) * 10) / 10);
  assert.equal(ramp.p1_low_fps, 10); // k = max(1, ceil(1)) = 1 -> 1000/100
  assert.equal(ramp.frame_ms_p95, 95); // chỉ số ceil(0.95·100) − 1 = 94 -> 95
});

test("benchStats: k = max(1, ceil(0.01·N)) (N=250 -> k=3; N=50 -> k=1)", () => {
  const dts = Array(250).fill(10); dts[0] = 40; dts[1] = 30; dts[2] = 20; dts[3] = 25;
  const s = benchStats(dts);
  assert.equal(s.p1_low_fps, Math.round((1000 / ((40 + 30 + 25) / 3)) * 10) / 10); // 3 giá trị lớn nhất: 40, 30, 25
  const small = benchStats([10, 10, 50, 10, 10]); // N=5 -> k=1 -> 1000/50
  assert.equal(small.p1_low_fps, 20);
  assert.equal(benchStats([]).frames, 0);
});

test("benchStats: p95 nearest-rank với N không chia hết (N=10 -> chỉ số 9; N=21 -> chỉ số 19)", () => {
  assert.equal(benchStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]).frame_ms_p95, 100);
  const dts = Array.from({ length: 21 }, (_, i) => (i + 1) * 2);
  assert.equal(benchStats(dts).frame_ms_p95, 40); // ceil(19.95)=20 -> chỉ số 19 -> 40
});

test("camera: (30,15,0) lúc t=0; góc tăng ngược chiều kim đồng hồ; đúng 15 s một vòng; luôn nhìn (0,0,0)", () => {
  const c0 = benchCamera(0);
  assert.ok(near(c0.x, 30) && near(c0.y, 15) && near(c0.z, 0));
  assert.deepEqual(c0.lookAt, [0, 0, 0]);
  const q = benchCamera(15 / 4); // 90°: x = r·cos90 = 0, z = r·sin90 = +30
  assert.ok(near(q.x, 0, 1e-9) && near(q.z, 30, 1e-9));
  const h = benchCamera(7.5); // 180°
  assert.ok(near(h.x, -30, 1e-9) && near(h.z, 0, 1e-9));
  const full = benchCamera(15);
  assert.ok(near(full.x, 30, 1e-9) && near(full.z, 0, 1e-9), "sau 15 s về điểm xuất phát");
  for (const t of [0, 1.3, 7, 12.9]) assert.ok(near(Math.hypot(benchCamera(t).x, benchCamera(t).z), 30, 1e-9) && benchCamera(t).y === 15);
});

test("spread: đúng số lượng, trong bán kính, phụ thuộc seed, tất định", () => {
  const a = spread(200, 38, 42);
  assert.equal(a.length, 200);
  assert.ok(a.every((p) => Math.hypot(p[0], p[2]) <= 38 && p[1] === 0));
  assert.deepEqual(spread(200, 38, 42), a);
  assert.notDeepEqual(spread(200, 38, 43), a);
  // rải đều: mỗi ô vuông 10×10 m trong đĩa có ít nhất 1 điểm (trừ ô ở rìa)
  const hit = new Set(a.map((p) => `${Math.floor(p[0] / 10)},${Math.floor(p[2] / 10)}`));
  assert.ok(hit.size >= 24, `chỉ phủ ${hit.size} ô`);
});

test("cảnh benchmark: 200 Bóng Mực wander, 100 đom đóm, L1-L3 sáng fuel 100, Mây đứng yên (0,0,0)", () => {
  const g = createGame({ tuning, seed: 42, night: 1, scenario: benchScenario(42), bench: true });
  const s = g.snapshot();
  assert.equal(s.shades.length, BENCH.shades);
  assert.equal(s.motes_active, BENCH.motes);
  assert.ok(s.shades.every((x) => x.state === "wander"));
  assert.deepEqual(s.lanterns.map((l) => [l.id, l.lit, l.fuel]), [["L1", true, 100], ["L2", true, 100], ["L3", true, 100], ["L4", false, 0], ["L5", false, 0]]);
  assert.deepEqual(s.player.pos, [0, 0, 0]);
  assert.equal(s.night, 1);
});

test("benchmark tắt: sinh thêm, sát thương, nhặt đom đóm, hao dầu, kết thúc Đêm; Bóng Mực vẫn di chuyển", () => {
  const g = createGame({ tuning, seed: 42, night: 1, scenario: { ...benchScenario(42), time_left_s: 1 }, bench: true });
  const first = g.snapshot().shades.map((s) => s.pos.join());
  const idle = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
  const events = [];
  for (let i = 0; i < 40 * TPS; i++) events.push(...g.step(idle)); // 40 s > time_left 1 s và > 300 tick (mốc sinh Bóng Mực)
  const s = g.snapshot();
  assert.equal(g.state, "playing", "không có điều kiện kết thúc dù hết giờ");
  assert.equal(s.shades.length, 200, "không sinh thêm Bóng Mực");
  assert.equal(s.motes_active, 100, "không sinh thêm / nhặt đom đóm");
  assert.equal(s.player.flames, 3, "không sát thương");
  assert.ok(s.lanterns.slice(0, 3).every((l) => l.lit && l.fuel === 100), "không hao dầu");
  assert.equal(s.score, 0);
  assert.equal(events.filter((e) => e.name !== "night_start").length, 0, "không có sự kiện gameplay nào");
  assert.notDeepEqual(s.shades.map((x) => x.pos.join()), first, "Bóng Mực vẫn di chuyển");
});

test("cờ bench tự nó tắt sinh thêm / nhặt / sát thương / hao dầu (không dựa vào scenario random_*:false)", () => {
  const idle = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
  // không ghi random_*: mặc định đáng ra sẽ sinh 20 đom đóm, Bóng Mực ở tick 300, hao dầu, nhặt, sát thương
  const g = createGame({
    tuning, seed: 3, night: 1, bench: true,
    scenario: { player: { pos: [0, 0, 0], flames: 3 }, motes: [[0, 0, 0.5]], shades: [{ pos: [0.4, 0, 0], state: "chase" }], lanterns: [{ id: "L1", lit: true }] },
  });
  for (let i = 0; i < 700; i++) g.step(idle);
  const s = g.snapshot();
  assert.equal(g.state, "playing");
  assert.equal(s.player.carried, 0, "không nhặt đom đóm đứng ngay cạnh");
  assert.equal(s.player.flames, 3, "không sát thương dù Bóng Mực chạm");
  assert.equal(s.shades.length, 1, "không sinh Bóng Mực ở tick 300 và 780");
  assert.equal(s.motes_active, 1, "không sinh/nhặt đom đóm");
  assert.equal(s.lanterns[0].fuel, 100, "không hao dầu");
  const control = createGame({ tuning, seed: 3, night: 1, scenario: { player: { pos: [0, 0, 0], flames: 3 }, motes: [[0, 0, 0.5]], shades: [{ pos: [0.4, 0, 0], state: "chase" }], lanterns: [{ id: "L1", lit: true }] } });
  for (let i = 0; i < 700; i++) control.step(idle);
  const c = control.snapshot();
  assert.ok(c.player.carried > 0 || c.motes_active !== 1, "đối chứng: không bật bench thì luật thật chạy (nhặt đom đóm)");
  assert.ok(c.player.flames < 3, "đối chứng: không bật bench thì bị chạm");
  assert.ok(c.lanterns[0].fuel < 100, "đối chứng: không bật bench thì hao dầu");
});

test("mặc định createGame KHÔNG ở chế độ bench (hồi quy: luật thật còn nguyên)", () => {
  const g = createGame({ tuning, seed: 1, night: 1, scenario: { time_left_s: 1, random_shades: false, random_motes: false } });
  assert.equal(g.bench, false);
  const idle = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
  for (let i = 0; i < 60; i++) g.step(idle);
  assert.equal(g.state, "lost", "hết giờ thiếu đèn phải thua dawn");
});
