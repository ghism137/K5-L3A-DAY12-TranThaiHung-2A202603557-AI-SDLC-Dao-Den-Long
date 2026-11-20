// Cài đặt người chơi, lưu giữa các lần mở game (localStorage): âm lượng, độ nhạy, dễ tiếp cận, phím.
import { sanitizeKeymap, cloneKeymap, DEFAULT_KEYMAP } from "../core/keymap.js";

const KEY = "ddl.settings.v1";
const DEFAULTS = { volume: 0.7, sensitivity: 1, colorblind: false, reduceMotion: false, largeText: false, cues: true };

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      volume: clamp(raw.volume, 0, 1, DEFAULTS.volume),
      sensitivity: clamp(raw.sensitivity, 0.2, 3, DEFAULTS.sensitivity),
      colorblind: raw.colorblind === true,
      reduceMotion: raw.reduceMotion === true,
      largeText: raw.largeText === true,
      cues: raw.cues !== false, // chỉ báo hình ảnh bật mặc định
      keymap: sanitizeKeymap(raw.keymap),
    };
  } catch {
    return { ...DEFAULTS, keymap: cloneKeymap(DEFAULT_KEYMAP) };
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
