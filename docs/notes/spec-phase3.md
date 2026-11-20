# Spec Phase 3 (Ticket-03 "Đèn cạn dầu", Contract v1.2): tiêu chí nghiệm thu

Quyết định thiết kế: [../adr/0001-lantern-fuel-and-dawn-win.md](../adr/0001-lantern-fuel-and-dawn-win.md). Thay đổi phá vỡ: [../../CHANGELOG.md](../../CHANGELOG.md). Giả định: [assumptions-phase3.md](assumptions-phase3.md). Bằng chứng sinh tự động: [../proof/phase3/REPORT.md](../proof/phase3/REPORT.md) (99 case), [ui-smoke.txt](../proof/phase3/ui-smoke.txt) (32 kiểm tra bot), [mutate.txt](../proof/phase3/mutate.txt), [fps.json](../proof/phase3/fps.json).

`cNN` = case trong `scenarios/cases.mjs`; `UI:` = `scripts/ui-smoke.mjs`; `thủ công` = cần người xem.

## 1. Nhiên liệu đèn

| Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|
| fuel tối đa 100; vừa thắp (lần đầu hoặc thắp lại) = 100; `lit:true` trong scenario không ghi fuel = 100 | c02, c56, c53 |
| Hao 1.0/s tính 1/60 mỗi tick; hết dầu đúng tick 6000 (số nguyên đơn vị 1/60) | c51, c52 |
| Hết dầu (fuel ≤ 0): đèn tắt ngay sau bước 2, `deposited = 0`, `lantern_out`, `ever_lit = true` | c52, c53, c57, c70 |
| Châm dầu: `used = min(mang, ceil((100−fuel)/10))`, `fuel = min(100, fuel+10×used)`, trừ `used` đom đóm, sự kiện `refuel {lantern_id, amount, fuel}`, +5 mỗi đom đóm | c54a–d |
| Chọn đèn khi tương tác: chỉ đèn nhận được (chưa sáng, hoặc sáng chưa đầy), gần nhất, hòa thì id nhỏ | c55, c55b |
| Thắp đèn chưa từng sáng cần 10; đèn `ever_lit` chỉ cần 5; `lantern_lit.relight`; `relit_count`; +100 thắp đầu, +40 thắp lại | c02, c56, c56b, c57 |
| Hiển thị: thanh dầu trên đèn sáng; fuel < 30 thì đèn và thanh nhấp nháy chậm 1 Hz | thủ công (ảnh `ui-fuel.png`, `ui-drain-*.png`: lamp ở pha tắt) |

## 2. Bóng Mực hút dầu

| Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|
| fuel < 30 mất vùng an toàn; đúng 30 vẫn còn | c59 (biên từng tick), c60 |
| Bóng `wander` chọn đèn yếu (fuel < 30, nghiêm ngặt) gần nhất; không có thì đèn tắt gần nhất, dừng cách 2 m; chase không đổi mục tiêu | c61, c61b, c62 |
| Cách đèn ≤ 2 m: `drain`, đứng yên, hút 5/s (cộng hao = 6/s); nhiều con cộng dồn (11/s); `fuel_drain` mỗi 60 tick | c63, c64 |
| Thoát `drain`: Mây vào 6 m → chase; đèn tắt, fuel ≥ 30 hoặc cách > 2 m → wander; trúng Tỏa Sáng → stunned; hết choáng → wander | c65, c65b, c65c, c63, c67, c68 |
| Châm dầu lên ≥ 30 lúc Bóng trong 6 m: đẩy dần ra mép ≤ 30 tick, không gây sát thương | c66 |
| Tỏa Sáng trúng Bóng đang `drain`: tổng +15 (thay vì +5) | c67 |
| Tia hút nối Bóng Mực với đèn | thủ công (ảnh `ui-drain-*.png`) |

## 3. Luật thắng mới

| Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|
| Thời gian Đêm 240/270/300 s | c47, c48, c49, contract test |
| Không còn thắng sớm: đủ đèn không kết thúc Đêm | c13, UI: "Thắp đủ 5/5 không kết thúc sớm" |
| Thắng khi sống tới bình minh và đủ ceil(0.6×n) đèn sáng: Đêm 1 ≥ 3/5, Đêm 2 ≥ 4/6, Đêm 3 ≥ 5/7 (kể cả biên dưới ngưỡng thì thua `dawn`) | c04, c69a–e |
| Lý do kết thúc: thắng `dawn_survived`; thua `dawn` hoặc `no_flames`; `all_lit` không dùng | c04, c12, c69, c71 |
| Hết Ngọn Lửa luôn thua trước, kể cả tick bình minh | c71, c40, c05 |
| Đèn hết dầu đúng tick cuối tắt trước khi xét thắng/thua | c70, c70b |

## 4. Sức chứa tăng dần

| Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|
| `10 + 2×successful_lights`, tối đa 20; đếm cả thắp lại; đèn đặt sẵn bằng scenario không tính; nhặt dừng ở sức chứa | c56 (capacity 12 sau thắp), c58, c58b, c58c, c58d |
| HUD hiển thị mang/sức chứa, số ô theo sức chứa | UI: "HUD: sức chứa 16 ô, 4/16" |

## 5. Điểm mới

| Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|
| +5/đom đóm nạp (thắp mới, thắp lại, châm dầu); +100 thắp đầu; +40 thắp lại | c02, c03, c54a–d, c56 |
| +5 mỗi Bóng trúng Tỏa Sáng, +15 nếu đang drain | c07, c08, c67 |
| Bình minh thắng: mỗi đèn sáng +50+floor(fuel), mỗi lửa +50, không thưởng thời gian | c04 (597), c13 (885), c70b (498) |
| Tổng điểm game không đổi (cộng các Đêm đã thắng) | UI: tổng điểm ở Bình Minh |

## 6. Chế độ mù màu

| Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|
| Cài đặt "Bảng màu dễ phân biệt", được lưu | UI: lưu localStorage, còn sau khi tải lại |
| Viền và mắt Bóng Mực `#7A3CFF` → `#00B3FF` | tests/palette.test.js; UI: `palette.shadeEdge` |
| Cảnh báo UI `#FF5A5F` → `#FFFFFF` kèm ⚠ | UI: màu đồng hồ `rgb(255,255,255)`, `::before` chứa ⚠ |
| Đèn tắt xẹp 20% + giấy rách; đèn sắp hết dầu nhấp nháy | thủ công (ảnh) |

## 7. Contract v1.2

| Mục | Kiểm chứng |
|---|---|
| `contract_version "1.2"`; tuning thêm 8 khóa; night durations 240/270/300 | tests/contract.test.js |
| Snapshot: đèn `fuel` (1 chữ số), `ever_lit`, `relit_count`; `player.capacity`; trạng thái `drain` | tests/contract.test.js, c63 |
| Scenario: đèn `lit/fuel/ever_lit`, `player.successful_lights`, `shades[].target_lantern_id`; sai định dạng → mã 2 | tests/contract.test.js |
| Sự kiện: `refuel`, `lantern_out`, `fuel_drain`, `lantern_lit.relight` | c54, c52, c63, c56 |