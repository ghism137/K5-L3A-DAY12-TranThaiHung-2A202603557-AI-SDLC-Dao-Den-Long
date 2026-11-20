import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const SERVER = fileURLToPath(new URL("../src/server.js", import.meta.url));
const dataDir = mkdtempSync(join(tmpdir(), "ddl-lb-"));
const env = (port) => ({ ...process.env, PORT: String(port), DDL_DATA_DIR: dataDir });

const freePort = () => new Promise((res) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
async function start(port) {
  const proc = spawn(process.execPath, [SERVER], { env: env(port), stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((ok, fail) => { proc.stdout.on("data", (d) => String(d).includes("localhost") && ok()); proc.on("exit", () => fail(new Error("máy chủ thoát sớm"))); setTimeout(() => fail(new Error("hết giờ chờ máy chủ")), 8000); });
  return proc;
}
const post = (port, body, raw) => fetch(`http://localhost:${port}/api/leaderboard`, { method: "POST", headers: { "content-type": "application/json" }, body: raw ?? JSON.stringify(body) });
const get = async (port) => (await fetch(`http://localhost:${port}/api/leaderboard`)).json();

test("bảng xếp hạng: lưu qua API, đúng thứ tự, từ chối mục sai, còn lại sau khi khởi động lại máy chủ, xuất bằng lệnh", async () => {
  const port = await freePort();
  let srv = await start(port);
  try {
    assert.deepEqual(await get(port), { entries: [] });

    const a = await post(port, { name: "Hưng_Đèn", score: 500, nights_won: 3, seed: 11 });
    assert.equal(a.status, 200);
    const ja = await a.json();
    assert.equal(ja.rank, 1);
    assert.match(ja.entries[0].achieved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/, "ISO 8601 có múi giờ do máy chủ gán");
    assert.deepEqual(Object.keys(ja.entries[0]), ["name", "score", "nights_won", "achieved_at", "seed"]);

    await post(port, { name: "second", score: 300, nights_won: 2, seed: 12 });
    const tie1 = await (await post(port, { name: "tieA", score: 300, nights_won: 2, seed: 13 })).json();
    assert.equal(tie1.rank, 3, "bằng điểm thì người đến trước đứng trên");

    for (const bad of [{ name: "ab", score: 1, nights_won: 0, seed: 1 }, { name: "a b c", score: 1, nights_won: 0, seed: 1 }, { name: "okname", score: -5, nights_won: 0, seed: 1 }, { name: "okname", score: 1, nights_won: 4, seed: 1 }, { name: "okname", score: 1.5, nights_won: 1, seed: 1 }, { name: "okname", score: 1, nights_won: 1 }, {}]) {
      const r = await post(port, bad);
      assert.equal(r.status, 400, JSON.stringify(bad));
      assert.ok((await r.json()).error);
    }
    assert.equal((await post(port, null, "{không phải json")).status, 400);
    assert.equal((await post(port, null, JSON.stringify({ name: "x".repeat(10000) }))).status, 413);
    assert.equal((await fetch(`http://localhost:${port}/api/leaderboard`, { method: "DELETE" })).status, 405);

    const before = await get(port);
    assert.deepEqual(before.entries.map((e) => e.name), ["Hưng_Đèn", "second", "tieA"]);

    srv.kill();
    srv = await start(port);
    assert.deepEqual(await get(port), before, "dữ liệu vẫn còn sau khi tắt và mở lại");

    // lệnh xuất: không mở cổng, thoát mã 0, đúng thứ tự
    const out = join(dataDir, "export.json");
    const r = spawnSync(process.execPath, [SERVER, "--export-leaderboard", out], { env: env(port), encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), before);
    assert.deepEqual(Object.keys(JSON.parse(readFileSync(out, "utf8"))), ["entries"]);
  } finally {
    srv.kill();
  }
});

test("chỉ giữ top 10 khi thêm nhiều hơn 10 mục", async () => {
  const port = await freePort();
  const srv = await start(port);
  try {
    for (let i = 0; i < 14; i++) await post(port, { name: `pl${String(i).padStart(2, "0")}`, score: 1000 + i, nights_won: 1, seed: i });
    const { entries } = await get(port);
    assert.equal(entries.length, 10);
    assert.equal(entries[0].score, 1013);
    assert.equal(entries[9].score, 1004);
    assert.ok(entries.every((e, i) => i === 0 || entries[i - 1].score >= e.score));
  } finally {
    srv.kill();
  }
});

test("file dữ liệu hỏng không làm máy chủ sập: coi như bảng trống; xuất vẫn ra {entries:[]}", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ddl-lb-bad-"));
  writeFileSync(join(dir, "leaderboard.json"), "{ hỏng");
  const out = join(dir, "o.json");
  const r = spawnSync(process.execPath, [SERVER, "--export-leaderboard", out], { env: { ...process.env, DDL_DATA_DIR: dir }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), { entries: [] });
  // thiếu file dữ liệu cũng vậy
  const empty = mkdtempSync(join(tmpdir(), "ddl-lb-empty-"));
  const out2 = join(empty, "sub", "o.json");
  assert.equal(spawnSync(process.execPath, [SERVER, "--export-leaderboard", out2], { env: { ...process.env, DDL_DATA_DIR: empty } }).status, 0);
  assert.ok(existsSync(out2));
});

test("--export-leaderboard thiếu đường dẫn -> mã 1 và có thông báo", () => {
  const r = spawnSync(process.execPath, [SERVER, "--export-leaderboard"], { env: { ...process.env, DDL_DATA_DIR: dataDir }, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /lỗi/);
});

test("máy chủ vẫn chặn file ngoài danh sách cho phép (không lộ data/ hay mã máy chủ)", async () => {
  const port = await freePort();
  const srv = await start(port);
  try {
    for (const p of ["/package.json", "/src/server.js", "/data/leaderboard.json", "/../etc/passwd", "/src/headless/cli.js"]) assert.equal((await fetch(`http://localhost:${port}${p}`)).status, 404, p);
    for (const p of ["/", "/src/core/leaderboard.js", "/src/core/keymap.js", "/game.contract.json"]) assert.equal((await fetch(`http://localhost:${port}${p}`)).status, 200, p);
  } finally {
    srv.kill();
  }
});
