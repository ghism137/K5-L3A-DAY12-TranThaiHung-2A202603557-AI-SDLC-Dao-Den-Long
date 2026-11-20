// Đóng gói bản phát hành chạy được (web tĩnh + máy chủ Node, đã gom sẵn three): npm run package
// Tạo dist/dao-den-long-<phiên bản>.zip. Giải nén rồi chạy start.bat (Windows) hoặc ./start.sh (macOS/Linux) — chỉ cần Node >= 22.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, chmodSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2] ?? "v1.0.0";
const name = `dao-den-long-${version}`;
const dist = resolve(ROOT, "dist");
const stage = join(dist, name);

rmSync(dist, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
const copy = (rel, to = rel) => {
  if (!existsSync(join(ROOT, rel))) throw new Error(`thiếu ${rel}`);
  cpSync(join(ROOT, rel), join(stage, to), { recursive: true });
};
for (const p of ["src", "web", "scripts", "game.contract.json", "package.json", "package-lock.json", "LICENSE", "CREDITS.md", "CHANGELOG.md"]) copy(p);
// three: chỉ cần thư mục build (module chạy trong trình duyệt) + giấy phép
copy("node_modules/three/build");
copy("node_modules/three/package.json");
copy("node_modules/three/LICENSE");
rmSync(join(stage, "scripts", "package.mjs"), { force: true });

writeFileSync(join(stage, "start.bat"), "@echo off\r\nnode src\\server.js\r\npause\r\n");
writeFileSync(join(stage, "start.sh"), "#!/bin/sh\ncd \"$(dirname \"$0\")\"\nnode src/server.js\n");
try { chmodSync(join(stage, "start.sh"), 0o755); } catch {}
writeFileSync(join(stage, "HUONG-DAN.md"), `# Đảo Đèn Lồng ${version}: bản chạy được

## Chạy (cần Node.js >= 22)
- Windows: bấm đúp \`start.bat\` (hoặc \`node src/server.js\`)
- macOS/Linux: \`./start.sh\` (hoặc \`node src/server.js\`)
Mở http://localhost:8080 trên Chrome hoặc Edge. Điểm xếp hạng lưu ở thư mục \`data/\` cạnh game.

## Docker (không cần cài Node)
\`\`\`bash
git clone https://github.com/ghism137/K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long
cd K5-L3A-DAY12-TranThaiHung-2A202603557-AI-SDLC-Dao-Den-Long
docker build -t ddl . && docker run --rm -p 8080:8080 -v ddl-data:/data ddl
\`\`\`

## Lệnh khác
- Xuất bảng xếp hạng: \`node src/server.js --export-leaderboard out.json\`
- Headless: \`node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out.jsonl\`
- Soak: \`node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json\`
- Benchmark (cần Chrome/Edge): \`node scripts/bench.mjs --seed 42 --duration 30 --out bench.json\`
`);

// nén
mkdirSync(dist, { recursive: true });
const zip = join(dist, `${name}.zip`);
let r;
if (process.platform === "win32") {
  r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", `Compress-Archive -Path '${stage}' -DestinationPath '${zip}' -Force`], { encoding: "utf8" });
} else {
  r = spawnSync("zip", ["-qr", zip, name], { cwd: dist, encoding: "utf8" });
}
if (r.status !== 0 || !existsSync(zip)) {
  console.error(`lỗi: không nén được (${r.stderr || r.error || "không rõ"})`);
  process.exit(1);
}
console.log(`đã tạo ${zip} (${(statSync(zip).size / 1048576).toFixed(2)} MB)`);
console.log(`phiên bản ${JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version} · thư mục chạy thử: ${stage}`);
