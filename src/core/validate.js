// Kiểm tra định dạng file inputs / scenario. Lỗi -> FormatError (headless thoát mã 2).
export class FormatError extends Error {}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const fail = (msg) => {
  throw new FormatError(msg);
};

function vec(v, what, allow2 = false) {
  if (!Array.isArray(v) || !(v.length === 3 || (allow2 && v.length === 2)) || !v.every(isNum)) {
    fail(`${what} phải là mảng ${allow2 ? "2 hoặc 3" : "3"} số`);
  }
  return v.length === 2 ? [v[0], 0, v[1]] : [...v];
}

export function parseInputs(obj) {
  if (!isObj(obj) || !Array.isArray(obj.frames)) fail("inputs phải có mảng 'frames'");
  let last = -1;
  const frames = obj.frames.map((f, i) => {
    if (!isObj(f)) fail(`frames[${i}] phải là object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) fail(`frames[${i}].tick phải là số nguyên >= 0`);
    if (f.tick <= last) fail(`frames[${i}].tick phải tăng nghiêm ngặt`);
    last = f.tick;
    if ("move" in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every(isNum)) fail(`frames[${i}].move phải là [x, z]`);
      if (f.move.some((c) => c < -1 || c > 1)) fail(`frames[${i}].move phải nằm trong [-1, 1]`);
    }
    if ("cam_yaw_deg" in f && !isNum(f.cam_yaw_deg)) fail(`frames[${i}].cam_yaw_deg phải là số`);
    for (const k of ["jump", "interact", "pulse", "dash"]) {
      if (k in f && typeof f[k] !== "boolean") fail(`frames[${i}].${k} phải là boolean`);
    }
    return f;
  });
  return frames;
}

export function parseScenario(obj) {
  if (!isObj(obj)) fail("scenario phải là object");
  const sc = {};
  if ("player" in obj) {
    const p = obj.player;
    if (!isObj(p)) fail("player phải là object");
    sc.player = {};
    if ("pos" in p) sc.player.pos = vec(p.pos, "player.pos");
    for (const k of ["carried", "flames"]) {
      if (k in p) {
        if (!Number.isInteger(p[k]) || p[k] < 0) fail(`player.${k} phải là số nguyên >= 0`);
        sc.player[k] = p[k];
      }
    }
  }
  for (const k of ["random_motes", "random_shades"]) {
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
      return { id: s.id, pos: vec(s.pos, `shades[${i}].pos`, true) };
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
        if (!Number.isInteger(l.deposited) || l.deposited < 0) fail(`lanterns[${i}].deposited phải là số nguyên >= 0`);
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
