// Địa hình: các "bề mặt" xếp chồng (đĩa, vành, hình chữ nhật, dốc). Không phụ thuộc render.
import { R } from "./rules.js";

const rad = (d) => (d * Math.PI) / 180;

// Độ cao của bề mặt s tại (x, z), hoặc null nếu (x, z) không thuộc bề mặt.
export function surfaceH(s, x, z) {
  switch (s.type) {
    case "disk":
      return (x - s.cx) ** 2 + (z - s.cz) ** 2 <= s.r * s.r ? s.h : null;
    case "ring": {
      if (s.zPositive && !(z > 0)) return null;
      const d = Math.hypot(x - s.cx, z - s.cz);
      return d >= s.r0 && d <= s.r1 ? s.h : null;
    }
    case "rect":
      return x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 ? s.h : null;
    case "ramp": {
      const ux = Math.cos(rad(s.angleDeg));
      const uz = Math.sin(rad(s.angleDeg));
      const t = x * ux + z * uz; // dọc theo bán kính
      const lat = -x * uz + z * ux; // ngang
      if (Math.abs(lat) > s.halfWidth || t > s.rFoot || t < s.rTop) return null;
      return s.hFoot + ((s.hTop - s.hFoot) * (s.rFoot - t)) / (s.rFoot - s.rTop);
    }
    default:
      return null;
  }
}

// Mặt đất cao nhất mà chân ở độ cao y có thể đứng lên (h <= y + step). null nếu là hư không.
export function groundAt(level, x, z, y, step = R.stepUp) {
  let best = null;
  for (const s of level.surfaces) {
    const h = surfaceH(s, x, z);
    if (h !== null && h <= y + step && (best === null || h > best)) best = h;
  }
  return best;
}

// Bề mặt gần độ cao refY nhất tại (x, z) (dùng cho vật lơ lửng như Bóng Mực). null nếu hư không.
export function heightNear(level, x, z, refY) {
  let best = null;
  for (const s of level.surfaces) {
    const h = surfaceH(s, x, z);
    if (h !== null && (best === null || Math.abs(h - refY) < Math.abs(best - refY))) best = h;
  }
  return best;
}

export const overGround = (level, x, z) => level.surfaces.some((s) => surfaceH(s, x, z) !== null);

// Di chuyển ngang (ox,oz) -> (nx,nz) có bị cột đặc (vách tầng / tháp) chặn không, với chân ở độ cao y.
export function blocked(level, ox, oz, nx, nz, y) {
  for (const s of level.surfaces) {
    const hn = surfaceH(s, nx, nz);
    if (hn !== null && hn > y + R.stepUp) {
      const ho = surfaceH(s, ox, oz);
      if (ho !== null && ho > y + R.stepUp) continue; // đã nằm trong cột đặc: cho phép đi ra
      return true;
    }
  }
  for (const t of level.towers) {
    if (y < t.y1 && Math.hypot(nx - t.x, nz - t.z) < t.r && !(Math.hypot(ox - t.x, oz - t.z) < t.r)) return true;
  }
  return false;
}

// Đẩy điểm ra khỏi tháp (cho Bóng Mực bay thẳng). Trả về [x, z].
export function pushOutOfTowers(level, x, z) {
  for (const t of level.towers) {
    const d = Math.hypot(x - t.x, z - t.z);
    if (d < t.r) {
      const ux = d === 0 ? 1 : (x - t.x) / d;
      const uz = d === 0 ? 0 : (z - t.z) / d;
      return [t.x + ux * t.r, t.z + uz * t.r];
    }
  }
  return [x, z];
}
