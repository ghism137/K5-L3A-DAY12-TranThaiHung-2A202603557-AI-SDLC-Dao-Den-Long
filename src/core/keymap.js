// Đổi phím (Ticket-04 mục 4): bản đồ phím thuần. Mỗi hành động có 2 ô (chính, phụ). Không phụ thuộc DOM.
export const ACTIONS = ["up", "down", "left", "right", "jump", "dash", "interact", "pulse", "pause"];
export const ACTION_LABEL = { up: "Đi lên", down: "Đi xuống", left: "Sang trái", right: "Sang phải", jump: "Nhảy", dash: "Lướt", interact: "Tương tác (nạp/châm dầu)", pulse: "Tỏa sáng", pause: "Tạm dừng" };

export const DEFAULT_KEYMAP = Object.freeze({
  up: ["w", "arrowup"],
  down: ["s", "arrowdown"],
  left: ["a", "arrowleft"],
  right: ["d", "arrowright"],
  jump: [" ", null],
  dash: ["shift", null],
  interact: ["e", null],
  pulse: ["q", "f"],
  pause: ["escape", "p"],
});

export const cloneKeymap = (m = DEFAULT_KEYMAP) => Object.fromEntries(ACTIONS.map((a) => [a, [m[a][0] ?? null, m[a][1] ?? null]]));
export const normalizeKey = (k) => (typeof k === "string" && k.length ? (k.length === 1 ? k.toLowerCase() : k.toLowerCase()) : null);

export function keyLabel(k) {
  if (!k) return "—";
  const map = { " ": "Space", arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→", escape: "Esc", shift: "Shift", control: "Ctrl", alt: "Alt", enter: "Enter", tab: "Tab", backspace: "⌫" };
  return map[k] ?? (k.length === 1 ? k.toUpperCase() : k);
}

// Hành động đang dùng phím k (khác `except`), hoặc null.
export function conflictOf(map, key, except) {
  const k = normalizeKey(key);
  for (const a of ACTIONS) if (a !== except && map[a].includes(k)) return a;
  return null;
}

// Gán phím cho ô slot (0/1) của action. Trả về { ok, map, conflict? , error? }. Không sửa map gốc.
export function bindKey(map, action, slot, key) {
  const k = normalizeKey(key);
  if (!ACTIONS.includes(action) || (slot !== 0 && slot !== 1)) return { ok: false, map, error: "hành động hoặc ô không hợp lệ" };
  if (k === null) {
    const next = cloneKeymap(map);
    next[action][slot] = null;
    if (next[action][0] === null && next[action][1] === null) return { ok: false, map, error: "mỗi hành động phải còn ít nhất một phím" };
    return { ok: true, map: next };
  }
  const conflict = conflictOf(map, k, action);
  if (conflict) return { ok: false, map, conflict };
  const other = map[action][1 - slot];
  const next = cloneKeymap(map);
  next[action][slot] = k;
  if (other === k) next[action][1 - slot] = null; // cùng hành động: dời sang ô này
  return { ok: true, map: next };
}

export const actionForKey = (map, key) => ACTIONS.find((a) => map[a].includes(normalizeKey(key))) ?? null;
export const isActionDown = (map, action, downKeys) => map[action].some((k) => k !== null && downKeys.has(k));

// Đọc từ lưu trữ: sai định dạng hoặc có trùng phím thì dùng mặc định.
export function sanitizeKeymap(raw) {
  try {
    const m = cloneKeymap(Object.fromEntries(ACTIONS.map((a) => {
      const slots = raw?.[a];
      if (!Array.isArray(slots) || slots.length !== 2) throw new Error("định dạng");
      return [a, slots.map((k) => (k === null ? null : normalizeKey(k)))];
    })));
    const seen = new Set();
    for (const a of ACTIONS) {
      if (m[a][0] === null && m[a][1] === null) throw new Error("rỗng");
      for (const k of m[a]) {
        if (k === null) continue;
        if (seen.has(k)) throw new Error("trùng");
        seen.add(k);
      }
    }
    return m;
  } catch {
    return cloneKeymap(DEFAULT_KEYMAP);
  }
}
