// Cài đặt người chơi, lưu giữa các lần mở game (localStorage).
const KEY = "ddl.settings.v1";
const DEFAULTS = { volume: 0.7, sensitivity: 1 };

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      volume: clamp(raw.volume, 0, 1, DEFAULTS.volume),
      sensitivity: clamp(raw.sensitivity, 0.2, 3, DEFAULTS.sensitivity),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* trình duyệt chặn lưu: bỏ qua, cài đặt vẫn dùng được trong phiên */
  }
}

function clamp(v, lo, hi, def) {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
}
