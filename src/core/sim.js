// Logic game thuần, tất định, không phụ thuộc render / Node API. 60 tick/giây. Contract v1.1.
// Thứ tự một bước (Ticket-02, bắt buộc): 1 input/pause · 2 giảm bộ đếm · 3 di chuyển Mây (nhảy, lướt, bục, gió) + rơi
// · 4 nhặt đom đóm/bùa · 5 tương tác đèn · 6 vùng an toàn · 7 Tỏa Sáng · 8 di chuyển Bóng Mực/Gió Lạc
// · 9 chạm (Gió Lạc trước, Bóng Mực theo id) · 10 sinh theo lịch · 11 thắng/thua. (12 snapshot do bên chạy ghi.)
import { createRng } from "./rng.js";
import { FormatError } from "./validate.js";
import { NIGHTS } from "./levels.js";
import { R, TPS } from "./rules.js";
import { groundAt, heightNear, overGround, blocked, pushOutOfTowers } from "./terrain.js";

export { TPS };

const r3 = (x) => {
  const v = Math.round(x * 1000) / 1000;
  return v === 0 ? 0 : v;
};
const toTicks = (s) => Math.round(s * TPS);
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const idNum = (id) => Number(String(id).replace(/\D/g, "")) || 0;
const byId = (a, b) => idNum(a.id) - idNum(b.id) || String(a.id).localeCompare(String(b.id));
const dec = (o, k) => {
  if (o[k] > 0) o[k]--;
};

// Gió Đêm 3: cơn thứ k (k >= 1) hoạt động trong [1800k, 1800k + 300), báo trước 120 tick. Hướng theo seed, độc lập luồng ngẫu nhiên khác.
export function windDir(seed, k) {
  return Math.round(createRng((seed * 7919 + k * 104729 + 12345) >>> 0)() * 360);
}
export function windAt(seed, simTick) {
  const w = R.wind;
  let k = Math.floor(simTick / w.every);
  const active = k >= 1 && simTick < k * w.every + w.dur;
  if (!active) k = Math.max(1, k + 1);
  const start = k * w.every;
  return { active, dir_deg: windDir(seed, k), warning: !active && simTick >= start - w.warn, k };
}

export function createGame({ tuning, seed = 1, night = 1, scenario = {} }) {
  const tu = tuning;
  const level = NIGHTS[night];
  if (!level) throw new FormatError(`không có Đêm ${night}`);
  const rng = createRng(seed);
  const sc = scenario;
  const dashTicksN = toTicks(tu.dash_duration_s);
  const dashCdN = toTicks(tu.dash_cooldown_s);
  const shadeSpeed = level.shades.speed ?? tu.shade_speed;
  const wantRandomMotes = sc.random_motes !== false;
  const wantRandomShades = sc.random_shades !== false;
  const wantDrifters = level.drifters && sc.random_drifters !== false;
  const wantWind = level.wind && sc.wind_enabled !== false;

  const g = {
    tuning: tu,
    level,
    night,
    seed,
    ticks: 0, // số bước đã chạy (kể cả lúc tạm dừng)
    sim: 0, // số bước gameplay (không tính lúc tạm dừng)
    paused: false,
    state: "playing",
    score: 0,
    remaining: toTicks(sc.time_left_s ?? tu[level.durationKey]),
    player: {
      x: level.start[0], y: level.start[1], z: level.start[2], vx: 0, vy: 0, vz: 0, fx: 0, fz: 1,
      flames: tu.flames, carried: 0, invuln: 0, dashTicks: 0, dashCd: 0, ddx: 0, ddz: 1, pulseCd: 0, charm: 0,
      grounded: true, launched: false, lvx: 0, lvz: 0, fallWait: 0, fallPending: false,
    },
    motes: [],
    shades: [],
    drifters: [],
    charms: level.charms.map((c) => ({ ...c, available: true, respawn: 0 })),
    lanterns: level.lanterns.map((l) => ({ ...l, lit: false, deposited: 0 })),
    prev: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    wind: { active: false, dir_deg: 0 },
  };
  const p = g.player;
  let nextMote = 1;
  let nextShade = 1;
  let nextDrifter = 1;

  // ---------- dựng scenario (không phát sự kiện, không cộng điểm) ----------
  if (sc.player) {
    if (sc.player.pos) [p.x, p.y, p.z] = sc.player.pos;
    for (const [k, f] of [["carried", "carried"], ["flames", "flames"], ["invuln_ticks", "invuln"], ["dash_cd_ticks", "dashCd"], ["pulse_cd_ticks", "pulseCd"], ["charm_ticks", "charm"]]) {
      if (sc.player[k] !== undefined) p[f] = sc.player[k];
    }
  }
  {
    const gnd = groundAt(level, p.x, p.z, p.y);
    p.grounded = gnd !== null && p.y <= gnd + 1e-9;
    if (p.grounded) p.y = gnd;
  }
  for (const l of sc.lanterns ?? []) {
    const t = g.lanterns.find((x) => x.id === l.id);
    if (!t) throw new FormatError(`scenario: không có đèn '${l.id}' ở Đêm ${night}`);
    if (l.pos) [t.x, t.y, t.z] = l.pos;
    if (l.lit !== undefined) t.lit = l.lit;
    if (l.deposited !== undefined) t.deposited = l.deposited;
  }
  const pointY = (pt) => pt[1];
  const addMote = (x, y, z, kind = "random", ttl = null, point = -1) => g.motes.push({ id: `M${nextMote++}`, x, y, z, kind, ttl, point });
  if (sc.motes) {
    for (const m of sc.motes) addMote(m[0], m[1], m[2]);
  } else if (wantRandomMotes) {
    const idx = level.motePoints.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (const i of idx.slice(0, R.moteStart)) {
      const pt = level.motePoints[i];
      addMote(pt[0], pointY(pt), pt[2], "random", null, i);
    }
  }
  const newShade = (pos, state, ticks) => {
    const s = { id: null, x: pos[0], y: pos[1], z: pos[2], gy: pos[1] - R.shadeY, state, spawning: 0, stun: 0, recoil: 0, rdx: 0, rdz: 0, push: 0, pushLeft: 0, pdx: 0, pdz: 0, wdx: 1, wdz: 0, wander: 0 };
    if (state === "spawning") s.spawning = ticks;
    if (state === "stunned") s.stun = ticks;
    if (state === "recoil") s.recoil = ticks;
    return s;
  };
  (sc.shades ?? []).forEach((d, i) => {
    const s = newShade(d.pos, d.state ?? "wander", d.state_ticks_left ?? (d.state === "spawning" ? R.shadeSpawningTicks : d.state === "stunned" ? toTicks(tu.pulse_stun_s) : d.state === "recoil" ? R.shadeRecoilTicks : 0));
    s.id = d.id ?? `S${i + 1}`;
    g.shades.push(s);
  });
  nextShade = g.shades.length + 1;
  const freshShadeId = () => {
    let id;
    do id = `S${nextShade++}`;
    while (g.shades.some((s) => s.id === id));
    return id;
  };
  (sc.drifters ?? []).forEach((d, i) => {
    g.drifters.push({ id: d.id ?? `D${i + 1}`, x: d.pos[0], y: d.pos[1], z: d.pos[2], gy: d.pos[1] - R.drifter.y, state: d.state ?? "idle", stolen: d.stolen ?? 0, flee: d.state_ticks_left ?? 0, stole: (d.stolen ?? 0) > 0, dx: 1, dz: 0, reroll: 0 });
  });
  nextDrifter = g.drifters.length + 1;
  if (sc.charms) {
    g.charms = sc.charms.map((c) => {
      const base = level.charms.find((x) => x.id === c.id);
      const pos = c.pos ?? (base ? [base.x, base.y, base.z] : null);
      if (!pos) throw new FormatError(`scenario: charms '${c.id}' cần pos`);
      const respawn = c.respawn_ticks ?? 0;
      return { id: c.id, x: pos[0], y: pos[1], z: pos[2], available: c.available ?? respawn === 0, respawn };
    });
  }
  const litLanterns = () => g.lanterns.filter((l) => l.lit);
  const startPush = (l) => {
    for (const s of g.shades) {
      if (dist2(s.x, s.z, l.x, l.z) < tu.safe_radius) {
        s.push = R.safePushTicks;
        s.pushFrom = l;
      }
    }
  };
  for (const l of litLanterns()) startPush(l);

  const settleShade = (s) => {
    const h = heightNear(level, s.x, s.z, p.y);
    if (h !== null) s.gy = h;
    s.y = s.gy + R.shadeY;
  };
  const clampSafe = (s) => {
    for (const l of litLanterns()) {
      const d = dist2(s.x, s.z, l.x, l.z);
      if (d < tu.safe_radius) {
        const ux = d === 0 ? 1 : (s.x - l.x) / d;
        const uz = d === 0 ? 0 : (s.z - l.z) / d;
        s.x = l.x + ux * tu.safe_radius;
        s.z = l.z + uz * tu.safe_radius;
      }
    }
  };
  const evalState = (s) => {
    const d = dist2(s.x, s.z, p.x, p.z);
    if (s.state === "chase") s.state = d > R.shadeGiveUp ? "wander" : "chase";
    else s.state = d <= R.shadeDetect ? "chase" : "wander";
  };

  // ---------- một bước ----------
  g.step = function step(inp) {
    const ev = [];
    if (g.state !== "playing") return ev;
    const tick = g.ticks + 1;
    const emit = (name, data) => ev.push({ type: "event", tick, name, data });
    const edge = (k) => !!inp[k] && !g.prev[k];
    const e = { jump: edge("jump"), interact: edge("interact"), pulse: edge("pulse"), dash: edge("dash"), pause: edge("pause") };
    g.prev = { jump: !!inp.jump, interact: !!inp.interact, pulse: !!inp.pulse, dash: !!inp.dash, pause: !!inp.pause };
    g.ticks = tick;

    // 1. input, tạm dừng
    if (e.pause) {
      g.paused = !g.paused;
      emit(g.paused ? "paused" : "resumed", {});
      if (g.paused) return ev;
    }
    if (g.paused) return ev;
    const s = ++g.sim;
    if (s === 1) emit("night_start", { night });

    // 2. giảm bộ đếm
    g.remaining--;
    for (const k of ["dashCd", "dashTicks", "pulseCd", "invuln", "charm", "fallWait"]) dec(p, k);
    for (const sh of g.shades) {
      if (sh.spawning > 0 && --sh.spawning === 0) sh.state = "wander";
      if (sh.stun > 0 && --sh.stun === 0) evalState(sh);
      if (sh.recoil > 0 && --sh.recoil === 0) evalState(sh);
      dec(sh, "push");
    }
    for (const d of g.drifters) dec(d, "flee");
    for (const m of g.motes) if (m.ttl !== null) m.ttl--;
    g.motes = g.motes.filter((m) => m.ttl === null || m.ttl > 0);
    for (const c of g.charms) if (c.respawn > 0 && --c.respawn === 0) c.available = true;

    // 3. di chuyển Mây
    if (p.fallPending && p.fallWait === 0) {
      [p.x, p.y, p.z] = level.start;
      p.vx = p.vy = p.vz = 0;
      p.invuln = R.respawnInvulnTicks;
      p.fallPending = false;
      p.launched = false;
      p.dashTicks = 0;
      p.grounded = true;
    }
    const live = !p.fallPending;
    if (live) {
      let [mx, mz] = inp.move;
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }
      const th = (inp.cam_yaw_deg * Math.PI) / 180;
      const wx = mx * Math.cos(th) + mz * Math.sin(th);
      const wz = -mx * Math.sin(th) + mz * Math.cos(th);
      const wl = Math.hypot(wx, wz);
      if (wl > 1e-9) {
        p.fx = wx / wl;
        p.fz = wz / wl;
      }
      if (e.dash && p.dashTicks === 0 && (p.charm > 0 || p.dashCd === 0)) {
        p.dashTicks = dashTicksN;
        if (p.charm === 0) p.dashCd = dashCdN;
        p.ddx = wl > 1e-9 ? wx / wl : p.fx;
        p.ddz = wl > 1e-9 ? wz / wl : p.fz;
        emit("dash", {});
      }
      if (e.jump && p.grounded && !p.launched) p.vy = R.jumpSpeed;

      const speed = tu.player_speed * (p.charm > 0 ? R.charmSpeedMul : 1);
      let vx;
      let vz;
      if (p.dashTicks > 0) {
        vx = p.ddx * tu.dash_speed;
        vz = p.ddz * tu.dash_speed;
      } else if (p.launched) {
        vx = p.lvx;
        vz = p.lvz;
      } else {
        vx = wx * speed;
        vz = wz * speed;
      }
      p.vx = vx;
      p.vz = vz;
      let dx = vx / TPS;
      let dz = vz / TPS;
      if (wantWind) {
        const w = windAt(seed, s);
        if (w.active) {
          dx += (R.wind.speed * Math.cos((w.dir_deg * Math.PI) / 180)) / TPS;
          dz += (R.wind.speed * Math.sin((w.dir_deg * Math.PI) / 180)) / TPS;
        }
      }
      // di chuyển ngang có va chạm vách/tháp, trượt theo từng trục
      if (!blocked(level, p.x, p.z, p.x + dx, p.z + dz, p.y)) {
        p.x += dx;
        p.z += dz;
      } else if (!blocked(level, p.x, p.z, p.x + dx, p.z, p.y)) p.x += dx;
      else if (!blocked(level, p.x, p.z, p.x, p.z + dz, p.y)) p.z += dz;

      // dọc
      const wasGrounded = p.grounded;
      if (p.dashTicks > 0) p.vy = 0;
      else p.vy -= R.gravity / TPS;
      p.y += p.vy / TPS;
      const gnd = groundAt(level, p.x, p.z, p.y);
      if (gnd !== null && p.y <= gnd + 1e-9 && p.vy <= 0) {
        p.y = gnd;
        p.vy = 0;
        p.grounded = true;
        p.launched = false;
      } else if (wasGrounded && p.vy <= 0 && gnd !== null && p.y - gnd <= R.stepUp && p.dashTicks === 0) {
        p.y = gnd;
        p.vy = 0;
        p.grounded = true;
      } else p.grounded = false;

      // bục nhảy
      if (!p.launched) {
        for (const pad of level.pads) {
          if (dist2(p.x, p.z, pad.x, pad.z) <= pad.r && Math.abs(p.y - pad.y) <= 0.5) {
            const dl = Math.hypot(pad.dir[0], pad.dir[1]);
            p.vy = pad.vy;
            p.lvx = (pad.dir[0] / dl) * pad.vh;
            p.lvz = (pad.dir[1] / dl) * pad.vh;
            p.launched = true;
            p.grounded = false;
            break;
          }
        }
      }

      // rơi khỏi đảo
      if (tu.fall_enabled && p.y < R.fallY) {
        const lost = p.carried;
        p.carried = 0;
        p.flames--;
        p.vx = p.vy = p.vz = 0;
        emit("player_hit", { by: "fall", flames: p.flames, dropped: 0, lost });
        if (p.flames > 0) {
          p.fallWait = R.fallWaitTicks;
          p.fallPending = true;
        }
      }
    }
    const alive = !p.fallPending;

    // 4. nhặt đom đóm và bùa
    if (alive) {
      const cand = g.motes
        .filter((m) => dist2(p.x, p.z, m.x, m.z) <= tu.pickup_radius && Math.abs(p.y - m.y) <= R.pickupDy)
        .sort((a, b) => dist2(p.x, p.z, a.x, a.z) - dist2(p.x, p.z, b.x, b.z) || byId(a, b));
      for (const m of cand) {
        if (p.carried >= tu.carry_capacity) break;
        g.motes.splice(g.motes.indexOf(m), 1);
        p.carried++;
        emit("mote_picked", { carried: p.carried });
      }
      for (const c of g.charms) {
        if (c.available && dist2(p.x, p.z, c.x, c.z) <= tu.pickup_radius && Math.abs(p.y - c.y) <= R.pickupDy) {
          c.available = false;
          c.respawn = R.charmRespawnTicks;
          p.charm = R.charmTicks;
          emit("charm_picked", { charm_id: c.id, charm_ticks: R.charmTicks });
        }
      }
    }

    // 5. tương tác đèn
    const newlyLit = [];
    if (alive && e.interact && p.carried > 0) {
      const best = g.lanterns
        .filter((l) => !l.lit && dist2(p.x, p.z, l.x, l.z) <= tu.interact_radius)
        .sort((a, b) => dist2(p.x, p.z, a.x, a.z) - dist2(p.x, p.z, b.x, b.z) || byId(a, b))[0];
      if (best) {
        const amount = Math.min(p.carried, Math.max(0, tu.lantern_cost - best.deposited));
        if (amount > 0) {
          best.deposited += amount;
          p.carried -= amount;
          g.score += amount * tu.score.per_mote;
          emit("deposit", { lantern_id: best.id, amount, deposited: best.deposited });
        }
        if (best.deposited >= tu.lantern_cost) {
          best.lit = true;
          g.score += tu.score.per_lantern;
          emit("lantern_lit", { lantern_id: best.id });
          newlyLit.push(best);
        }
      }
    }

    // 6. vùng an toàn: Bóng Mực đang ở trong vùng của đèn vừa sáng bị đẩy ra mép (<= 30 tick, không gây hại)
    for (const l of newlyLit) startPush(l);
    for (const sh of g.shades) {
      if (sh.push > 0 && sh.pushFrom) {
        const l = sh.pushFrom;
        const d = dist2(sh.x, sh.z, l.x, l.z);
        const left = d < tu.safe_radius ? tu.safe_radius - d : 0;
        const step = sh.push === 1 ? left : left / sh.push;
        const ux = d === 0 ? 1 : (sh.x - l.x) / d;
        const uz = d === 0 ? 0 : (sh.z - l.z) / d;
        sh.x += ux * step;
        sh.z += uz * step;
      }
    }

    // 7. Tỏa Sáng
    if (alive && e.pulse && p.pulseCd === 0 && p.carried >= tu.pulse_cost) {
      p.carried -= tu.pulse_cost;
      p.pulseCd = toTicks(tu.pulse_cooldown_s);
      const cy = p.y + R.pulseCenterDy;
      const ids = [];
      for (const sh of g.shades) {
        if (Math.hypot(sh.x - p.x, sh.y - cy, sh.z - p.z) <= tu.pulse_radius) {
          ids.push(sh.id);
          sh.state = "stunned";
          sh.stun = toTicks(tu.pulse_stun_s);
          sh.spawning = 0;
          sh.recoil = 0;
          sh.push = 0;
          const d = dist2(sh.x, sh.z, p.x, p.z);
          sh.pdx = d === 0 ? 1 : (sh.x - p.x) / d;
          sh.pdz = d === 0 ? 0 : (sh.z - p.z) / d;
          sh.pushLeft = R.pulsePushTicks;
          g.score += tu.score.per_stun;
        }
      }
      for (const d of g.drifters) {
        if (Math.hypot(d.x - p.x, d.y - cy, d.z - p.z) > tu.pulse_radius) continue;
        if (d.state === "chase") {
          d.state = "flee";
          d.flee = R.drifter.fleeTicks;
        } else if (d.state === "flee" && d.stolen > 0) {
          emit("drifter_drop", { drifter_id: d.id, amount: d.stolen });
          for (let i = 0; i < d.stolen; i++) addMote(d.x, d.gy, d.z, "dropped", R.dropTtl);
          d.stolen = 0;
          d.flee = R.drifter.dropVanishTicks;
        }
      }
      emit("pulse", { stunned_ids: ids });
    }

    // 8. Bóng Mực và Gió Lạc di chuyển
    for (const sh of g.shades) {
      if (sh.spawning > 0) {
        settleShade(sh);
        continue;
      }
      if (sh.push > 0) {
        settleShade(sh);
        continue;
      }
      if (sh.state === "stunned") {
        if (sh.pushLeft > 0) {
          sh.x += (sh.pdx * tu.pulse_push_m) / R.pulsePushTicks;
          sh.z += (sh.pdz * tu.pulse_push_m) / R.pulsePushTicks;
          sh.pushLeft--;
        }
      } else if (sh.state === "recoil") {
        sh.x += (sh.rdx * R.shadeRecoilM) / R.shadeRecoilTicks;
        sh.z += (sh.rdz * R.shadeRecoilM) / R.shadeRecoilTicks;
      } else {
        evalState(sh);
        if (sh.state === "chase") {
          const d = dist2(sh.x, sh.z, p.x, p.z);
          const stepLen = Math.min(d, shadeSpeed / TPS);
          if (d > 0) {
            sh.x += ((p.x - sh.x) / d) * stepLen;
            sh.z += ((p.z - sh.z) / d) * stepLen;
          }
        } else {
          if (sh.wander <= 0) {
            const a = rng() * 2 * Math.PI;
            sh.wdx = Math.cos(a);
            sh.wdz = Math.sin(a);
            sh.wander = R.shadeWanderReroll;
          }
          sh.wander--;
          const nx = sh.x + (sh.wdx * R.shadeWanderSpeed) / TPS;
          const nz = sh.z + (sh.wdz * R.shadeWanderSpeed) / TPS;
          if (overGround(level, nx, nz)) {
            sh.x = nx;
            sh.z = nz;
          } else sh.wander = 0;
        }
      }
      [sh.x, sh.z] = pushOutOfTowers(level, sh.x, sh.z);
      clampSafe(sh);
      settleShade(sh);
    }
    for (const d of g.drifters) {
      const dist = dist2(d.x, d.z, p.x, p.z);
      if (d.state !== "flee") d.state = p.carried >= R.drifter.aggroCarried && dist <= R.drifter.aggroDist ? "chase" : "idle";
      let vx = 0;
      let vz = 0;
      if (d.state === "chase" && dist > 0) {
        vx = ((p.x - d.x) / dist) * R.drifter.speed;
        vz = ((p.z - d.z) / dist) * R.drifter.speed;
      } else if (d.state === "flee") {
        const ux = dist === 0 ? 1 : (d.x - p.x) / dist;
        const uz = dist === 0 ? 0 : (d.z - p.z) / dist;
        vx = ux * R.drifter.speed;
        vz = uz * R.drifter.speed;
      } else {
        if (d.reroll <= 0) {
          const a = rng() * 2 * Math.PI;
          d.dx = Math.cos(a);
          d.dz = Math.sin(a);
          d.reroll = R.shadeWanderReroll;
        }
        d.reroll--;
        vx = d.dx * R.drifter.idleSpeed;
        vz = d.dz * R.drifter.idleSpeed;
      }
      const stepLen = d.state === "chase" ? Math.min(dist, Math.hypot(vx, vz) / TPS) : Math.hypot(vx, vz) / TPS;
      const vl = Math.hypot(vx, vz);
      if (vl > 0) {
        d.x += (vx / vl) * stepLen;
        d.z += (vz / vl) * stepLen;
      }
      const h = heightNear(level, d.x, d.z, p.y);
      if (h !== null) d.gy = h;
      d.y = d.gy + R.drifter.y;
    }
    g.drifters = g.drifters.filter((d) => !(d.state === "flee" && d.flee === 0));

    // 9. chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (theo id tăng dần, tối đa 1 lần mất flame mỗi tick)
    if (alive) {
      for (const d of g.drifters) {
        if (d.state === "chase" && !d.stole && p.carried > 0 && dist2(d.x, d.z, p.x, p.z) <= R.drifter.touch) {
          const amount = Math.min(R.drifter.steal, p.carried);
          p.carried -= amount;
          d.stolen = amount;
          d.stole = true;
          d.state = "flee";
          d.flee = R.drifter.fleeTicks;
          emit("drifter_steal", { drifter_id: d.id, amount, carried: p.carried });
        }
      }
      let hitDone = false;
      for (const sh of [...g.shades].sort(byId)) {
        if (sh.state !== "wander" && sh.state !== "chase") continue;
        if (sh.push > 0 || sh.spawning > 0) continue;
        if (dist2(p.x, p.z, sh.x, sh.z) > tu.shade_hit_radius || Math.abs(p.y - sh.gy) > R.hitDy) continue;
        if (p.invuln > 0 || hitDone) continue;
        hitDone = true;
        p.flames--;
        const dropped = Math.floor(p.carried * tu.hit_drop_ratio);
        p.carried -= dropped;
        for (let i = 0; i < dropped; i++) {
          const a = rng() * 2 * Math.PI;
          const rr = R.dropRing[0] + rng() * (R.dropRing[1] - R.dropRing[0]);
          const mx = p.x + Math.cos(a) * rr;
          const mz = p.z + Math.sin(a) * rr;
          const gy = groundAt(level, mx, mz, p.y);
          if (gy === null) addMote(p.x, p.y, p.z, "dropped", R.dropTtl);
          else addMote(mx, gy, mz, "dropped", R.dropTtl);
        }
        p.invuln = toTicks(tu.invuln_s);
        emit("player_hit", { by: "shade", flames: p.flames, dropped });
        const d = dist2(sh.x, sh.z, p.x, p.z);
        sh.state = "recoil";
        sh.recoil = R.shadeRecoilTicks + 1; // bộ đếm giảm ở đầu tick kế tiếp: đủ 60 bước di chuyển = 2 m
        sh.rdx = d === 0 ? 1 : (sh.x - p.x) / d;
        sh.rdz = d === 0 ? 0 : (sh.z - p.z) / d;
      }
    }

    // 10. sinh theo lịch (thực thể mới chỉ tương tác được từ tick sau)
    if (wantRandomMotes && s % R.moteEvery === 0 && g.motes.length < R.moteMax) {
      const used = new Set(g.motes.map((m) => m.point));
      const free = level.motePoints.map((_, i) => i).filter((i) => !used.has(i));
      if (free.length) {
        const i = free[Math.floor(rng() * free.length)];
        const pt = level.motePoints[i];
        addMote(pt[0], pointY(pt), pt[2], "random", null, i);
      }
    }
    const spawnCount = s === R.shadeFirstTick ? R.shadeFirstCount : s > R.shadeFirstTick && (s - R.shadeFirstTick) % level.shades.interval === 0 ? 1 : 0;
    if (wantRandomShades) {
      for (let n = 0; n < spawnCount && g.shades.length < level.shades.max; n++) {
        const ok = level.shadePoints.filter(
          (pt) =>
            dist2(pt[0], pt[2], p.x, p.z) >= R.spawnMinDist &&
            !litLanterns().some((l) => dist2(pt[0], pt[2], l.x, l.z) < tu.safe_radius) &&
            !g.shades.some((o) => dist2(pt[0], pt[2], o.x, o.z) < 1),
        );
        if (!ok.length) continue;
        const pt = ok[Math.floor(rng() * ok.length)];
        const sh = newShade([pt[0], pt[1] + R.shadeY, pt[2]], "spawning", R.shadeSpawningTicks);
        sh.id = freshShadeId();
        g.shades.push(sh);
        emit("shade_spawned", { id: sh.id });
      }
    }
    if (wantDrifters && s % R.drifter.every === 0 && g.drifters.length < R.drifter.max) {
      const pt = level.shadePoints[Math.floor(rng() * level.shadePoints.length)];
      const d = { id: `D${nextDrifter++}`, x: pt[0], y: pt[1] + R.drifter.y, z: pt[2], gy: pt[1], state: "idle", stolen: 0, flee: 0, stole: false, dx: 1, dz: 0, reroll: 0 };
      g.drifters.push(d);
    }

    // 11. thắng / thua
    const over = (result, reason) => {
      g.state = result;
      emit("game_over", { result, reason });
    };
    if (p.flames <= 0) over("lost", "no_flames");
    else if (g.lanterns.every((l) => l.lit)) {
      g.score += Math.floor(g.remaining / TPS) * tu.score.per_second_left + p.flames * tu.score.per_flame_left;
      over("won", "all_lit");
    } else if (g.remaining <= 0) over("lost", "dawn");
    return ev;
  };

  g.snapshot = function snapshot() {
    const w = wantWind ? windAt(seed, g.sim) : { active: false, dir_deg: 0 };
    return {
      type: "snapshot",
      tick: g.ticks,
      sim_tick: g.sim,
      state: g.paused ? "paused" : g.state,
      night,
      time_left_s: r3(g.remaining / TPS),
      score: g.score,
      wind: { active: w.active, dir_deg: w.dir_deg },
      player: {
        pos: [r3(p.x), r3(p.y), r3(p.z)],
        vel: [r3(p.vx), r3(p.vy), r3(p.vz)],
        grounded: p.grounded,
        invuln: r3(p.invuln / TPS),
        dash_cd_s: r3(p.dashCd / TPS),
        pulse_cd_s: r3(p.pulseCd / TPS),
        charm_s: r3(p.charm / TPS),
        flames: p.flames,
        carried: p.carried,
      },
      lanterns: g.lanterns.map((l) => ({ id: l.id, pos: [r3(l.x), r3(l.y), r3(l.z)], lit: l.lit, deposited: l.deposited })),
      shades: g.shades.map((sh) => ({ id: sh.id, pos: [r3(sh.x), r3(sh.y), r3(sh.z)], state: sh.state })),
      motes_active: g.motes.length,
      motes: g.motes.map((m) => ({ id: m.id, pos: [r3(m.x), r3(m.y), r3(m.z)], kind: m.kind, ttl_s: m.ttl === null ? null : r3(m.ttl / TPS) })),
      drifters: g.drifters.map((d) => ({ id: d.id, pos: [r3(d.x), r3(d.y), r3(d.z)], state: d.state, stolen: d.stolen })),
      charms: g.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: r3(c.respawn / TPS) })),
    };
  };
  g.endLine = () => ({ type: "end", ticks: g.ticks, state: g.state, score: g.score });
  return g;
}
