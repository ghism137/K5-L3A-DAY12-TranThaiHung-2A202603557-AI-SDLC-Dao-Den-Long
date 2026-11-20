import test from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, DEFAULT_KEYMAP, cloneKeymap, bindKey, conflictOf, actionForKey, isActionDown, sanitizeKeymap, keyLabel } from "../src/core/keymap.js";

test("mặc định: đủ 9 hành động (4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng), không trùng phím", () => {
  assert.deepEqual(ACTIONS, ["up", "down", "left", "right", "jump", "dash", "interact", "pulse", "pause"]);
  const all = ACTIONS.flatMap((a) => DEFAULT_KEYMAP[a]).filter(Boolean);
  assert.equal(new Set(all).size, all.length, "mặc định không được trùng phím");
  for (const a of ACTIONS) assert.ok(DEFAULT_KEYMAP[a].some(Boolean), a);
});

test("gán phím mới vào ô, không sửa bản đồ gốc", () => {
  const m = cloneKeymap();
  const r = bindKey(m, "jump", 0, "J");
  assert.equal(r.ok, true);
  assert.equal(r.map.jump[0], "j");
  assert.equal(m.jump[0], " ", "bản gốc không đổi");
  assert.equal(actionForKey(r.map, "J"), "jump");
  assert.equal(actionForKey(r.map, " "), null);
});

test("phát hiện trùng phím với hành động khác ở cả ô chính và ô phụ, báo rõ hành động trùng", () => {
  const m = cloneKeymap();
  for (const [key, owner] of [["e", "interact"], ["w", "up"], ["arrowup", "up"], ["f", "pulse"], ["p", "pause"], ["shift", "dash"], ["E", "interact"]]) {
    const r = bindKey(m, "jump", 0, key);
    assert.equal(r.ok, false, key);
    assert.equal(r.conflict, owner, key);
    assert.deepEqual(r.map, m, "bản đồ không đổi khi trùng");
  }
  assert.equal(conflictOf(m, "q", "pulse"), null, "không tính trùng với chính hành động đó");
  assert.equal(conflictOf(m, "q", "jump"), "pulse");
});

test("gán lại cùng phím cho cùng hành động là hợp lệ; chuyển phím giữa hai ô của cùng hành động", () => {
  const m = cloneKeymap();
  assert.equal(bindKey(m, "pulse", 0, "q").ok, true);
  const moved = bindKey(m, "pulse", 1, "q"); // Q đang ở ô 0: dời sang ô 1, ô 0 trống, F bị thay
  assert.equal(moved.ok, true);
  assert.deepEqual(moved.map.pulse, [null, "q"]);
});

test("xóa phím: được nếu còn phím khác, từ chối nếu hành động sẽ không còn phím nào", () => {
  const m = cloneKeymap();
  assert.equal(bindKey(m, "up", 1, null).ok, true);
  assert.equal(bindKey(m, "jump", 0, null).ok, false, "nhảy chỉ có một phím");
  assert.equal(bindKey(m, "nope", 0, "x").ok, false);
  assert.equal(bindKey(m, "jump", 2, "x").ok, false);
});

test("isActionDown nhận mọi ô của hành động", () => {
  const m = cloneKeymap();
  assert.equal(isActionDown(m, "up", new Set(["arrowup"])), true);
  assert.equal(isActionDown(m, "up", new Set(["w"])), true);
  assert.equal(isActionDown(m, "up", new Set(["s"])), false);
  const r = bindKey(m, "up", 0, "i").map;
  assert.equal(isActionDown(r, "up", new Set(["w"])), false, "phím cũ không còn tác dụng");
  assert.equal(isActionDown(r, "up", new Set(["i"])), true);
});

test("đọc từ lưu trữ: hợp lệ giữ nguyên; sai định dạng, trùng phím, hành động rỗng thì về mặc định", () => {
  const custom = bindKey(cloneKeymap(), "jump", 0, "j").map;
  assert.deepEqual(sanitizeKeymap(JSON.parse(JSON.stringify(custom))), custom);
  assert.deepEqual(sanitizeKeymap(undefined), cloneKeymap(DEFAULT_KEYMAP));
  assert.deepEqual(sanitizeKeymap({ up: ["w"] }), cloneKeymap(DEFAULT_KEYMAP));
  const dup = cloneKeymap(); dup.jump[0] = "e";
  assert.deepEqual(sanitizeKeymap(dup), cloneKeymap(DEFAULT_KEYMAP));
  const empty = cloneKeymap(); empty.dash = [null, null];
  assert.deepEqual(sanitizeKeymap(empty), cloneKeymap(DEFAULT_KEYMAP));
});

test("nhãn phím dễ đọc", () => {
  assert.equal(keyLabel(" "), "Space");
  assert.equal(keyLabel("arrowup"), "↑");
  assert.equal(keyLabel("escape"), "Esc");
  assert.equal(keyLabel("j"), "J");
  assert.equal(keyLabel(null), "—");
});
