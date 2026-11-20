// Đo FPS thật của bản có giao diện ở 1280×720 bằng trình duyệt headless + CDP. Dùng: npm run fps [-- docs/proof/phase2/fps.json]
// Ghi rõ GPU/bộ render mà trình duyệt dùng (nếu là SwiftShader = render phần mềm, số đo không đại diện cho máy có GPU).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(process.argv[2] ?? "docs/proof/phase2/fps.json");
const PORT = 8099;
const CDP = 9333;
const SECONDS = Number(process.env.FPS_SECONDS ?? 8);

const candidates = [
  process.env.BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error("Không tìm thấy Chrome/Edge. Đặt biến BROWSER=<đường dẫn>.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ["src/server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });

async function cdp(wsUrl, expression) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
  const result = await new Promise((res) => {
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id === 1) res(d.result?.result?.value);
    };
    ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
  });
  ws.close();
  return result;
}

const results = [];
try {
  await sleep(800);
  for (const night of [1, 2, 3]) {
    const profile = mkdtempSync(join(tmpdir(), "ddl-fps-"));
    const proc = spawn(browser, [
      "--headless=new", "--window-size=1280,720", `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
      "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-extensions",
      `http://localhost:${PORT}/?autostart=${night}&seed=3&fps&dpr=1`,
    ], { stdio: "ignore" });
    await sleep((SECONDS + 3) * 1000);
    const pages = await (await fetch(`http://localhost:${CDP}/json`)).json();
    const page = pages.find((p) => p.type === "page" && p.url.includes(`autostart=${night}`));
    const fps = JSON.parse((await cdp(page.webSocketDebuggerUrl, "JSON.stringify(window.__fps || null)")) ?? "null");
    const gpu = await cdp(page.webSocketDebuggerUrl, "(()=>{const gl=document.createElement('canvas').getContext('webgl');const e=gl&&gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'không rõ'})()");
    proc.kill();
    results.push({ night, ...fps, gpu });
    console.log(`Đêm ${night}: ${JSON.stringify(fps)}  [${gpu}]`);
    await sleep(500);
  }
} finally {
  server.kill();
}
const report = { when: new Date().toISOString(), resolution: "1280x720", machine: `${os.type()} ${os.release()}, ${os.cpus()[0].model}, ${Math.round(os.totalmem() / 1e9)} GB RAM`, seconds_per_night: SECONDS, results };
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(report, null, 2));
const soft = results.some((r) => /swiftshader|software|llvmpipe/i.test(r.gpu ?? ""));
console.log(soft ? "\nLƯU Ý: bộ render phần mềm (SwiftShader), số đo thấp hơn máy có GPU." : "\nGPU thật.");
process.exit(results.every((r) => r.avg >= 30) ? 0 : 1);
