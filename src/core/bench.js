// Cảnh benchmark chuẩn (Ticket-04 mục 1): hàm thuần, không phụ thuộc render hay Node.
// Cảnh: Đêm 1, 200 Bóng Mực wander rải đều theo seed, 100 đom đóm, 3 đèn L1-L3 sáng fuel 100, Mây đứng yên (0,0,0).
import { createRng } from "./rng.js";

export const BENCH = { shades: 200, motes: 100, warmupS: 3, orbitRadius: 30, orbitHeight: 15, orbitPeriodS: 15, islandRadius: 40 };
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Rải đều trên đĩa bán kính R bằng đường xoắn ốc Vogel, xoay theo seed. Trả về [[x, y, z], ...]
export function spread(count, radius, seed) {
  const phase = createRng(seed)() * 2 * Math.PI;
  return Array.from({ length: count }, (_, i) => {
    const r = radius * Math.sqrt((i + 0.5) / count);
    const a = phase + i * GOLDEN;
    return [r * Math.cos(a), 0, r * Math.sin(a)];
  });
}

// Scenario của cảnh benchmark (dùng với createGame({ bench: true, night: 1 })).
export function benchScenario(seed) {
  return {
    random_motes: false,
    random_shades: false,
    random_drifters: false,
    wind_enabled: false,
    player: { pos: [0, 0, 0], flames: 3, carried: 0 },
    lanterns: [{ id: "L1", lit: true, fuel: 100 }, { id: "L2", lit: true, fuel: 100 }, { id: "L3", lit: true, fuel: 100 }],
    shades: spread(BENCH.shades, BENCH.islandRadius - 2, seed).map((pos, i) => ({ id: `S${i + 1}`, pos, state: "wander" })),
    motes: spread(BENCH.motes, BENCH.islandRadius - 4, seed + 1),
    charms: [],
    drifters: [],
  };
}

// Camera bay vòng tâm (0,0,0), bán kính 30 m, cao 15 m, nhìn vào (0,0,0); t = 0 ở (30,15,0),
// góc tăng ngược chiều kim đồng hồ khi nhìn từ trên xuống (quy ước x = r·cosθ, z = r·sinθ), 15 s một vòng.
export function benchCamera(tSeconds) {
  const a = (2 * Math.PI * tSeconds) / BENCH.orbitPeriodS;
  return { x: BENCH.orbitRadius * Math.cos(a), y: BENCH.orbitHeight, z: BENCH.orbitRadius * Math.sin(a), lookAt: [0, 0, 0] };
}

// Thống kê theo định nghĩa của ticket. dts: thời gian từng khung hình (ms).
export function benchStats(dts) {
  const n = dts.length;
  if (n === 0) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(n - k);
  const meanWorst = worst.reduce((a, b) => a + b, 0) / k;
  const p95 = sorted[Math.ceil(0.95 * n) - 1]; // nearest-rank
  const r1 = (x) => Math.round(x * 10) / 10;
  return { frames: n, avg_fps: r1((1000 * n) / sum), p1_low_fps: r1(1000 / meanWorst), frame_ms_p95: r1(p95) };
}
