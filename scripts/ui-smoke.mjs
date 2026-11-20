// Kiểm thử đầu-cuối giao diện: một "bot" điều khiển trình duyệt thật bằng phím và chuột (CDP). Dùng: npm run smoke
// Kiểm: menu → giới thiệu → chơi; tạm dừng đứng yên; cài đặt được lưu; phím đi/nhảy/lướt; chơi lại Đêm;
// thua (dawn) → chơi lại; thắng Đêm 1 → Đêm 2; thắng Đêm 3 → Bình Minh với tổng điểm. Thoát mã 1 nếu có mục hỏng.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8098;
const CDP = 9334;
const candidates = [process.env.BROWSER, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) (console.error("Không tìm thấy Chrome/Edge (đặt BROWSER=...)"), process.exit(1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ["src/server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const proc = spawn(browser, ["--headless=new", "--window-size=1280,720", `--remote-debugging-port=${CDP}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ddl-smoke-"))}`, "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--no-first-run", "--autoplay-policy=no-user-gesture-required", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "about:blank"], { stdio: "ignore" });

let ws;
let nextId = 1;
const pending = new Map();
const errors = [];
async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const pages = await (await fetch(`http://localhost:${CDP}/json`)).json();
      const page = pages.find((p) => p.type === "page");
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
        ws.onmessage = (m) => {
          const d = JSON.parse(m.data);
          if (d.id && pending.has(d.id)) (pending.get(d.id)(d), pending.delete(d.id));
          if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
        };
        return;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error("không kết nối được trình duyệt");
}
const send = (method, params = {}) => new Promise((res) => { const id = nextId++; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const KEYS = { w: ["KeyW", 87], a: ["KeyA", 65], s: ["KeyS", 83], d: ["KeyD", 68], e: ["KeyE", 69], q: ["KeyQ", 81], " ": ["Space", 32], Shift: ["ShiftLeft", 16], Escape: ["Escape", 27] };
const key = (type, k) => send("Input.dispatchKeyEvent", { type, key: k, code: KEYS[k][0], windowsVirtualKeyCode: KEYS[k][1] });
const tap = async (k, ms = 60) => (await key("keyDown", k), await sleep(ms), await key("keyUp", k));
const open = async (q) => {
  await send("Page.navigate", { url: `http://localhost:${PORT}/${q}` });
  await sleep(1800);
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Page.setWebLifecycleState", { state: "active" }).catch?.(() => {});
  for (let i = 0; i < 50 && !(await ev("!!window.__ddl && document.visibilityState === 'visible'")); i++) await sleep(100);
};
const click = (id) => ev(`document.getElementById(${JSON.stringify(id)}).click()`);
const state = () => ev(`(() => { const d = window.__ddl; const g = d.game; return { mode: d.mode, night: g?.night, st: g?.state, sim: g?.sim, ticks: g?.ticks, score: g?.score, total: d.run.total, x: g?.player.x, y: g?.player.y, z: g?.player.z, grounded: g?.player.grounded, dashCd: g?.player.dashCd, carried: g?.player.carried, screen: document.getElementById('screen').innerText.slice(0, 120).replace(/\\n/g, ' | '), hudShown: getComputedStyle(document.getElementById('hud')).display }; })()`);

const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok }); console.log(`${ok ? "ĐẠT   " : "HỎNG  "} ${name}${info ? "  (" + info + ")" : ""}`); };
const waitFor = async (pred, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await state(); if (pred(s)) return s; await sleep(100); } return await state(); };

// bot: đi tới đèn rồi nạp (dùng phím thật, đọc vị trí từ game)
async function walkTo(tx, tz, within = 1.2) {
  const held = new Set();
  const set = async (k, on) => { if (on && !held.has(k)) (held.add(k), await key("keyDown", k)); if (!on && held.has(k)) (held.delete(k), await key("keyUp", k)); };
  for (let i = 0; i < 400; i++) {
    const s = await state();
    const dx = tx - s.x, dz = tz - s.z;
    if (Math.hypot(dx, dz) <= within) break;
    // camera yaw 180: A → +X, D → −X, W → +Z, S → −Z
    await set("a", dx > 0.4); await set("d", dx < -0.4); await set("w", dz > 0.4); await set("s", dz < -0.4);
    await sleep(60);
  }
  for (const k of [...held]) await set(k, false);
}

try {
  await connect();
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });

  // 1. menu → giới thiệu → chơi
  await open("?seed=2");
  let s = await state();
  check("Menu hiện đầu tiên", s.mode === "menu" && s.screen.includes("Bắt đầu"), s.screen);
  await click("start");
  s = await state();
  check("Bắt đầu → màn giới thiệu Đêm 1 có lời Ông Đăng", s.mode === "intro" && s.screen.includes("Đảo Bến") && s.screen.includes("Ông Đăng"));
  await click("go");
  s = await state();
  check("Vào chơi, HUD hiện", s.mode === "playing" && s.hudShown === "block");

  { const a = await state(); await sleep(2000); const b = await state(); const gpu = await ev("(()=>{const gl=document.createElement('canvas').getContext('webgl');const e=gl&&gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'})()"); console.log(`        tốc độ mô phỏng: ${((b.sim - a.sim) / 2).toFixed(0)} tick/giây (cần 60) · ${gpu}`); }
  // 2. điều khiển
  const x0 = (await state()).x;
  await key("keyDown", "d"); await sleep(700); await key("keyUp", "d");
  s = await state();
  check("Phím D di chuyển Mây (screen-right = −X)", x0 - s.x > 2, `Δx=${(s.x - x0).toFixed(2)}`);
  await tap(" ", 80); await sleep(120);
  check("Space nhảy (rời mặt đất)", !(await state()).grounded);
  await sleep(900);
  await tap("Shift", 80); await sleep(100);
  check("Shift lướt (hồi chiêu lướt chạy)", (await state()).dashCd > 0);

  // 3. tạm dừng đứng yên
  await tap("Escape");
  s = await state();
  check("Esc → tạm dừng, có menu Tiếp tục/Chơi lại/Cài đặt/Về menu", s.mode === "paused" && ["Tiếp tục", "Chơi lại Đêm", "Cài đặt", "Về menu"].every((t) => s.screen.includes(t)), s.screen);
  const frozen = s.sim;
  await sleep(900);
  check("Tạm dừng: logic đứng yên hoàn toàn", (await state()).sim === frozen);
  // 4. cài đặt lưu lại
  await click("settings");
  await ev(`(() => { const e = document.getElementById('s-vol'); e.value = 30; e.dispatchEvent(new Event('input')); const m = document.getElementById('s-sens'); m.value = 20; m.dispatchEvent(new Event('input')); })()`);
  const saved = JSON.parse((await ev(`localStorage.getItem('ddl.settings.v1')`)) ?? "{}");
  check("Cài đặt âm lượng/độ nhạy được lưu (localStorage)", Math.abs(saved.volume - 0.3) < 0.01 && Math.abs(saved.sensitivity - 2) < 0.01, JSON.stringify(saved));
  await send("Page.reload"); await sleep(1800);
  await click("start"); await click("go");
  await tap("Escape"); await click("settings");
  const vol = await ev(`document.getElementById('s-vol').value`);
  check("Cài đặt còn nguyên sau khi mở lại game", vol === "30", `volume=${vol}`);
  await click("back"); await click("resume");
  s = await state();
  const sim1 = s.sim; await sleep(600);
  check("Tiếp tục: logic chạy lại", s.mode === "playing" && (await state()).sim > sim1);
  await tap("Escape"); await click("restart");
  s = await state();
  check("Chơi lại Đêm từ menu tạm dừng", s.mode === "intro" && s.sim === 0);

  // 5. thua (hết giờ) → chơi lại
  await open("?autostart=1&seed=2&time=2");
  s = await waitFor((v) => v.mode === "result", 6000);
  check("Hết giờ → thua, màn kết quả có 'Chơi lại Đêm này'", s.mode === "result" && s.screen.includes("Chơi lại Đêm này") && s.st === "lost", s.screen);
  await click("retry");
  s = await state();
  check("Chơi lại → giới thiệu lại Đêm 1", s.mode === "intro" && s.night === 1 && s.score === 0);

  // 6. thắng Đêm 1 (4 đèn đã sáng, mang 10 đom đóm, nạp đèn cuối bằng phím)
  await open("?autostart=1&seed=2&lit=4&carry=10");
  await walkTo(-23.8, 7.7, 1.2);
  { const w = await state(); console.log(`        bot dừng tại (${w.x.toFixed(1)}, ${w.z.toFixed(1)}) mang ${w.carried}, mode ${w.mode}, st ${w.st}, sim ${w.sim}`); }
  await tap("e", 80);
  s = await waitFor((v) => v.mode === "result", 6000);
  check("Nạp đèn cuối → thắng Đêm 1 → màn kết quả 'Đêm kế tiếp'", s.mode === "result" && s.st === "won" && s.screen.includes("Đêm kế tiếp"), `score=${s.score} total=${s.total}`);
  check("Điểm Đêm 1 > 0 và cộng vào tổng", s.score > 0 && s.total === s.score);
  await click("next");
  s = await state();
  check("Đêm kế tiếp → giới thiệu Đêm 2 (Đảo Cau)", s.mode === "intro" && s.night === 2 && s.screen.includes("Đảo Cau"));

  // 7. thắng Đêm 3 → Bình Minh
  await open("?autostart=3&seed=2&lit=6&carry=10");
  await walkTo(-20, -35, 1.2);
  await tap("e", 80);
  s = await waitFor((v) => v.mode === "result", 6000);
  check("Thắng Đêm 3 → kết quả 'Đón Bình Minh'", s.mode === "result" && s.st === "won" && s.screen.includes("Đón Bình Minh"), s.screen);
  await click("next");
  s = await state();
  check("Màn Bình Minh hiện tổng điểm", s.mode === "dawn" && s.screen.includes("Bình Minh") && s.screen.includes("Tổng điểm") && s.total > 0, s.screen);

  // 8. HUD đầy đủ
  await open("?autostart=1&seed=2&time=25");
  const hudInfo = JSON.parse(await ev(`JSON.stringify({ timerClass: document.getElementById('hud-timer').className, timerColor: getComputedStyle(document.getElementById('hud-timer')).color, cells: document.querySelectorAll('#hud-motes i').length, flames: document.querySelectorAll('#hud-flames .flame').length, dash: !!document.getElementById('cd-dash'), pulse: !!document.getElementById('cd-pulse'), lanterns: document.getElementById('hud-lanterns').innerText, score: document.getElementById('hud-score').innerText, timer: document.getElementById('hud-timer').innerText })`));
  check("HUD: đồng hồ mm:ss đổi sang đỏ khi ≤ 30 s", hudInfo.timerClass.includes("danger") && hudInfo.timerColor === "rgb(255, 90, 95)" && /^0:2\d$/.test(hudInfo.timer), `${hudInfo.timer} ${hudInfo.timerColor}`);
  check("HUD: 3 Ngọn Lửa, thanh đom đóm 10 ô, biểu tượng hồi chiêu Lướt/Tỏa Sáng, đèn k/n, điểm", hudInfo.flames === 3 && hudInfo.cells === 10 && hudInfo.dash && hudInfo.pulse && /0\/5/.test(hudInfo.lanterns) && /\d/.test(hudInfo.score), JSON.stringify(hudInfo));
  await open("?autostart=3&seed=2&lit=6&carry=3");
  check("HUD: mũi tên chỉ tới đèn chưa sáng khi nó ngoài màn hình", (await ev(`getComputedStyle(document.getElementById('hud-arrow')).display`)) === "block");
  await walkTo(-20, -35, 1.2);
  await sleep(200);
  const prompt = await ev(`document.getElementById('hud-prompt').innerText`);
  check("HUD: nhắc \"E — Nạp ánh sáng (x/10)\" khi đứng gần đèn", /E\s*—\s*Nạp ánh sáng \(0\/10\)/.test(prompt), prompt);

  check("Không có ngoại lệ JS trong suốt phiên", errors.length === 0, errors.slice(0, 2).join(" | "));
} catch (e) {
  check("Kịch bản chạy hết không lỗi", false, String(e));
} finally {
  proc.kill();
  server.kill();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} đạt.`);
process.exit(bad ? 1 : 0);
