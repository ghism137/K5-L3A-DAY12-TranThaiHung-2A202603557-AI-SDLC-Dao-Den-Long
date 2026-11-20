import test from "node:test";
import assert from "node:assert/strict";
import { validateName, entryError, insertEntry, sortEntries, sanitizeEntries, isoWithOffset, MAX_ENTRIES } from "../src/core/leaderboard.js";

const E = (name, score, at, extra = {}) => ({ name, score, nights_won: 1, achieved_at: at, seed: 7, ...extra });

test("tên: 3–12 ký tự chữ/số/_ ; biên 2/3/12/13", () => {
  for (const ok of ["abc", "A_1", "Mây_Nhỏ", "abcdefghijkl", "Nguyễn_Hưng", "user_123", "ĐÈN", "Đèn_Lồng_01"]) assert.equal(validateName(ok), true, ok);
  for (const bad of ["ab", "", "abcdefghijklm", "có dấu cách", "a-b-c", "abc!", "tên@", "a b", "😀😀😀", "abc\n"]) assert.equal(validateName(bad), false, JSON.stringify(bad));
  assert.equal(validateName(undefined), false);
});

test("tên tiếng Việt dạng NFD (dấu tách rời) vẫn hợp lệ sau chuẩn hóa NFC", () => {
  assert.equal(validateName("Nguyễn".normalize("NFD")), true);
  assert.equal(validateName("Hưng_Đèn".normalize("NFD")), true);
});

test("mục hợp lệ: nights_won 0..3, score số nguyên >= 0, achieved_at ISO có múi giờ, seed nguyên", () => {
  const ok = E("abc", 10, "2026-11-21T09:00:00+07:00");
  assert.equal(entryError(ok), null);
  assert.equal(entryError({ ...ok, achieved_at: "2026-11-21T09:00:00Z" }), null);
  assert.equal(entryError({ ...ok, achieved_at: "2026-11-21T09:00:00.123-05:30" }), null);
  for (const bad of [{ nights_won: 4 }, { nights_won: -1 }, { nights_won: 1.5 }, { score: -1 }, { score: 1.5 }, { score: "10" }, { seed: 1.2 }, { achieved_at: "2026-11-21 09:00:00" }, { achieved_at: "2026-11-21T09:00:00" }, { achieved_at: "không phải ngày" }, { name: "ab" }]) {
    assert.notEqual(entryError({ ...ok, ...bad }), null, JSON.stringify(bad));
  }
  assert.notEqual(entryError(null), null);
  assert.equal(entryError({ ...ok, nights_won: 0 }), null);
  assert.equal(entryError({ ...ok, nights_won: 3 }), null);
});

test("sắp xếp: điểm giảm dần; bằng điểm thì ai đạt trước đứng trên", () => {
  const list = sortEntries([E("bbb", 50, "2026-11-21T10:00:00+07:00"), E("aaa", 50, "2026-11-21T09:00:00+07:00"), E("ccc", 90, "2026-11-21T11:00:00+07:00"), E("ddd", 10, "2026-11-21T08:00:00+07:00")]);
  assert.deepEqual(list.map((e) => e.name), ["ccc", "aaa", "bbb", "ddd"]);
});

test("so sánh thời điểm theo tức thời, không theo chuỗi (múi giờ khác nhau)", () => {
  // 10:00+07:00 = 03:00Z sớm hơn 09:00+00:00 = 09:00Z
  const list = sortEntries([E("late", 5, "2026-11-21T09:00:00+00:00"), E("early", 5, "2026-11-21T10:00:00+07:00")]);
  assert.deepEqual(list.map((e) => e.name), ["early", "late"]);
});

test("giữ top 10, mục thứ 11 thấp điểm bị loại, rank đúng", () => {
  let entries = [];
  for (let i = 0; i < 10; i++) entries = insertEntry(entries, E(`p${String(i).padStart(2, "0")}`, 100 + i, `2026-11-21T09:${String(i).padStart(2, "0")}:00+07:00`)).entries;
  assert.equal(entries.length, MAX_ENTRIES);
  const low = insertEntry(entries, E("thapdiem", 1, "2026-11-21T10:00:00+07:00"));
  assert.equal(low.rank, null);
  assert.equal(low.entries.length, 10);
  assert.ok(!low.entries.some((e) => e.name === "thapdiem"));
  const top = insertEntry(entries, E("caodiem", 500, "2026-11-21T10:00:00+07:00"));
  assert.equal(top.rank, 1);
  assert.equal(top.entries.length, 10);
  assert.ok(!top.entries.some((e) => e.name === "p00"), "điểm thấp nhất (100) bị đẩy ra");
  const mid = insertEntry(entries, E("giuaban", 106, "2026-11-21T10:00:00+07:00"));
  assert.equal(mid.rank, 5); // 109,108,107 và p06 (106, đạt trước) đứng trên
});

test("bằng điểm với mục cuối trong top 10: người đến sau không chen vào", () => {
  let entries = [];
  for (let i = 0; i < 10; i++) entries = insertEntry(entries, E(`pl${i}`, 50, `2026-11-21T09:0${i}:00+07:00`)).entries;
  const r = insertEntry(entries, E("denmuon", 50, "2026-11-21T12:00:00+07:00"));
  assert.equal(r.rank, null);
  assert.ok(r.entries.every((e) => e.name !== "denmuon"));
  const sooner = insertEntry(entries, E("denSom", 50, "2026-11-21T08:00:00+07:00"));
  assert.equal(sooner.rank, 1);
});

test("chèn mục sai định dạng thì ném lỗi, không đổi danh sách", () => {
  const before = [E("abc", 1, "2026-11-21T09:00:00+07:00")];
  assert.throws(() => insertEntry(before, { ...before[0], name: "x" }));
  assert.equal(before.length, 1);
});

test("sanitizeEntries: bỏ mục hỏng, sắp xếp lại, cắt top 10; nhận cả {entries:[...]}", () => {
  const good = Array.from({ length: 12 }, (_, i) => E(`pl${String(i).padStart(2, "0")}`, i, "2026-11-21T09:00:00+07:00"));
  const out = sanitizeEntries({ entries: [...good, { name: "hong" }, null] });
  assert.equal(out.length, 10);
  assert.equal(out[0].score, 11);
  assert.deepEqual(sanitizeEntries("rác"), []);
  assert.deepEqual(sanitizeEntries(undefined), []);
});

test("isoWithOffset: định dạng ISO 8601 có múi giờ và hợp lệ với entryError", () => {
  const s = isoWithOffset(new Date(2026, 10, 21, 9, 5, 3));
  assert.match(s, /^2026-11-21T09:05:03[+-]\d{2}:\d{2}$/);
  assert.equal(entryError(E("abc", 1, s)), null);
  assert.ok(Math.abs(Date.parse(s) - new Date(2026, 10, 21, 9, 5, 3).getTime()) < 1000);
});
