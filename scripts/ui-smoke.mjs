// Kiểm thử đầu-cuối giao diện: một "bot" điều khiển trình duyệt thật bằng phím và chuột (CDP). Dùng: npm run smoke
// Kiểm: menu → giới thiệu → chơi; tạm dừng đứng yên; cài đặt được lưu; phím đi/nhảy/lướt; chơi lại Đêm;
// thua (dawn) → chơi lại; thắng Đêm 1 → Đêm 2; thắng Đêm 3 → Bình Minh với tổng điểm. Thoát mã 1 nếu có mục hỏng.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

const dataDir = mkdtempSync(join(tmpdir(), "ddl-smoke-data-"));
const server = spawn(process.execPath, ["src/server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), DDL_DATA_DIR: dataDir }, stdio: "ignore" });
const proc = spawn(browser, ["--headless=new", "--window-size=1280,720", `--remote-debugging-port=${CDP}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ddl-smoke-"))}`, "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--no-first-run", "--autoplay-policy=no-user-gesture-required", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion", "about:blank"], { stdio: "ignore" });

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
          if (d.method === "Runtime.exceptionThrown") {
          const x = d.params.exceptionDetails;
          // chỉ tính lỗi do trang của game ném ra; bỏ qua script do chính trình duyệt chèn vào (ví dụ Edge Copilot)
          // chỉ lỗi từ mã của game (src/ hoặc three); script do trình duyệt tự chèn có dòng 0 và url là chính trang
          if ((x.url ?? "").startsWith(`http://localhost:${PORT}/src/`) || (x.url ?? "").includes("/node_modules/three/")) {
            errors.push(x.exception?.description ?? x.text);
            if (process.env.SMOKE_LOG) appendFileSync(process.env.SMOKE_LOG, `${x.url}:${x.lineNumber}:${x.columnNumber}\n${x.exception?.description ?? x.text}\n---\n`);
          }
        }
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
const KEYS = { j: ["KeyJ", 74], Backspace: ["Backspace", 8], w: ["KeyW", 87], a: ["KeyA", 65], s: ["KeyS", 83], d: ["KeyD", 68], e: ["KeyE", 69], q: ["KeyQ", 81], " ": ["Space", 32], Shift: ["ShiftLeft", 16], Escape: ["Escape", 27] };
const key = (type, k) => send("Input.dispatchKeyEvent", { type, key: k, code: KEYS[k][0], windowsVirtualKeyCode: KEYS[k][1] });
const tap = async (k, ms = 60) => (await key("keyDown", k), await sleep(ms), await key("keyUp", k));
// bấm phím tới khi hiệu ứng xuất hiện (tối đa 4 lần): kiểm "phím này có tác dụng", không phụ thuộc một khung hình chậm làm lỡ một lần bấm ngắn
const tapUntil = async (k, pred, tries = 4, ms = 80) => {
  for (let i = 0; i < tries; i++) {
    await tap(k, ms);
    await sleep(200);
    const st = await state();
    if (await pred(st)) return st;
  }
  return await state();
};
const open = async (q) => {
  await ev("window.__oldPage = true").catch(() => {});
  await send("Page.navigate", { url: `http://localhost:${PORT}/${q}` });
  // chờ TRANG MỚI (không còn cờ của trang cũ): nếu không, dưới tải nặng bước kế tiếp có thể đọc nhầm trạng thái trang cũ
  for (let i = 0; i < 100 && !(await ev("!!window.__ddl && !window.__oldPage && document.readyState === 'complete'").catch(() => false)); i++) await sleep(100);
  await sleep(300);
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Page.setWebLifecycleState", { state: "active" }).catch?.(() => {});
  for (let i = 0; i < 50 && !(await ev("!!window.__ddl && document.visibilityState === 'visible'")); i++) await sleep(100);
};
const click = (id) => ev(`document.getElementById(${JSON.stringify(id)}).click()`);
const state = () => ev(`(() => { const d = window.__ddl; const g = d.game; return { mode: d.mode, night: g?.night, st: g?.state, sim: g?.sim, ticks: g?.ticks, score: g?.score, total: d.run.total, x: g?.player.x, y: g?.player.y, z: g?.player.z, grounded: g?.player.grounded, dashCd: g?.player.dashCd, carried: g?.player.carried, screen: document.getElementById('screen').innerText.slice(0, 400).replace(/\\n/g, ' | '), hudShown: getComputedStyle(document.getElementById('hud')).display, fuel0: g ? g.lanterns[0].fuel / 60 : null, lit0: g ? g.lanterns[0].lit : null, ever0: g ? g.lanterns[0].everLit : null, cap: g ? g.capacity() : null }; })()`);

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
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

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
  s = await tapUntil(" ", (v) => !v.grounded);
  check("Space nhảy (rời mặt đất)", !s.grounded);
  await sleep(900);
  s = await tapUntil("Shift", (v) => v.dashCd > 0);
  check("Shift lướt (hồi chiêu lướt chạy)", s.dashCd > 0);

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
  s = await waitFor((v) => v.mode === "result", 20000);
  check("Hết giờ → thua, màn kết quả có 'Chơi lại Đêm này'", s.mode === "result" && s.screen.includes("Chơi lại Đêm này") && s.st === "lost", s.screen);
  await click("retry");
  s = await state();
  check("Chơi lại → giới thiệu lại Đêm 1", s.mode === "intro" && s.night === 1 && s.score === 0);

  // 6. [Ticket-03] thắng bằng cách sống tới bình minh với đủ đèn sáng (3/5 ở Đêm 1); không còn thắng sớm
  await open("?autostart=1&seed=2&lit=5&time=3");
  await sleep(1200);
  s = await state();
  check("Thắp đủ 5/5 đèn không kết thúc Đêm sớm (còn đang chơi)", s.mode === "playing" && s.st === "playing", `mode=${s.mode}`);
  s = await waitFor((v) => v.mode === "result", 20000);
  check("Sống tới bình minh với đủ đèn → thắng, màn kết quả 'Bình minh' + 'Đêm kế tiếp'", s.mode === "result" && s.st === "won" && s.screen.includes("Bình minh") && s.screen.includes("Đêm kế tiếp"), `score=${s.score} total=${s.total} ${s.screen}`);
  check("Điểm Đêm 1 > 0 và cộng vào tổng", s.score > 0 && s.total === s.score);
  await click("next");
  s = await state();
  check("Đêm kế tiếp → giới thiệu Đêm 2 (Đảo Cau) kèm mục tiêu 4/6", s.mode === "intro" && s.night === 2 && s.screen.includes("Đảo Cau") && s.screen.includes("4 trong 6"));
  await open("?autostart=1&seed=2&lit=2&time=3");
  s = await waitFor((v) => v.mode === "result", 20000);
  check("Hết giờ với 2/5 đèn (< 3/5) → thua, kết quả nói rõ thiếu đèn", s.mode === "result" && s.st === "lost" && s.screen.includes("2/5") && s.screen.includes("cần ≥ 3"), JSON.stringify({ mode: s.mode, st: s.st, night: s.night, screen: s.screen }));

  // 6b. châm dầu bằng phím thật: đi tới đèn yếu rồi bấm E
  await open("?autostart=1&seed=2&lit=1&fuel=20&carry=10");
  await walkTo(0, 25, 1.2);
  const before = await state();
  s = await tapUntil("e", (v) => v.carried < before.carried);
  check("Bấm E ở đèn yếu: châm dầu (fuel tăng mạnh, đom đóm giảm, +5 điểm mỗi đom đóm)", s.fuel0 > 90 && s.carried < before.carried && s.score === 5 * (10 - s.carried), `fuel ${before.fuel0?.toFixed(1)} → ${s.fuel0?.toFixed(1)}, mang ${before.carried} → ${s.carried}, điểm ${s.score}`);

  // 6c. hết dầu thì tắt, nhớ ever_lit
  await open("?autostart=1&seed=2&lit=1&fuel=0.05");
  await sleep(400);
  s = await state();
  check("Đèn hết dầu tắt (lit=false) và nhớ ever_lit", s.lit0 === false && s.ever0 === true && s.fuel0 === 0, `lit=${s.lit0} ever=${s.ever0} fuel=${s.fuel0}`);

  // 7. thắng Đêm 3 → Bình Minh
  await open("?autostart=3&seed=2&lit=5&time=3");
  s = await waitFor((v) => v.mode === "result", 20000);
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

  // 9. [Ticket-03] HUD sức chứa tăng dần và chế độ mù màu
  await open("?autostart=1&seed=2&sl=3&carry=4");
  const capInfo = JSON.parse(await ev(`JSON.stringify({ cells: document.querySelectorAll('#hud-motes i').length, cnt: document.querySelector('#hud-motes .cnt').innerText, lanterns: document.getElementById('hud-lanterns').innerText })`));
  check("HUD: sức chứa 10 + 2×3 = 16 ô, hiển thị mang/sức chứa (4/16), 'cần ≥ 3'", capInfo.cells === 16 && capInfo.cnt === "4/16" && capInfo.lanterns.includes("cần ≥ 3"), JSON.stringify(capInfo));
  await open("?seed=2");
  await click("settings");
  await ev(`(() => { const c = document.getElementById('s-cb'); c.checked = true; c.dispatchEvent(new Event('change')); })()`);
  const cbSaved = JSON.parse((await ev(`localStorage.getItem('ddl.settings.v1')`)) ?? "{}");
  check("Cài đặt 'Bảng màu dễ phân biệt' được lưu", cbSaved.colorblind === true, JSON.stringify(cbSaved));
  await open("?autostart=1&seed=2&time=25");
  const cb = JSON.parse(await ev(`JSON.stringify({ body: document.body.classList.contains('cb'), color: getComputedStyle(document.getElementById('hud-timer')).color, before: getComputedStyle(document.getElementById('hud-timer'), '::before').content, edge: window.__ddl.palette.shadeEdge, danger: window.__ddl.palette.danger })`));
  check("Chế độ mù màu: viền Bóng Mực #00B3FF, cảnh báo UI trắng kèm ⚠ (còn nguyên sau khi tải lại)", cb.body && cb.edge === 0x00b3ff && cb.danger === 0xffffff && cb.color === "rgb(255, 255, 255)" && cb.before.includes("⚠"), JSON.stringify(cb));
  await ev("localStorage.removeItem('ddl.settings.v1')");
  await open("?autostart=1&seed=2&time=25");
  const normal = JSON.parse(await ev(`JSON.stringify({ body: document.body.classList.contains('cb'), color: getComputedStyle(document.getElementById('hud-timer')).color, edge: window.__ddl.palette.shadeEdge })`));
  check("Tắt mù màu: trở lại #7A3CFF và cảnh báo đỏ #FF5A5F", !normal.body && normal.edge === 0x7a3cff && normal.color === "rgb(255, 90, 95)", JSON.stringify(normal));

  // ================= Phase 4 =================
  const text = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)}) || {}).innerText || ""`);
  const minFont = () => ev(`(() => { let min = 99, who = ""; for (const n of document.body.querySelectorAll("*")) { if (n.closest("#fps")) continue; const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden") continue; if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue; const r = n.getBoundingClientRect(); if (!r.width || !r.height) continue; const fs = parseFloat(cs.fontSize); if (fs < min) { min = fs; who = n.tagName + "." + n.className + ":" + n.textContent.trim().slice(0, 24); } } return { min, who }; })()`);

  // 10. bảng xếp hạng: nhập tên sau khi thua, lưu xuống đĩa, hiện từ menu chính
  await open("?seed=2");
  await click("board");
  await sleep(400);
  check("Bảng xếp hạng từ menu chính: trống thì có lời mời chơi", (await text("#screen")).includes("Chưa có ai trên bảng"));
  await open("?autostart=1&seed=2&time=2");
  s = await waitFor((v) => v.mode === "result", 20000);
  check("Sau khi thua có ô nhập tên để lưu điểm", s.screen.includes("Lưu điểm") && !!(await ev("!!document.getElementById('pname')")));
  const fillName = (n) => ev(`(() => { const i = document.getElementById("pname"); i.value = ${JSON.stringify(n)}; i.dispatchEvent(new Event("input")); })()`);
  await fillName("ab");
  check("Tên quá ngắn (2 ký tự) bị báo lỗi ngay", (await text("#pmsg")).includes("3–12"));
  await fillName("a b c");
  check("Tên có khoảng trắng bị báo lỗi", (await text("#pmsg")).includes("3–12"));
  await fillName("Hưng_Đèn_01");
  await click("psave");
  await sleep(500);
  check("Lưu tên tiếng Việt có dấu thành công và báo hạng", (await text("#pmsg")).includes("Đã lưu! Bạn đứng hạng 1"), await text("#pmsg"));
  await open("?autostart=3&seed=2&lit=5&time=3&quiet=1");
  s = await waitFor((v) => v.mode === "result", 20000);
  await click("next");
  s = await state();
  check("Thắng Đêm 3 → màn Bình Minh có ô nhập tên", s.mode === "dawn" && !!(await ev("!!document.getElementById('pname')")));
  await fillName("Mây_Nhỏ");
  await click("psave");
  await sleep(500);
  check("Lưu điểm sau Bình Minh: hạng 1 (điểm cao hơn)", (await text("#pmsg")).includes("hạng 1"), await text("#pmsg"));
  await open("?seed=2");
  await click("board");
  await sleep(500);
  const rows = JSON.parse(await ev("JSON.stringify([...document.querySelectorAll('table.lb tbody tr')].map((r) => [...r.children].map((c) => c.innerText)))"));
  check("Bảng xếp hạng hiện đúng thứ tự (điểm giảm dần), có tên và số Đêm thắng", rows.length === 2 && rows[0][1] === "Mây_Nhỏ" && rows[1][1] === "Hưng_Đèn_01" && rows[0][3] === "1/3" && rows[1][3] === "0/3" && Number(rows[0][2]) > Number(rows[1][2]), JSON.stringify(rows));
  const disk = JSON.parse(readFileSync(join(dataDir, "leaderboard.json"), "utf8"));
  check("Điểm được lưu trên ĐĨA (data/leaderboard.json) với đủ trường, ISO 8601 có múi giờ", disk.entries.length === 2 && disk.entries.every((e) => Object.keys(e).join() === "name,score,nights_won,achieved_at,seed" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(e.achieved_at)), JSON.stringify(disk.entries[0]));
  const exp = join(dataDir, "exported.json");
  const er = spawnSync(process.execPath, ["src/server.js", "--export-leaderboard", exp], { cwd: ROOT, env: { ...process.env, DDL_DATA_DIR: dataDir }, encoding: "utf8" });
  check("Lệnh --export-leaderboard xuất đúng thứ tự, thoát mã 0", er.status === 0 && JSON.stringify(JSON.parse(readFileSync(exp, "utf8")).entries.map((e) => e.name)) === JSON.stringify(["Mây_Nhỏ", "Hưng_Đèn_01"]));

  // 11. đổi phím: gán, báo trùng, lưu, áp dụng trong game, khôi phục mặc định
  await open("?seed=2");
  await click("settings");
  await click("keys");
  const keyBtn = (a, sl) => ev(`document.querySelector('.keybtn[data-a="${a}"][data-s="${sl}"]').click()`);
  await keyBtn("jump", 0);
  await tap("j");
  check("Đổi phím Nhảy sang J", (await text("#kmsg")).includes("= J"), await text("#kmsg"));
  await keyBtn("jump", 0);
  await tap("e");
  check("Gán phím đã dùng (E = Tương tác) bị từ chối và báo rõ hành động trùng", (await text("#kmsg")).includes("đang dùng cho") && (await text("#kmsg")).includes("Tương tác"), await text("#kmsg"));
  await keyBtn("pulse", 1);
  await tap("Backspace");
  const km1 = JSON.parse((await ev("localStorage.getItem('ddl.settings.v1')")) ?? "{}").keymap;
  check("Phím được lưu (jump=J, pulse ô 2 đã xóa)", km1?.jump?.[0] === "j" && km1?.pulse?.[1] === null && km1?.pulse?.[0] === "q", JSON.stringify(km1?.jump) + JSON.stringify(km1?.pulse));
  await open("?autostart=1&seed=2&quiet=1");
  await tap(" ", 80); await sleep(150);
  check("Phím cũ (Space) không còn nhảy sau khi đổi", (await state()).grounded === true);
  s = await tapUntil("j", (v) => v.grounded === false);
  check("Phím mới (J) nhảy được, còn nguyên sau khi tải lại trang", s.grounded === false);
  await sleep(900);
  await tap("Escape"); await click("settings"); await click("keys"); await click("kreset");
  const km2 = JSON.parse((await ev("localStorage.getItem('ddl.settings.v1')")) ?? "{}").keymap;
  check("Khôi phục mặc định (jump = Space) và được lưu", km2?.jump?.[0] === " " && km2?.pulse?.[1] === "f", JSON.stringify(km2?.jump) + JSON.stringify(km2?.pulse));

  // 12. phụ đề / chỉ báo hình ảnh
  await open("?autostart=1&seed=2&time=12&quiet=1&hold=1");
  await ev("window.__ddl.advance(130)");
  check("Chỉ báo: '10 giây cuối'", (await text("#cues")).includes("10 giây cuối"), await text("#cues"));
  await open("?autostart=1&seed=2&hold=1");
  await ev("window.__ddl.advance(300)");
  const spawnInfo = JSON.parse(await ev(`JSON.stringify({ cue: document.getElementById("cues").innerText, arrows: document.querySelectorAll("#spawn-arrows .sarrow").length })`));
  let anyVisible = false;
  for (const yaw of [180, 0, 90, 270]) {
    await ev(`window.__ddl.cam.yaw = ${yaw}`);
    await sleep(250);
    if (await ev("[...document.querySelectorAll('#spawn-arrows .sarrow')].some((a) => getComputedStyle(a).display === 'block')")) { anyVisible = true; break; }
  }
  check("Chỉ báo: Bóng Mực xuất hiện kèm phụ đề và mũi tên chỉ hướng ở mép màn hình", spawnInfo.cue.includes("Bóng Mực xuất hiện") && spawnInfo.arrows >= 1 && anyVisible, JSON.stringify(spawnInfo) + " visible=" + anyVisible);
  await open("?autostart=1&seed=2&lit=1&fuel=30.5&quiet=1&hold=1");
  await ev("window.__ddl.advance(60)");
  check("Chỉ báo: đèn có fuel < 30 báo 'sắp tắt' kèm tên đèn", (await text("#cues")).includes("Đèn L1 sắp tắt"), await text("#cues"));
  await open("?autostart=3&seed=2&quiet=1&hold=1");
  await ev("window.__ddl.advance(1700)");
  check("Chỉ báo: gió sắp thổi (Đêm 3)", (await text("#cues")).includes("Gió sắp thổi"), await text("#cues"));
  await open("?autostart=1&seed=2&time=12&quiet=1&hold=1");
  await ev("window.__ddl.settings.cues = false; window.__ddl.advance(130)");
  check("Tắt 'Phụ đề và chỉ báo' trong Cài đặt thì không còn chỉ báo", (await text("#cues")) === "");

  // 13. giảm chuyển động
  await open("?seed=2&shade=1&quiet=1"); // không autostart: mô phỏng chỉ chạy qua advance(), nên đọc được rung/chớp ngay sau cú đánh
  await click("start");
  await ev("window.__ddl.advance(1)");
  const motionOn = JSON.parse(await ev("JSON.stringify({ flashes: window.__ddl.ui.stats.flashes, shake: window.__ddl.shake })"));
  check("Bình thường: bị đánh thì chớp màn hình và rung camera", motionOn.flashes >= 1 && motionOn.shake > 0, JSON.stringify(motionOn));
  await ev("localStorage.setItem('ddl.settings.v1', JSON.stringify({ reduceMotion: true }))");
  await open("?seed=2&shade=1&quiet=1");
  await click("start");
  await ev("window.__ddl.advance(1)");
  const reduced = JSON.parse(await ev("JSON.stringify({ flashes: window.__ddl.ui.stats.flashes, shake: window.__ddl.shake, cls: document.body.classList.contains('reduce') })"));
  check("Giảm chuyển động: không chớp màn hình, không rung camera", reduced.flashes === 0 && reduced.shake === 0 && reduced.cls, JSON.stringify(reduced));
  await ev("localStorage.removeItem('ddl.settings.v1')");

  // 14. cỡ chữ ≥ 18 px ở 1280×720 trên mọi màn hình; chữ lớn ×1.25
  const fonts = {};
  await open("?seed=2");
  fonts.menu = await minFont();
  await click("settings"); fonts.settings = await minFont();
  await click("keys"); fonts.keys = await minFont();
  await click("kback"); await click("back"); await click("board"); await sleep(400); fonts.board = await minFont();
  await open("?autostart=1&seed=2&lit=2&fuel=20&carry=4&quiet=1");
  await ev("window.__ddl.advance(40)");
  await sleep(300);
  fonts.hud = await minFont();
  await tap("Escape"); fonts.pause = await minFont();
  await open("?autostart=1&seed=2&time=2&quiet=1");
  await waitFor((v) => v.mode === "result", 20000);
  fonts.result = await minFont();
  const smallest = Object.entries(fonts).sort((a, b) => a[1].min - b[1].min)[0];
  check("Mọi chữ giao diện ≥ 18 px ở 1280×720 (menu, cài đặt, đổi phím, bảng xếp hạng, HUD, tạm dừng, kết quả)", smallest[1].min >= 18, `nhỏ nhất ${smallest[1].min}px ở '${smallest[0]}': ${smallest[1].who}`);
  await ev("localStorage.setItem('ddl.settings.v1', JSON.stringify({ largeText: true }))");
  await open("?seed=2");
  const big = JSON.parse(await ev("JSON.stringify({ root: getComputedStyle(document.documentElement).fontSize, cls: document.documentElement.classList.contains('large') })"));
  const bigMin = await minFont();
  check("Chữ lớn (×1.25): gốc 20 px và mọi chữ ≥ 22.5 px", big.root === "20px" && big.cls && bigMin.min >= 22.5, JSON.stringify(big) + " nhỏ nhất " + bigMin.min + "px: " + bigMin.who);
  await ev("localStorage.removeItem('ddl.settings.v1')");

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
