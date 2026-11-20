// Máy chủ tĩnh tối giản cho bản có giao diện. Chỉ phục vụ danh sách file được phép.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 8080);
const ALLOW = ["web", "src/core", "src/render", "node_modules/three/build", "node_modules/three/examples/jsm"].map((p) => resolve(ROOT, p) + sep);
const EXACT = new Set([resolve(ROOT, "game.contract.json")]);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css" };

createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (url === "/") url = "/web/index.html";
    const file = normalize(resolve(ROOT, "." + url));
    if (!EXACT.has(file) && !ALLOW.some((a) => file.startsWith(a))) {
      res.writeHead(404).end("not found");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, "0.0.0.0", () => console.log(`Đảo Đèn Lồng: http://localhost:${PORT}`));
