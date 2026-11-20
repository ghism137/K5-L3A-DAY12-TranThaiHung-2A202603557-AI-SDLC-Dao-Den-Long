// Máy chủ cục bộ: phục vụ file tĩnh (danh sách cho phép) + API bảng xếp hạng ghi ra đĩa.
//   npm start                                   mở game ở http://localhost:8080
//   npm start -- --export-leaderboard out.json  xuất {"entries":[...]} rồi thoát (không mở cổng)
// Dữ liệu: ./data/leaderboard.json (đổi bằng biến môi trường DDL_DATA_DIR).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { insertEntry, sanitizeEntries, entryError, isoWithOffset } from "./core/leaderboard.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = resolve(process.env.DDL_DATA_DIR ?? resolve(ROOT, "data"));
const DATA_FILE = resolve(DATA_DIR, "leaderboard.json");

export function loadLeaderboard() {
  try {
    return sanitizeEntries(JSON.parse(readFileSync(DATA_FILE, "utf8")));
  } catch {
    return [];
  }
}
function saveLeaderboard(entries) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + "\n"); // ghi tạm rồi đổi tên: không để file dở dang khi tắt đột ngột
  renameSync(tmp, DATA_FILE);
}

// ---- lệnh xuất ----
const exportAt = process.argv.indexOf("--export-leaderboard");
if (exportAt >= 0) {
  const out = process.argv[exportAt + 1];
  if (!out) {
    console.error("lỗi: --export-leaderboard cần đường dẫn file");
    process.exit(1);
  }
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify({ entries: loadLeaderboard() }, null, 2) + "\n");
  console.log(`đã xuất bảng xếp hạng: ${out}`);
  process.exit(0);
}

const ALLOW = ["web", "src/core", "src/render", "node_modules/three/build", "node_modules/three/examples/jsm"].map((p) => resolve(ROOT, p) + sep);
const EXACT = new Set([resolve(ROOT, "game.contract.json")]);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css" };
const json = (res, code, body) => res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify(body));

function readBody(req, limit = 4096) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        if (chunks.length || size - c.length <= limit) fail(Object.assign(new Error("quá lớn"), { code: 413 }));
        chunks.length = 0;
        req.resume(); // bỏ phần còn lại để máy chủ kịp trả lời 413 mà không cắt kết nối giữa chừng
      } else chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
}

async function api(req, res) {
  if (req.method === "GET") return json(res, 200, { entries: loadLeaderboard() });
  if (req.method !== "POST") return json(res, 405, { error: "chỉ hỗ trợ GET và POST" });
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return json(res, e.code === 413 ? 413 : 400, { error: e.code === 413 ? "dữ liệu quá lớn" : "JSON không hợp lệ" });
  }
  const entry = { name: body?.name, score: body?.score, nights_won: body?.nights_won, seed: body?.seed, achieved_at: isoWithOffset(new Date()) };
  const err = entryError(entry);
  if (err) return json(res, 400, { error: err });
  const { entries, rank } = insertEntry(loadLeaderboard(), entry);
  saveLeaderboard(entries);
  return json(res, 200, { entries, rank });
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (url === "/api/leaderboard") return await api(req, res);
    let path = url === "/" ? "/web/index.html" : url;
    const file = normalize(resolve(ROOT, "." + path));
    if (!EXACT.has(file) && !ALLOW.some((a) => file.startsWith(a))) {
      res.writeHead(404).end("not found");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" }).end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404).end("not found");
  }
});
server.listen(PORT, "0.0.0.0", () => console.log(`Đảo Đèn Lồng: http://localhost:${PORT}  (dữ liệu: ${existsSync(DATA_DIR) ? DATA_DIR : DATA_DIR + " (sẽ được tạo)"})`));
