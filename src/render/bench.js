// Cảnh benchmark chuẩn (Ticket-04 mục 1) chạy trong trình duyệt: ?bench=1&seed=42&duration=30
// Đêm 1 đầy đủ ánh sáng/hiệu ứng, 200 Bóng Mực wander + 100 đom đóm + L1-L3 sáng, Mây đứng yên, camera bay vòng.
// Không âm thanh, không input. Kết quả đọc ở window.__bench (scripts/bench.mjs lấy ra và tính thống kê bằng src/core/bench.js).
import * as THREE from "three";
import { createGame, TPS } from "../core/sim.js";
import { benchScenario, benchCamera, BENCH } from "../core/bench.js";
import { createWorld } from "./world.js";
import { createUI } from "./ui.js";
import { savePrevShades } from "./pose.js";
import { loadSettings } from "./settings.js";

const params = new URLSearchParams(location.search);
const seed = Number(params.get("seed") ?? 42);
const duration = Number(params.get("duration") ?? 30);
const tuning = (await (await fetch("/game.contract.json")).json()).tuning;

const settings = loadSettings();
const world = createWorld();
document.body.prepend(world.renderer.domElement);
const ui = createUI({ settings, onSettings() {}, handlers: {} });

const game = createGame({ tuning, seed, night: 1, scenario: benchScenario(seed), bench: true });
world.load(game);
ui.showHUD(true);

const idle = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
const prev = { x: 0, y: 0, z: 0, shades: new Map() };
const gl = world.renderer.getContext();
const dbg = gl.getExtension("WEBGL_debug_renderer_info");
const bench = (window.__bench = {
  done: false,
  measuring: false,
  warmupS: BENCH.warmupS,
  durationS: duration,
  seed,
  dts: [],
  firstFrameEpochMs: null,
  gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "không rõ",
  three: THREE.REVISION,
  userAgent: navigator.userAgent,
  viewport: [innerWidth, innerHeight],
  dpr: devicePixelRatio,
  shades: game.shades.length,
  motes: game.motes.length,
});

let t0 = null;
let last = null;
let measureStart = null;
let acc = 0;
function frame(now) {
  if (t0 === null) {
    t0 = now;
    bench.firstFrameEpochMs = performance.timeOrigin + now; // khung hình đầu tiên của cảnh bench
  }
  const dtMs = last === null ? 0 : now - last;
  last = now;
  acc += (dtMs / 1000) * TPS;
  while (acc >= 1) {
    acc -= 1;
    prev.x = game.player.x; prev.y = game.player.y; prev.z = game.player.z;
    savePrevShades(prev.shades, game.shades);
    game.step(idle);
  }
  const elapsed = (now - t0) / 1000;
  world.draw(game, prev, acc, now / 1000, dtMs / 1000, 180, 0, benchCamera(elapsed));
  ui.update(game, { total: 0, project: world.project, windWarning: false, windActive: false });

  if (!bench.done) {
    if (elapsed >= BENCH.warmupS) {
      if (measureStart === null) {
        measureStart = now;
        bench.measuring = true;
      }
      if (now - measureStart < duration * 1000) bench.dts.push(dtMs);
      else {
        bench.measuring = false;
        bench.done = true;
      }
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
