import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/bench.mjs", import.meta.url));
const hasBrowser = [process.env.BROWSER, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean).some(existsSync);
const run = (args, timeout = 90000) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", timeout });

test("bench CLI: tham số sai -> mã 1 và có thông báo lỗi", () => {
  assert.equal(run(["--seed", "42", "--duration", "5"]).status, 1);
  const r = run(["--duration", "abc", "--out", join(mkdtempSync(join(tmpdir(), "ddl-b-")), "x.json")]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /lỗi/);
  assert.equal(run(["--duration", "0", "--out", join(tmpdir(), "x.json")]).status, 1);
});

test("bench CLI: đo thật 2 s trong trình duyệt, tự thoát mã 0, đúng schema và số liệu nhất quán", { skip: hasBrowser ? false : "không có Chrome/Edge trên máy này (CI Ubuntu có google-chrome)" }, () => {
  const out = join(mkdtempSync(join(tmpdir(), "ddl-b-")), "bench.json");
  const r = run(["--seed", "42", "--duration", "2", "--out", out, "--headless"], 120000);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(Object.keys(j), ["contract_version", "avg_fps", "p1_low_fps", "frame_ms_p95", "frames", "load_ms", "peak_mem_mb", "vsync_off", "renderer", "os"]);
  assert.equal(j.contract_version, "1.3");
  assert.ok(j.frames > 10, `frames ${j.frames}`);
  assert.ok(j.avg_fps > 0 && j.p1_low_fps > 0 && j.frame_ms_p95 > 0);
  assert.ok(j.p1_low_fps <= j.avg_fps * 1.01, "p1 low không thể cao hơn trung bình");
  assert.ok(j.load_ms > 0 && j.load_ms < 60000, `load_ms ${j.load_ms}`);
  assert.equal(typeof j.vsync_off, "boolean");
  assert.ok(j.peak_mem_mb === null || j.peak_mem_mb > 0);
  assert.match(j.renderer, /Three\.js r\d+/);
  assert.match(j.renderer, /1280x720/);
  assert.match(j.renderer, /200 Bóng Mực, 100 đom đóm/);
  assert.ok(j.os.length > 5);
  // Σdt = 1000·N/avg_fps phải xấp xỉ thời lượng đo (2 s), sai số ≤ 25% (khung cuối vượt cửa sổ)
  const sumMs = (1000 * j.frames) / j.avg_fps;
  assert.ok(sumMs > 1500 && sumMs < 2600, `Σdt = ${sumMs} ms, mong ~2000`);
});
