// Hook Stop của Claude Code: chặn agent kết thúc khi `npm test` đang đỏ (exit 2 + stderr = agent phải sửa tiếp).
// stop_hook_active=true nghĩa là agent đã bị chặn một lần và đang sửa: không chặn lặp vô hạn.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, "") || "{}");
} catch {}
if (input.stop_hook_active) process.exit(0);

const r = spawnSync("npm", ["test", "--silent"], { encoding: "utf8", shell: true });
if (r.status !== 0) {
  const tail = (r.stdout + r.stderr).split("\n").filter((l) => /not ok|fail|error/i.test(l)).slice(0, 15).join("\n");
  console.error(`npm test đang ĐỎ. Sửa cho xanh trước khi kết thúc.\n${tail}`);
  process.exit(2);
}
