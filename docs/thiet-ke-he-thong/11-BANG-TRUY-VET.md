# Phần 11 — Bảng truy vết yêu cầu

> Mỗi yêu cầu chủ quán nêu ↔ thiết kế trả lời ở đâu ↔ cài đặt ở chỗ nào trong mã ↔ kiểm bằng gì.
> Đây là phần để **soi**, không phải để đọc.

---

## 11.1. Cách đọc bảng

Bảng truy vết trả lời hai câu hỏi ngược chiều nhau:

- **Xuôi:** *"Tôi yêu cầu X — anh làm ở đâu, và làm sao tôi biết nó chạy?"*
- **Ngược:** *"Đoạn mã này tồn tại để làm gì — ai yêu cầu nó?"*

Câu hỏi ngược quan trọng ngang câu hỏi xuôi. Một dòng mã không truy về được yêu cầu nào là mã
không ai cần, và mã không ai cần là mã không ai bảo trì.

| Cột | Nghĩa |
|---|---|
| **Mã** | Mã yêu cầu từ Phần 1 §1.3, hoặc mã phát sinh từ Phần 9 §9.2 |
| **Thiết kế** | Phần và tiểu mục trả lời yêu cầu đó |
| **Nơi cài đặt** | Lớp, bảng, hoặc migration cụ thể. Bỏ trống nghĩa là **chưa có mã nào** |
| **Phép kiểm** | Mã kịch bản nghiệm thu ở Phần 10, cộng lớp kiểm tự động nếu có |
| **TT** | Trạng thái: `Đ` = đủ, `MP` = một phần, `T` = thiếu |

**Quy ước về tên.** Lớp Java ghi theo tên lớp, không ghi đường dẫn đầy đủ — gói đã nêu ở Phần 7
§7.3. Bảng cơ sở dữ liệu ghi bằng `chữ_thường_gạch_dưới`, đối chiếu được với từ điển ở Phần 6 §6.4.

---

## 11.2. Khách ăn

| Mã | Yêu cầu | Thiết kế | Nơi cài đặt | Phép kiểm | TT |
|---|---|---|---|---|---|
| YC-KH-01 | Quét QR vào thực đơn, không cài app, không đăng ký | P2 §2.2, P3 §3.2 | `GET /api/tables/qr/{qrToken}` → `TableController`, `TableSessionService`, `restaurant_tables.qr_token`, `CustomerTokenGuard` | NT-KH-01 | Đ |
| YC-KH-02 | Xem thực đơn, món hết hiện rõ | P5 §5.1 | `GET /api/menu` → `MenuController`, `MenuQueryService`, `menu_items.available` | NT-KH-02 · `ChuanBiThucDonHomNayTest` | Đ |
| YC-KH-03 | Nhiều lượt gọi, một hoá đơn | P3 §3.3 (V14) | `OrderService`, `TableInvoiceService`, `table_invoices`, `orders` | NT-KH-03 · `OrderTest` | Đ |
| YC-KH-04 | Theo dõi trạng thái **từng món** | P3 §3.5 | `OrderItemStatus`, `order_items.status`, `OrderController`, STOMP `/topic/orders/{orderCode}` | NT-KH-04 · `KitchenBoardListTest` | Đ |
| YC-KH-05 | Huỷ món khi bếp chưa nấu | P3 §3.5 | `POST /orders/{code}/items/{id}/cancel` → `OrderService`, `OrderItemStatus`, `order_status_history` | NT-KH-05 · `OrderTest` | Đ |
| YC-KH-06 | Xem hoá đơn cả bàn trước khi trả | P4 §4.3 | `GET /table-sessions/{id}/invoice` → `TableInvoiceService`, `table_invoices` | NT-KH-06 · `DoiSoatHoaDonBanTest` | Đ |
| YC-KH-07 | Chuyển khoản quét mã, tự biết đã nhận tiền | P4 §4.4 | VietQR + webhook SePay → `SePayWebhookController`, `SePayWebhookService`, `payment_transactions` | NT-KH-07 · `SePayWebhookServiceTest`, `EmvCoVietQrTest` | Đ |
| YC-KH-08 | Gọi nhân viên từ điện thoại | P3 §3.4 | `POST /table-sessions/{id}/assistance` → `TableSessionActivityService` | NT-KH-08 | Đ |
| YC-KH-09 | Đóng mở lại vẫn ở đúng chỗ đang dở | P3 §3.6 (V51–V55) | `ResumeStateQueryService` **+ một bản thứ hai ở frontend** | NT-KH-09 | MP → **KT-07** |
| YC-KH-10 | Biết bao lâu nữa món ra | P3 §3.7 | `OrderItemEstimationService`, `KitchenDelayService`, `menu_items.prep_minutes` | NT-KH-10 · `OrderItemEstimationServiceTest`, `UocLuongTheoTramTest` | MP → **KT-10** |
| YC-KH-11 | Nhập số điện thoại tích điểm, xem điểm và hạng | P5 §5.3 | `LoyaltyService`, `MyLoyaltyService`, `loyalty_members`, `loyalty_point_ledger` | NT-KH-11 | MP → **KT-04a/b/c** |
| YC-KH-12 | Đổi điểm lấy ưu đãi | P5 §5.3, P4 §4.5 | `LoyaltyService`, `TranDoiDiem`, `MaUuDai`, `loyalty_redemptions` | NT-KH-12, NT-QU-04, NT-SC-04 · `TranDoiDiemTest`, `RedeemConcurrencyTest`, `MaUuDaiTest` | Đ |
| YC-KH-13 | Gọi lại món đã ăn lần trước | P3 §3.4 | `GET /orders/mine/favourites` → `OrderController` | NT-KH-13 · `MyOrderHistoryTest` | Đ |
| **YC-KH-14** | **Ghi chú từng món phải tới được bếp** | P9 §9.3 | `CartItemEntity.note` — **dừng ở giỏ**. `CreateOrderItemRequest` và `order_items` **không có** trường này | NT-KH-14 | **T → KT-18** |

---

## 11.3. Vận hành

| Mã | Yêu cầu | Thiết kế | Nơi cài đặt | Phép kiểm | TT |
|---|---|---|---|---|---|
| YC-VH-01 | Món mới hiện trên màn bếp trong vài giây | P4 §4.1, P7 §7.3 | STOMP `/hub/orders` → `/topic/kitchen`, `StompSubscriptionGuard` | NT-BP-01 · cổng CI `realtime-e2e` | Đ |
| YC-VH-02 | Bếp đổi trạng thái từng món, khách và quầy thấy ngay | P4 §4.1 | `PATCH /orders/{code}/items/{id}/status` → `OrderController`, `OrderItemStatus`, `order_status_history`, phát tin `/topic/orders/{code}` | NT-BP-02 · `KitchenBoardListTest` | Đ |
| YC-VH-03 | Bếp tắt món hết nguyên liệu, hiệu lực tức thì | P4 §4.2, P5 §5.1 | `PATCH /kitchen/menu-items/{id}/availability` → `KitchenMenuController`, `MenuItemService`; chặn lại ở `OrderService` (kiểm `isAvailable` lúc đặt) | NT-BP-03, NT-KH-02 | Đ |
| YC-VH-04 | Bếp báo chậm chung khi quá tải | P4 §4.2 | `PUT /api/kitchen/delay` → `KitchenDelayController`, `KitchenDelayService`, bảng `kitchen_delay` | NT-BP-04 · `KitchenDelayServiceTest` | Đ |
| YC-VH-05 | Quầy thấy bàn đang mở, bàn nợ, bàn quá giờ | P4 §4.3 | `TableController`, `AdminTableService`, `table_sessions.overdue_since`, `CounterOverduePanel` | NT-QU-01 | Đ |
| YC-VH-06 | Quầy thu tiền mặt và xác nhận chuyển khoản | P4 §4.4 | `TableInvoicePaymentService`, `PaymentService`, `payments`, `payment_transactions` | NT-QU-02 · `TienKhachDuaTest`, `PaymentTest` | Đ |
| YC-VH-07 | Quầy áp mã giảm giá và cộng điểm | P4 §4.5, P5 §5.2 | `PromotionService`, `TranGiamGiaHoaDon` (trần 50%), `TranDoiDiem` (trần 30% / 200.000đ) | NT-QU-03, NT-QU-04 · `TranGiamGiaHoaDonTest`, `TranDoiDiemTest` | Đ |
| YC-VH-08 | Ca quầy: mở, đóng, tính lệch | P4 §4.6 | `CounterService`, `counter_shifts`, `counter_shift_transactions` | NT-QU-05 · `CounterShiftTest`, `HoanTienMatTest` | Đ |
| YC-VH-09 | Không đóng được bàn còn nợ, trừ khi ép đóng kèm lý do | P4 §4.3 | `TableSessionService.kiemNoTruocKhiDong` | NT-QU-06 · `DongPhienBanTest` | Đ |
| YC-VH-10 | Bàn quá 4 giờ còn nợ không tự đóng, phải nổi lên | P3 §3.3 (V17) | `TableSession.expireIfPast`, `overdueSince`, `QuetPhienQuaHanJob` | NT-QU-07, NT-SC-05 · `PhienQuaGioConNoTest`, `QuetPhienQuaHanJobTest` | Đ |
| YC-VH-11 | Màn bếp đọc ở 2m, bấm khi đeo găng | P4 §4.1, P8 §8.5 | `apps/kitchen-web` — **chưa chỉnh thang chữ và vùng chạm** | Phép thử tại chỗ 1 và 2 | **T → KT-02** |
| YC-VH-12 | Đổi tab ở quầy không mất dữ liệu đang gõ | P4 §4.2 | `apps/staff-web` — **tab dựng lại từ đầu khi chuyển** | NT-QU-09, phép thử tại chỗ 3 | **T → KT-03** |
| YC-VH-13 | Phân biệt huỷ trước nấu với huỷ sau nấu | P3 §3.5, P5 §5.5 | `OrderItemEntity.cancelledFromStatus` (V33), `OrderItemEntity.unitCost` (V34), `ReportService.haoHut`, `WasteResponse` | NT-BP-05, NT-QL-12 | Đ |
| **YC-VH-14** | **Chuyển bàn và ghép bàn** | P9 §9.4 | — **không có mã nào** | — (chưa có kịch bản, chờ thiết kế) | **T → KT-20** |
| **YC-VH-15** | **Nhiều lần thanh toán trên một hoá đơn** | P9 §9.4 | Nền tảng có: `payments` và `payment_transactions` đã tách rời. Luồng chia tiền **chưa mở** | — | **T → KT-19** |

---

## 11.4. Quản lý

| Mã | Yêu cầu | Thiết kế | Nơi cài đặt | Phép kiểm | TT |
|---|---|---|---|---|---|
| YC-QL-01 | Thêm/sửa/xoá món, nhóm món, giá, ảnh | P5 §5.1 | `AdminMenuItemController`, `AdminCategoryController`, `MenuItemService`, `CategoryService`, `menu_items`, `categories` | NT-QL-01, NT-QL-02 | Đ |
| YC-QL-02 | Bật/tắt món theo tình trạng nguyên liệu | P5 §5.1 | `MenuItemService`, `menu_items.available` | NT-QL-03 | Đ (nhưng **KT-11**) |
| YC-QL-03 | Khung giờ bán theo món | P5 §5.1 | `AdminServingPeriodController`, `ServingPeriodService`, `serving_periods`, `menu_item_serving_periods`, `LichPhucVu` | NT-QL-04 · `LichPhucVuTest`, `ThucDonTheoCaTest`, `DatDonNgoaiCaTest` | Đ |
| YC-QL-04 | Số suất chuẩn bị, trừ dần, tự tắt khi hết | P5 §5.1 | `menu_items.remaining_quantity`, `MenuItemRepository.truTonKho` (trừ bằng một câu lệnh có điều kiện), V39 → V40 | NT-QL-05, NT-SC-03 | Đ |
| YC-QL-05 | Quản lý bàn, sinh/xoay mã QR | P2 §2.2, P5 §5.1 | `AdminTableController`, `AdminTableService`, `restaurant_tables.qr_token` | NT-QL-06 | Đ |
| YC-QL-06 | Khuyến mãi theo mã, theo %, theo số tiền, có thời hạn | P5 §5.2 | `AdminPromotionController`, `AdminPromotionService`, `PromotionEntity`, `promotions` | NT-QL-07 · `PromotionTest`, `PromotionIsActiveAtTest` | Đ (nhưng **KT-12**, **KT-13**) |
| YC-QL-07 | Giới hạn số lượt dùng một mã | P5 §5.2 (V32) | `PromotionEntity.usageLimit` / `usedCount`, tăng trong **cùng giao dịch** với việc áp mã | NT-QL-08 · `GioiHanLuotDungTest` | Đ |
| YC-QL-08 | Tích điểm, hạng thành viên, đổi điểm | P5 §5.3 | `AdminLoyaltyController`, `AdminLoyaltyService`, `MemberTier`, `loyalty_members`, `loyalty_rewards` | NT-QL-09 · `MemberTierTest`, `TichDiemTheoHangTest`, `HetHanDiemTest` | Đ |
| YC-QL-09 | Báo cáo doanh thu theo ngày/tháng, món bán chạy | P5 §5.5 | `ReportController`, `ReportService`, `RevenueLedger` | NT-QL-10 · `RevenueLedgerTest` | MP |
| YC-QL-10 | Mọi con số có mốc so với kỳ trước | P5 §5.5 | — **không có mã nào** | NT-QL-11, phép thử tại chỗ 4 | **T → KT-08** |
| YC-QL-11 | Thời gian phục vụ TB, tỷ lệ huỷ món, giờ cao điểm | P5 §5.5 | `ReportService` — có tỷ lệ huỷ và hao hụt; **thời gian phục vụ và giờ cao điểm chưa đủ** | NT-QL-12 | MP |
| YC-QL-12 | Giá vốn từng món để tính lãi gộp | P5 §5.1, P6 §6.3 | `menu_items.cost_price`, `order_items.unit_cost` (chụp lại, V34), `WasteResponse` | NT-QL-12 | MP |
| YC-QL-13 | Đổi chính sách tiền không cần lập trình viên | P5 §5.6 | — **sáu hằng số nằm trong `TranDoiDiem`, `TranGiamGiaHoaDon`, `LoyaltyService`** | — (chờ thiết kế `business_rule`) | **T → KT-14** |
| **YC-QL-14** | **VAT, phí phục vụ, tiền tip** | P9 §9.4 | — **không có `vat`, `thuế`, `serviceCharge`, `tip` ở bất kỳ đâu trong backend** | — (chờ trả lời §9.7 câu 1–3) | **T → KT-21** |
| **YC-QL-15** | **Xuất dữ liệu ra bảng tính** | P6 §6.6 | — **chưa có** | — | **T → KT-15** |

---

## 11.5. Nhân sự

Đây là nhóm mỏng nhất của hệ thống, và bảng dưới cho thấy rõ điều đó: **bốn dòng có mã, sáu dòng
gần như trống.**

| Mã | Yêu cầu | Thiết kế | Nơi cài đặt | Phép kiểm | TT |
|---|---|---|---|---|---|
| YC-NS-01 | Mỗi nhân viên một tài khoản, quản lý tạo/sửa/khoá | P2 §2.4, P5 §5.4 | `GET/POST/PUT/DELETE /api/users` → `AdminUserController`, `AdminUserService`, `users` | NT-QL-13 · `AdminBootstrapTest` | Đ |
| YC-NS-02 | Phân quyền theo vai | P2 §2.3 | `UserRole` (5 vai, `ADMIN_ASSIGNABLE` 3 vai), `@PreAuthorize` trên từng endpoint, `StompSubscriptionGuard` | NT-QL-13, NT-QL-15, NT-BP-06, NT-QU-08 · `PreAuthorizeExpressionTest` | Đ (nhưng **KT-01**) |
| YC-NS-03 | Đặt lại mật khẩu cho nhân viên quên | P5 §5.4 | `POST /api/users/{userId}/reset-password` → `AdminUserService`. **Không** có đường "quên mật khẩu" tự phục vụ | NT-QL-13 | Đ |
| YC-NS-04 | Khoá tài khoản sau nhiều lần sai | P2 §2.5 | `UserEntity.failedLoginCount`, `UserEntity.lockoutEndAt` | NT-QL-14 | Đ |
| YC-NS-05 | Ghi tên người thao tác cho **mọi** việc đụng tiền | P5 §5.4 | Rải rác: `counter_shift_transactions`, `order_status_history`, `payment_transactions`. **Huỷ món, áp giảm giá, ép đóng phiên, tích điểm, đổi giá, hoàn tiền: không ghi ai làm** | NT-QL-16 | **MP → KT-06** |
| YC-NS-06 | Xếp ca làm việc theo tuần | P5 §5.4 (NS-2) | — | — | **T → NS-2** |
| YC-NS-07 | Chấm công vào/ra ca | P5 §5.4 (NS-2) | — | — | **T → NS-2** |
| YC-NS-08 | Bảng công cuối tháng | P5 §5.4 (NS-2) | — | — | **T → NS-2** |
| YC-NS-09 | Đo năng suất theo người | P5 §5.4 (NS-3) | — | — | **T → NS-3** |
| YC-NS-10 | Nhật ký thao tác tra cứu được | P5 §5.4 (NS-1) | Dữ liệu có ở ba bảng, **không có màn hình tra cứu, không có sổ gộp** | NT-QL-16 | **MP → KT-06** |

> **Đọc bảng này như một câu trả lời cho chủ quán.** Yêu cầu lớn nhất ở Phần 1 §1.1 là *"biết được
> vì sao két lệch"*. Dòng YC-NS-05 và YC-NS-10 là hai dòng trả lời câu đó, và cả hai đang ở trạng
> thái `MP`. Đó là lý do **KT-06** được xếp vào Đợt 1 của lộ trình dù nó không phải một lỗi.

---

## 11.6. Phi chức năng

| Mã | Yêu cầu | Thiết kế | Nơi cài đặt | Phép kiểm | TT |
|---|---|---|---|---|---|
| YC-PCN-01 | Mạng chập chờn không mất đơn, không tính tiền hai lần | P8 §8.3 | Ba lớp: `orders.reference_code` duy nhất (V23) · `idempotencyKey` trên `POST /orders` và thanh toán · kiểm trạng thái `Pending`. Cộng `@Version` trên `table_sessions` và `payments` | NT-SC-01, NT-BP-07 · `PaymentTest`, `RedeemConcurrencyTest` | Đ |
| YC-PCN-02 | Khách A không xem được hoá đơn bàn B | P2 §2.2, P8 §8.2 | `CustomerTokenGuard` (so sánh thời gian hằng định), `X-Order-Token`, `StompSubscriptionGuard` canh cả lúc đăng ký nhận tin | NT-KH-15, NT-BP-06, NT-QU-08 · `PreAuthorizeExpressionTest` | Đ |
| YC-PCN-03 | Mã QR bị chụp phát tán không dùng được mãi mãi | P2 §2.2 | Xoay `restaurant_tables.qr_token` từ `AdminTableService`; token gắn với **phiên**, phiên có hạn | NT-QL-06 | Đ |
| YC-PCN-04 | 30 bàn cùng gọi không làm chậm màn bếp | P7 §7.5 | Có chỉ mục và truy vấn hướng tới quy mô này, **nhưng chưa đo** | NT-SC-10 | **MP → KT-17** |
| YC-PCN-05 | Tiền không sai do làm tròn | P8 §8.3, P6 §6.3 | `BigDecimal` ↔ `numeric` xuyên suốt, `RoundingMode.DOWN` nhất quán, không dùng `double` ở đâu | NT-SC-06, NT-SC-07 · `TienKhachDuaTest`, `TranDoiDiemTest`, `HoanTienTraLaiDiemTest` | Đ |
| YC-PCN-06 | Hỏng máy quầy thì dữ liệu không mất | P6 §6.7, P7 §7.4 | Toàn bộ trạng thái nằm ở PostgreSQL phía máy chủ, không ở máy quầy. `backup-postgres.sh` chạy **trước mỗi lần triển khai và trước khi lùi phiên bản**; `thu-khoi-phuc.yml` chứng minh khôi phục được | NT-SC-09 | **MP → KT-16** (chưa có sao lưu theo lịch) |
| YC-PCN-07 | Toàn bộ giao diện tiếng Việt | P8 §8.6 | `packages/i18n`, thông báo lỗi nghiệp vụ viết sẵn tiếng Việt trong `ApiException` | NT-SC-08 | Đ |
| YC-PCN-08 | Nhân viên mới dùng được sau 15 phút | P7 §7.6 | Sáu ứng dụng riêng theo vai — mỗi người chỉ thấy màn hình của mình (P7 §7.2) | Phép thử tại chỗ 5 | Đ |
| **YC-PCN-09** | **Có người hoặc máy được báo khi hệ thống ngừng hoạt động** | P8 §8.7, P9 §9.4 | `HealthController` (`/actuator/health`) có, **nhưng không ai đọc nó khi không có người ngồi nhìn** | — | **T → KT-09** |

---

## 11.7. Truy vết ngược: bất biến nghiệp vụ

Sáu bất biến được nhắc nhiều nhất trong tài liệu, và nơi chúng được canh. Đây là bảng dùng khi có
người hỏi *"làm sao chắc quy tắc này không bị phá về sau?"*

| Bất biến | Phát biểu | Canh ở đâu | Kiểm bằng |
|---|---|---|---|
| **V4** | Mỗi bàn nhiều nhất **một** phiên còn sống | Ràng buộc duy nhất ở `table_sessions` + `@Version` khoá lạc quan | NT-SC-02 · `TableSessionTest` |
| **V14** | Một phiên → nhiều lượt đặt → **một** hoá đơn | `table_invoices` gắn một-một với phiên; `orders` gắn nhiều-một | NT-KH-03 · `OrderTest`, `DoiSoatHoaDonBanTest` |
| **V17** | Phiên quá giờ mà **còn nợ tiền** thì không tự đóng | `TableSession.expireIfPast` — gia hạn và ghi `overdueSince` đúng **một lần** | NT-SC-05 · `PhienQuaGioConNoTest` |
| **V19** | Chứng từ **chụp lại** giá trị, không tham chiếu | `order_items.unit_price`, `unit_cost`, `menu_item_name` | NT-QL-02 |
| **V32** | Mã khuyến mãi không vượt quá số lượt cho phép | `usedCount` tăng trong **cùng giao dịch** với việc áp mã | NT-QL-08 · `GioiHanLuotDungTest` |
| **V51–V55** | Khách quay lại phải về đúng chỗ đang dở | `ResumeStateQueryService` — **và một bản thứ hai ở frontend** | NT-KH-09 → **KT-07** |

Dòng cuối là dòng duy nhất trong bảng này có chữ "và một bản thứ hai". Phần 8 §8.8 đã chỉ ra rằng
bốn lỗi từng xảy ra đều cùng một hình dạng — *một quy tắc được phát biểu ở hai nơi* — nên dòng đó
là chỗ đáng lo nhất còn lại, và là lý do **KT-07** được xếp làm món nợ kỹ thuật phải trả trước
tiên.

---

## 11.8. Truy vết ngược: hạng mục lộ trình → yêu cầu

Bảng ngược của Phần 9 §9.2: đọc từ phía việc-cần-làm về phía ai-yêu-cầu.

| Hạng mục | Đóng yêu cầu nào | Đợt |
|---|---|---|
| KT-18 | YC-KH-14 | 1 |
| KT-04a + KT-04c | YC-KH-11 | 1 |
| KT-16 | YC-PCN-06 | 1 |
| KT-06 (NS-1) | YC-NS-05, YC-NS-10 | 1 |
| KT-02 | YC-VH-11 | 1 |
| KT-20 | YC-VH-14 | 2 |
| KT-19 | YC-VH-15 | 2 |
| KT-09 | YC-PCN-09 | 2 |
| KT-17 | YC-PCN-04 | 2 |
| KT-13 | YC-QL-06 | 2 |
| KT-03 | YC-VH-12 | 2 |
| KT-21 | YC-QL-14 | 2 |
| NS-2 | YC-NS-06, 07, 08 | 3 |
| KT-05 | YC-NS-05 | 3 |
| KT-04b | YC-KH-11 | 3 |
| KT-08 | YC-QL-10 | 3 |
| KT-15 | YC-QL-15 | 3 |
| KT-10 | YC-KH-10, YC-NS-09 | 3 |
| NS-3 | YC-NS-09 | 3 |
| KT-14 | YC-QL-13 | 3 |
| KT-07 | YC-KH-09 | 4 |
| KT-11 | YC-QL-02 | 4 |
| KT-01 | YC-NS-02 | 4 |
| KT-12 | YC-QL-06 | 4 |

---

## 11.9. Tự kiểm tính đầy đủ

Một bảng truy vết chỉ có giá trị khi nó **kín cả hai đầu**. Năm phép tự kiểm dưới đây chạy bằng
mắt trên chính tài liệu này.

| Phép tự kiểm | Kết quả |
|---|---|
| Mọi yêu cầu có ít nhất một mục thiết kế trả lời | **Đạt** — 63/63 yêu cầu có cột *Thiết kế* không trống |
| Mọi yêu cầu có ít nhất một phép kiểm | **Không đạt** — 10 yêu cầu chưa có kịch bản: YC-VH-14, YC-VH-15, YC-QL-13, YC-QL-14, YC-QL-15, YC-NS-06, 07, 08, 09, YC-PCN-09 |
| Mọi hạng mục lộ trình truy về được một yêu cầu | **Đạt** — 25/25 hạng mục ở Phần 9 §9.2, nhờ sáu mã phát sinh. (§11.8 có 24 dòng vì KT-04a và KT-04c làm chung một việc, gộp làm một dòng) |
| Mọi hạng mục lộ trình được xếp vào một đợt | **Đạt** — sau khi [Phần 12 §12.2](12-DANH-SACH-CONG-VIEC.md) phát hiện **KT-04b** chưa có đợt và xếp nó vào Đợt 3 |
| Mọi yêu cầu trạng thái `T` hoặc `MP` có một hạng mục lộ trình chịu trách nhiệm | **Đạt** — không có dòng nào thiếu mà bị bỏ rơi |

**Về dòng thứ hai.** Nó không đạt, và đó là điều đúng ở giai đoạn này: **không viết được kịch bản
nghiệm thu cho một tính năng chưa được thiết kế chi tiết.** Viết ra thì cũng chỉ là chép lại câu
yêu cầu, và một phép kiểm chép lại yêu cầu thì không kiểm gì cả. Mười dòng đó sẽ có kịch bản khi
hạng mục tương ứng bước vào đợt của nó — và đó là điều kiện ký mức B ở Phần 10 §10.6.

---

## 11.10. Bảng tóm tắt trạng thái

| Nhóm | Tổng yêu cầu | `Đ` | `MP` | `T` |
|---|---:|---:|---:|---:|
| Khách ăn (YC-KH) | 14 | 10 | 3 | 1 |
| Vận hành (YC-VH) | 15 | 11 | 0 | 4 |
| Quản lý (YC-QL) | 15 | 8 | 3 | 4 |
| Nhân sự (YC-NS) | 10 | 4 | 2 | 4 |
| Phi chức năng (YC-PCN) | 9 | 6 | 2 | 1 |
| **Tổng** | **63** | **39** | **10** | **14** |

Trong 63 yêu cầu, **6 yêu cầu do bên thiết kế phát hiện và thêm vào**, không nằm trong 57 yêu cầu
chủ quán ký ở Phần 1. Cả 6 đều ở trạng thái `T`, và cả 6 đều có hạng mục lộ trình chịu trách
nhiệm. Nói cách khác: nếu chỉ chấm theo bản yêu cầu chủ quán ký, hệ thống đạt **39/57**; nhưng
bản yêu cầu ấy **thiếu 6 dòng**, và tài liệu này chọn cách tính khắt khe hơn với chính nó.

Tỷ lệ 39/63 đáp ứng đầy đủ **không phải là điểm số**. Con số có ý nghĩa hơn là: **mọi dòng `MP` và
`T` đều có tên người phải làm gì tiếp theo**, và không dòng nào được để trống hay bỏ qua trong lộ
trình ở Phần 9.

---

**Phần tiếp theo:** [Phần 12 — Danh sách công việc cần làm](12-DANH-SACH-CONG-VIEC.md) — nơi mọi
dòng `MP` và `T` ở trên biến thành một việc có người nhận, có đầu ra và có phép kiểm đóng.
