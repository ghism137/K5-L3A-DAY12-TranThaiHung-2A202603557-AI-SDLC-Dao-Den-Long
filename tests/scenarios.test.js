import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cases } from "../scenarios/cases.mjs";
import { main } from "../src/headless/run.js";

const dir = mkdtempSync(join(tmpdir(), "ddl-"));

export function runCase(c, tag = "a") {
  const sc = join(dir, `${c.name}.sc.json`);
  const inp = join(dir, `${c.name}.in.json`);
  const out = join(dir, `${c.name}.${tag}.jsonl`);
  writeFileSync(sc, JSON.stringify(c.scenario));
  const args = ["--seed", String(c.seed), "--night", "1", "--scenario", sc, "--ticks", String(c.ticks), "--out", out];
  if (c.inputs) {
    writeFileSync(inp, JSON.stringify(c.inputs));
    args.push("--inputs", inp);
  }
  args.push("--snapshot-every", String(c.snapshotEvery ?? 10));
  const code = main(args, () => {});
  const text = readFileSync(out, "utf8");
  const rows = text.trim().split("\n").map((l) => JSON.parse(l));
  return {
    code,
    text,
    events: rows.filter((r) => r.type === "event"),
    snaps: rows.filter((r) => r.type === "snapshot"),
    end: rows.at(-1),
  };
}

for (const c of cases) {
  test(`${c.name}: ${c.req}`, () => {
    const o = runCase(c);
    assert.equal(o.code, 0);
    assert.equal(o.end.type, "end");
    assert.deepEqual(c.check(o), []);
    if (c.determinism) {
      assert.equal(runCase(c, "b").text, o.text, "hai lần chạy phải giống hệt");
      assert.notEqual(runCase({ ...c, seed: 43 }, "c").text, o.text, "seed khác phải khác kết quả");
    }
  });
}
