// Bản có giao diện: vòng lặp, điều khiển, chuỗi 3 Đêm. Chỉ ĐỌC/ĐIỀU KHIỂN src/core; không đổi luật chơi.
// Hiệu ứng thêm (âm thanh, rung màn hình, lá gió, nhấp nháy) chỉ có ở đây, không ảnh hưởng đầu ra headless.
import { createGame, TPS, windAt } from "../core/sim.js";
import { createWorld } from "./world.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";
import { loadSettings, saveSettings } from "./settings.js";

const contract = await (await fetch("/game.contract.json")).json();
const tuning = contract.tuning;
const params = new URLSearchParams(location.search);
const settings = loadSettings();
if (params.has("cb")) settings.colorblind = params.get("cb") === "1"; // chỉ để kiểm thử/chụp ảnh, không lưu
const audio = createAudio(settings);
const world = createWorld();
document.body.prepend(world.renderer.domElement);
world.setColorblind(settings.colorblind);
document.body.classList.toggle("cb", settings.colorblind);

// ---------- trạng thái chuỗi chơi ----------
const run = { night: 1, total: 0 };
let game = null;
let mode = "menu"; // menu | intro | playing | paused | result | dawn
let cam = { yaw: 180 };
let shake = 0;
let endTimer = 0;
let lastCountdown = -1;
const prev = { x: 0, y: 0, z: 0, shades: new Map() };
const seedFor = (night) => Number(params.get("seed") ?? (Date.now() + night * 7919) % 1000003);

const handlers = {
  ui: () => audio.sfx("ui"),
  start: () => {
    audio.unlock();
    audio.startMusic();
    run.night = 1;
    run.total = 0;
    loadNight();
  },
  begin: () => beginNight(),
  next: () => {
    if (run.night < 3) {
      run.night++;
      loadNight();
    } else {
      mode = "dawn";
      ui.showHUD(false);
      ui.dawn(run.total);
    }
  },
  retry: () => loadNight(),
  restartNight: () => loadNight(),
  resume: () => setPaused(false),
  menu: () => {
    mode = "menu";
    game = null;
    ui.showHUD(false);
    ui.menu();
  },
};
const ui = createUI({
  settings,
  onSettings: (s) => {
    audio.setVolume(s.volume);
    world.setColorblind(s.colorblind);
    document.body.classList.toggle("cb", s.colorblind);
    saveSettings(s);
  },
  handlers,
});

function loadNight() {
  game = createGame({ tuning, seed: seedFor(run.night), night: run.night, scenario: testScenario() });
  world.load(game);
  cam = { yaw: 180 }; // máy quay ở phía sau lưng Mây, cùng nhìn về +Z (hướng xuất phát)
  shake = 0;
  endTimer = 0;
  lastCountdown = -1;
  resetPose();
  mode = "intro";
  ui.showHUD(false);
  ui.intro(run.night, run.total);
}
// Chỉ để kiểm thử/chụp ảnh: ?lit=3 dựng sẵn 3 đèn sáng, ?carry=10 mang sẵn đom đóm, ?time=3 còn 3 giây. Mặc định: không có gì.
function testScenario() {
  const sc = {};
  const n = Number(params.get("lit") ?? 0);
  if (n) sc.lanterns = Array.from({ length: n }, (_, i) => ({ id: `L${i + 1}`, lit: true, ...(params.has("fuel") ? { fuel: Number(params.get("fuel")) } : {}) }));
  if (params.has("carry")) sc.player = { ...sc.player, carried: Number(params.get("carry")) };
  if (params.has("sl")) sc.player = { ...sc.player, successful_lights: Number(params.get("sl")) };
  if (params.has("drain")) sc.shades = [{ pos: [0, 0, 23.5], state: "drain", target_lantern_id: "L1" }]; // chỉ để chụp ảnh: Bóng Mực đang hút đèn L1
  if (params.has("time")) sc.time_left_s = Number(params.get("time"));
  return sc;
}
function beginNight() {
  ui.hideScreen();
  ui.showHUD(true);
  mode = "playing";
  acc = 0;
}
function setPaused(p) {
  if (mode !== "playing" && mode !== "paused") return;
  mode = p ? "paused" : "playing";
  if (p) ui.pause();
  else {
    ui.hideScreen();
    acc = 0;
  }
}

// ---------- điều khiển ----------
const keys = new Set();
const latch = { jump: false, interact: false, pulse: false, dash: false };
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "escape" || k === "p") {
    if (!e.repeat) setPaused(mode === "playing");
    return;
  }
  if (e.repeat) return;
  keys.add(k);
  audio.unlock();
  if (mode !== "playing") return;
  if (k === " ") latch.jump = true;
  if (k === "e") latch.interact = true;
  if (k === "q" || k === "f") latch.pulse = true;
  if (k === "shift") latch.dash = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());
let drag = false;
world.renderer.domElement.addEventListener("pointerdown", () => (drag = true));
addEventListener("pointerup", () => (drag = false));
addEventListener("pointermove", (e) => {
  if (drag && mode === "playing") cam.yaw -= e.movementX * 0.3 * settings.sensitivity;
});

function readInput() {
  const x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const z = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  return {
    move: [x, z],
    cam_yaw_deg: cam.yaw,
    jump: latch.jump || keys.has(" "),
    interact: latch.interact || keys.has("e"),
    pulse: latch.pulse || keys.has("q") || keys.has("f"),
    dash: latch.dash || keys.has("shift"),
    pause: false,
  };
}

// ---------- sự kiện -> âm thanh/hiệu ứng ----------
function onEvent(e) {
  const d = e.data;
  switch (e.name) {
    case "mote_picked": return audio.sfx("pickup", d.carried);
    case "deposit": return audio.sfx("deposit");
    case "lantern_lit": return audio.sfx("light");
    case "pulse": audio.sfx("pulse"); return world.pulseFlash();
    case "player_hit":
      shake = 0.5;
      ui.flash();
      return audio.sfx("hit");
    case "shade_spawned": return audio.sfx("spawn");
    case "dash": return audio.sfx("dash");
    case "charm_picked": ui.flash(0xc8102e); return audio.sfx("charm");
    case "drifter_steal": return audio.sfx("steal");
    case "drifter_drop": return audio.sfx("pickup", 3);
    case "refuel": return audio.sfx("refuel");
    case "lantern_out":
      ui.flash();
      return audio.sfx("out");
    case "fuel_drain": return audio.sfx("drain");
    case "game_over":
      audio.sfx(d.result === "won" ? "win" : "lose");
      endTimer = 1.4;
      return;
  }
}

// ---------- vòng lặp ----------
function resetPose() {
  if (!game) return;
  const p = game.player;
  prev.x = p.x; prev.y = p.y; prev.z = p.z;
  prev.shades.clear();
}
function savePose() {
  const p = game.player;
  prev.x = p.x; prev.y = p.y; prev.z = p.z;
  prev.shades.clear();
  for (const s of game.shades) prev.shades.set(s.id, { x: s.x, z: s.z });
}
let acc = 0;
let prevT = performance.now();
let fpsFrames = 0, fpsT = 0, fpsMin = Infinity, fpsSum = 0, fpsN = 0;
const showFps = params.has("fps");

function frame(now) {
  const dt = Math.min((now - prevT) / 1000, 0.25);
  prevT = now;
  if (game) {
    if (mode === "playing" && game.state === "playing") {
      acc += dt * TPS;
      while (acc >= 1) {
        acc -= 1;
        savePose();
        for (const e of game.step(readInput())) onEvent(e);
        latch.jump = latch.interact = latch.pulse = latch.dash = false;
        if (game.state !== "playing") break;
      }
      const left = Math.ceil(game.remaining / TPS);
      if (left <= 10 && left > 0 && left !== lastCountdown && game.state === "playing") {
        lastCountdown = left;
        audio.sfx("countdown");
      }
    }
    if (mode === "playing" && game.state !== "playing") {
      endTimer -= dt;
      if (endTimer <= 0) {
        mode = "result";
        const win = game.state === "won";
        if (win) run.total += game.score;
        ui.showHUD(false);
        const lit = game.lanterns.filter((l) => l.lit).length;
        ui.result(win, { night: run.night, score: game.score, total: run.total, reason: game.player.flames <= 0 ? "no_flames" : "dawn", lit, n: game.lanterns.length, need: Math.ceil(tuning.win_ratio * game.lanterns.length - 1e-9) });
      }
    }
    shake = Math.max(0, shake - dt * 1.5);
    const w = game.level.wind ? windAt(game.seed, game.sim) : { active: false, warning: false };
    const interp = mode === "playing" ? acc : 1;
    const lit = world.draw(game, prev, interp, now / 1000, dt, cam.yaw, shake);
    if (mode === "playing" || mode === "paused") ui.update(game, { total: run.total, project: world.project, windWarning: w.warning, windActive: w.active, lit });
  } else world.renderer.render(world.scene, world.camera);

  if (showFps) {
    fpsFrames++;
    fpsT += dt;
    if (dt > 0) (fpsMin = Math.min(fpsMin, 1 / dt)), (fpsSum += 1 / dt), fpsN++;
    if (fpsT >= 1) {
      const fps = fpsFrames / fpsT;
      window.__fps = { fps: Math.round(fps), avg: Math.round(fpsSum / fpsN), min: Math.round(fpsMin) };
      ui.setFps(`${window.__fps.fps} FPS (tb ${window.__fps.avg}, thấp nhất ${window.__fps.min})`);
      fpsFrames = 0;
      fpsT = 0;
    }
  }
  requestAnimationFrame(frame);
}

// móc kiểm thử (chỉ đọc) cho scripts/ui-smoke.mjs
window.__ddl = { get game() { return game; }, get mode() { return mode; }, get run() { return run; }, get cam() { return cam; }, get palette() { return world.palette(); }, get settings() { return settings; } };

// khởi động
const auto = Number(params.get("autostart") ?? 0);
if (auto >= 1 && auto <= 3) {
  run.night = auto;
  loadNight();
  beginNight();
} else ui.menu();
requestAnimationFrame(frame);
