import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGame } from "../src/core/sim.js";

const contract = JSON.parse(readFileSync(new URL("../game.contract.json", import.meta.url), "utf8"));
const CLI = fileURLToPath(new URL("../src/headless/cli.js", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "ddl-c-"));
const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
const file = (name, text) => {
  const p = join(dir, name);
  writeFileSync(p, text);
  return p;
};
const rows = (p) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l));

test("game.contract.json v1.3: đủ khóa, bench_cmd/soak_cmd, đúng số chuẩn của Ticket-02/03", () => {
  assert.equal(contract.contract_version, "1.3");
  assert.equal(contract.bench_cmd, "node scripts/bench.mjs");
  assert.equal(contract.soak_cmd, "node --expose-gc scripts/soak.mjs");
  assert.equal(contract.run_cmd, "npm start");
  for (const k of ["team", "build_cmd", "run_cmd", "headless_cmd"]) assert.equal(typeof contract[k], "string");
  const std = {
    player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5, pickup_radius: 1, interact_radius: 2,
    pulse_cost: 3, pulse_radius: 5, night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300, flames: 3,
    invuln_s: 1.5, hit_drop_ratio: 0.5, pulse_stun_s: 2, pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6,
    shade_speed: 4, shade_hit_radius: 1, dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5, fall_enabled: true,
    fuel_max: 100, fuel_decay_per_s: 1.0, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20,
  };
  for (const [k, v] of Object.entries(std)) assert.equal(contract.tuning[k], v, `tuning.${k}`);
  assert.deepEqual(contract.tuning.score, { per_mote: 5, per_lantern: 100, per_relight: 40, per_stun: 5, per_stun_drain: 15, per_lit_lantern_dawn: 50, per_second_left: 0, per_flame_left: 50 });
});

test("game đọc tuning từ contract (không lệch giữa khai báo và thực tế)", () => {
  const g = createGame({ tuning: contract.tuning, scenario: {} });
  assert.equal(g.lanterns.length, contract.tuning.lantern_count_night1);
  assert.equal(g.player.flames, contract.tuning.flames);
  assert.equal(g.remaining, contract.tuning.night1_duration_s * 60);
  for (const [n, key] of [[2, "night2_duration_s"], [3, "night3_duration_s"]]) {
    assert.equal(createGame({ tuning: contract.tuning, night: n }).remaining, contract.tuning[key] * 60);
  }
});

test("CLI: chạy bình thường, mã 0, JSONL v1.1 đúng định dạng", () => {
  const out = join(dir, "ok.jsonl");
  const r = run(["--seed", "7", "--night", "1", "--ticks", "100", "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  const rs = rows(out);
  assert.equal(rs[0].type, "snapshot");
  assert.equal(rs[0].tick, 0);
  assert.equal(rs.filter((x) => x.type === "snapshot").length, 11); // tick 0,10,...,100
  assert.deepEqual(rs.at(-1), { type: "end", ticks: 100, state: "playing", score: 0 });
  const s = rs[0];
  for (const k of ["type", "tick", "sim_tick", "state", "night", "time_left_s", "score", "wind", "player", "lanterns", "shades", "motes_active", "motes", "drifters", "charms"]) assert.ok(k in s, `snapshot thiếu ${k}`);
  for (const k of ["pos", "vel", "grounded", "invuln", "dash_cd_s", "pulse_cd_s", "charm_s", "flames", "carried", "capacity"]) assert.ok(k in s.player, `player thiếu ${k}`);
  assert.deepEqual(Object.keys(s.wind), ["active", "dir_deg"]);
  assert.deepEqual(Object.keys(s.lanterns[0]), ["id", "pos", "lit", "deposited", "fuel", "ever_lit", "relit_count"]);
  assert.deepEqual([s.lanterns[0].fuel, s.lanterns[0].ever_lit, s.lanterns[0].relit_count, s.player.capacity], [0, false, 0, 10]);
  assert.deepEqual(Object.keys(s.motes[0]), ["id", "pos", "kind", "ttl_s"]);
  assert.equal(s.motes.length, s.motes_active);
  assert.equal(rs.find((x) => x.type === "event").name, "night_start");
});

test("CLI: --night nhận 1, 2, 3; ngoài đó là lỗi mã 1", () => {
  for (const n of [1, 2, 3]) {
    const out = join(dir, `n${n}.jsonl`);
    assert.equal(run(["--seed", "1", "--night", String(n), "--ticks", "5", "--out", out]).status, 0);
    assert.equal(rows(out)[0].night, n);
  }
  for (const n of ["0", "4"]) assert.equal(run(["--seed", "1", "--night", n, "--ticks", "5", "--out", join(dir, "z")]).status, 1);
});

test("CLI: inputs sai định dạng -> mã 2", () => {
  const out = join(dir, "x.jsonl");
  const bad = [
    file("a.json", "{ không phải json"),
    file("b.json", JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] })),
    file("c.json", JSON.stringify({ frames: [{ tick: 0, move: [2, 0] }] })),
    file("d.json", JSON.stringify({ frames: [{ tick: 0, interact: "yes" }] })),
    file("e.json", JSON.stringify({ frames: [{ tick: 0, pause: 1 }] })),
    file("f.json", JSON.stringify({ frames: [{ tick: 0, dash: "x" }] })),
    join(dir, "khong-ton-tai.json"),
  ];
  for (const f of bad) {
    const r = run(["--seed", "1", "--night", "1", "--ticks", "5", "--inputs", f, "--out", out]);
    assert.equal(r.status, 2, `inputs ${f}`);
    assert.match(r.stderr, /lỗi/);
  }
});

test("CLI: scenario sai định dạng -> mã 2 (kể cả các trường mới của v1.1)", () => {
  const out = join(dir, "x.jsonl");
  const bad = [
    { motes: "nope" }, { lanterns: [{ id: "L9" }] }, { player: { pos: [1, 2] } }, { time_left_s: -1 },
    { shades: [{ pos: [1, 0, 1], state: "flying" }] }, { drifters: [{ pos: [1, 0, 1], state: "idle", stolen: -1 }] },
    { lanterns: [{ id: "L1", fuel: -1 }] }, { lanterns: [{ id: "L1", fuel: "100" }] }, { lanterns: [{ id: "L1", ever_lit: "yes" }] },
    { player: { successful_lights: -1 } }, { shades: [{ pos: [1, 0, 1], target_lantern_id: 5 }] }, { shades: [{ pos: [1, 0, 1], state: "drain", target_lantern_id: "L9" }] },
    { charms: [{ id: "C9" }] }, { player: { dash_cd_ticks: 1.5 } }, { random_drifters: "yes" }, { wind_enabled: 1 },
  ];
  for (const sc of bad) {
    const r = run(["--seed", "1", "--night", "2", "--ticks", "5", "--scenario", file("s.json", JSON.stringify(sc)), "--out", out]);
    assert.equal(r.status, 2, JSON.stringify(sc));
  }
  const ok = { player: { pos: [0, 0, 0], invuln_ticks: 3, dash_cd_ticks: 2, pulse_cd_ticks: 1, charm_ticks: 5, successful_lights: 2 }, lanterns: [{ id: "L1", lit: true, fuel: 12.5, ever_lit: true }], shades: [{ pos: [1, 0, 1], state: "stunned", state_ticks_left: 9 }, { pos: [1, 0, 1], state: "drain", target_lantern_id: "L1" }], drifters: [], charms: [], random_drifters: false, wind_enabled: false };
  assert.equal(run(["--seed", "1", "--night", "2", "--ticks", "5", "--scenario", file("ok.json", JSON.stringify(ok)), "--out", out]).status, 0);
});

test("CLI: thiếu tham số / tham số sai -> mã khác 0 và có stderr", () => {
  assert.equal(run(["--seed", "1"]).status, 1);
  assert.equal(run(["--seed", "x", "--night", "1", "--ticks", "1", "--out", join(dir, "z")]).status, 1);
  assert.notEqual(run(["--seed", "1"]).stderr, "");
});

test("snapshot-every tùy chỉnh", () => {
  const out = join(dir, "e.jsonl");
  run(["--seed", "1", "--night", "1", "--ticks", "10", "--snapshot-every", "5", "--out", out]);
  assert.deepEqual(rows(out).filter((x) => x.type === "snapshot").map((s) => s.tick), [0, 5, 10]);
});

test("hiệu năng: một Đêm đầy đủ (21.600 tick) headless ≤ 30 s, mỗi Đêm", () => {
  for (const n of [1, 2, 3]) {
    const sc = file(`perf${n}.json`, JSON.stringify({ player: { flames: 99999 } })); // không chết sớm: chạy đủ 21.600 tick
    const out = join(dir, `perf${n}.jsonl`);
    const t0 = Date.now();
    const r = run(["--seed", "5", "--night", String(n), "--scenario", sc, "--ticks", "21600", "--out", out]);
    const dt = (Date.now() - t0) / 1000;
    assert.equal(r.status, 0, r.stderr);
    const end = rows(out).at(-1);
    assert.equal(end.ticks, contract.tuning[`night${n}_duration_s`] * 60, `Đêm ${n} phải chạy đủ thời lượng (hết giờ → dawn)`);
    assert.ok(dt <= 30, `Đêm ${n} mất ${dt}s`);
    console.log(`# Đêm ${n}: ${end.ticks} tick trong ${dt.toFixed(2)} s`);
  }
});

test("Contract v1.2: sự kiện và trạng thái mới xuất hiện đúng tên", () => {
  const out = join(dir, "v12.jsonl");
  const sc = file("v12.json", JSON.stringify({ random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [{ id: "S1", pos: [0, 0, 24], state: "drain", target_lantern_id: "L1" }], lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 0.1 }], player: { pos: [-25, 0, -25], flames: 99 } }));
  assert.equal(run(["--seed", "1", "--night", "1", "--ticks", "200", "--scenario", sc, "--snapshot-every", "50", "--out", out]).status, 0);
  const rs = rows(out);
  const names = new Set(rs.filter((x) => x.type === "event").map((x) => x.name));
  assert.ok(names.has("lantern_out"), "thiếu lantern_out");
  assert.ok(rs.some((x) => x.type === "snapshot" && x.shades.some((s) => s.state === "drain")), "snapshot phải có trạng thái drain");
  assert.equal(rs.filter((x) => x.type === "event" && x.name === "game_over").length, 0);
});
