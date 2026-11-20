import test from "node:test";
import assert from "node:assert/strict";
import { PAL, ambientIntensity } from "../src/render/palette.js";

// Bảng màu chuẩn Ticket-02: đúng mã hex (sai lệch cho phép 10% mỗi kênh, ở đây dùng đúng giá trị)
test("bảng màu đúng mã hex của Ticket-02", () => {
  const want = {
    sky: 0x0e1430, mist: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, cloudSea: 0x12384a,
    lanternLit: 0xffb347, lanternCore: 0xffe9b0, lanternOff: 0x5b5f6e, moteCore: 0xfff6c2, moteHalo: 0xffe58a,
    shadeBody: 0x120a1a, shadeEdge: 0x7a3cff, shadeStunned: 0x3a3450, robe: 0xe8e2d0, scarf: 0xc8102e,
    gold: 0xf2c14e, drifter: 0x8fa3b8, danger: 0xff5a5f, text: 0xf5f1e6,
  };
  assert.deepEqual(PAL, want);
});

test("ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng / tổng đèn)", () => {
  assert.equal(ambientIntensity(0, 5), 0.15);
  assert.ok(Math.abs(ambientIntensity(5, 5) - 0.7) < 1e-12);
  assert.ok(Math.abs(ambientIntensity(3, 6) - 0.425) < 1e-12);
  assert.ok(Math.abs(ambientIntensity(2, 7) - (0.15 + (0.55 * 2) / 7)) < 1e-12);
});
// Chế độ mù màu (Ticket-03): đổi đúng hai màu, các màu khác giữ nguyên
test("bảng màu dễ phân biệt: viền Bóng Mực #00B3FF, cảnh báo UI #FFFFFF, còn lại không đổi", async () => {
  const { PAL_CB, palFor } = await import("../src/render/palette.js");
  assert.equal(PAL_CB.shadeEdge, 0x00b3ff);
  assert.equal(PAL_CB.danger, 0xffffff);
  assert.equal(palFor(true), PAL_CB);
  assert.equal(palFor(false), PAL);
  for (const k of Object.keys(PAL)) if (k !== "shadeEdge" && k !== "danger") assert.equal(PAL_CB[k], PAL[k], k);
  assert.equal(PAL.shadeEdge, 0x7a3cff);
  assert.equal(PAL.danger, 0xff5a5f);
});
