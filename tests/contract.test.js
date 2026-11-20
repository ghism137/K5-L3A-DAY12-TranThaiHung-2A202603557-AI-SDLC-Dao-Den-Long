import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGame } from "../src/core/sim.js";

const contract = JSON.parse(readFileSync(new URL("../game.contract.json", import.meta.url), "utf8"));
const CLI = new URL("../src/headless/cli.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dir = mkdtempSync(join(tmpdir(), "ddl-c-"));
const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
const file = (name, text) => {
  const p = join(dir, name);
  writeFileSync(p, text);
  return p;
};

test("game.contract.json: đủ khóa theo Test Contract v1.0", () => {
  assert.equal(contract.contract_version, "1.0");
  for (const k of ["team", "build_cmd", "run_cmd", "headless_cmd"]) assert.equal(typeof contract[k], "string");
  const keys = ["player_speed", "carry_capacity", "lantern_cost", "lantern_count_night1", "pickup_radius", "interact_radius",
    "pulse_cost", "pulse_radius", "night1_duration_s", "flames", "invuln_s", "hit_drop_ratio", "pulse_stun_s", "pulse_push_m",
    "pulse_cooldown_s", "safe_radius", "shade_speed", "shade_hit_radius", "fall_enabled", "score"];
  for (const k of keys) assert.ok(k in contract.tuning, `thiếu tuning.${k}`);
  for (const k of ["per_mote", "per_lantern", "per_stun", "per_second_left", "per_flame_left"]) assert.ok(k in contract.tuning.score);
  assert.equal(contract.tuning.lantern_count_night1, 5);
});

test("tuning khai báo = tuning game dùng (game đọc thẳng từ file contract)", () => {
  const g = createGame({ tuning: contract.tuning, scenario: {} });
  assert.equal(g.lanterns.length, contract.tuning.lantern_count_night1);
  assert.equal(g.player.flames, contract.tuning.flames);
  assert.equal(g.remaining, contract.tuning.night1_duration_s * 60);
  assert.deepEqual(g.lanterns[0].z, 25);
});

test("CLI: chạy bình thường, mã 0, JSONL đúng định dạng, tick 0 + dòng end", () => {
  const out = join(dir, "ok.jsonl");
  const r = run(["--seed", "7", "--night", "1", "--ticks", "100", "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  const rows = readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows[0].type, "snapshot");
  assert.equal(rows[0].tick, 0);
  assert.equal(rows.filter((x) => x.type === "snapshot").length, 11); // tick 0,10,...,100
  assert.deepEqual(rows.at(-1), { type: "end", ticks: 100, state: "playing", score: 0 });
  assert.deepEqual(Object.keys(rows[0]).slice(0, 8), ["type", "tick", "sim_tick", "state", "time_left_s", "score", "player", "lanterns"]);
});

test("CLI: inputs sai định dạng -> mã 2", () => {
  const out = join(dir, "x.jsonl");
  const bad = [
    file("a.json", "{ không phải json"),
    file("b.json", JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] })),
    file("c.json", JSON.stringify({ frames: [{ tick: 0, move: [2, 0] }] })),
    file("d.json", JSON.stringify({ frames: [{ tick: 0, interact: "yes" }] })),
    join(dir, "khong-ton-tai.json"),
  ];
  for (const f of bad) {
    const r = run(["--seed", "1", "--night", "1", "--ticks", "5", "--inputs", f, "--out", out]);
    assert.equal(r.status, 2, `inputs ${f}`);
    assert.match(r.stderr, /lỗi/);
  }
});

test("CLI: scenario sai định dạng -> mã 2", () => {
  const out = join(dir, "x.jsonl");
  for (const sc of [{ motes: "nope" }, { lanterns: [{ id: "L9" }] }, { player: { pos: [1, 2] } }, { time_left_s: -1 }]) {
    const r = run(["--seed", "1", "--night", "1", "--ticks", "5", "--scenario", file("s.json", JSON.stringify(sc)), "--out", out]);
    assert.equal(r.status, 2, JSON.stringify(sc));
  }
});

test("CLI: thiếu tham số / tham số sai -> mã khác 0 và có stderr", () => {
  assert.equal(run(["--seed", "1"]).status, 1);
  assert.equal(run(["--seed", "x", "--night", "1", "--ticks", "1", "--out", join(dir, "z")]).status, 1);
  assert.equal(run(["--seed", "1", "--night", "2", "--ticks", "1", "--out", join(dir, "z")]).status, 1);
  assert.notEqual(run(["--seed", "1"]).stderr, "");
});

test("snapshot-every tùy chỉnh", () => {
  const out = join(dir, "e.jsonl");
  run(["--seed", "1", "--night", "1", "--ticks", "10", "--snapshot-every", "5", "--out", out]);
  const snaps = readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((x) => x.type === "snapshot");
  assert.deepEqual(snaps.map((s) => s.tick), [0, 5, 10]);
});
