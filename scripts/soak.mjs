// Soak test: node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json
// Chạy headless N Đêm liên tiếp trong cùng một tiến trình; thoát mã 0 nếu crashes = 0 và mem_end_mb <= 1.2 × mem_start_mb.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Cần --expose-gc để đo RSS công bằng, và MALLOC_ARENA_MAX=1: trên Linux glibc cấp nhiều arena cho các luồng nền của V8 nên RSS
// tăng thất thường dù heap JS phẳng (đo trong Docker: 3/8 lần vượt 1.2× nếu không đặt). Thiếu một trong hai thì tự chạy lại.
if (typeof globalThis.gc !== "function" || process.env.MALLOC_ARENA_MAX !== "1") {
  const r = spawnSync(process.execPath, ["--expose-gc", ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, MALLOC_ARENA_MAX: "1" } });
  process.exit(r.status ?? 1);
}

const { runSoak } = await import("../src/headless/soak.js");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tuning = JSON.parse(readFileSync(resolve(ROOT, "game.contract.json"), "utf8")).tuning;

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  if (v === undefined || !/^-?\d+$/.test(v)) {
    console.error(`lỗi: ${name} cần một số nguyên`);
    process.exit(1);
  }
  return Number(v);
};
const outAt = process.argv.indexOf("--out");
if (outAt < 0 || !process.argv[outAt + 1]) {
  console.error("lỗi: thiếu --out <file>");
  process.exit(1);
}
const seed = arg("--seed", 7);
const nights = arg("--nights", 10);
if (nights < 1) {
  console.error("lỗi: --nights phải >= 1");
  process.exit(1);
}

const { json, detail } = runSoak({ tuning, seed, nights, onNight: (i, d) => console.log(`Đêm ${i}/${nights}: màn ${d.night}, seed ${d.seed}, ${d.ticks} tick, ${d.state}, ${d.score} điểm`) });
const out = resolve(process.argv[outAt + 1]);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(json) + "\n");
console.log(JSON.stringify(json));
const ok = json.crashes === 0 && json.mem_end_mb <= 1.2 * json.mem_start_mb;
console.log(ok ? "ĐẠT: crashes = 0 và bộ nhớ không rò rỉ" : `KHÔNG ĐẠT: crashes=${json.crashes}, mem ${json.mem_start_mb} → ${json.mem_end_mb} MB (ngưỡng ${(1.2 * json.mem_start_mb).toFixed(1)})`);
process.exit(ok ? 0 : 1);
void detail;
