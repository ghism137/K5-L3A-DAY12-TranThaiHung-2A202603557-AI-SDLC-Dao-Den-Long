// Logic game thuÃ¡ÂºÂ§n, tÃ¡ÂºÂ¥t Ã„â€˜Ã¡Â»â€¹nh, khÃƒÂ´ng phÃ¡Â»Â¥ thuÃ¡Â»â„¢c render / Node API. 60 tick/giÃƒÂ¢y.
// ThÃ¡Â»Â© tÃ¡Â»Â± mÃ¡Â»â„¢t bÃ†Â°Ã¡Â»â€ºc (A14): input -> di chuyÃ¡Â»Æ’n/nhÃ¡ÂºÂ£y -> nhÃ¡ÂºÂ·t -> interact -> pulse
// -> BÃƒÂ³ng MÃ¡Â»Â±c -> va chÃ¡ÂºÂ¡m -> sinh BÃƒÂ³ng MÃ¡Â»Â±c -> giÃ¡ÂºÂ£m thÃ¡Â»Âi gian -> thÃ¡ÂºÂ¯ng/thua.
import { createRng } from "./rng.js";
import { FormatError } from "./validate.js";

export const TPS = 60;
export const ISLAND_RADIUS = 40;
export const JUMP_SPEED = 7; // m/s
export const GRAVITY = 20; // m/s^2
export const LANTERN_RING = 25; // m
export const RANDOM_MOTES = 20;
export const SHADE_MAX = 4;
export const SHADE_SPAWN_EVERY_TICKS = 20 * TPS;
export const SHADE_FIRST_SPAWN_TICK = 10 * TPS;
export const SHADE_Y = 1.0;

const r3 = (x) => {
  const v = Math.round(x * 1000) / 1000;
  return v === 0 ? 0 : v;
};
const toTicks = (s) => Math.round(s * TPS);
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export function lanternLayout(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    out.push({ id: `L${i + 1}`, x: r3(LANTERN_RING * Math.sin(a)), y: 0, z: r3(LANTERN_RING * Math.cos(a)), lit: false, deposited: 0 });
  }
  return out;
}

export function createGame({ tuning, seed = 1, scenario = {} }) {
  const tu = tuning;
  const rng = createRng(seed);
  const sc = scenario;
  const g = {
    tuning: tu,
    stepsDone: 0,
    state: "playing",
    score: 0,
    remaining: toTicks(sc.time_left_s ?? tu.night1_duration_s),
    player: { x: 0, y: 0, z: 0, vy: 0, flames: tu.flames, carried: 0, invuln: 0, cooldown: 0 },
    motes: [],
    shades: [],
    lanterns: lanternLayout(tu.lantern_count_night1),
    nextMote: 1,
    prev: { jump: false, interact: false, pulse: false },
    spawnShades: sc.random_shades !== false,
  };
  const p = g.player;

  if (sc.player) {
    if (sc.player.pos) [p.x, p.y, p.z] = sc.player.pos;
    if (sc.player.carried !== undefined) p.carried = sc.player.carried;
    if (sc.player.flames !== undefined) p.flames = sc.player.flames;
  }
  for (const l of sc.lanterns ?? []) {
    const t = g.lanterns.find((x) => x.id === l.id);
    if (!t) throw new FormatError(`scenario: khÃƒÂ´ng cÃƒÂ³ Ã„â€˜ÃƒÂ¨n '${l.id}'`);
    if (l.pos) [t.x, t.y, t.z] = l.pos;
    if (l.lit !== undefined) t.lit = l.lit;
    if (l.deposited !== undefined) t.deposited = l.deposited;
  }
  const addMote = (x, y, z) => g.motes.push({ id: `M${g.nextMote++}`, x, y, z });
  if (sc.motes) {
    for (const m of sc.motes) addMote(m[0], m[1], m[2]);
  } else if (sc.random_motes !== false) {
    for (let i = 0; i < RANDOM_MOTES; i++) {
      const a = rng() * 2 * Math.PI;
      const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
      addMote(r * Math.sin(a), 0, r * Math.cos(a));
    }
  }
  (sc.shades ?? []).forEach((s, i) =>
    g.shades.push({ id: s.id ?? `S${i + 1}`, x: s.pos[0], y: s.pos[1], z: s.pos[2], state: "chase", stun: 0 }),
  );
  let nextShade = g.shades.length + 1;
  const newShadeId = () => {
    let id;
    do id = `S${nextShade++}`;
    while (g.shades.some((s) => s.id === id));
    return id;
  };

  const clampIsland = (o, limit = ISLAND_RADIUS) => {
    const r = Math.hypot(o.x, o.z);
    if (r > limit) {
      o.x *= limit / r;
      o.z *= limit / r;
    }
  };
  const litLanterns = () => g.lanterns.filter((l) => l.lit);
  const pushOutOfSafe = (s) => {
    for (const l of litLanterns()) {
      const d = dist(s.x, s.z, l.x, l.z);
      if (d < tu.safe_radius) {
        const dx = d === 0 ? 1 : (s.x - l.x) / d;
        const dz = d === 0 ? 0 : (s.z - l.z) / d;
        s.x = l.x + dx * tu.safe_radius;
        s.z = l.z + dz * tu.safe_radius;
      }
    }
  };

  g.step = function step(inp) {
    const ev = [];
    if (g.state !== "playing") return ev;
    const tick = g.stepsDone + 1;
    const emit = (name, data) => ev.push({ type: "event", tick, name, data });
    const edge = (k) => !!inp[k] && !g.prev[k];
    const jumpE = edge("jump");
    const interactE = edge("interact");
    const pulseE = edge("pulse");
    g.prev = { jump: !!inp.jump, interact: !!inp.interact, pulse: !!inp.pulse };

    // 1. di chuyÃ¡Â»Æ’n + nhÃ¡ÂºÂ£y
    let [mx, mz] = inp.move;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const th = (inp.cam_yaw_deg * Math.PI) / 180;
    const wx = mx * Math.cos(th) + mz * Math.sin(th);
    const wz = -mx * Math.sin(th) + mz * Math.cos(th);
    p.x += (wx * tu.player_speed) / TPS;
    p.z += (wz * tu.player_speed) / TPS;
    clampIsland(p);
    if (jumpE && p.y === 0) p.vy = JUMP_SPEED;
    if (p.y > 0 || p.vy > 0) {
      p.vy -= GRAVITY / TPS;
      p.y += p.vy / TPS;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
      }
    }

    // 2. nhÃ¡ÂºÂ·t Ã„â€˜om Ã„â€˜ÃƒÂ³m (tÃ¡Â»â€˜i Ã„â€˜a 1 con / bÃ†Â°Ã¡Â»â€ºc)
    if (p.carried < tu.carry_capacity) {
      let best = null;
      let bd = Infinity;
      for (const m of g.motes) {
        const d = dist(p.x, p.z, m.x, m.z);
        if (d <= tu.pickup_radius && d < bd) {
          best = m;
          bd = d;
        }
      }
      if (best) {
        g.motes.splice(g.motes.indexOf(best), 1);
        p.carried++;
        g.score += tu.score.per_mote;
        emit("mote_picked", { carried: p.carried });
      }
    }

    // 3. nÃ¡ÂºÂ¡p Ã„â€˜ÃƒÂ¨n
    if (interactE && p.carried > 0) {
      let best = null;
      let bd = Infinity;
      for (const l of g.lanterns) {
        const d = dist(p.x, p.z, l.x, l.z);
        if (!l.lit && d <= tu.interact_radius && d < bd) {
          best = l;
          bd = d;
        }
      }
      if (best) {
        const amount = Math.min(p.carried, Math.max(0, tu.lantern_cost - best.deposited));
        if (amount > 0) {
          best.deposited += amount;
          p.carried -= amount;
          emit("deposit", { lantern_id: best.id, amount, deposited: best.deposited });
        }
        if (best.deposited >= tu.lantern_cost) {
          best.lit = true;
          g.score += tu.score.per_lantern;
          emit("lantern_lit", { lantern_id: best.id });
        }
      }
    }

    // 4. pulse
    if (pulseE && p.cooldown === 0 && p.carried >= tu.pulse_cost) {
      p.carried -= tu.pulse_cost;
      p.cooldown = toTicks(tu.pulse_cooldown_s);
      const ids = [];
      for (const s of g.shades) {
        if (dist(p.x, p.z, s.x, s.z) <= tu.pulse_radius) {
          ids.push(s.id);
          s.state = "stunned";
          s.stun = toTicks(tu.pulse_stun_s);
          const d = dist(s.x, s.z, p.x, p.z);
          const dx = d === 0 ? 1 : (s.x - p.x) / d;
          const dz = d === 0 ? 0 : (s.z - p.z) / d;
          s.x += dx * tu.pulse_push_m;
          s.z += dz * tu.pulse_push_m;
          clampIsland(s, ISLAND_RADIUS + 2);
          pushOutOfSafe(s);
          g.score += tu.score.per_stun;
        }
      }
      emit("pulse", { stunned_ids: ids });
    }

    // 5. BÃƒÂ³ng MÃ¡Â»Â±c
    for (const s of g.shades) {
      if (s.stun > 0) {
        s.stun--;
        if (s.stun === 0) s.state = "chase";
        continue;
      }
      const d = dist(s.x, s.z, p.x, p.z);
      const stepLen = Math.min(d, tu.shade_speed / TPS);
      if (d > 0) {
        s.x += ((p.x - s.x) / d) * stepLen;
        s.z += ((p.z - s.z) / d) * stepLen;
      }
      pushOutOfSafe(s);
    }

    // 6. va chÃ¡ÂºÂ¡m (tÃ¡Â»â€˜i Ã„â€˜a 1 lÃ¡ÂºÂ§n / bÃ†Â°Ã¡Â»â€ºc)
    if (p.invuln === 0) {
      const hit = g.shades.find((s) => s.state !== "stunned" && dist(p.x, p.z, s.x, s.z) <= tu.shade_hit_radius);
      if (hit) {
        p.flames--;
        const dropped = Math.floor(p.carried * tu.hit_drop_ratio);
        p.carried -= dropped;
        for (let i = 0; i < dropped; i++) {
          const a = (2 * Math.PI * i) / dropped;
          const m = { x: p.x + Math.sin(a) * (tu.pickup_radius + 1), z: p.z + Math.cos(a) * (tu.pickup_radius + 1) };
          clampIsland(m);
          addMote(m.x, 0, m.z);
        }
        p.invuln = toTicks(tu.invuln_s);
        emit("player_hit", { by: "shade", flames: p.flames, dropped });
      }
    }

    // 7. sinh BÃƒÂ³ng MÃ¡Â»Â±c
    const after = g.stepsDone + 1;
    if (
      g.spawnShades &&
      after >= SHADE_FIRST_SPAWN_TICK &&
      (after - SHADE_FIRST_SPAWN_TICK) % SHADE_SPAWN_EVERY_TICKS === 0 &&
      g.shades.length < SHADE_MAX
    ) {
      const a = rng() * 2 * Math.PI;
      const id = newShadeId();
      g.shades.push({ id, x: ISLAND_RADIUS * Math.sin(a), y: SHADE_Y, z: ISLAND_RADIUS * Math.cos(a), state: "chase", stun: 0 });
      emit("shade_spawned", { id });
    }

    // 8. thÃ¡Â»Âi gian, bÃ¡Â»â„¢ Ã„â€˜Ã¡ÂºÂ¿m, thÃ¡ÂºÂ¯ng/thua
    g.stepsDone = after;
    g.remaining--;
    if (p.invuln > 0) p.invuln--;
    if (p.cooldown > 0) p.cooldown--;

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
    return {
      type: "snapshot",
      tick: g.stepsDone,
      sim_tick: g.stepsDone,
      state: g.state,
      time_left_s: r3(g.remaining / TPS),
      score: g.score,
      player: { pos: [r3(p.x), r3(p.y), r3(p.z)], flames: p.flames, carried: p.carried },
      lanterns: g.lanterns.map((l) => ({ id: l.id, pos: [r3(l.x), r3(l.y), r3(l.z)], lit: l.lit, deposited: l.deposited })),
      shades: g.shades.map((s) => ({ id: s.id, pos: [r3(s.x), r3(s.y), r3(s.z)], state: s.state })),
      motes_active: g.motes.length,
      motes: g.motes.map((m) => ({ id: m.id, pos: [r3(m.x), r3(m.y), r3(m.z)] })),
    };
  };
  g.endLine = () => ({ type: "end", ticks: g.stepsDone, state: g.state, score: g.score });
  return g;
}
