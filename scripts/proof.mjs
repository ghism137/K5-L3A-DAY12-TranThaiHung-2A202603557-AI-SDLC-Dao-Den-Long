// Sinh bằng chứng thật: chạy CLI headless cho từng case, lưu scenario/inputs/output, chấm bằng check(), ghi REPORT.md.
// Dùng: npm run proof [-- docs/proof/phase1]. Thoát mã 1 nếu có case không đạt.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { cases } from "../scenarios/cases.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(process.argv[2] ?? "docs/proof/phase1");
mkdirSync(outDir, { recursive: true });
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

const rows = [];
let failed = 0;
for (const c of cases) {
  const d = join(outDir, c.name);
  mkdirSync(d, { recursive: true });
  const sc = join(d, "scenario.json");
  const inp = join(d, "inputs.json");
  const out = join(d, "out.jsonl");
  writeFileSync(sc, JSON.stringify(c.scenario, null, 2));
  const args = ["src/headless/cli.js", "--seed", String(c.seed), "--night", "1", "--scenario", sc, "--ticks", String(c.ticks), "--out", out, "--snapshot-every", String(c.snapshotEvery ?? 10)];
  if (c.inputs) {
    writeFileSync(inp, JSON.stringify(c.inputs, null, 2));
    args.push("--inputs", inp);
  }
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  let errs = [];
  let note = "";
  if (r.status !== 0) errs = [`CLI thoát mã ${r.status}: ${r.stderr.trim()}`];
  else {
    const text = readFileSync(out, "utf8");
    const parsed = text.trim().split("\n").map((l) => JSON.parse(l));
    errs = c.check({ events: parsed.filter((x) => x.type === "event"), snaps: parsed.filter((x) => x.type === "snapshot"), end: parsed.at(-1) });
    note = `sha256 ${sha(text)}`;
    if (c.determinism) {
      const out2 = join(d, "out-run2.jsonl");
      spawnSync(process.execPath, args.map((a) => (a === out ? out2 : a)), { cwd: ROOT });
      const same = readFileSync(out2, "utf8") === text;
      note += same ? "; chạy lần 2 GIỐNG HỆT" : "; chạy lần 2 KHÁC";
      if (!same) errs.push("không tất định");
    }
  }
  if (errs.length) failed++;
  rows.push(`| ${c.name} | ${c.req} | \`${c.name}/out.jsonl\` | ${errs.length ? "CHƯA ĐẠT: " + errs.join("; ") : "đạt"} | ${note} |`);
}

const report = `# Bằng chứng Phase 1 (sinh tự động)

Sinh bởi \`npm run proof\` từ mã ở commit hiện tại. Máy: ${os.type()} ${os.release()}, ${os.cpus()[0].model}, Node ${process.version}.

| Case | Yêu cầu kiểm chứng | Output thật | Kết quả | Ghi chú |
|---|---|---|---|---|
${rows.join("\n")}

Tổng: ${cases.length - failed}/${cases.length} đạt.
`;
writeFileSync(join(outDir, "REPORT.md"), report);
console.log(report);
process.exit(failed ? 1 : 0);
