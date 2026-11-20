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
  [S, "(s - R.shadeFirstTick) % level.shades.interval === 0", "(s - R.shadeFirstTick) % (level.shades.interval + 1) === 0", "lịch sinh Bóng Mực lệch"],
  [S, "if (len > 1) {", "if (false) {", "không chuẩn hóa move"],
  [S, "const tick = g.ticks + 1;", "const tick = g.ticks;", "tick sự kiện lệch 1"],
  [S, "const wx = mx * Math.cos(th) + mz * Math.sin(th);", "const wx = mx * Math.cos(th) - mz * Math.sin(th);", "công thức cam_yaw"],
  [S, "if (d < tu.safe_radius) {", "if (false) {", "không chặn ở mép vùng an toàn"],
  [S, "if (d.state === \"chase\" && !d.stole && p.carried > 0", "if (d.state === \"chase\" && p.carried > 0", "Gió Lạc cướp nhiều lần", true], // tương đương: sau khi cướp nó ở flee
  [S, "if (p.invuln > 0 || hitDone) continue;", "if (p.invuln > 0) continue;", "bỏ hitDone", true], // tương đương: invuln > 0 ngay sau hit đầu
  [T, "if (hn !== null && hn > y + R.stepUp) {", "if (false) {", "vách đứng không chặn"],
  [T, "if (y < t.y1 && Math.hypot(nx - t.x, nz - t.z) < t.r", "if (false && Math.hypot(nx - t.x, nz - t.z) < t.r", "tháp không chặn"],
  // ---- Phase 3 (Ticket-03): nhiên liệu, hút dầu, luật thắng bình minh ----
  [S, "for (const l of g.lanterns) if (l.lit) l.fuel -= tu.fuel_decay_per_s;", "for (const l of g.lanterns) if (l.lit) l.fuel -= tu.fuel_decay_per_s * 2;", "hao dầu gấp đôi"],
  [S, "l.fuel -= tu.drain_per_s;", "l.fuel -= 1;", "hút dầu 1/s thay vì 5/s"],
  [S, "g.lanterns.filter((l) => l.lit && l.fuel >= lowU)", "g.lanterns.filter((l) => l.lit && l.fuel > lowU)", "vùng an toàn mất ở đúng 30"],
  [S, "const weak = g.lanterns.filter((l) => l.lit && l.fuel < lowU);", "const weak = g.lanterns.filter((l) => l.lit && l.fuel <= lowU);", "đèn yếu tính cả đúng 30"],
  [S, "best.everLit ? tu.relight_cost : tu.lantern_cost", "best.everLit ? tu.lantern_cost : tu.relight_cost", "chi phí thắp lại bị đảo"],
  [S, "Math.ceil((maxU - best.fuel) / perMoteU)", "Math.floor((maxU - best.fuel) / perMoteU)", "châm dầu làm tròn xuống"],
  [S, "Math.ceil(tu.win_ratio * g.lanterns.length - 1e-9)", "Math.floor(tu.win_ratio * g.lanterns.length - 1e-9)", "ngưỡng thắng làm tròn xuống"],
  [S, "if (lit.length >= need) {", "if (lit.length > need) {", "ngưỡng thắng nghiêm ngặt"],
  [S, "if (l.lit && l.fuel <= 0) {", "if (l.lit && l.fuel < 0) {", "đèn hết dầu đúng 0 không tắt"],
  [S, "tu.carry_capacity + 2 * g.successful", "tu.carry_capacity + 1 * g.successful", "sức chứa tăng 1 thay vì 2"],
  [S, 'g.score += sh.state === "drain" ? tu.score.per_stun_drain : tu.score.per_stun;', "g.score += tu.score.per_stun;", "stun Bóng drain không có thưởng"],
  [S, 'if (sh.stun > 0 && --sh.stun === 0) sh.state = "wander";', 'if (sh.stun > 0 && --sh.stun === 0) sh.state = "chase";', "hết choáng về chase"],
  [S, "g.successful++;", "g.successful += 0;", "thắp lại không tăng sức chứa"],
  [S, "g.score += tu.score.per_lit_lantern_dawn + Math.floor(l.fuel / 60);", "g.score += tu.score.per_lit_lantern_dawn;", "thưởng bình minh bỏ floor(fuel)"],
  [S, "<= R.drainChaseDist) leaveDrain", "<= 3) leaveDrain", "drain→chase ở 3 m thay vì 6 m"],
  [S, "if (sh.drainTicks % 60 === 0)", "if (sh.drainTicks % 61 === 0)", "fuel_drain lệch nhịp"],
  [S, "if (wasLow && best.fuel >= lowU) newlyLit.push(best);", "", "châm dầu qua 30 không đẩy Bóng Mực"],
  [S, "if (!l || !l.lit || l.fuel >= lowU) leaveDrain(sh, \"wander\");", "if (!l || !l.lit) leaveDrain(sh, \"wander\");", "drain không thoát khi fuel ≥ 30", true], // tương đương: fuel chỉ tăng qua châm dầu/thắp lại, cả hai đều gọi startPush đã đổi drain→wander
  [S, "(!l.lit || l.fuel < maxU) && dist2", "(!l.lit) && dist2", "không châm dầu được đèn đang sáng"],
  [S, "if (tgt.lit && dist2(sh.x, sh.z, tgt.x, tgt.z) <= R.drainReach + 1e-9) {", "if (dist2(sh.x, sh.z, tgt.x, tgt.z) <= R.drainReach + 1e-9) {", "hút cả đèn tắt"],
  [S, "best.relit++;", "", "relit_count không tăng"],
  [S, "const pool = weak.length ? weak : g.lanterns.filter((l) => !l.lit);", "const pool = weak;", "không đi về đèn tắt"],
  [S, "g.score += used * tu.score.per_mote;", "g.score += 0;", "châm dầu không có điểm"],
  [S, "g.score += tu.score.per_relight;", "g.score += tu.score.per_lantern;", "thắp lại tính điểm thắp đầu"],
  [S, "t.fuel = Math.min(maxU, Math.round((t.fuelSpec ?? tu.fuel_max) * 60));", "t.fuel = Math.min(maxU, Math.round((t.fuelSpec ?? 50) * 60));", "lit:true không fuel mặc định sai"],
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
