// Soak test (Ticket-04 mục 2): chạy N Đêm liên tiếp trong cùng một tiến trình với input ngẫu nhiên theo seed.
// Đêm i (i = 1..N) dùng seed S + i, màn (i − 1) mod 3 + 1. Không dùng Date/Math.random: kết quả tất định theo seed.
import { createGame, TPS } from "../core/sim.js";
import { createRng } from "../core/rng.js";

const IDLE = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
export const PROB = { jump: 0.05, dash: 0.03, pulse: 0.02, interact: 0.1, reroll: 30 };

// Input ngẫu nhiên: mỗi 30 tick chọn lại hướng (góc đều); mỗi tick xác suất nhảy 5%, lướt 3%, tỏa sáng 2%, tương tác 10%.
export function inputStream(seed) {
  const rng = createRng((seed * 7919 + 13) >>> 0);
  let move = [0, 0];
  return (tick) => {
    if (tick % PROB.reroll === 0) {
      const a = rng() * 2 * Math.PI;
      move = [Math.cos(a), Math.sin(a)];
    }
    // thứ tự rút số ngẫu nhiên cố định để tái lập
    const jump = rng() < PROB.jump;
    const dash = rng() < PROB.dash;
    const pulse = rng() < PROB.pulse;
    const interact = rng() < PROB.interact;
    return { move, cam_yaw_deg: 0, jump, interact, pulse, dash, pause: false };
  };
}

const mb = (bytes) => Math.round((bytes / 1048576) * 10) / 10;
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
// RSS ổn định: gc rồi lấy trung vị của 9 mẫu cách nhau 25 ms. Một lần đọc RSS đơn lẻ dao động ±10 MB do hệ điều hành
// tự cắt/trả trang bộ nhớ (heap V8 giữ phẳng ~5 MB), nên so sánh hai lần đọc đơn lẻ sẽ không ổn định.
export const stableRssMb = () => {
  if (typeof globalThis.gc === "function") globalThis.gc();
  const xs = [];
  for (let i = 0; i < 9; i++) {
    pause(25);
    xs.push(process.memoryUsage().rss);
  }
  xs.sort((a, b) => a - b);
  return mb(xs[4]);
};
const collect = stableRssMb;

// "Tải xong Đêm đầu tiên" gồm cả khởi động nóng: chạy mỗi màn (1, 2, 3) WARMUP_TICKS tick trên game bỏ đi (cùng seed, không ảnh hưởng
// kết quả các Đêm). Nếu không, đo ngay sau khi dựng sẽ bắt nhầm chi phí khởi động nóng là "rò rỉ": heap V8 phẳng (~5 MB) nhưng
// bộ nhớ native của JIT (TurboFan) và malloc còn tăng sau 900 tick đầu, nhất là trên Linux; `--jitless` thì RSS phẳng hoàn toàn.
export const WARMUP_TICKS = 3600;
function warmUp(tuning, seed) {
  for (let night = 1; night <= 3; night++) {
    const g = createGame({ tuning, seed, night });
    const next = inputStream(seed);
    for (let i = 0; i < WARMUP_TICKS && g.state === "playing"; i++) g.step(next(i));
  }
}

// onNight(i, info) tùy chọn, để CLI in tiến độ. Trả về cả thông tin phụ (ticks, điểm) dùng cho test.
export function runSoak({ tuning, seed = 7, nights = 10, now = () => performance.now(), onNight }) {
  const t0 = now();
  const results = [];
  const detail = [];
  let crashes = 0;
  let memStart = null;
  let lastNight = 1;
  for (let i = 1; i <= nights; i++) {
    const night = ((i - 1) % 3) + 1;
    const nightSeed = seed + i;
    lastNight = night;
    let ticks = 0;
    let state = "crashed";
    let score = 0;
    try {
      const game = createGame({ tuning, seed: nightSeed, night });
      if (memStart === null) {
        warmUp(tuning, nightSeed); // tải xong Đêm đầu tiên (kèm khởi động nóng một lần)
        memStart = collect();
      }
      const next = inputStream(nightSeed);
      const max = Math.round(tuning[`night${night}_duration_s`] * TPS);
      for (; ticks < max; ticks++) {
        game.step(next(ticks));
        if (game.state !== "playing") {
          ticks++;
          break;
        }
      }
      state = game.state;
      score = game.score;
    } catch (e) {
      crashes++;
      if (memStart === null) memStart = collect();
      console.error(`Đêm ${i} (seed ${nightSeed}) gặp lỗi: ${e.stack ?? e}`);
    }
    results.push(state === "won" || state === "lost" ? state : state);
    detail.push({ night, seed: nightSeed, ticks, state, score });
    onNight?.(i, detail[detail.length - 1]);
  }
  // reset Đêm cuối (dựng lại trạng thái mới), rồi đo
  let resetOk = true;
  try {
    createGame({ tuning, seed: seed + nights, night: lastNight });
  } catch {
    resetOk = false;
    crashes++;
  }
  const memEnd = collect();
  return {
    json: { nights, crashes, results, mem_start_mb: memStart ?? memEnd, mem_end_mb: memEnd, duration_s: Math.round(((now() - t0) / 1000) * 10) / 10 },
    detail,
    resetOk,
  };
}
