// Bảng xếp hạng cục bộ (Ticket-04 mục 3): luật thuần, dùng chung cho máy chủ (ghi đĩa) và giao diện.
export const MAX_ENTRIES = 10;
// 3-12 ký tự: chữ cái (kể cả có dấu tiếng Việt), chữ số, dấu gạch dưới. Chuẩn hóa NFC trước khi đếm.
const NAME_RE = /^[\p{L}\p{N}_]{3,12}$/u;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export const normalizeName = (name) => String(name ?? "").normalize("NFC");
export const validateName = (name) => NAME_RE.test(normalizeName(name));

// ISO 8601 có múi giờ theo giờ địa phương, ví dụ 2026-11-21T09:15:30+07:00
export function isoWithOffset(date = new Date()) {
  const p = (n, w = 2) => String(Math.abs(n)).padStart(w, "0");
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

// Trả về chuỗi lỗi, hoặc null nếu hợp lệ.
export function entryError(e) {
  if (!e || typeof e !== "object") return "mục phải là object";
  if (!validateName(e.name)) return "tên phải gồm 3-12 ký tự chữ cái, chữ số hoặc _";
  if (!Number.isInteger(e.score) || e.score < 0) return "score phải là số nguyên >= 0";
  if (!Number.isInteger(e.nights_won) || e.nights_won < 0 || e.nights_won > 3) return "nights_won phải từ 0 đến 3";
  if (typeof e.achieved_at !== "string" || !ISO_RE.test(e.achieved_at) || Number.isNaN(Date.parse(e.achieved_at))) return "achieved_at phải là ISO 8601 có múi giờ";
  if (!Number.isInteger(e.seed)) return "seed phải là số nguyên";
  return null;
}

// score giảm dần; bằng điểm thì ai đạt trước đứng trên (sort ổn định giữ thứ tự chèn nếu cùng thời điểm)
export function sortEntries(entries) {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.score - a.e.score || Date.parse(a.e.achieved_at) - Date.parse(b.e.achieved_at) || a.i - b.i)
    .map((x) => x.e);
}

// Thêm một mục, giữ top 10. Trả về { entries, rank } (rank 1..10, hoặc null nếu không vào top 10).
export function insertEntry(entries, entry) {
  const err = entryError(entry);
  if (err) throw new Error(err);
  const clean = { name: normalizeName(entry.name), score: entry.score, nights_won: entry.nights_won, achieved_at: entry.achieved_at, seed: entry.seed };
  const all = sortEntries([...entries, clean]);
  const top = all.slice(0, MAX_ENTRIES);
  const idx = top.indexOf(clean);
  return { entries: top, rank: idx >= 0 ? idx + 1 : null };
}

// Đọc dữ liệu từ đĩa: bỏ mục hỏng, sắp xếp lại, giữ top 10.
export function sanitizeEntries(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.entries) ? raw.entries : [];
  return sortEntries(list.filter((e) => entryError(e) === null)).slice(0, MAX_ENTRIES);
}
