# Phần 9 — Khoảng trống và lộ trình

> Gom lại mọi chỗ hệ thống chưa đáp ứng được yêu cầu ở Phần 1, xếp theo thứ tự nên làm.
> Đây là phần trung thực nhất của tài liệu: nó nói hệ thống **chưa** làm được gì.

---

## 9.1. Cách tài liệu này xếp hạng

Một danh sách việc còn thiếu mà không có thứ tự thì vô dụng — ai đọc cũng gật đầu rồi không ai
làm. Nên mỗi hạng mục ở đây được phân loại theo hai trục, và thứ tự ưu tiên suy ra từ hai trục đó
chứ không từ cảm tính.

**Trục 1 — Loại.** Ba loại khác nhau về bản chất, và lẫn chúng vào nhau là sai:

| Loại | Nghĩa | Thái độ đúng |
|---|---|---|
| **Lỗi** | Hệ thống làm **sai so với chính thiết kế của nó**. Có mã, mã chạy, mã cho kết quả sai | Sửa ngay. Không cần bàn phạm vi |
| **Thiếu** | Nghiệp vụ nhà hàng thật cần, hệ thống **chưa từng làm**. Không ai viết sai cả | Thiết kế, ước lượng, xếp đợt |
| **Nợ** | Làm rồi và đang chạy đúng, nhưng **cách làm sẽ sinh lỗi về sau** | Trả khi có khoảng lặng, trước khi nó cắn |

**Trục 2 — Tác động.** Đo bằng câu hỏi của chủ quán, không bằng thuật ngữ kỹ thuật:

| Mức | Câu hỏi |
|---|---|
| **Mất tiền** | Sai chỗ này thì tiền vào sổ lệch với tiền trong két, hoặc khách bị tính sai |
| **Mất lòng tin** | Không mất tiền, nhưng khách hoặc nhân viên thôi tin vào màn hình và quay về giấy |
| **Bất tiện** | Vẫn làm được việc, chỉ chậm hơn hoặc xấu hơn |

**Quy tắc xếp đợt.** Mọi hạng mục *Lỗi* có tác động *Mất tiền* hoặc *Mất lòng tin* vào Đợt 1,
không thương lượng. Sau đó mới tới *Thiếu*, xếp theo tần suất gặp trong một ngày làm việc thật —
một việc xảy ra mười lần mỗi tối quan trọng hơn một việc xảy ra mỗi tháng một lần, kể cả khi việc
mỗi tháng nghe "to" hơn.

---

## 9.2. Bảng tổng hợp toàn bộ khoảng trống

Mã `KT-nn` được dùng xuyên suốt Phần 2 đến Phần 8; mã `NS-n` là ba thiết kế nhân sự đề xuất ở
Phần 5 §5.4. Bảng này là nơi duy nhất liệt kê đủ.

| Mã | Tên ngắn | Loại | Tác động | Yêu cầu liên quan | Nêu ở |
|---|---|---|---|---|---|
| **KT-01** | Vai `Staff` đã chết nhưng còn trong mã 14 chỗ | Nợ | Bất tiện | YC-NS-02 | P2 §2.6 |
| **KT-02** | Màn bếp chưa đọc được ở 2m, chưa bấm được khi đeo găng | Thiếu | Mất lòng tin | YC-VH-11 | P4 §4.1, P8 §8.5 |
| **KT-03** | Đổi tab ở quầy làm mất dữ liệu đang gõ dở | Lỗi | Mất lòng tin | YC-VH-12 | P4 §4.2 |
| **KT-04a** | Số điện thoại gõ ở quầy không hiện lại để khách xác nhận | Thiếu | Mất lòng tin | YC-KH-11 | P5 §5.3 |
| **KT-04b** | Không có thao tác chuyển điểm giữa hai hồ sơ | Thiếu | Mất lòng tin | YC-KH-11 | P5 §5.3 |
| **KT-04c** | Kết quả tích điểm bị bỏ, khách không được báo vừa tích bao nhiêu | Lỗi | Mất lòng tin | YC-KH-11 | P5 §5.3 |
| **KT-05** | Không đo được việc nhân viên nhập số của chính mình | Thiếu | Mất tiền | YC-NS-05 | P2 §2.6 |
| **KT-06** ≡ **NS-1** | Chưa có sổ nhật ký thao tác tra cứu được | Thiếu | Mất tiền | YC-NS-05, YC-NS-10 | P2 §2.6, P5 §5.4 |
| **KT-07** | Quy tắc "quay lại đúng chỗ đang dở" cài hai bản, hai nơi | Nợ | Mất lòng tin | YC-KH-09 | P3 §3.6, P8 §8.8 |
| **KT-08** | Báo cáo không có mốc so sánh kỳ trước | Thiếu | Bất tiện | YC-QL-10 | P5 §5.5 |
| **KT-09** | Hệ thống hỏng thì người biết đầu tiên là nhân viên đang đứng trước khách | Thiếu | Mất lòng tin | **YC-PCN-09** (mới) | P8 §8.7 |
| **KT-10** | Chưa đo thời gian nấu thật, ước lượng chờ vẫn là số phỏng đoán | Thiếu | Bất tiện | YC-KH-10, YC-NS-09 | P3 §3.7 |
| **KT-11** | Cờ `available` mang hai nghĩa: *hết hôm nay* và *ngừng bán* | Nợ | Bất tiện | YC-QL-02 | P5 §5.1 |
| **KT-12** | Cờ `flashSale` không ai dùng, nên bỏ | Nợ | Bất tiện | YC-QL-06 | P5 §5.2 |
| **KT-13** | Mã ưu đãi hết hạn giữa bữa ăn: chưa có quy tắc | Thiếu | Mất lòng tin | YC-QL-06 | P5 §5.2 |
| **KT-14** | Sáu hằng số tiền nằm trong mã nguồn, đổi phải triển khai lại | Nợ | Bất tiện | YC-QL-13 | P5 §5.6 |
| **KT-15** | Không xuất được CSV/Excel cho kế toán ngoài | Thiếu | Bất tiện | **YC-QL-15** (mới) | P6 §6.6 |
| **KT-16** | Sao lưu chỉ chạy quanh lúc triển khai, không chạy hằng đêm | Thiếu | Mất tiền | YC-PCN-06 | P6 §6.7, P7 §7.4, P8 §8.4 |
| **KT-17** | Chưa có phép thử tải 30 phiên bàn đồng thời | Thiếu | Mất lòng tin | YC-PCN-04 | P7 §7.5 |
| **KT-18** | **Ghi chú món rơi mất giữa giỏ và lượt đặt** | **Lỗi** | **Mất lòng tin** | **YC-KH-14** (mới) | Phần này §9.3 |
| **KT-19** | Không tách được hoá đơn một bàn thành nhiều phần | Thiếu | Bất tiện | **YC-VH-15** (mới) | Phần này §9.4 |
| **KT-20** | Không chuyển bàn, không ghép bàn | Thiếu | Mất lòng tin | **YC-VH-14** (mới) | Phần này §9.4 |
| **KT-21** | Chưa có VAT, phí phục vụ, tiền tip trên hoá đơn | Thiếu | Mất tiền | **YC-QL-14** (mới) | Phần này §9.4 |
| **NS-2** | Xếp ca và chấm công | Thiếu | Bất tiện | YC-NS-06, 07, 08 | P5 §5.4 |
| **NS-3** | Đo năng suất theo người | Thiếu | Bất tiện | YC-NS-09 | P5 §5.4 |

**Đếm:** 25 hạng mục — 3 *Lỗi*, 16 *Thiếu*, 6 *Nợ*.

### Sáu yêu cầu phát sinh, không có trong bảng chủ quán ký

Sáu mã đánh dấu **(mới)** ở trên không truy về được yêu cầu nào ở Phần 1 §1.3, vì chủ quán **chưa
từng nêu chúng**. Chúng lộ ra khi đối chiếu hệ thống với một ngày làm việc thật, chứ không khi đọc
bản yêu cầu. Tài liệu ghi chúng thành yêu cầu có mã đàng hoàng, tiếp nối dãy số của Phần 1, để
Phần 11 truy vết được đầy đủ:

| Mã mới | Yêu cầu | Ưu tiên đề nghị | Vì sao chủ quán không nêu |
|---|---|---|---|
| **YC-KH-14** | Ghi chú riêng cho từng món phải tới được bếp | Bắt buộc | Vì ai cũng mặc định điều này có. Hệ thống có ô nhập, nên không ai nghĩ phải yêu cầu |
| **YC-VH-14** | Chuyển bàn và ghép bàn | Bắt buộc | Vì đây là việc tay chân trong quán, không ai nghĩ nó là "chức năng phần mềm" |
| **YC-VH-15** | Nhiều lần thanh toán trên một hoá đơn (chia tiền) | Nên có | Cùng lý do trên |
| **YC-QL-14** | VAT, phí phục vụ, tiền tip trên hoá đơn | Bắt buộc **nếu** quán xuất hoá đơn VAT | Phụ thuộc diện đăng ký thuế; chủ quán chưa nói, xem §9.7 câu 1–3 |
| **YC-QL-15** | Xuất dữ liệu ra bảng tính cho kế toán ngoài | Nên có | Chủ quán yêu cầu "dữ liệu là của tôi" (RB-6) nhưng chưa nói ở định dạng nào |
| **YC-PCN-09** | Có người hoặc máy được báo khi hệ thống ngừng hoạt động | Bắt buộc | Vì không ai yêu cầu "hãy báo cho tôi khi hỏng" — người ta chỉ phát hiện ra mình cần nó sau lần hỏng đầu tiên |

> **Đây chính là phần chủ quán đặt hàng ở lời mở đầu:** *"thêm những gì dự án thiếu nếu so với một
> nghiệp vụ"*. Sáu dòng trên là câu trả lời cụ thể cho yêu cầu đó, và chúng được đưa vào lộ trình
> Đợt 1 và Đợt 2 như mọi hạng mục khác — không phải phụ lục.

---

## 9.3. Ba lỗi thật, mô tả đủ để sửa

Ba hạng mục dưới đây khác phần còn lại: chúng không phải "chưa làm", chúng là "làm rồi và sai".
Mỗi mục nêu nơi cụ thể trong mã, vì một lỗi mô tả chung chung thì không ai sửa được.

### KT-18 — Ghi chú món rơi mất giữa giỏ và lượt đặt

**Hiện tượng.** Khách gõ "ít cay" vào món phở, thấy chữ đó hiện trên giỏ hàng, bấm *Gửi bếp*, và
bếp không bao giờ nhìn thấy dòng chữ ấy. Không có thông báo lỗi. Không có gì bất thường trên màn
hình. Ghi chú đơn giản là biến mất.

**Nguyên nhân, truy được từng bước:**

| Bước | Nơi trong mã | Ghi chú có sống không |
|---|---|---|
| Khách gõ ghi chú | `CartDtos.java:13` `UpdateCartItemRequest` có trường `note` | Có |
| Lưu vào giỏ | `CartService.java:76,79,95` → `CartItemEntity.java:29` `private String note` | Có, nằm ở bảng `table_session_cart_items` |
| Khách bấm gửi bếp | `OrderDtos.java:14` `CreateOrderItemRequest(String menuItemId, int quantity)` | **Không có trường nào để chở ghi chú** |
| Dựng dòng món của đơn | `OrderService.java:205` `new OrderItemEntity(id, menuItemId, menuItemName, unitPrice, quantity, now, costPrice)` | `OrderItemEntity` **không có cột `note`** |
| Xoá giỏ | `OrderService.java:244` `cartService.clearAfterOrderPlaced(session.getId())` | Bản duy nhất của ghi chú **bị xoá** |

Dòng cuối là chỗ đau nhất: ghi chú tồn tại đúng tới thời điểm nó trở nên cần thiết, rồi bị xoá ở
chính thời điểm đó. Nếu giỏ không bị xoá thì còn có đường cứu chữa bằng cách tra lại; nhưng giỏ bị
xoá, nên dữ liệu không còn tồn tại ở bất kỳ bảng nào.

**Vì sao đây là lỗi chứ không phải thiếu tính năng.** Vì hệ thống đã *hứa* với khách rồi. Nó dựng
ô nhập ghi chú, nó nhận chữ, nó hiện chữ lại trên giỏ. Một hệ thống không có ô ghi chú thì khách
biết mà gọi nhân viên; một hệ thống có ô ghi chú rồi nuốt mất nội dung thì khách tin là bếp đã
biết. Cái thứ hai tệ hơn cái thứ nhất.

**Thiết kế sửa:**

1. Thêm cột `note` (`varchar(500)`, cho phép NULL) vào `order_items` bằng migration `V41`. Giới
   hạn 500 ký tự khớp với `MAX_NOTE_LENGTH` đang dùng ở `PaymentService.java:31`,
   `TableInvoicePaymentService.java:61` và `Payment.java:30`.
2. Thêm `String note` vào `CreateOrderItemRequest` và vào hàm dựng `OrderItemEntity`.
3. **Chụp lại, không tham chiếu.** Ghi chú là một phần của chứng từ, cùng lý do với `unitPrice` và
   `unitCost` (Phần 6 §6.3). Sao chép chuỗi sang `order_items`, không lưu khoá trỏ về dòng giỏ —
   dòng giỏ sẽ bị xoá ngay sau đó.
4. Hiện ghi chú **trên thẻ món ở màn bếp**, không phải ở chân đơn. Bếp đọc từng món, không đọc cả
   đơn; ghi chú nằm ở chân đơn thì vẫn bị bỏ sót, chỉ là bỏ sót chậm hơn.
5. In ghi chú lên hoá đơn bàn — để khách đối chiếu được rằng yêu cầu của mình đã tới bếp.

**Phép kiểm đóng lỗi:** đặt một món có ghi chú "ít cay", mở màn bếp, đọc thấy đúng chữ "ít cay"
trên thẻ món đó. Không đọc cơ sở dữ liệu, không mở công cụ nhà phát triển — nhìn bằng mắt trên màn
hình bếp, vì đó là nơi lỗi này gây hại.

### KT-04c — Kết quả tích điểm bị vứt bỏ

**Hiện tượng.** Khách trả tiền, hệ thống cộng điểm, và không ai biết cộng bao nhiêu.

**Nguyên nhân.** `TableInvoicePaymentService` gọi `loyaltyService.accrue(...)` rồi **bỏ giá trị
trả về**. Số điểm vừa cộng và hạng thành viên mới có được tính, được ghi vào sổ điểm, nhưng không
đi tiếp ra phản hồi HTTP, nên màn quầy không có gì để hiện và khách không có gì để nghe.

**Vì sao mục này nguy hiểm hơn vẻ ngoài của nó.** Nó che KT-04a. Nếu nhân viên gõ nhầm một chữ số
của số điện thoại, điểm rơi vào hồ sơ người lạ — và vì khách không bao giờ được báo *"anh vừa được
cộng 45 điểm"*, khách không có cách nào phát hiện. Lỗi im lặng không tự lộ ra; nó tích tụ. Sửa
KT-04a mà không sửa KT-04c là sửa nửa vời: khách xác nhận đúng số điện thoại rồi vẫn không biết
điểm có vào hay không.

**Thiết kế sửa.** Cho `accrue(...)` trả về `(diemVuaCong, tongDiemSauKhiCong, hangHienTai,
hangKeTiep, conThieuBaoNhieuDeLenHang)`; đưa cụm đó vào phản hồi của API thanh toán; màn quầy hiện
một dòng để nhân viên đọc to cho khách. Không cần bảng mới, không cần migration — dữ liệu đã được
tính rồi, chỉ đang bị vứt đi trên đường về.

### KT-03 — Đổi tab ở quầy làm mất dữ liệu đang gõ dở

**Hiện tượng.** Nhân viên quầy đang gõ dở số tiền khách đưa, chuyển sang tab khác để tra một bàn,
quay lại thì ô nhập trống trơn và phải gõ lại từ đầu.

**Nguyên nhân.** Các tab được dựng lại từ đầu mỗi lần chuyển, thay vì giữ nguyên trạng thái. Đây
là quyết định vô tình của việc dựng giao diện, không phải quyết định thiết kế.

**Vì sao xếp là *Lỗi* chứ không phải *Bất tiện*.** Vì hậu quả của nó không dừng ở việc gõ lại. Một
quầy mất dữ liệu khi chuyển tab sẽ dạy nhân viên **đừng chuyển tab**, tức là đừng tra cứu, tức là
đoán. Và quầy đoán thì sổ lệch. Đường từ "khó chịu nhỏ" tới "mất tiền" ở đây ngắn hơn vẻ ngoài.

**Thiết kế sửa.** Giữ trạng thái tab khi chuyển (không huỷ và dựng lại), hoặc lưu bản nháp của ô
nhập theo từng bàn và khôi phục khi quay lại. Cách thứ hai bền hơn vì nó còn sống qua cả lần tải
lại trang.

---

## 9.4. Bốn nghiệp vụ nhà hàng thật mà hệ thống chưa có

Bốn mục dưới đây được phát hiện khi đối chiếu hệ thống với một ngày làm việc thật, chứ không phải
khi đọc mã. Chúng không được nêu ở các phần trước vì các phần trước mô tả *cái đang có*.

### KT-20 — Chuyển bàn và ghép bàn

**Nghiệp vụ.** Nhóm bốn người ngồi bàn 12, có thêm ba người tới, nhân viên dồn họ sang bàn 8 to
hơn. Hoặc hai nhóm quen nhau ngồi bàn 5 và bàn 6 muốn ngồi chung và trả chung một hoá đơn. Cả hai
việc này xảy ra hằng ngày ở mọi nhà hàng 30 bàn.

**Hiện trạng.** Tìm khắp backend không có `chuyenBan`, `ghepBan`, `transfer`, `merge` hay
`moveTable` — chỉ có `BankTransfer` là tên một phương thức thanh toán. Nghiệp vụ này **chưa từng
được cài**.

**Vì sao nó khó hơn vẻ ngoài.** Bất biến V4 nói *mỗi bàn nhiều nhất một phiên còn sống*. Chuyển
bàn tức là chuyển một phiên đang sống từ bàn này sang bàn khác — phải kiểm bàn đích không có phiên
sống, và phải làm trong một giao dịch, nếu không hai nhân viên chuyển hai bàn vào cùng một bàn
đích thì V4 vỡ. Ghép bàn còn khó hơn: hai phiên có hai mã QR, hai `X-Order-Token` đã phát cho hai
nhóm điện thoại khác nhau, và các điện thoại ấy vẫn đang mở trang.

**Thiết kế đề xuất:**

- **Chuyển bàn** — đổi `restaurant_table_id` của phiên, dùng cùng cơ chế khoá lạc quan `@Version`
  đang bảo vệ V4. Mã QR cũ của khách vẫn dùng được vì token gắn với *phiên*, không gắn với *bàn*.
  Ghi một dòng vào `order_status_history` để đối chiếu được về sau.
- **Ghép bàn** — chọn một phiên làm phiên chính, chuyển toàn bộ lượt đặt của phiên phụ sang phiên
  chính, đóng phiên phụ với trạng thái riêng (`MergedInto`) chứ **không** xoá, vì xoá thì mất dấu
  vết. Token của nhóm phụ phải tiếp tục đọc được hoá đơn chung — nếu không, nửa số khách ở bàn ghép
  mất quyền xem hoá đơn mà họ vừa ăn.
- **Cấm ghép khi phiên phụ đã thanh toán một phần.** Ghép hai hoá đơn có tiền đã trả vào nhau là
  bài toán đối soát, không phải bài toán bàn ghế. Chặn ở mức nghiệp vụ và nói rõ lý do.

### KT-19 — Tách hoá đơn

**Nghiệp vụ.** Bàn 6 người, mỗi người trả phần của mình. Hoặc một nhóm công ty cần hai hoá đơn:
một phần thanh toán bằng thẻ công ty, phần còn lại tiền mặt.

**Hiện trạng.** `table_invoices` gắn một-một với phiên bàn (bất biến V14: một phiên → nhiều lượt
đặt → **một** hoá đơn). Không có đường tách.

**Thiết kế đề xuất.** Không phá V14. Thay vào đó cho phép **nhiều khoản thanh toán trên một hoá
đơn** — vốn đã gần đúng, vì `payments` và `payment_transactions` đã là hai bảng tách rời. Cụ thể:
cho phép ghi nhận nhiều lần trả một phần, mỗi lần một phương thức, và hoá đơn chỉ đóng khi tổng đã
trả bằng tổng phải trả. Cách này giải quyết 90% tình huống thật (chia tiền) mà không đụng vào mô
hình dữ liệu, và tránh được cái bẫy "tách hoá đơn theo món" — vốn đòi gán từng món cho từng người,
là việc nhân viên sẽ không làm khi quán đông.

**Ghi rõ giới hạn:** cách trên **không** in ra hai tờ hoá đơn riêng có mã số riêng. Nếu chủ quán
cần đúng nghĩa hai chứng từ cho kế toán thì đó là bài toán khác và nên gắn với KT-21.

### KT-21 — VAT, phí phục vụ, tiền tip

**Hiện trạng.** Tìm khắp mã nguồn backend không có `vat`, `thuế`, `serviceCharge` hay `tip`. Tổng
hoá đơn hiện nay là *tổng tiền món trừ giảm giá*, không có dòng nào khác.

**Vì sao xếp *Mất tiền*.** Vì nếu quán thuộc diện xuất hoá đơn giá trị gia tăng, con số hệ thống
in ra không phải con số phải nộp, và sai lệch ấy tích luỹ theo từng ngày cho tới khi quyết toán.

**Thiết kế đề xuất.** Thêm vào `table_invoices` ba cột chụp lại tại thời điểm chốt:
`tax_amount`, `service_charge_amount`, `tip_amount`, cùng với **tỷ lệ đã dùng** (`tax_rate`,
`service_charge_rate`), chứ không chỉ số tiền. Lý do nằm ở nguyên tắc chứng từ ở Phần 6 §6.3: đổi
thuế suất từ 8% lên 10% vào tháng sau không được viết lại hoá đơn của tháng này, và để chứng minh
điều đó khi bị hỏi thì phải lưu cả tỷ lệ.

Thứ tự tính phải viết ra rõ trong thiết kế, vì mỗi nước làm một kiểu và làm sai thì lệch tiền:
**tiền món → trừ giảm giá → cộng phí phục vụ → tính thuế trên tổng sau phí → cộng tip (không chịu
thuế)**. Tip cộng sau cùng và không vào doanh thu của quán — nó là tiền của nhân viên, và nếu để
lẫn vào doanh thu thì báo cáo lãi lỗ ở Phần 5 §5.5 sai từ gốc.

> **Đây là quyết định của chủ quán, không phải của bên thiết kế.** Quán có thuộc diện xuất hoá đơn
> VAT không, có thu phí phục vụ không, tip có chia theo ca hay theo người — ba câu hỏi này quyết
> định thiết kế, và bên thiết kế không được tự trả lời. Tài liệu ghi nhận chúng là **câu hỏi còn
> mở**, xem §9.7.

### KT-09 — Không ai được báo khi hệ thống hỏng

**Nghiệp vụ.** Tối thứ Bảy, 7 giờ, backend chết. Người biết đầu tiên là nhân viên đang đứng trước
mặt khách với cái máy tính bảng không tải được. Người biết thứ hai là khách. Chủ quán biết sau
cùng, qua một cuộc gọi.

**Hiện trạng.** Hệ thống có `/actuator/health`, có log, nhưng **không có ai hoặc cái gì đọc chúng
khi không có người ngồi nhìn**. Đó không phải giám sát, đó là bằng chứng sau khi chuyện đã rồi.

**Thiết kế đề xuất.** Một phép kiểm định kỳ mỗi phút gọi `/actuator/health`; hai lần hỏng liên
tiếp thì nhắn cho chủ quán và người trực kỹ thuật. Ngưỡng hai lần là cố ý: một lần hỏng có thể là
mạng chập, và một hệ thống cảnh báo kêu sai sẽ bị tắt tiếng trong tuần đầu, sau đó nó vô dụng
đúng vào hôm cần nó nhất.

---

## 9.5. Lộ trình bốn đợt

Thời lượng ghi dưới đây là **ước lượng của bên thiết kế cho một người làm**, nêu để so sánh tương
đối giữa các hạng mục, không phải cam kết.

### Đợt 1 — Chặn việc dùng thật (≈ 3–4 tuần)

Không mở bán dựa vào hệ thống trước khi xong đợt này. Lý do: ba mục đầu là lỗi đang gây hại mỗi
ngày, mục thứ tư là bảo hiểm cho toàn bộ dữ liệu, mục thứ năm là chỗ nhân viên chạm vào nhiều nhất.

| Thứ tự | Mã | Vì sao ở Đợt 1 | Ước lượng |
|---:|---|---|---|
| 1 | **KT-18** | Xảy ra mỗi lần có khách gõ ghi chú. Rẻ nhất trong nhóm: một migration, một trường, một chỗ hiện | 2 ngày |
| 2 | **KT-04c** + **KT-04a** | Sai về điểm là sai về tiền của khách. Làm cùng nhau vì sửa riêng KT-04a không lộ ra kết quả | 3 ngày |
| 3 | **KT-16** | Một ổ đĩa hỏng là mất toàn bộ dữ liệu từ lần triển khai gần nhất. Rẻ và một lần xong | 2 ngày |
| 4 | **KT-06** (NS-1) | Sổ nhật ký thao tác. Chặn đường cả KT-05 và mọi tranh chấp tiền về sau. Đây là điều chủ quán hỏi đầu tiên khi két lệch | 5 ngày |
| 5 | **KT-02** | Bếp nhìn màn hình này vài trăm lần mỗi tối. Sửa cỡ chữ và vùng bấm là việc giao diện, không đụng nghiệp vụ | 3 ngày |

> **Vì sao KT-06 nằm ở Đợt 1 dù không phải lỗi.** Vì nó là món duy nhất trong danh sách mà *càng
> chậm làm càng mất giá trị*. Sổ nhật ký chỉ trả lời được câu hỏi về những việc xảy ra **sau khi**
> nó được bật. Làm tháng sau nghĩa là tháng này không có dữ liệu, vĩnh viễn.

### Đợt 2 — Nghiệp vụ nhà hàng thật (≈ 6–8 tuần)

| Thứ tự | Mã | Vì sao ở Đợt 2 | Ước lượng |
|---:|---|---|---|
| 6 | **KT-20** | Chuyển bàn, ghép bàn: xảy ra nhiều lần mỗi tối ở quán 30 bàn | 8 ngày |
| 7 | **KT-19** | Nhiều lần trả trên một hoá đơn | 5 ngày |
| 8 | **KT-09** | Cảnh báo khi hệ thống hỏng | 2 ngày |
| 9 | **KT-17** | Thử tải 30 phiên đồng thời — phải làm *trước* khi tin vào con số 30 bàn, không phải sau | 3 ngày |
| 10 | **KT-13** | Khoá mã ưu đãi theo lúc mở phiên, để mã không hết hạn giữa bữa | 2 ngày |
| 11 | **KT-03** | Giữ dữ liệu đang gõ khi đổi tab ở quầy | 3 ngày |
| 12 | **KT-21** | VAT, phí phục vụ, tip — **chỉ bắt đầu sau khi chủ quán trả lời ba câu ở §9.7** | 6 ngày |

### Đợt 3 — Quản lý và nhân sự (≈ 8–10 tuần)

| Thứ tự | Mã | Ghi chú | Ước lượng |
|---:|---|---|---|
| 13 | **NS-2** | Xếp ca và chấm công. Phụ thuộc KT-06 đã có ở Đợt 1 | 12 ngày |
| 14 | **KT-05** | Đo việc nhân viên tự tích điểm. Không chặn cứng — chỉ hiện lên báo cáo. Gần như miễn phí khi đã có KT-06 | 1 ngày |
| 14b | **KT-04b** | Chuyển điểm giữa hai hồ sơ khi đã lỡ gõ nhầm số. Xếp ở đây chứ không ở Đợt 1 vì đây là thao tác **dịch chuyển tài sản của khách**, làm trước khi có KT-06 là mở một đường chuyển tiền không ai ghi lại | 3 ngày |
| 15 | **KT-08** | So sánh kỳ trước trong báo cáo | 3 ngày |
| 16 | **KT-15** | Xuất CSV/Excel cho kế toán | 3 ngày |
| 17 | **KT-10** | Đo thời gian nấu thật, rồi thay số phỏng đoán bằng số đo | 4 ngày |
| 18 | **NS-3** | Đo năng suất. Phụ thuộc NS-1 và NS-2 | 5 ngày |
| 19 | **KT-14** | Đưa sáu hằng số tiền ra bảng `business_rule` | 5 ngày |

### Đợt 4 — Trả nợ kỹ thuật (làm xen kẽ, không cần đợt riêng)

| Mã | Ghi chú |
|---|---|
| **KT-07** | Gộp hai bản cài của quy tắc "quay lại đúng chỗ đang dở" về một. Đây là chỗ duy nhất còn lại mang đúng hình dạng của bốn lỗi ở Phần 8 §8.8 — nên trả trước các món nợ khác |
| **KT-11** | Tách `available` thành hai cờ: *hết hôm nay* và *ngừng bán* |
| **KT-01** | Xoá vai `Staff` khỏi 14 chỗ trong mã, sau khi di trú tài khoản cũ |
| **KT-12** | Bỏ cờ `flashSale` |

---

## 9.6. Những gì cố ý không làm

Một lộ trình trung thực phải nói cả những việc **sẽ không làm**, kèm lý do. Nếu không, mỗi thứ
thiếu đều trông như một sơ suất.

| Việc | Vì sao không làm đợt này |
|---|---|
| Quản lý kho nguyên liệu nhập–xuất–tồn | Là một hệ thống riêng, không phải một tính năng. Hệ thống hiện chỉ đếm *phần bán được còn lại* của món đã nấu — đủ để không bán món đã hết, không đủ để quản kho, và tài liệu không giả vờ ngược lại |
| Kế toán đầy đủ, sổ cái, công nợ nhà cung cấp | Ngoài phạm vi từ Phần 1 §1.5. Đường nối đúng là xuất dữ liệu (KT-15) cho phần mềm kế toán, không phải viết lại kế toán |
| Giao hàng, đặt món mang về qua mạng | Đổi mô hình định danh: không còn *bàn*, nên token theo bàn không còn nghĩa. Cần thiết kế lại Phần 2, không phải thêm màn hình |
| Ứng dụng cho khách cài đặt | Ràng buộc RB-1 của chủ quán: khách không phải cài gì. Ứng dụng di động hiện có là **cho nhân viên**, không phải cho khách |
| Nhiều chi nhánh | Mọi bảng hiện không có cột chi nhánh. Thêm sau được, nhưng thêm *đúng* đòi rà lại toàn bộ 22 bảng và mọi truy vấn báo cáo. Không làm nửa vời |
| Đặt bàn trước | Chủ quán xếp vào "sẽ cần ở đợt sau" (Phần 1 §1.5). Thiết kế hiện không chặn đường: phiên bàn đã có trạng thái và thời hạn, thêm phiên *đặt trước* là mở rộng tự nhiên |

---

## 9.7. Câu hỏi còn mở, cần chủ quán trả lời

Bên thiết kế không được tự trả lời những câu này. Mỗi câu chặn một hạng mục cụ thể trong lộ trình.

| # | Câu hỏi | Chặn hạng mục | Vì sao không tự quyết được |
|---|---|---|---|
| 1 | Quán có xuất hoá đơn VAT không? Thuế suất bao nhiêu? | KT-21 | Phụ thuộc diện đăng ký thuế của quán, không suy ra từ mã nguồn |
| 2 | Có thu phí phục vụ không? Bao nhiêu phần trăm, tính trước hay sau giảm giá? | KT-21 | Thứ tự tính đổi thì tổng tiền đổi. Phải do chủ quán chốt |
| 3 | Tiền tip chia thế nào — theo ca, theo người, hay vào quỹ chung? | KT-21, NS-2 | Là chính sách nhân sự, không phải kỹ thuật |
| 4 | Ghép bàn xong, nhóm phụ có được tiếp tục xem hoá đơn chung không? | KT-20 | Là quyết định về quyền riêng tư của khách, nêu ở Phần 2 §2.3 |
| 5 | Sổ nhật ký thao tác giữ bao lâu? | KT-06 | Càng lâu càng tra được, càng lâu càng tốn. Cần một con số từ chủ quán |
| 6 | Khi nhân viên tích điểm vào số của chính mình, quán muốn *chặn*, *cảnh báo*, hay *chỉ ghi lại*? | KT-05 | Tài liệu đề xuất "chỉ ghi lại" (Phần 2 §2.6), nhưng đây là quyết định về cách quản người |

---

## 9.8. Đọc lại tiêu chí thành công của chủ quán

Phần 1 §1.6 nêu năm tiêu chí. Lộ trình trên được xếp để phục vụ đúng năm tiêu chí ấy, và bảng dưới
là cách tự kiểm rằng nó không trôi mất:

| Tiêu chí của chủ quán | Hạng mục trực tiếp phục vụ |
|---|---|
| Không mất đơn | Đã đạt ở hệ thống hiện tại (ba lớp chống trùng, Phần 8 §8.3) + **KT-17** để chứng minh ở mức tải thật |
| Không mất bàn | Đã đạt (bất biến V4, khoá lạc quan) + **KT-20** cho nghiệp vụ chuyển/ghép |
| Biết được vì sao két lệch — **không** đặt mục tiêu lệch bằng 0 | **KT-06** là câu trả lời duy nhất. Không có sổ nhật ký thì mọi giải thích đều là lời kể |
| Biết khách quen là ai | **KT-04a/b/c** — hiện điểm đang chảy vào đâu thì không ai biết chắc |
| Biết món nào thật sự có lãi | Đã đạt (chụp `unit_cost`, báo cáo hao hụt) + **KT-21** nếu có thuế và phí phục vụ, vì khi đó "lãi" phải trừ thêm |

Tiêu chí thứ ba đáng nhắc lại nguyên văn, vì nó định hình cả lộ trình:

> *"Tôi **không** đặt mục tiêu lệch bằng 0. Đặt mục tiêu đó thì nhân viên sẽ tự bù tiền túi cho
> khớp sổ, và tôi mất luôn thứ tôi cần là con số thật."*

Đó là lý do KT-06 nằm ở Đợt 1 còn KT-05 nằm ở Đợt 3, và lý do KT-05 được thiết kế để **ghi lại**
chứ không **chặn**. Hệ thống nào ép con số phải đẹp thì sẽ nhận được con số đẹp, và không nhận
được con số đúng.

---

**Phần tiếp theo:** [Phần 10 — Kế hoạch kiểm thử và nghiệm thu](10-NGHIEM-THU.md)
