// Bản có giao diện: vòng lặp, điều khiển (đổi phím được), chuỗi 3 Đêm, bảng xếp hạng. Chỉ ĐỌC/ĐIỀU KHIỂN src/core; không đổi luật chơi.
// Hiệu ứng thêm (âm thanh, rung màn hình, lá gió, nhấp nháy, chỉ báo) chỉ có ở đây, không ảnh hưởng đầu ra headless.
import { createGame, TPS, windAt } from "../core/sim.js";
import { actionForKey, isActionDown, normalizeKey } from "../core/keymap.js";
import { createWorld } from "./world.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";
import { loadSettings, saveSettings } from "./settings.js";
import { savePrevShades } from "./pose.js";

const contract = await (await fetch("/game.contract.json")).json();
const tuning = contract.tuning;
const params = new URLSearchParams(location.search);
const settings = loadSettings();
if (params.has("cb")) settings.colorblind = params.get("cb") === "1"; // chỉ để kiểm thử/chụp ảnh, không lưu
const audio = createAudio(settings);
const world = createWorld();
document.body.prepend(world.renderer.domElement);

// dễ tiếp cận: chữ lớn (rem), bảng màu dễ phân biệt, giảm chuyển động
function applyAccessibility() {
  document.documentElement.classList.toggle("large", settings.largeText);
  document.body.classList.toggle("cb", settings.colorblind);
  document.body.classList.toggle("reduce", settings.reduceMotion);
  world.setColorblind(settings.colorblind);
}
applyAccessibility();

// ---------- trạng thái chuỗi chơi ----------
const run = { night: 1, total: 0, wins: 0, seed: 0 };
let game = null;
let mode = "menu"; // menu | intro | playing | paused | result | dawn
let cam = { yaw: 180 };
let shake = 0;
let endTimer = 0;
let lastCountdown = -1;
let tenCued = false;
let windCued = false;
const lowSet = new Set(); // đèn đã báo "sắp tắt"
const spawnTrack = new Map(); // id Bóng Mực vừa xuất hiện -> thời điểm hết chỉ báo
const prev = { x: 0, y: 0, z: 0, shades: new Map() };
const seedFor = (night) => Number(params.get("seed") ?? (Date.now() + night * 7919) % 1000003);
const IDLE = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };

async function postScore(name) {
  let res;
  try {
    res = await fetch("/api/leaderboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, score: run.total, nights_won: run.wins, seed: run.seed }) });
  } catch {
    throw new Error("Không kết nối được máy chủ. Hãy chạy game bằng npm start.");
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `Lỗi máy chủ (${res.status})`);
  return j;
}

const handlers = {
  ui: () => audio.sfx("ui"),
  start: () => {
    audio.unlock();
    audio.startMusic();
    run.night = 1;
    run.total = 0;
    run.wins = 0;
    run.seed = seedFor(1);
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
      ui.dawn(run.total, { score: run.total, nights_won: run.wins });
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
  save: postScore,
  fetchBoard: async () => {
    const r = await fetch("/api/leaderboard");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()).entries;
  },
};
const ui = createUI({
  settings,
  onSettings: (s) => {
    audio.setVolume(s.volume);
    applyAccessibility();
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
  tenCued = false;
  windCued = false;
  lowSet.clear();
  spawnTrack.clear();
  resetPose();
  mode = "intro";
  ui.showHUD(false);
  ui.intro(run.night, run.total);
}
// Chỉ để kiểm thử/chụp ảnh: ?lit=3 dựng sẵn 3 đèn sáng, ?carry=10 mang sẵn đom đóm, ?time=3 còn 3 giây,
// ?fuel=F dầu của các đèn sáng sẵn, ?sl=S số lần thắp, ?drain=1 Bóng Mực đang hút L1, ?shade=1 một Bóng Mực áp sát. Mặc định: không có gì.
function testScenario() {
  const sc = {};
  const n = Number(params.get("lit") ?? 0);
  if (n) sc.lanterns = Array.from({ length: n }, (_, i) => ({ id: `L${i + 1}`, lit: true, ...(params.has("fuel") ? { fuel: Number(params.get("fuel")) } : {}) }));
  if (params.has("carry")) sc.player = { ...sc.player, carried: Number(params.get("carry")) };
  if (params.has("sl")) sc.player = { ...sc.player, successful_lights: Number(params.get("sl")) };
  if (params.has("drain")) sc.shades = [{ pos: [0, 0, 23.5], state: "drain", target_lantern_id: "L1" }];
  if (params.has("shade")) sc.shades = [{ pos: [0.5, 0, 0], state: "chase" }];
  if (params.has("quiet")) Object.assign(sc, { random_shades: false, random_drifters: false });
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

// ---------- điều khiển (phím đổi được trong Cài đặt → Đổi phím) ----------
const keys = new Set();
const latch = { jump: false, interact: false, pulse: false, dash: false };
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
addEventListener("keydown", (e) => {
  if (typing(e)) return; // đang gõ tên: không điều khiển game
  const k = normalizeKey(e.key);
  const act = actionForKey(settings.keymap, k);
  if (act === "pause") {
    if (!e.repeat) setPaused(mode === "playing");
    e.preventDefault();
    return;
  }
  if (e.repeat) return;
  keys.add(k);
  audio.unlock();
  if (mode !== "playing" || !act) return;
  if (act === "jump") latch.jump = true;
  if (act === "interact") latch.interact = true;
  if (act === "pulse") latch.pulse = true;
  if (act === "dash") latch.dash = true;
  e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(normalizeKey(e.key)));
addEventListener("blur", () => keys.clear());
let drag = false;
world.renderer.domElement.addEventListener("pointerdown", () => (drag = true));
addEventListener("pointerup", () => (drag = false));
addEventListener("pointermove", (e) => {
  if (drag && mode === "playing") cam.yaw -= e.movementX * 0.3 * settings.sensitivity;
});

function readInput() {
  const km = settings.keymap;
  const down = (a) => isActionDown(km, a, keys);
  return {
    move: [(down("right") ? 1 : 0) - (down("left") ? 1 : 0), (down("down") ? 1 : 0) - (down("up") ? 1 : 0)],
    cam_yaw_deg: cam.yaw,
    jump: latch.jump || down("jump"),
    interact: latch.interact || down("interact"),
    pulse: latch.pulse || down("pulse"),
    dash: latch.dash || down("dash"),
    pause: false,
  };
}

// ---------- sự kiện -> âm thanh/hiệu ứng/chỉ báo ----------
function onEvent(e) {
  const d = e.data;
  switch (e.name) {
    case "mote_picked": return audio.sfx("pickup", d.carried);
    case "deposit": return audio.sfx("deposit");
    case "lantern_lit": return audio.sfx("light");
    case "pulse": audio.sfx("pulse"); return world.pulseFlash();
    case "player_hit":
      shake = settings.reduceMotion ? 0 : 0.5;
      ui.flash();
      return audio.sfx("hit");
    case "shade_spawned":
      ui.cue("⚠ Bóng Mực xuất hiện!", "warn");
      spawnTrack.set(d.id, performance.now() + 4000);
      return audio.sfx("spawn");
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

// phụ đề: gió sắp thổi, 10 giây cuối, đèn sắp tắt (fuel < 30)
function checkCues() {
  if (!game || game.state !== "playing") return;
  const left = game.remaining / TPS;
  if (left <= 10 && left > 0 && !tenCued) {
    tenCued = true;
    ui.cue("⏳ 10 giây cuối!", "warn");
  }
  if (game.level.wind) {
    const w = windAt(game.seed, game.sim);
    if (w.warning && !windCued) {
      windCued = true;
      ui.cue("🍃 Gió sắp thổi!");
    }
    if (!w.warning) windCued = false;
  }
  const lowU = tuning.low_fuel_threshold * 60;
  for (const l of game.lanterns) {
    const low = l.lit && l.fuel < lowU;
    if (low && !lowSet.has(l.id)) {
      lowSet.add(l.id);
      ui.cue(`🏮 Đèn ${l.id} sắp tắt!`, "warn");
    }
    if (!low) lowSet.delete(l.id);
  }
}
function updateSpawnMarkers(now) {
  const items = [];
  for (const [id, until] of spawnTrack) {
    const s = game?.shades.find((x) => x.id === id);
    if (now > until || !s) spawnTrack.delete(id);
    else items.push(world.project(s.x, s.y, s.z));
  }
  ui.updateSpawnArrows(items);
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
  savePrevShades(prev.shades, game.shades);
}
let acc = 0;
let frozen = false;
let prevT = performance.now();
let fpsFrames = 0, fpsT = 0, fpsMin = Infinity, fpsSum = 0, fpsN = 0;
const showFps = params.has("fps");

function frame(now) {
  const dt = Math.min((now - prevT) / 1000, 0.25);
  prevT = now;
  if (game) {
    if (mode === "playing" && game.state === "playing" && !frozen) {
      acc += dt * TPS;
      while (acc >= 1) {
        acc -= 1;
        savePose();
        for (const e of game.step(readInput())) onEvent(e);
        latch.jump = latch.interact = latch.pulse = latch.dash = false;
        if (game.state !== "playing") break;
      }
      checkCues();
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
        if (win) {
          run.total += game.score;
          run.wins++;
        }
        ui.showHUD(false);
        const lit = game.lanterns.filter((l) => l.lit).length;
        ui.result(win, {
          night: run.night, score: game.score, total: run.total, reason: game.player.flames <= 0 ? "no_flames" : "dawn",
          lit, n: game.lanterns.length, need: Math.ceil(tuning.win_ratio * game.lanterns.length - 1e-9),
          save: { score: run.total, nights_won: run.wins },
        });
      }
    }
    shake = Math.max(0, shake - dt * 1.5);
    const w = game.level.wind ? windAt(game.seed, game.sim) : { active: false, warning: false };
    const interp = mode === "playing" ? acc : 1;
    const lit = world.draw(game, prev, interp, now / 1000, dt, cam.yaw, settings.reduceMotion ? 0 : shake);
    if (mode === "playing" || mode === "paused") {
      ui.update(game, { total: run.total, project: world.project, windWarning: w.warning, windActive: w.active, lit });
      updateSpawnMarkers(performance.now());
    }
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

// móc kiểm thử cho scripts/ui-smoke.mjs (chỉ đọc, trừ advance: chạy nhanh n tick không người chơi)
window.__ddl = {
  get game() { return game; },
  get mode() { return mode; },
  get run() { return run; },
  get cam() { return cam; },
  get palette() { return world.palette(); },
  get settings() { return settings; },
  get shake() { return shake; },
  get ui() { return ui; },
  advance(n) {
    for (let i = 0; i < n && game && game.state === "playing"; i++) {
      savePose();
      for (const e of game.step(IDLE)) onEvent(e);
    }
    checkCues();
  },
};

// khởi động
const auto = Number(params.get("autostart") ?? 0);
if (auto >= 1 && auto <= 3) {
  run.night = auto;
  run.seed = seedFor(1);
  loadNight();
  beginNight();
  frozen = params.has("hold"); // ?hold=1 (chỉ để kiểm thử): vào chơi nhưng không chạy thời gian thực; mô phỏng chỉ chạy qua __ddl.advance
} else ui.menu();
requestAnimationFrame(frame);
