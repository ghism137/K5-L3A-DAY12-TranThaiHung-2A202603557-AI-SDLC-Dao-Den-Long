// Kiểm tra định dạng file inputs / scenario (Contract v1.1). Lỗi -> FormatError (headless thoát mã 2).
import { SHADE_STATES, DRIFTER_STATES } from "./rules.js";

export class FormatError extends Error {}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNat = (v) => Number.isInteger(v) && v >= 0;
const fail = (msg) => {
  throw new FormatError(msg);
};

function vec(v, what, allow2 = false) {
  if (!Array.isArray(v) || !(v.length === 3 || (allow2 && v.length === 2)) || !v.every(isNum)) {
    fail(`${what} phải là mảng ${allow2 ? "2 hoặc 3" : "3"} số`);
  }
  return v.length === 2 ? [v[0], 0, v[1]] : [...v];
}
const optNat = (o, k, what) => {
  if (k in o && !isNat(o[k])) fail(`${what}.${k} phải là số nguyên >= 0`);
};

export function parseInputs(obj) {
  if (!isObj(obj) || !Array.isArray(obj.frames)) fail("inputs phải có mảng 'frames'");
  let last = -1;
  return obj.frames.map((f, i) => {
    if (!isObj(f)) fail(`frames[${i}] phải là object`);
    if (!isNat(f.tick)) fail(`frames[${i}].tick phải là số nguyên >= 0`);
    if (f.tick <= last) fail(`frames[${i}].tick phải tăng nghiêm ngặt`);
    last = f.tick;
    if ("move" in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every(isNum)) fail(`frames[${i}].move phải là [x, z]`);
      if (f.move.some((c) => c < -1 || c > 1)) fail(`frames[${i}].move phải nằm trong [-1, 1]`);
    }
    if ("cam_yaw_deg" in f && !isNum(f.cam_yaw_deg)) fail(`frames[${i}].cam_yaw_deg phải là số`);
    for (const k of ["jump", "interact", "pulse", "dash", "pause"]) {
      if (k in f && typeof f[k] !== "boolean") fail(`frames[${i}].${k} phải là boolean`);
    }
    return f;
  });
}

export function parseScenario(obj) {
  if (!isObj(obj)) fail("scenario phải là object");
  const sc = {};
  if ("player" in obj) {
    const p = obj.player;
    if (!isObj(p)) fail("player phải là object");
    sc.player = {};
    if ("pos" in p) sc.player.pos = vec(p.pos, "player.pos");
    for (const k of ["carried", "flames", "invuln_ticks", "dash_cd_ticks", "pulse_cd_ticks", "charm_ticks"]) {
      if (k in p) {
        optNat(p, k, "player");
        sc.player[k] = p[k];
      }
    }
  }
  for (const k of ["random_motes", "random_shades", "random_drifters", "wind_enabled"]) {
    if (k in obj) {
      if (typeof obj[k] !== "boolean") fail(`${k} phải là boolean`);
      sc[k] = obj[k];
    }
  }
  if ("motes" in obj) {
    if (!Array.isArray(obj.motes)) fail("motes phải là mảng");
    sc.motes = obj.motes.map((m, i) => vec(m, `motes[${i}]`, true));
  }
  if ("shades" in obj) {
    if (!Array.isArray(obj.shades)) fail("shades phải là mảng");
    sc.shades = obj.shades.map((s, i) => {
      if (!isObj(s)) fail(`shades[${i}] phải là object`);
      if ("id" in s && typeof s.id !== "string") fail(`shades[${i}].id phải là chuỗi`);
      if ("state" in s && !SHADE_STATES.includes(s.state)) fail(`shades[${i}].state phải thuộc ${SHADE_STATES.join("|")}`);
      optNat(s, "state_ticks_left", `shades[${i}]`);
      return { id: s.id, pos: vec(s.pos, `shades[${i}].pos`, true), state: s.state, state_ticks_left: s.state_ticks_left };
    });
  }
  if ("drifters" in obj) {
    if (!Array.isArray(obj.drifters)) fail("drifters phải là mảng");
    sc.drifters = obj.drifters.map((d, i) => {
      if (!isObj(d)) fail(`drifters[${i}] phải là object`);
      if ("id" in d && typeof d.id !== "string") fail(`drifters[${i}].id phải là chuỗi`);
      if ("state" in d && !DRIFTER_STATES.includes(d.state)) fail(`drifters[${i}].state phải thuộc ${DRIFTER_STATES.join("|")}`);
      optNat(d, "stolen", `drifters[${i}]`);
      optNat(d, "state_ticks_left", `drifters[${i}]`);
      return { id: d.id, pos: vec(d.pos, `drifters[${i}].pos`, true), state: d.state, stolen: d.stolen, state_ticks_left: d.state_ticks_left };
    });
  }
  if ("charms" in obj) {
    if (!Array.isArray(obj.charms)) fail("charms phải là mảng");
    sc.charms = obj.charms.map((c, i) => {
      if (!isObj(c) || typeof c.id !== "string") fail(`charms[${i}] cần 'id' dạng chuỗi`);
      if ("available" in c && typeof c.available !== "boolean") fail(`charms[${i}].available phải là boolean`);
      optNat(c, "respawn_ticks", `charms[${i}]`);
      return { id: c.id, pos: "pos" in c ? vec(c.pos, `charms[${i}].pos`, true) : undefined, available: c.available, respawn_ticks: c.respawn_ticks };
    });
  }
  if ("lanterns" in obj) {
    if (!Array.isArray(obj.lanterns)) fail("lanterns phải là mảng");
    sc.lanterns = obj.lanterns.map((l, i) => {
      if (!isObj(l) || typeof l.id !== "string") fail(`lanterns[${i}] cần 'id' dạng chuỗi`);
      const o = { id: l.id };
      if ("pos" in l) o.pos = vec(l.pos, `lanterns[${i}].pos`, true);
      if ("lit" in l) {
        if (typeof l.lit !== "boolean") fail(`lanterns[${i}].lit phải là boolean`);
        o.lit = l.lit;
      }
      if ("deposited" in l) {
        optNat(l, "deposited", `lanterns[${i}]`);
        o.deposited = l.deposited;
      }
      return o;
    });
  }
  if ("time_left_s" in obj) {
    if (!isNum(obj.time_left_s) || obj.time_left_s < 0) fail("time_left_s phải là số >= 0");
    sc.time_left_s = obj.time_left_s;
  }
  return sc;
}
