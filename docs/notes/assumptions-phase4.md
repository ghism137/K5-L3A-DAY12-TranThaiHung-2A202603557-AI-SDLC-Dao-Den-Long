# Giả định Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0", Contract v1.3)

Quy ước: **[B]** bắt buộc theo ticket, **[G]** giả định của tôi, ❓ nên hỏi trợ giảng. Phase này không đổi luật chơi: đầu ra headless của Phase 1–3 phải giữ nguyên (test ẩn còn hiệu lực vẫn đạt).

## 1. Hiện trạng và khoảng cách

| Yêu cầu | Hiện trạng | Việc phải làm |
|---|---|---|
| Benchmark (`--seed 42 --duration 30 --out bench.json`) | Chưa có | Cảnh chuẩn (200 Bóng Mực wander, 100 đom đóm, 3 đèn sáng), camera bay vòng, script đo, **tối ưu render** (hiện mỗi Bóng Mực ~5 đối tượng, mỗi đom đóm 2) |
| Soak (`--seed 7 --nights 10 --out soak.json`) | Chưa có | Script headless 10 Đêm trong một tiến trình, input ngẫu nhiên, đo RSS |
| Bảng xếp hạng + `--export-leaderboard` | Chưa có | Lưu trên đĩa qua máy chủ, màn hình nhập tên, top 10, lệnh xuất |
| Đổi phím, phụ đề, giảm chuyển động, chữ ≥ 18 px, chữ lớn ×1.25 | Chưa có (phím cố định, nhiều chữ 11–16 px) | Hệ thống phím, chỉ báo, cài đặt, chuyển CSS sang rem |
| Đóng gói, README (ảnh, yêu cầu hệ thống, bench, soak), CHANGELOG 4 phase, CREDITS, LICENSE | Một phần | Hoàn thiện; zip chạy được cho Release |
| Contract v1.3: `bench_cmd`, `soak_cmd` | v1.2 | Nâng contract |
| Retro, video, Release `v1.0.0` | Chưa có | Tôi soạn retro từ bằng chứng; **video do bạn quay**; Release tôi tạo |

## 2. Giả định

| # | Chỗ mơ hồ | Giả định | Kiểm chứng |
|---|---|---|---|
| G1 | `<bench_cmd>` của một game web | `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`: khởi động máy chủ cục bộ, mở Chrome/Edge **có cửa sổ** (1280×720 qua CDP, không toàn màn hình), nạp `?bench=1`, đo rồi tự thoát mã 0. Tự thử headed rồi lùi về `--headless=new` nếu không mở được; cờ `--headless` để chạy máy không màn hình | chạy thật, bench.json |
| G2 | Tắt vsync trong trình duyệt | Cờ `--disable-gpu-vsync --disable-frame-rate-limit`; `vsync_off: true` khi cờ được áp dụng, README nói rõ rằng trình duyệt không cho trang tự tắt vsync và số đo có thể bị chặn ở tần số quét màn hình ❓ | README |
| G3 | Cảnh benchmark | Cờ nội bộ `bench` của `createGame` (**không có trong CLI headless**) tắt: sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm; 3 đèn L1–L3 sáng fuel 100; Mây đứng yên (0,0,0); 200 Bóng Mực `wander` rải đều theo đường xoắn ốc Vogel có độ lệch theo seed; 100 đom đóm rải đều; âm thanh và hiệu ứng sáng tạo (Ông Đăng, lá gió) tắt; HUD vẫn hiện | test đơn vị `createGame({bench})`, ảnh |
| G4 | Camera | `(30·cosθ, 15, 30·sinθ)`, θ = 2π·t/15, nhìn (0,0,0); θ = 0 ở điểm (30,15,0) và tăng ngược chiều kim đồng hồ nhìn từ trên xuống (cùng quy ước góc `x = r·cosθ, z = r·sinθ` của bản đồ) | test công thức camera |
| G5 | Đo khung hình | `dt` từ chênh `requestAnimationFrame`; 3 s đầu bỏ; cửa sổ đo đúng `--duration` s; `frames` = số khung có thời điểm bắt đầu trong cửa sổ; `avg_fps = 1000·N/Σdt`; `p1_low_fps` đúng công thức k = max(1, ceil(0.01·N)); `frame_ms_p95` dùng phân vị nearest-rank trên dt tăng dần (chỉ số ceil(0.95·N) − 1) ❓ | test hàm thống kê với dữ liệu biết trước |
| G6 | `load_ms`, `peak_mem_mb` | `load_ms` = từ lúc tiến trình `bench.mjs` bắt đầu tới khung hình đầu tiên của cảnh bench (gồm khởi động máy chủ và trình duyệt); `peak_mem_mb` = tổng RSS cây tiến trình trình duyệt, lấy mẫu mỗi 250 ms trong lúc đo; nếu hệ điều hành không cho đo thì `null` và README giải thích | bench.json |
| G7 | `renderer`, `os` | `renderer` = tên GPU/ANGLE trình duyệt báo + phiên bản trình duyệt + phiên bản Three.js; `os` tự điền từ `os` của Node | bench.json |
| G8 | Tối ưu để đạt ≥ 60 FPS | Dùng `InstancedMesh` cho Bóng Mực (thân, viền, mắt) và `THREE.Points` cho đom đóm; giữ nguyên diện mạo. Máy chấm chưa biết: số tôi đo chỉ tham khảo | bench.json, ảnh trước/sau |
| G9 | `<soak_cmd>` | `node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json`; Đêm i = 1..10 dùng seed 7 + i, màn (i−1) mod 3 + 1; chạy tới khi kết thúc hoặc hết thời lượng; lỗi ném ra được bắt và đếm vào `crashes` | test + soak.json |
| G10 | Input ngẫu nhiên soak | PRNG riêng theo seed Đêm; mỗi 30 tick chọn hướng (góc đều); mỗi tick độc lập: nhảy 5%, lướt 3%, tỏa sáng 2%, tương tác 10% (đặt boolean mỗi tick, cạnh lên ra tự nhiên); `results[i]` = `won`/`lost` | test tất định (cùng seed → cùng kết quả) |
| G11 | Đo RSS | `mem_start_mb`: sau khi tải xong Đêm đầu và gọi `gc()`; `mem_end_mb`: sau khi tạo lại (reset) Đêm cuối và `gc()`; `process.memoryUsage().rss` làm tròn MB. Cần `--expose-gc` (đã nằm trong `soak_cmd`) | soak.json |
| G12 | Lưu bảng xếp hạng "trên đĩa" | Máy chủ ghi `data/leaderboard.json` (ghi tạm rồi đổi tên); API `GET/POST /api/leaderboard`; client không tự lưu localStorage. `npm start -- --export-leaderboard out.json` đọc file, ghi `{"entries":[...]}`, thoát mã 0, không mở cổng. Thư mục đổi được bằng `DDL_DATA_DIR` | test máy chủ + CLI |
| G13 | Mục bảng xếp hạng | `name`, `score` (tổng điểm các Đêm đã thắng), `nights_won` (0–3), `achieved_at` (ISO 8601 có múi giờ, đồng hồ máy chủ), `seed` (seed của Đêm 1 trong lượt chơi) ❓; top 10 theo `score` giảm dần, hòa thì `achieved_at` sớm hơn đứng trên | test thuần `src/core/leaderboard.js` |
| G14 | Tên | 3–12 ký tự gồm chữ cái, chữ số và `_` (chữ cái Unicode, nên có dấu tiếng Việt vẫn hợp lệ, là điểm cộng); mọi ký tự khác (khoảng trắng, dấu câu) bị từ chối ở cả client và máy chủ ❓ | test tên hợp lệ/không hợp lệ |
| G15 | Khi nào cho nhập tên | Sau màn Bình Minh và sau khi thua ở bất kỳ Đêm nào (có thể bỏ qua); lưu không kết thúc lượt chơi | smoke |
| G16 | Đổi phím | Mỗi hành động có 2 ô (chính + phụ): đi lên/xuống/trái/phải, nhảy, lướt, tương tác, tỏa sáng, tạm dừng; mặc định WASD/mũi tên, Space, Shift, E, Q/F, Esc/P. Trùng phím với hành động khác thì từ chối và báo; "Khôi phục mặc định"; lưu cùng cài đặt | smoke, test thuần `keymap` |
| G17 | Phụ đề/chỉ báo hình ảnh | Bật mặc định, có công tắc: Bóng Mực mới sinh (dòng chữ + mũi tên chỉ hướng ở mép màn hình ~4 s), gió sắp thổi, 10 giây cuối, đèn sắp tắt (fuel < 30, kể tên đèn) | smoke |
| G18 | Giảm chuyển động | Công tắc lưu lại: tắt rung camera, chớp màn hình khi bị đánh/đèn tắt/nhận bùa và nhấp nháy đồng hồ; giữ nhấp nháy 1 Hz của đèn sắp hết dầu vì Ticket-03 bắt buộc | smoke |
| G19 | Cỡ chữ | Mọi chữ giao diện ≥ 18 px ở 1280×720; chuyển CSS sang `rem` (gốc 16 px); "Chữ lớn" đặt gốc 20 px (×1.25), lưu lại; smoke quét kích thước tính toán của mọi phần tử có chữ ở menu, HUD, cài đặt, bảng xếp hạng | smoke |
| G20 | Đóng gói Release | `v1.0.0` đính kèm **zip web tĩnh + máy chủ Node** (đã gom `three`, kèm `start.bat`/`start.sh`) và hướng dẫn Docker; không đính kèm image Docker | Release |
| G21 | README | Có ảnh chụp (PNG trong `docs/screenshots`), yêu cầu hệ thống, cài đặt (≤ 3 lệnh), điều khiển, test, headless, bench, soak, bảng xếp hạng, đổi phím | rà soát |
| G22 | Video | **Người dùng quay** (Game Bar Win+Alt+R → `.mp4`, < 5 phút), tôi gửi kịch bản; đặt `docs/demo/demo.mp4` hoặc đính kèm Release | người dùng |
| G23 | Retro | Tôi soạn `docs/notes/retro.md` (1–2 trang) từ các cpN, ai-log, đột biến; phần token/chi phí ghi rõ là không có số đo (gói Pro dùng chung nhiều việc, không có phép đo thay thế phù hợp) | rà soát |
| G24 | Hồi quy | Cờ `bench` mặc định `false`; không có đường nào bật nó từ CLI headless; toàn bộ test Phase 1–3 chạy không sửa | `npm test`, `npm run mutate` |

## 3. Kế hoạch (8 bước, mỗi bước có test)

1. Contract v1.3 (`bench_cmd`, `soak_cmd`), cờ `bench` trong `createGame` + test, module thuần `leaderboard.js` + `keymap.js` + test.
2. Máy chủ: API bảng xếp hạng, ghi đĩa an toàn, `--export-leaderboard`, test chạy thật.
3. Soak: `scripts/soak.mjs`, test ngắn (2 Đêm) + chạy đủ 10 Đêm, commit `soak.json`.
4. Benchmark: cảnh `?bench=1` (instancing, Points), `scripts/bench.mjs`, test hàm thống kê, đo thật và tối ưu tới khi đạt, commit `bench.json`.
5. Dễ tiếp cận: đổi phím, chỉ báo, giảm chuyển động, rem và chữ lớn; test + bot UI.
6. Bảng xếp hạng trên giao diện: nhập tên, màn hình từ menu, bot UI kiểm lưu và còn sau khi khởi động lại máy chủ.
7. Đóng gói: README (ảnh), CREDITS, CHANGELOG Phase 4, `scripts/package.mjs` tạo zip, kiểm clone sạch ≤ 3 lệnh.
8. Retro, spec/cp4, ai-log; commit, tag `phase-4`, Release `v1.0.0` (sau khi bạn quay video).
