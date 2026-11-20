---
name: verify-ui
description: Kiểm chứng bản có giao diện của Đảo Đèn Lồng bằng trình duyệt thật (bot bấm phím/chuột, đo FPS, chụp ảnh). Dùng sau khi sửa src/render, web/ hoặc luồng menu, và trước khi gắn tag phase.
---

# Kiểm chứng giao diện

1. `npm run smoke` — bot Chrome/Edge headless (CDP) chơi thật: menu → giới thiệu → chơi, phím di chuyển/nhảy/lướt, tạm dừng đứng yên, cài đặt lưu lại sau khi tải lại trang, thua → chơi lại, thắng Đêm 1 → Đêm 2, thắng Đêm 3 → Bình Minh, các thành phần HUD. Lưu kết quả: `node scripts/ui-smoke.mjs > docs/proof/phaseN/ui-smoke.txt`. Phải 100% đạt.
   - Cần Chrome/Edge (đặt `BROWSER=<đường dẫn>` nếu không tự tìm thấy).
   - Móc kiểm thử: `window.__ddl` (chỉ đọc) và tham số URL `?autostart=N&seed=S&lit=K&carry=C&time=T` (dựng sẵn tình huống; mặc định không có gì).
2. `npm run fps` — đo FPS ở 1280×720 mỗi Đêm, ghi `docs/proof/phaseN/fps.json` và tên GPU. Nếu GPU là SwiftShader (render phần mềm) thì số đo thấp hơn máy thật, ghi rõ khi báo cáo. Yêu cầu: trung bình ≥ 30.
3. Ảnh chụp: Edge headless `--screenshot` với `?autostart=N&lit=K`. Đọc console: lỗi JS = 0.
4. Âm thanh, lá bay, rung màn hình **không** có kiểm tra tự động: ghi "thủ công, chưa nghe/xem" nếu chưa ai thử.
5. Mọi hiệu ứng thêm chỉ nằm ở `src/render/`, không được đổi đầu ra headless (`npm test` phải vẫn xanh).