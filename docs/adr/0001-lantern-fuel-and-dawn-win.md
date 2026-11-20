# ADR-0001: Mô hình nhiên liệu đèn và luật thắng "sống tới bình minh"

- Trạng thái: **Chấp nhận** (2026-11-20, Ticket-03 "Đèn cạn dầu", Contract v1.2)
- Thay thế: luật "đèn đã sáng sáng mãi" và "thắng ngay khi thắp hết đèn" của Ticket-01/02
- Người quyết định: tác giả bài (Trần Thái Hưng); yêu cầu từ nhà thiết kế qua Ticket-03

## Bối cảnh

Playtest cho thấy người giỏi thắp hết đèn trong 2 phút rồi game kết thúc, cuối Đêm thiếu căng thẳng. Ticket-03 đổi mục tiêu từ "thắp hết" sang "giữ đảo sáng tới bình minh". Điều đó đòi hỏi: đèn phải **có thể tắt**, một thứ gì đó làm đèn tắt (hao dầu, Bóng Mực hút dầu), một cách để cứu đèn (châm dầu), và luật thắng/thua dựa trên trạng thái **lúc hết giờ** thay vì sự kiện "đủ đèn".

Ràng buộc: Test Contract chạy headless, tất định, kiểm tra từng tick; test ẩn của Phase 1–2 không bị thay thế vẫn phải đạt.

## Quyết định

### 1. Mô hình trạng thái của một đèn

```
            nạp đủ cost (10 nếu chưa từng sáng, 5 nếu ever_lit)
  TẮT  ───────────────────────────────────────────────────────►  SÁNG (fuel = 100)
  deposited tích lũy                                              │   ▲
  ever_lit giữ mãi            fuel ≤ 0 (ngay sau bước 2)          │   │ châm dầu (E): fuel += 10 × used
        ◄─────────────────────────────────────────────────────────┘   │ (không thay đổi trạng thái)
        deposited = 0, phát lantern_out                               └── hao 1/s, bị hút 5/s mỗi Bóng Mực
```

Trường mỗi đèn: `lit`, `fuel`, `deposited`, `ever_lit`, `relit_count`. Đèn "yếu" = sáng và fuel < 30 (mất vùng an toàn, thành mục tiêu của Bóng Mực). Fuel đúng 30 vẫn còn vùng an toàn.

### 2. Dầu là số nguyên đơn vị 1/60

`U = fuel × 60`. Hao 1 đơn vị/tick, hút 5 đơn vị/tick/Bóng Mực, châm +600/đom đóm. Chỉ khi **xuất ra** mới chia 60 và làm tròn 1 chữ số. Nhờ đó hết dầu đúng tick 6000 (không sai số số thực) và các biên (30, 100) so sánh chính xác. Scenario nhập số thực được làm tròn `round(fuel × 60)` một lần.

### 3. Thứ tự trong tick (bổ sung vào thứ tự Ticket-02)

Bước 2: giảm bộ đếm → **hao dầu + bị hút** → **đèn fuel ≤ 0 tắt ngay** (phát `fuel_drain` rồi `lantern_out`). Bước 5: tương tác (châm dầu/thắp). Bước 11: thắng/thua sau mọi cập nhật. Hệ quả có chủ ý: dầu bị trừ trước khi người chơi châm, nên đèn "đầy 100" chỉ tồn tại đúng tick vừa châm; và đèn hết dầu đúng tick bình minh **không** được tính.

### 4. Bóng Mực hút dầu

Thêm trạng thái `drain`. Bóng `wander` (Mây ngoài 12 m) mỗi tick chọn: đèn yếu gần nhất, không có thì đèn tắt gần nhất, không có thì lang thang ngẫu nhiên. Tới ≤ 2 m đèn yếu thì đứng yên hút. Thoát `drain` theo thứ tự: đèn tắt/fuel ≥ 30 → `wander`; Mây ≤ 6 m → `chase`; cách đèn > 2 m → `wander`; Tỏa Sáng → `stunned`. Khi đèn được châm qua 30 hoặc vừa thắp, Bóng trong 6 m bị **đẩy dần** ra mép (≤ 30 tick, không gây hại): dùng chung cơ chế `startPush` đã có cho "đèn vừa thắp".

### 5. Luật thắng

Không còn kết thúc sớm. Hết giờ: còn Ngọn Lửa và số đèn sáng ≥ `ceil(0.6 × n − 1e-9)` (3/5, 4/6, 5/7) thì thắng `dawn_survived`, ngược lại thua `dawn`; hết Ngọn Lửa luôn thua `no_flames` trước. Điểm bình minh: Σ đèn sáng (50 + floor(fuel)) + 50 × Ngọn Lửa; bỏ thưởng thời gian.

### 6. Sức chứa tăng dần

`min(20, 10 + 2 × successful_lights)`, đếm cả thắp lại, không đếm đèn đặt sẵn bằng scenario, đặt lại mỗi Đêm. Lưu ở trạng thái game (`g.successful`), không đổi lượng đang mang khi tính lại.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Dầu số thực | Sai số tích lũy 6000 tick; biên 30 và 100 so sánh không chắc chắn; khó tái lập giữa hai máy |
| Kiểm tra thắng trước khi đèn tắt ở tick cuối | Trái ticket ("ngay sau bước 2 đèn có fuel ≤ 0 tắt"); cho điểm cao hơn khi đèn vừa chết |
| Bóng Mực hút theo vùng thay vì đứng yên tại đèn | Ticket quy định trạng thái `drain` đứng yên và cộng dồn theo con |
| Giữ `deposited` khi đèn tắt | Ticket: `deposited = 0`; đèn tắt phải thắp lại bằng `relight_cost` |
| Xóa test cũ không thay thế | DoD: test cũ bị thay phải được cập nhật/xóa kèm lý do; thay bằng case mới cho luật mới |

## Hệ quả

- **Breaking changes**: xem [CHANGELOG.md](../../CHANGELOG.md) (kết thúc sớm, thời lượng, điểm, `tuning`, snapshot, sự kiện, trạng thái Bóng Mực).
- Test cũ bị thay: c02, c03, c04, c13, thời lượng ở c46–c49, bot UI "thắng"; lý do từng mục trong [cp3-checklist](../notes/cp3-checklist.md). 63 test còn lại của Phase 2 **không phải sửa** (hồi quy đạt nguyên vẹn).
- Rủi ro còn lại: các giả định ❓ D6, D9, D10, D13, D17, D18 chưa được trợ giảng xác nhận ([assumptions-phase3.md](../notes/assumptions-phase3.md)).
- Kiểm chứng: 99 case headless, 46 đột biến (0 sống sót; 3 tương đương có giải thích), bot UI 32 kiểm tra.