// Kiểm tra đột biến: phá cố ý từng luật trong src/core, `npm test` PHẢI đỏ. Mutant sống sót = test còn yếu.
// Dùng: npm run mutate. Luôn hoàn lại file gốc (kể cả khi lỗi). Thoát mã 1 nếu có mutant sống (trừ mutant đã đánh dấu tương đương).
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const S = "src/core/sim.js";
const T = "src/core/terrain.js";
const mutants = [
  [S, "if (p.invuln > 0 || hitDone) continue;", "if (false) continue;", "bất tử không chặn hit"],
  [S, "g.score += amount * tu.score.per_mote;", "g.score += 0;", "điểm nạp đom đóm"],
  [S, "p.fallWait = R.fallWaitTicks;", "p.fallWait = R.fallWaitTicks + 1;", "chờ hồi sinh 61 tick"],
  [S, "sh.recoil = R.shadeRecoilTicks + 1;", "sh.recoil = R.shadeRecoilTicks;", "recoil 59 bước"],
  [S, "if (p.charm === 0) p.dashCd = dashCdN;", "if (p.charm === 0) p.dashCd = dashCdN + 1;", "hồi chiêu lướt 91"],
  [S, "c.respawn = R.charmRespawnTicks;", "c.respawn = R.charmRespawnTicks + 1;", "hồi bùa 2701"],
  [S, "Math.hypot(sh.x - p.x, sh.y - cy, sh.z - p.z) <= tu.pulse_radius", "Math.hypot(sh.x - p.x, 0, sh.z - p.z) <= tu.pulse_radius", "Tỏa Sáng đo 2D"],
  [S, "if (!p.launched) {", "if (true) {", "bục bắn lại liên tục"],
  [S, "const step = sh.push === 1 ? left : left / sh.push;", "const step = left / 30;", "đẩy khỏi vùng an toàn lệch nhịp"],
  [S, "dx += (R.wind.speed * Math.cos", "dx += (R.wind.speed * 1.1 * Math.cos", "gió 2.2 m/s"],
  [S, "const dropped = Math.floor(p.carried * tu.hit_drop_ratio);", "const dropped = Math.ceil(p.carried * tu.hit_drop_ratio);", "rơi làm tròn lên"],
  [S, "if (e.jump && p.grounded && !p.launched) p.vy = R.jumpSpeed;", "if (e.jump && !p.launched) p.vy = R.jumpSpeed;", "nhảy trên không"],
  [S, "else if (g.lanterns.every((l) => l.lit)) {", "else if (g.remaining > 0 && g.lanterns.every((l) => l.lit)) {", "không thắng đúng tick hết giờ"],
  [S, "(s - R.shadeFirstTick) % level.shades.interval === 0", "(s - R.shadeFirstTick) % (level.shades.interval + 1) === 0", "lịch sinh Bóng Mực lệch"],
  [S, "if (len > 1) {", "if (false) {", "không chuẩn hóa move"],
  [S, "const tick = g.ticks + 1;", "const tick = g.ticks;", "tick sự kiện lệch 1"],
  [S, "const wx = mx * Math.cos(th) + mz * Math.sin(th);", "const wx = mx * Math.cos(th) - mz * Math.sin(th);", "công thức cam_yaw"],
  [S, "if (d < tu.safe_radius) {", "if (false) {", "không chặn ở mép vùng an toàn"],
  [S, "if (d.state === \"chase\" && !d.stole && p.carried > 0", "if (d.state === \"chase\" && p.carried > 0", "Gió Lạc cướp nhiều lần", true], // tương đương: sau khi cướp nó ở flee
  [S, "if (p.invuln > 0 || hitDone) continue;", "if (p.invuln > 0) continue;", "bỏ hitDone", true], // tương đương: invuln > 0 ngay sau hit đầu
  [T, "if (hn !== null && hn > y + R.stepUp) {", "if (false) {", "vách đứng không chặn"],
  [T, "if (y < t.y1 && Math.hypot(nx - t.x, nz - t.z) < t.r", "if (false && Math.hypot(nx - t.x, nz - t.z) < t.r", "tháp không chặn"],
];

let survived = 0;
for (const [file, from, to, name, equivalent] of mutants) {
  const orig = readFileSync(file, "utf8");
  if (!orig.includes(from)) {
    console.log(`? KHÔNG TÌM THẤY: ${name} (${from.slice(0, 50)})`);
    survived++;
    continue;
  }
  writeFileSync(file, orig.replace(from, to));
  let r;
  try {
    r = spawnSync("npm", ["test", "--silent"], { encoding: "utf8", shell: true });
  } finally {
    writeFileSync(file, orig);
  }
  const caught = r.status !== 0;
  if (!caught && !equivalent) survived++;
  console.log(`${caught ? "đã bắt " : equivalent ? "tương đương" : "SỐNG SÓT"}  ${name}`);
}
console.log(`\n${mutants.length} đột biến, ${survived} sống sót (không tính mutant tương đương).`);
process.exit(survived ? 1 : 0);
