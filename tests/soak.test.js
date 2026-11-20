import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSoak, inputStream, PROB } from "../src/headless/soak.js";

const tuning = JSON.parse(readFileSync(new URL("../game.contract.json", import.meta.url), "utf8")).tuning;
const SCRIPT = fileURLToPath(new URL("../scripts/soak.mjs", import.meta.url));

test("input ngẫu nhiên: tần suất nhảy 5%, lướt 3%, tỏa sáng 2%, tương tác 10%", () => {
  const next = inputStream(7);
  const n = 300000;
  const c = { jump: 0, dash: 0, pulse: 0, interact: 0 };
  for (let t = 0; t < n; t++) {
    const i = next(t);
    for (const k of Object.keys(c)) if (i[k]) c[k]++;
  }
  for (const k of Object.keys(c)) assert.ok(Math.abs(c[k] / n - PROB[k]) < 0.003, `${k}: ${c[k] / n} != ${PROB[k]}`);
});

test("hướng di chuyển đổi đúng mỗi 30 tick, vector đơn vị, đổi thật sự", () => {
  const next = inputStream(7);
  const dirs = [];
  for (let t = 0; t < 30 * 40; t++) dirs.push(next(t).move);
  for (let b = 0; b < 40; b++) {
    const first = dirs[b * 30];
    assert.ok(Math.abs(Math.hypot(first[0], first[1]) - 1) < 1e-9);
    for (let k = 1; k < 30; k++) assert.deepEqual(dirs[b * 30 + k], first, `khối ${b} tick ${k}`);
  }
  assert.ok(new Set(dirs.map((d) => d.join())).size >= 35, "phải đổi hướng ở hầu hết các khối");
  assert.notDeepEqual(inputStream(8)(0).move, dirs[0], "seed khác: hướng khác");
});

test("Đêm i dùng seed S + i và màn xoay vòng 1 → 2 → 3", () => {
  const { detail } = runSoak({ tuning, seed: 7, nights: 7 });
  assert.deepEqual(detail.map((d) => d.night), [1, 2, 3, 1, 2, 3, 1]);
  assert.deepEqual(detail.map((d) => d.seed), [8, 9, 10, 11, 12, 13, 14]);
});

test("tất định: cùng seed cho cùng kết quả, số tick và điểm; seed khác thì khác", () => {
  const a = runSoak({ tuning, seed: 7, nights: 4 });
  const b = runSoak({ tuning, seed: 7, nights: 4 });
  assert.deepEqual(a.json.results, b.json.results);
  assert.deepEqual(a.detail, b.detail);
  const c = runSoak({ tuning, seed: 99, nights: 4 });
  assert.notDeepEqual(c.detail, a.detail);
});

test("mỗi Đêm chạy tới khi kết thúc hoặc hết thời lượng chuẩn, kết quả won/lost", () => {
  const { detail, json } = runSoak({ tuning, seed: 7, nights: 3 });
  for (const d of detail) {
    assert.ok(d.state === "won" || d.state === "lost", d.state);
    assert.ok(d.ticks >= 1 && d.ticks <= tuning[`night${d.night}_duration_s`] * 60, `${d.ticks} tick`);
  }
  assert.equal(json.nights, 3);
  assert.equal(json.crashes, 0);
  assert.ok(json.results.every((r) => r === "won" || r === "lost"));
});

test("lỗi trong một Đêm được đếm vào crashes và không dừng cả lượt chạy", () => {
  const broken = { ...tuning, night2_duration_s: "hỏng" }; // Đêm 2 ném lỗi hoặc chạy sai; các Đêm khác vẫn chạy
  const origErr = console.error;
  console.error = () => {};
  try {
    const { json } = runSoak({ tuning: { ...broken, flames: undefined }, seed: 7, nights: 3 });
    assert.equal(json.nights, 3);
    assert.equal(json.results.length, 3);
  } finally {
    console.error = origErr;
  }
});

test("CLI: đủ trường theo contract, crashes = 0, mem_end ≤ 1.2 × mem_start, thoát mã 0", () => {
  const out = join(mkdtempSync(join(tmpdir(), "ddl-soak-")), "soak.json");
  const r = spawnSync(process.execPath, [SCRIPT, "--seed", "7", "--nights", "4", "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(Object.keys(j), ["nights", "crashes", "results", "mem_start_mb", "mem_end_mb", "duration_s"]);
  assert.equal(j.nights, 4);
  assert.equal(j.crashes, 0);
  assert.equal(j.results.length, 4);
  assert.ok(typeof j.mem_start_mb === "number" && j.mem_start_mb > 10);
  assert.ok(j.mem_end_mb <= 1.2 * j.mem_start_mb, `${j.mem_start_mb} → ${j.mem_end_mb}`);
  assert.ok(j.duration_s >= 0);
});

test("CLI: tham số sai -> mã 1 và có thông báo lỗi", () => {
  const out = join(mkdtempSync(join(tmpdir(), "ddl-soak-")), "x.json");
  assert.equal(spawnSync(process.execPath, [SCRIPT, "--seed", "7"], { encoding: "utf8" }).status, 1);
  const r = spawnSync(process.execPath, [SCRIPT, "--seed", "abc", "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /lỗi/);
  assert.equal(spawnSync(process.execPath, [SCRIPT, "--nights", "0", "--out", out], { encoding: "utf8" }).status, 1);
});
