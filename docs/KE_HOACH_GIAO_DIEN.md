# Kế hoạch làm lại giao diện

**Lập:** 07/09/2026 · **Trạng thái:** chờ duyệt

Tài liệu này **không viết lại** §17–§21 của [THIET_KE_NGHIEP_VU.md](THIET_KE_NGHIEP_VU.md) — bối
cảnh vận hành, nguyên tắc trải nghiệm ba vai và bảy luật giao diện dùng chung đã chốt ở đó và vẫn
đúng. Nó bổ sung hai thứ còn thiếu để bắt tay vào làm: **trạng thái đo được của mã hiện tại**, và
**bốn màn hình mà đợt sửa backend vừa rồi đang đòi mà chưa ai lên kế hoạch**.

---

## 1. Hiện trạng — đo, không ước lượng

### 1.1 Mã chết — ĐÃ DỌN

Đi từ ba entrypoint (`customer-web`, `ordering-web`, `admin-web`), lần theo mọi `import` tĩnh.
Kết quả đo được trước khi dọn:

| | Tệp | Dòng |
|---|---|---|
| Nguồn (không kể test) | 138 | 28.921 |
| Tới được từ một app | 119 | |
| **Chết** | **18** | **1.283** (~4,4%) |

> **Nói cho đúng đơn vị.** Bản đầu của tài liệu này viết "một phần ba giao diện là mã chết". Con
> số một-phần-ba là đếm theo **số trang** (12/36); theo **khối lượng mã** thì chỉ 4,4%. Nói "một
> phần ba" mà không kèm đơn vị làm người đọc tưởng đây là một đợt việc lớn — nó không phải.

Nặng nhất không phải trang mà là CSS: hai tệp `realtime-order.css` (567 dòng) và
`admin-table-sessions.css` (172 dòng) chiếm hơn nửa toàn bộ mã chết, và không ai `@import`.

**Vì sao chúng sống sót:** đây là một CỤM, không phải 18 tệp rời. Sáu trang chỉ là vỏ 6 dòng
re-export sang một trang chết khác, nên mỗi tệp nhìn riêng đều "có người dùng" và tìm kiếm thông
thường không thấy gì. Chỉ phân tích khả đạt từ entrypoint mới lộ ra.

**Đã dọn** cùng đợt này, kèm một phép kiểm chặn mã chết quay lại:
`frontend/src/utils/deadModules.test.ts`. Nó có danh sách ngoại lệ cho tệp cố ý không được
import (hiện chỉ `vite-env.d.ts`, khai báo ambient cho `tsc`), và mỗi ngoại lệ phải nêu lý do.

### 1.2 Hai thế hệ màn hình chồng lên nhau

Tên tệp nói ra lịch sử: `pages/*.tsx` phẳng là thế hệ cũ, `pages/{admin,counter,customer,kitchen}/`
là thế hệ sau theo vai. Nhiều cặp làm cùng một việc:

| Việc | Thế hệ cũ | Thế hệ đang chạy |
|---|---|---|
| Quản lý thực đơn | `AdminMenuPage`, `AdminMenuManagementPage`, `AdminCategoriesPage` | `MenuHubPage` |
| Quản lý bàn | `AdminTablesPage`, `AdminTableSessionsPage` | `TableHubPage` |
| Đơn hàng | `AdminOrdersPage` | `OrdersHubPage`, `TableOrdersPage` |
| Bếp | `KitchenHomePage` | `KitchenPage` |
| Quầy | `StaffHomePage`, `StaffOrdersPage`, `CounterWorkspacePage` | `CounterHubPage` |

**Cả cột giữa đều nằm trong danh sách chết.** Đây không phải hai lựa chọn kiến trúc đang cạnh
tranh — thế hệ cũ đã thua rồi, chỉ là chưa ai dọn.

### 1.3 Năm workspace, ba bản dựng thật

`kitchen-web` và `staff-web` chỉ là stub chuyển hướng sang app vận hành. Bếp và quầy dùng chung
`ops-web`, không phải hai ứng dụng riêng. Giữ hai workspace đó là giữ hai đường build, hai dòng
`COPY` trong Dockerfile và hai chỗ để quên.

---

## 2. Bốn màn hình mà backend vừa đòi

Đợt sửa nợ kỹ thuật vừa xong mở ra bốn năng lực mới **chưa có chỗ nào bấm**. Đây là phần cấp thiết
nhất của kế hoạch: một năng lực không có giao diện thì bằng không có.

### 2.1 Bàn quá giờ chưa thu tiền — *chưa có màn nào*

`AdminTableSessionSummary.overdueSince` giờ đã có trong API. Nó trả lời câu quầy cần hỏi: *bàn này
ngồi quá giờ bao lâu rồi mà chưa trả tiền*.

Trước bản sửa, những bàn này **biến mất khỏi mọi màn hình** — đó chính là chỗ mất tiền im lặng.
Nay dữ liệu đã có nhưng chưa ai hiện nó.

> **Cần:** một mục "Bàn quá giờ, chưa thanh toán" ở màn quầy, sắp theo `overdueSince` cũ nhất
> trước. Đây là danh sách công việc, không phải bảng thống kê — mỗi dòng phải bấm thẳng sang được
> hoá đơn của bàn đó.

### 2.2 Ép đóng bàn kèm lý do — *chưa có hộp thoại*

`POST /api/table-sessions/{id}/close` nay nhận `{force, reason}` và **từ chối** đóng bàn còn nợ nếu
thiếu. Giao diện hiện gọi endpoint đó không kèm thân request, nên nó sẽ nhận
`TABLE_SESSION_HAS_UNPAID_ITEMS` và không có gì để hiện ra.

> **Cần:** hộp thoại nêu **số tiền còn nợ** rồi mới hỏi lý do — cùng khuôn với hộp chốt ca đã làm
> đúng ở §19 (*"Thực đếm 4.850.000đ. Thiếu 50.000đ…"*). Ô lý do bắt buộc, không có giá trị gợi ý
> sẵn: một danh sách chọn nhanh sẽ biến thành bấm cho xong.

### 2.3 Quầy hoàn tiền — ⛔ KHÔNG LÀM ĐƯỢC Ở TẦNG GIAO DIỆN

**Chẩn đoán ban đầu của tài liệu này SAI.** Nó viết *"quyền vừa mở, nút chưa có"*, ngụ ý chỉ cần
thêm một cái nút. Không phải.

Đo lại trên mã:

```java
// PaymentService.applyManualAction — dùng bởi confirm / fail / refund
PaymentEntity entity = paymentRepository.findByOrderId(order.id())
        .orElseThrow(() -> ApiException.notFound("PAYMENT_NOT_FOUND", ...));

// PaymentEntity.forTableInvoice — đường thanh toán của ăn tại bàn
payment.tableInvoiceId = tableInvoiceId;   // orderId để NULL
```

Thanh toán của hoá đơn bàn được tạo bằng `forTableInvoice`, mang `tableInvoiceId` và **không có
`orderId`**. Còn `refund` thì tra cứu bằng `findByOrderId`. Hai đường không gặp nhau.

> **Hệ quả:** `POST /api/orders/{code}/payment/refund` trả `PAYMENT_NOT_FOUND` cho mọi hoá đơn ăn
> tại bàn. Nghĩa là **hệ thống hiện KHÔNG có đường hoàn tiền nào cho ăn tại bàn** — chế độ thanh
> toán chính của quán. Endpoint hoàn tiền chỉ dùng được cho đơn lẻ không qua hoá đơn bàn.

Gắn một cái nút vào màn quầy lúc này chỉ tạo ra một nút luôn báo lỗi.

> **Cần, và là việc BACKEND:** một đường hoàn tiền ở cấp hoá đơn bàn —
> `POST /api/table-sessions/{id}/invoice/payment/refund` — đi cùng đường đảo điểm đã có (O). Sau
> đó mới tới nút.
>
> Việc mở quyền `CounterStaff` ở đợt sửa M vẫn đúng và vẫn cần: nó là điều kiện cần, chỉ không
> phải điều kiện đủ.

### 2.4 Giới hạn lượt dùng mã khuyến mãi — *chưa có ô nhập*

`PromotionRequest.usageLimit` đã có trong DTO admin và `usedCount` đã trả về.

> **Cần:** một ô số ở form khuyến mãi, để trống = không giới hạn. Và hiện **`usedCount / usageLimit`**
> trong danh sách — người đặt mã cần thấy nó sắp hết, không phải phát hiện khi khách phàn nàn.

---

## 3. Thứ tự làm

Xếp theo **rủi ro giảm được trên mỗi giờ bỏ ra**, không theo thứ tự dễ làm.

### Đợt 0 — Dọn mã chết ✅ XONG

Gỡ 18 tệp / 1.283 dòng, cộng một test mồ côi. Không đổi một pixel nào của thứ đang chạy: 255 test
frontend vẫn xanh.

**Kiểm chứng:** `deadModules.test.ts` dựng lại đúng phép đo ở §1.1 thành một cổng chặn, và đã thử
làm nó đỏ bằng một tệp mồ côi cố ý. Mã chết không quay lại được, và bản thân phép đo cũng được canh
bằng một ca đối chứng.

### Đợt 1 — Bốn màn hình ở §2

Bốn năng lực đã có ở backend và đã được CI kiểm chứng, nhưng chưa dùng được. Đây là khoảng cách
lớn nhất giữa "đã làm" và "dùng được".

Thứ tự trong đợt: **2.1 → 2.2 → 2.4**. Mục 2.3 đã chuyển thành việc backend — xem §2.3.
công việc; cái thứ tư ở màn quản lý, độc lập.

### Đợt 2 — Ba chỗ chưa đạt của §18–§20

Đã nêu rõ trong tài liệu thiết kế, không nhắc lại chi tiết:

| Vai | Chỗ chưa đạt |
|---|---|
| Quầy | Đổi tab làm **mất số đang gõ** — `CounterHubPage` dựng tab theo điều kiện nên đổi tab là huỷ component |
| Quản lý | Tắt món chỉ nói hệ quả, **không nói số phần đang trong hàng đợi bếp** |
| Quản lý | **Sửa giá không cảnh báo gì** — thay đổi lan rộng nhất mà lại lặng lẽ nhất |

### Đợt 3 — Gộp về một thế hệ

Sau đợt 0 thì chỉ còn một thế hệ trên đĩa, nhưng `ops-web` vẫn đang gánh cả ba vai trong một
bundle. Cân nhắc tách hay giữ **sau khi** đã dọn xong, không phải bây giờ — quyết định đó cần số
đo kích thước bundle thật, mà số đó chỉ đúng khi mã chết đã bị xoá.

Gỡ luôn hai workspace stub `kitchen-web` và `staff-web` nếu quyết định giữ một bundle.

---

## 4. Cái KHÔNG làm trong đợt này

- **Không đổi hệ màu, không đổi font, không đổi `tokens.css`.** Mỗi vai một màu nhấn đã chốt ở §21
  và đang chạy đúng. Đổi bảng màu là đợt việc riêng, và nó phải bắt đầu từ một lý do — hiện chưa
  có lý do nào ngoài "muốn mới".
- **Không dựng lại từ số không.** Ba app đang chạy được, có test, có người dùng thật. Rủi ro của
  việc viết lại lớn hơn hẳn giá trị nó mang lại ở thời điểm này.
- **Không đụng `mobile-rn`.** App di động là một mặt trận riêng với ràng buộc riêng.

---

## 5. Cách biết đợt này đã xong

| Đợt | Xong khi |
|---|---|
| 0 | Phép kiểm "không trang nào không tới được" xanh, và số trang trên đĩa bằng số tới được |
| 1 | Bốn năng lực ở §2 bấm được từ giao diện, mỗi cái có một phép kiểm |
| 2 | Ba chỗ ở §18–§20 chuyển sang "đã đạt" trong tài liệu thiết kế |
| 3 | Một thế hệ màn hình, và quyết định tách/gộp bundle có số đo kèm theo |
