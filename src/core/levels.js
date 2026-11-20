// Bản đồ chuẩn của 3 Đêm (Ticket-02 Phần 2) dưới dạng dữ liệu. Góc: x = cx + r·cosθ, z = cz + r·sinθ.
const rad = (d) => (d * Math.PI) / 180;
const polar = (cx, cz, r, deg, y = 0) => [cx + r * Math.cos(rad(deg)), y, cz + r * Math.sin(rad(deg))];
const ring = (cx, cz, r, startDeg, stepDeg, n, y = 0) => Array.from({ length: n }, (_, i) => polar(cx, cz, r, startDeg + i * stepDeg, y));
const L = (id, x, y, z) => ({ id, x, y, z });

const night1 = {
  id: 1,
  name: "Đảo Bến",
  durationKey: "night1_duration_s",
  start: [0, 0, 0],
  surfaces: [{ type: "disk", cx: 0, cz: 0, r: 40, h: 0 }],
  pads: [],
  towers: [],
  lanterns: [L("L1", 0, 0, 25), L("L2", 23.8, 0, 7.7), L("L3", 14.7, 0, -20.2), L("L4", -14.7, 0, -20.2), L("L5", -23.8, 0, 7.7)],
  motePoints: [...ring(0, 0, 12, 0, 45, 8), ...ring(0, 0, 33, 0, 22.5, 16)],
  shadePoints: ring(0, 0, 37, 15, 30, 12),
  shades: { interval: 480, max: 6, speed: null },
  charms: [],
  drifters: false,
  wind: false,
};

const night2 = {
  id: 2,
  name: "Đảo Cau",
  durationKey: "night2_duration_s",
  start: [0, 0, 0],
  surfaces: [
    { type: "disk", cx: 0, cz: 0, r: 28, h: 0 },
    { type: "disk", cx: 70, cz: 0, r: 28, h: 0 },
    { type: "rect", x0: 26, x1: 44, z0: -2, z1: 2, h: 0 }, // cầu tre, không lan can
  ],
  pads: [
    { x: 20, y: 0, z: 18, r: 1, vy: 14, vh: 24, dir: [70 - 20, 0 - 18] }, // bắn về tâm đảo B
    { x: 50, y: 0, z: -18, r: 1, vy: 14, vh: 24, dir: [0 - 50, 0 + 18] }, // bắn về tâm đảo A
  ],
  towers: [],
  lanterns: [L("L1", 0, 0, 20), L("L2", 17, 0, -10), L("L3", -17, 0, -10), L("L4", 70, 0, 20), L("L5", 87, 0, -10), L("L6", 53, 0, -10)],
  motePoints: [
    ...ring(0, 0, 10, 0, 90, 4), ...ring(0, 0, 22, 0, 45, 8),
    ...ring(70, 0, 10, 0, 90, 4), ...ring(70, 0, 22, 0, 45, 8),
  ],
  shadePoints: [...ring(0, 0, 26, 22.5, 45, 8), ...ring(70, 0, 26, 22.5, 45, 8)],
  shades: { interval: 420, max: 8, speed: null },
  charms: [{ id: "C1", x: 35, y: 0, z: 0 }],
  drifters: true,
  wind: false,
};

const night3 = {
  id: 3,
  name: "Đảo Chuông",
  durationKey: "night3_duration_s",
  start: [0, 0, -30], // (0,0,0) nằm trong tháp chuông nên không dùng được (giả định B8)
  surfaces: [
    { type: "disk", cx: 0, cz: 0, r: 45, h: 0 },
    { type: "ring", cx: 0, cz: 0, r0: 12, r1: 24, h: 3, zPositive: true },
    { type: "disk", cx: 0, cz: 0, r: 8, h: 6 },
    { type: "ramp", angleDeg: 30, rFoot: 30, rTop: 24, hFoot: 0, hTop: 3, halfWidth: 1.5 },
    { type: "ramp", angleDeg: 150, rFoot: 30, rTop: 24, hFoot: 0, hTop: 3, halfWidth: 1.5 },
  ],
  pads: [{ x: 0, y: 3, z: 13, r: 1, vy: 12, vh: 8, dir: [0, -1] }],
  towers: [{ x: 0, z: 0, r: 2, y0: 6, y1: 14 }],
  lanterns: [L("L1", 0, 6, 6), L("L2", 18, 3, 10), L("L3", -18, 3, 10), L("L4", 35, 0, -10), L("L5", -35, 0, -10), L("L6", 20, 0, -35), L("L7", -20, 0, -35)],
  motePoints: [...ring(0, 0, 34, 0, 20, 18, 0), ...ring(0, 0, 18, 20, 20, 8, 3), ...ring(0, 0, 5, 45, 90, 4, 6)],
  shadePoints: ring(0, 0, 43, 0, 22.5, 16),
  shades: { interval: 360, max: 10, speed: 4.5 },
  charms: [{ id: "C1", x: 30, y: 0, z: 25 }, { id: "C2", x: -30, y: 0, z: 25 }],
  drifters: true,
  wind: true,
};

export const NIGHTS = { 1: night1, 2: night2, 3: night3 };
