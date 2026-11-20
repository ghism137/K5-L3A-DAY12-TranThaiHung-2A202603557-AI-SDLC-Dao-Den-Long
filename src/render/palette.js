// Bảng màu chuẩn của Ticket-02 (sai lệch tối đa 10% mỗi kênh RGB; đây là đúng mã hex của ticket).
export const PAL = {
  sky: 0x0e1430,
  mist: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternOff: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteHalo: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeEdge: 0x7a3cff,
  shadeStunned: 0x3a3450,
  robe: 0xe8e2d0,
  scarf: 0xc8102e, // khăn Mây và Bùa Gió
  gold: 0xf2c14e, // viền vàng, điểm số
  drifter: 0x8fa3b8,
  danger: 0xff5a5f,
  text: 0xf5f1e6,
};
export const css = (hex) => "#" + hex.toString(16).padStart(6, "0");

// Ánh sáng môi trường tăng theo tiến độ: 0.15 + 0.55 × (đèn sáng / tổng đèn)
export const ambientIntensity = (lit, total) => 0.15 + 0.55 * (total ? lit / total : 0);

// Chế độ "Bảng màu dễ phân biệt" (Ticket-03): viền/mắt Bóng Mực #00B3FF, cảnh báo UI #FFFFFF (kèm biểu tượng ⚠)
export const PAL_CB = { ...PAL, shadeEdge: 0x00b3ff, danger: 0xffffff };
export const palFor = (colorblind) => (colorblind ? PAL_CB : PAL);
