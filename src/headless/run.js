// Chạy mô phỏng không giao diện. Không đụng tới render. Tách riêng để test gọi trực tiếp.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGame } from "../core/sim.js";
import { parseInputs, parseScenario, FormatError } from "../core/validate.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const loadTuning = () => JSON.parse(readFileSync(resolve(ROOT, "game.contract.json"), "utf8")).tuning;

export class UsageError extends Error {}

export function parseArgs(argv) {
  const o = { snapshotEvery: 10 };
  const intArg = (name, v) => {
    if (v === undefined || !/^-?\d+$/.test(v)) throw new UsageError(`${name} cần một số nguyên`);
    return Number(v);
  };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--seed") o.seed = intArg(k, v);
    else if (k === "--night") o.night = intArg(k, v);
    else if (k === "--ticks") o.ticks = intArg(k, v);
    else if (k === "--snapshot-every") o.snapshotEvery = intArg(k, v);
    else if (k === "--scenario") o.scenario = v;
    else if (k === "--inputs") o.inputs = v;
    else if (k === "--out") o.out = v;
    else throw new UsageError(`tham số lạ: ${k}`);
  }
  for (const req of ["seed", "night", "ticks", "out"]) {
    if (o[req] === undefined) throw new UsageError(`thiếu --${req}`);
  }
  if (o.night !== 1) throw new UsageError("chỉ hỗ trợ --night 1");
  if (o.ticks < 0) throw new UsageError("--ticks phải >= 0");
  if (o.snapshotEvery < 1) throw new UsageError("--snapshot-every phải >= 1");
  return o;
}

function readJson(path, what) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    throw new FormatError(`không đọc được ${what}: ${path}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new FormatError(`${what} không phải JSON hợp lệ: ${path}`);
  }
}

// frames: đã kiểm tra. Trả về hàm áp frame của tick k lên trạng thái input đang giữ.
function inputDriver(frames) {
  const cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
  let idx = 0;
  return (k) => {
    while (idx < frames.length && frames[idx].tick < k) idx++;
    if (idx < frames.length && frames[idx].tick === k) {
      const f = frames[idx++];
      if (f.move) cur.move = f.move;
      if ("cam_yaw_deg" in f) cur.cam_yaw_deg = f.cam_yaw_deg;
      for (const b of ["jump", "interact", "pulse"]) if (b in f) cur[b] = f[b];
    }
    return cur;
  };
}

export function simulate(opts, tuning = loadTuning()) {
  const scenario = opts.scenario ? parseScenario(readJson(opts.scenario, "scenario")) : {};
  const frames = opts.inputs ? parseInputs(readJson(opts.inputs, "inputs")) : [];
  const game = createGame({ tuning, seed: opts.seed, scenario });
  const input = inputDriver(frames);
  const lines = [JSON.stringify(game.snapshot())];
  for (let k = 0; k < opts.ticks; k++) {
    for (const e of game.step(input(k))) lines.push(JSON.stringify(e));
    if ((k + 1) % opts.snapshotEvery === 0) lines.push(JSON.stringify(game.snapshot()));
    if (game.state !== "playing") break;
  }
  lines.push(JSON.stringify(game.endLine()));
  return lines;
}

// Trả về mã thoát. Ghi file --out khi thành công.
export function main(argv, stderr = console.error) {
  try {
    const opts = parseArgs(argv);
    const lines = simulate(opts);
    mkdirSync(dirname(resolve(opts.out)), { recursive: true });
    writeFileSync(opts.out, lines.join("\n") + "\n");
    return 0;
  } catch (e) {
    stderr(`lỗi: ${e.message}`);
    return e instanceof FormatError ? 2 : 1;
  }
}
