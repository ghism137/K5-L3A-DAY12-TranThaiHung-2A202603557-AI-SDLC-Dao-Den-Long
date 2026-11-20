// Benchmark: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless] [--browser <đường dẫn>]
// Mở trình duyệt (Chrome/Edge) có cửa sổ 1280×720, nạp cảnh benchmark chuẩn (?bench=1), đo rồi tự thoát mã 0.
// Tính thống kê bằng src/core/bench.js (đúng định nghĩa của ticket). Thoát mã 1 nếu không đo được.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as netServer } from "node:net";
import os from "node:os";
import { benchStats, BENCH } from "../src/core/bench.js";

const PROCESS_START_EPOCH_MS = performance.timeOrigin; // "từ lúc tiến trình bắt đầu"
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg) => {
  console.error(`lỗi: ${msg}`);
  process.exit(1);
};

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, def) => {
  const i = argv.indexOf(n);
  return i < 0 ? def : argv[i + 1];
};
const num = (n, def) => {
  const v = val(n, undefined);
  if (v === undefined) return def;
  if (!/^-?\d+(\.\d+)?$/.test(v)) fail(`${n} cần một số`);
  return Number(v);
};
const seed = num("--seed", 42);
const duration = num("--duration", 30);
const out = val("--out", undefined);
if (!out) fail("thiếu --out <file>");
if (duration <= 0) fail("--duration phải > 0");
const wantHeadless = flag("--headless");

const candidates = [
  val("--browser", undefined),
  process.env.BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) fail("không tìm thấy Chrome/Edge. Đặt BROWSER=<đường dẫn> hoặc --browser <đường dẫn>");

const freePort = () => new Promise((res) => { const s = netServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

// ---------- đo RSS của cây tiến trình trình duyệt (MB), null nếu hệ điều hành không cho đo ----------
function treeRssMb(rootPid) {
  try {
    let rows;
    if (process.platform === "win32") {
      const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process | ForEach-Object { \"$($_.ProcessId),$($_.ParentProcessId),$($_.WorkingSetSize)\" }"], { encoding: "utf8", timeout: 15000 });
      rows = r.stdout.trim().split(/\r?\n/).map((l) => l.split(",").map(Number));
    } else {
      const r = spawnSync("ps", ["-A", "-o", "pid=,ppid=,rss="], { encoding: "utf8", timeout: 15000 });
      rows = r.stdout.trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number)).map(([p, pp, kb]) => [p, pp, kb * 1024]);
    }
    const byParent = new Map();
    const size = new Map();
    for (const [pid, ppid, bytes] of rows) {
      if (!Number.isFinite(pid)) continue;
      size.set(pid, Number.isFinite(bytes) ? bytes : 0);
      (byParent.get(ppid) ?? byParent.set(ppid, []).get(ppid)).push(pid);
    }
    let total = 0;
    let n = 0;
    const stack = [rootPid];
    while (stack.length) {
      const p = stack.pop();
      if (size.has(p)) (total += size.get(p)), n++;
      stack.push(...(byParent.get(p) ?? []));
    }
    return n > 1 && Number.isFinite(total) ? total / 1048576 : null;
  } catch {
    return null;
  }
}

// ---------- CDP tối giản ----------
let ws;
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "lỗi trong trang");
  return r.result.value;
};

const port = await freePort();
const cdpPort = await freePort();
const profile = mkdtempSync(join(tmpdir(), "ddl-bench-"));
const server = spawn(process.execPath, [join(ROOT, "src/server.js")], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
let proc;
const cleanup = () => {
  try { ws?.close(); } catch {}
  try { proc?.kill(); } catch {}
  try { server.kill(); } catch {}
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 1500).unref();
};
process.on("exit", cleanup);

try {
  // máy chủ sẵn sàng
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://localhost:${port}/game.contract.json`)).ok) break; } catch {}
    await sleep(100);
  }

  const browserArgs = [
    "--window-size=1280,720", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`,
    "--disable-gpu-vsync", "--disable-frame-rate-limit", // tắt vsync nếu trình duyệt cho phép
    "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion",
    "--mute-audio",
  ];
  const url = `http://localhost:${port}/?bench=1&seed=${seed}&duration=${duration}`;
  const launch = async (headless) => {
    proc = spawn(browser, [...(headless ? ["--headless=new"] : []), ...browserArgs, "about:blank"], { stdio: "ignore" });
    for (let i = 0; i < 100; i++) {
      try {
        const pages = await (await fetch(`http://localhost:${cdpPort}/json`)).json();
        const page = pages.find((p) => p.type === "page");
        if (page) return page;
      } catch {}
      await sleep(150);
    }
    return null;
  };
  let headless = wantHeadless;
  let page = await launch(headless);
  if (!page && !headless) {
    console.error("không mở được cửa sổ trình duyệt, thử lại ở chế độ headless");
    try { proc.kill(); } catch {}
    await sleep(500);
    headless = true;
    page = await launch(true);
  }
  if (!page) fail("không kết nối được trình duyệt (CDP)");

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => ((ws.onopen = ok), (ws.onerror = no)));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { res } = pending.get(d.id);
      pending.delete(d.id);
      res(d.result ?? d);
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");
  // cửa sổ trang đúng 1280×720, tỉ lệ 1, không toàn màn hình
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Page.bringToFront");
  await send("Page.navigate", { url });

  // chờ đo xong. RSS của cây tiến trình trình duyệt: mỗi mẫu tốn ~1.5 s CPU trên Windows nên KHÔNG lấy trong cửa sổ đo
  // (sẽ làm nhiễu số đo). Lấy 1 mẫu lúc khởi động nóng và 1 mẫu ngay sau khi cửa sổ đo kết thúc (trang vẫn đang vẽ cảnh bench).
  let peak = null;
  const sampleMem = async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const m = treeRssMb(proc.pid);
      if (m !== null) {
        if (peak === null || m > peak) peak = m;
        return;
      }
      await sleep(400); // cây tiến trình có thể chưa kịp dựng xong: thử lại
    }
  };
  let sampledWarmup = false;
  const deadline = Date.now() + (BENCH.warmupS + duration + 60) * 1000;
  let state;
  for (;;) {
    await sleep(250);
    if (Date.now() > deadline) fail("hết thời gian chờ cảnh benchmark (trang không chạy?)");
    try { state = await evalJs("window.__bench ? { done: window.__bench.done, measuring: window.__bench.measuring, n: window.__bench.dts.length } : null"); } catch { state = null; }
    if (!state) continue;
    if (!sampledWarmup && !state.measuring && !state.done && state.n === 0) {
      sampledWarmup = true;
      await sampleMem(); // khởi động nóng: ngoài cửa sổ đo
    }
    if (state.done) {
      await sampleMem(); // ngay sau cửa sổ đo
      break;
    }
  }
  const data = await evalJs("({ dts: window.__bench.dts, first: window.__bench.firstFrameEpochMs, gpu: window.__bench.gpu, three: window.__bench.three, ua: window.__bench.userAgent, viewport: window.__bench.viewport, dpr: window.__bench.dpr, shades: window.__bench.shades, motes: window.__bench.motes })");
  if (val("--screenshot", undefined)) {
    const shot = await send("Page.captureScreenshot", { format: "png" }); // sau cửa sổ đo, trang vẫn đang vẽ cảnh bench
    writeFileSync(resolve(val("--screenshot", "")), Buffer.from(shot.data, "base64"));
  }
  const stats = benchStats(data.dts);
  if (val("--raw", undefined)) writeFileSync(resolve(val("--raw", "")), JSON.stringify(data.dts)); // thời gian từng khung (ms), để phân tích
  const uaVer = (data.ua.match(/(Edg)\/([\d.]+)/) ?? data.ua.match(/(Chrome)\/([\d.]+)/) ?? []).slice(1, 3).join(" ");
  const report = {
    contract_version: "1.3",
    avg_fps: stats.avg_fps,
    p1_low_fps: stats.p1_low_fps,
    frame_ms_p95: stats.frame_ms_p95,
    frames: stats.frames,
    load_ms: Math.round(data.first - PROCESS_START_EPOCH_MS),
    peak_mem_mb: peak === null ? null : Math.round(peak),
    vsync_off: true, // cờ --disable-gpu-vsync --disable-frame-rate-limit đã được truyền cho trình duyệt (xem README mục Benchmark)
    renderer: `${data.gpu}; ${uaVer}${headless ? " (headless)" : ""}; Three.js r${data.three}; ${data.viewport.join("x")} @${data.dpr}x; ${data.shades} Bóng Mực, ${data.motes} đom đóm`,
    os: `${os.type()} ${os.release()} (${os.platform()} ${os.arch()}), ${os.cpus()[0].model.trim()}, ${Math.round(os.totalmem() / 1073741824)} GB RAM`,
  };
  const target = resolve(out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  const ok = report.avg_fps >= 60 && report.p1_low_fps >= 30 && report.load_ms <= 10000;
  console.log(ok ? "\nĐẠT ngưỡng (avg ≥ 60, p1 low ≥ 30, load ≤ 10000 ms) trên máy này; máy chấm có thể khác." : "\nChưa đạt ngưỡng trên máy này (avg ≥ 60, p1 low ≥ 30, load ≤ 10000 ms).");
  process.exitCode = 0; // theo ticket: tự thoát mã 0 sau khi đo; ngưỡng do máy chấm quyết định
} catch (e) {
  console.error(`lỗi: ${e.message}`);
  process.exitCode = 1;
} finally {
  cleanup();
  setTimeout(() => process.exit(process.exitCode ?? 0), 300);
}
