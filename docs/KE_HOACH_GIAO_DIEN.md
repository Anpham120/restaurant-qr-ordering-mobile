# Kế hoạch làm lại giao diện

**Lập:** 07/09/2026 · **Trạng thái:** chờ duyệt

Tài liệu này **không viết lại** §17–§21 của [THIET_KE_NGHIEP_VU.md](THIET_KE_NGHIEP_VU.md) — bối
cảnh vận hành, nguyên tắc trải nghiệm ba vai và bảy luật giao diện dùng chung đã chốt ở đó và vẫn
đúng. Nó bổ sung hai thứ còn thiếu để bắt tay vào làm: **trạng thái đo được của mã hiện tại**, và
**bốn màn hình mà đợt sửa backend vừa rồi đang đòi mà chưa ai lên kế hoạch**.

---

## 1. Hiện trạng — đo, không ước lượng

### 1.1 Một phần ba giao diện là mã chết

Đi từ ba entrypoint (`customer-web`, `ordering-web`, `admin-web`), lần theo mọi `import` tĩnh:

| | |
|---|---|
| Trang có trên đĩa | **36** |
| Tới được từ một app | 26 |
| **Không tới được từ đâu cả** | **12** |

Đã loại trừ nạp động: kho này không dùng `React.lazy` hay `import()` động ở đâu, và 11/12 trang
dưới đây không được nhắc tới trong bất kỳ tệp nào khác.

```
AdminCategoriesPage       AdminMenuManagementPage   AdminMenuPage
AdminOrdersPage           AdminTableSessionsPage    AdminTablesPage
CounterWorkspacePage      KitchenHomePage           PageShell
RoleAccessPage            StaffHomePage             StaffOrdersPage
```

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

### 2.3 Quầy hoàn tiền — *quyền vừa mở, nút chưa có*

`CounterStaff` nay được phép gọi `payment/refund`, `payment/confirm`, `payment/fail`. Trước đây
bốn endpoint này chỉ cho `Staff` và `Admin`, mà `Staff` là vai không còn cấp mới.

> **Cần:** nút hoàn tiền ở màn quầy, có hỏi lại và ghi lý do. Theo §13 quầy **sở hữu** việc thu
> tiền, nên đây là chỗ đúng — nhưng hoàn tiền là thao tác không lùi được, phải hỏi lại.

### 2.4 Giới hạn lượt dùng mã khuyến mãi — *chưa có ô nhập*

`PromotionRequest.usageLimit` đã có trong DTO admin và `usedCount` đã trả về.

> **Cần:** một ô số ở form khuyến mãi, để trống = không giới hạn. Và hiện **`usedCount / usageLimit`**
> trong danh sách — người đặt mã cần thấy nó sắp hết, không phải phát hiện khi khách phàn nàn.

---

## 3. Thứ tự làm

Xếp theo **rủi ro giảm được trên mỗi giờ bỏ ra**, không theo thứ tự dễ làm.

### Đợt 0 — Dọn 12 trang chết

Làm trước vì nó rẻ nhất và làm mọi đợt sau nhẹ đi: ít tệp để đọc nhầm, ít tệp để sửa nhầm, tìm
kiếm trong mã bớt nhiễu. Không đổi một pixel nào của thứ đang chạy.

**Kiểm chứng:** phép kiểm khả đạt — dựng lại đúng phép đo ở §1.1 thành một test, đỏ khi có trang
không tới được từ entrypoint nào. Như vậy mã chết không quay lại được, và bản thân phép đo cũng
được canh.

### Đợt 1 — Bốn màn hình ở §2

Bốn năng lực đã có ở backend và đã được CI kiểm chứng, nhưng chưa dùng được. Đây là khoảng cách
lớn nhất giữa "đã làm" và "dùng được".

Thứ tự trong đợt: **2.1 → 2.2 → 2.3 → 2.4**. Ba cái đầu cùng nằm ở màn quầy và cùng một luồng
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
