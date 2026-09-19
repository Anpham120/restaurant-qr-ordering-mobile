# Khảo sát và phân tích nghiệp vụ quản lý nhà hàng

> **Loại tài liệu:** khảo sát nghiệp vụ  
> **Phiên bản:** 0.1 — giả lập theo góc nhìn chủ nhà hàng, 2026-09-18  
> **Đối tượng đọc:** chủ quán, quản lý vận hành, bếp trưởng, thu ngân và đội sản phẩm  
> **Lưu ý:** phần Bối cảnh giả lập là quyết định giả định để thiết kế/kiểm thử. Phần Mức độ đáp ứng hiện tại chỉ kết luận từ source CMC Restaurant.

## 1. Mục tiêu khảo sát

Tôi là chủ một nhà hàng phục vụ tại bàn. Tôi không mua phần mềm có nhiều màn hình; tôi cần hệ thống giúp quán **phục vụ đúng, thu đúng, biết đang mất gì và ra quyết định được trong ca làm việc**.

Tài liệu trả lời bốn câu hỏi:

1. Một ngày vận hành diễn ra thế nào và ai chịu trách nhiệm ở mỗi điểm giao?
2. Tiền, món, bàn, nguyên liệu và ưu đãi có thể sai ở đâu?
3. Hệ thống phải kiểm soát điều gì để phát hiện sai ngay trong ca?
4. Những gì dự án đã có, còn thiếu và cần làm theo thứ tự nào?

## 2. Bối cảnh nhà hàng giả lập

| Hạng mục | Giả định vận hành |
|---|---|
| Mô hình | Nhà hàng món Việt tầm trung, phục vụ tại bàn, một chi nhánh |
| Sức chứa | 20 bàn / khoảng 90 khách; khu thường và một phòng đặt trước |
| Giờ mở cửa | 10:00–22:30; hai ca: sáng 09:30–15:30, tối 15:30–23:00 |
| Kênh phục vụ | Ăn tại bàn là trọng tâm; khách tự gọi QR, nhân viên luôn có thể hỗ trợ |
| Khu chế biến | Bếp nóng, quầy đồ uống, hàng lấy sẵn; năng lực mỗi khu khác nhau |
| Thanh toán | Tiền mặt và VietQR; giá hiển thị là giá khách phải trả, phí phục vụ mặc định bằng 0 |
| Quyết định hóa đơn P0 | Một hóa đơn cho một session; **chưa** tách hóa đơn, gộp/chuyển bàn hoặc trả nhiều phương thức |
| Đặt trước P0 | Quản lý nhận thủ công qua điện thoại; số hóa reservation là P1, trừ khi quán có đặt cọc/phòng riêng ngay từ ngày đầu |
| Nhân sự/ca | 1 quản lý, 1 thu ngân, 2 phục vụ, 3 bếp, 1 phụ bếp/quầy đồ uống |
| Mục tiêu chủ quán | Giảm chờ đợi, tránh thất thoát tiền/nguyên liệu, biết lãi theo món/ca, không ghi chép lặp |

Các giả định phải được thay bằng số liệu thật khi triển khai. Chúng không phải quy định pháp lý hay hằng số được chôn trong mã.

## 3. Các bên liên quan và nhu cầu

| Vai trò | Họ cần nhìn thấy | Họ quyết định/làm gì | Rủi ro nếu thiếu |
|---|---|---|---|
| Chủ quán | doanh thu thực, lãi gộp, thất thoát, hiệu suất ca | giá, menu, khuyến mãi, nhân sự | doanh thu tăng nhưng lợi nhuận giảm mà không biết |
| Quản lý ca | bàn đang phục vụ, món trễ, khiếu nại, chênh quỹ | điều phối, duyệt huỷ/hoàn tiền, đóng ca | khách chờ lâu, trách nhiệm mơ hồ |
| Thu ngân | hóa đơn bàn, tiền nhận/thối, quỹ ca | xác nhận thu, hoàn tiền, chốt ca | lệch quỹ hoặc thu trùng/thiếu |
| Bếp trưởng | hàng đợi theo khu bếp, món sắp hết, món huỷ muộn | phân công, báo trễ/hết món | làm món không thể bán, không đo được hao hụt |
| Phục vụ | bàn cần hỗ trợ, món sẵn sàng, ghi chú | bưng món, xác nhận phục vụ | sót bàn hoặc nhầm món |
| Khách tại bàn | menu đúng giá, tiến độ món, tổng tiền | gọi món, huỷ trước khi làm, thanh toán | mất niềm tin, phải gọi nhân viên liên tục |
| Kế toán | chứng từ thu–hoàn, quỹ ca, doanh thu ngày | đối soát ngân hàng/quỹ | hậu kiểm tốn công, số liệu không khớp |

### Tiêu chí thành công của chủ quán

- Không có hóa đơn mất chủ: bàn quá giờ nhưng còn nợ phải hiện cho quầy xử lý.
- Mỗi huỷ, giảm giá, hoàn tiền và điều chỉnh tiền mặt đều có người làm, lý do và thời điểm.
- Bếp không gọi điện hỏi lại: thấy đúng món, số lượng, ghi chú và thời gian chờ.
- Quản lý nhìn 30 giây biết ca tốt/xấu: doanh thu, bàn mở, món trễ, tiền mặt dự kiến–thực tế, món hết và hao hụt.

## 4. Chuỗi vận hành một ngày

~~~mermaid
flowchart LR
  A[Mở ca: quỹ đầu ca · nhân sự · menu] --> B[Nhận khách: đặt bàn hoặc xếp bàn]
  B --> C[QR mở phiên bàn: giỏ dùng chung]
  C --> D[Gửi lượt đặt món: KDS theo khu bếp]
  D --> E[Chuẩn bị → sẵn sàng → phục vụ]
  E --> F[Thanh toán hóa đơn bàn: COD hoặc VietQR]
  F --> G[Chốt ca: đối chiếu quỹ · báo cáo]
  A -. kiểm tra .-> H[Nguyên liệu · định lượng · món khả dụng]
  D -. tiêu hao .-> H
  E -. huỷ muộn .-> H
~~~

### 4.1 Mở ca

Thu ngân mở ca với tiền đầu ca; bếp trưởng xác nhận món bán được, số suất chuẩn bị và sự cố thiết bị/nhân sự; quản lý xem bàn/QR có hoạt động.

**Quy tắc:** không có quá một ca quầy mở tại cùng điểm thu. Tiền đầu ca và mọi điều chỉnh là ledger, không sửa số dư trực tiếp. Món chưa chuẩn bị hoặc hết nguyên liệu phải bị ẩn/đánh dấu trước giờ bán.

### 4.2 Nhận khách, đặt chỗ và xếp bàn

Nhà hàng thực tế có khách walk-in và khách đặt trước. Cần trạng thái bàn Available, Occupied, Reserved, Maintenance; không được chỉ suy luận bàn trống từ việc có order.

Luồng tối thiểu cho reservation: tạo tên/số điện thoại, số khách, giờ đến, thời lượng, yêu cầu đặc biệt và bàn dự kiến. Khi khách đến, chuyển reservation thành phiên bàn. No-show và khách trễ có quy tắc rõ (giả lập: giữ bàn 15 phút, sau đó quản lý giải phóng).

### 4.3 Gọi món QR và phục vụ tại bàn

QR gắn với bàn vật lý; Table Session gắn với lượt khách. Nhiều điện thoại quét cùng QR phải vào cùng session, giỏ và hóa đơn. Một session có nhiều Order Round nhưng chỉ một Table Invoice khi quyết toán.

Khách tự huỷ khi món chưa vào bếp. Khi món đã Preparing, quyền huỷ chuyển cho quầy/quản lý và bắt buộc lý do: khách đổi ý, bếp lỗi, hết nguyên liệu, thao tác nhầm hoặc miễn phí chăm sóc khách. Lý do là dữ liệu báo cáo hao hụt, không phải ghi chú tùy ý.

### 4.4 Bếp và tốc độ phục vụ

Trạng thái sống ở từng món:

**Pending → Preparing → Ready → Served**, hoặc **Pending/Preparing → Cancelled** khi có quyền và lý do hợp lệ.

KDS chia hàng đợi bếp nóng, quầy đồ uống, hàng lấy sẵn. ETA được tính từ thời gian chuẩn bị của món + tải hàng đợi của khu bếp + độ trễ do bếp trưởng khai báo. Ngưỡng cảnh báo trễ là business rule (giả lập ban đầu: ETA + 10 phút), không phải hằng số giao diện.

### 4.5 Thanh toán, giảm giá và hoàn tiền

Thu tiền theo hóa đơn bàn, không theo từng lượt gọi món:

1. Server khóa dòng món phải trả và tính subtotal, discount, total.
2. Promotion, số điện thoại tích điểm, reward đổi điểm và phương thức trả được gắn vào invoice attempt.
3. COD: thu ngân nhập tiền khách đưa; hệ thống tính tiền thối và ghi transaction vào ca quầy.
4. VietQR: chỉ webhook có reference và amount hợp lệ mới xác nhận tự động.
5. Cancel payment attempt mở lại khả năng gọi món và phải trả trạng thái promotion/loyalty đúng trước khi request.
6. Refund gồm chứng từ hoàn, người/lý do duyệt, đảo điểm và khoản chi tiền mặt nếu là COD.

Tại thời điểm payment request, invoice chuyển Pending và khóa tập hợp dòng phải trả. P0 không hỗ trợ partial refund: sai món sau khi đã thu xử lý bằng một refund toàn hóa đơn rồi lập hóa đơn mới, hoặc một chính sách comp có manager approval được thiết kế riêng. Món Preparing/Ready/Served không bị xoá/sửa lịch sử để “chỉnh số tiền”; mọi ngoại lệ đi qua void/refund có audit.

### 4.6 Chốt ca và đối soát

Thu ngân đếm tiền thật, nhập closing cash actual; hệ thống tính dự kiến từ opening float + thu COD – hoàn COD ± điều chỉnh quỹ. Chênh lệch không bị xóa cho đẹp: quản lý phải xác nhận nguyên nhân trước khi đóng ca. Ca đã đóng là immutable; sửa sai tạo adjustment/audit record mới.

## 5. Nhu cầu nghiệp vụ theo phân hệ

| Mã | Nhu cầu của chủ quán | Ưu tiên | Điều kiện nghiệm thu |
|---|---|---|---|
| BR-01 | Quản lý bàn/QR/session | P0 | Một bàn chỉ một session mở; quét nhiều máy trả cùng session và resume state đúng |
| BR-02 | Menu bán theo ca và số suất | P0 | Món hết/ngoài ca không checkout được; thay đổi hiện ngay trên web/KDS |
| BR-03 | Order từng món và KDS | P0 | Bếp/nhân viên chỉ chuyển trạng thái hợp lệ; khách thấy item-level progress |
| BR-04 | Hóa đơn bàn, thanh toán an toàn | P0 | Không double-charge; request có idempotency; invoice pending không bị đổi tiền qua huỷ món |
| BR-05 | Ca quầy, quỹ tiền mặt | P0 | Thu/chi COD vào ledger ca; chênh lệch cuối ca có lý do và người xác nhận |
| BR-06 | Promotion, loyalty, refund | P0 | Không vượt trần giảm; hoàn tiền đảo benefit đúng một lần; không sửa lịch sử ledger |
| BR-07 | Reservation, waitlist, floor map | P1 | Không overbook; check-in thành session; no-show/ahead/late có audit |
| BR-08 | Kho nguyên liệu và recipe/BOM | P1 | Món có recipe version; tiêu hao/hoàn kho/hao hụt vào stock ledger |
| BR-09 | Mua hàng và nhà cung cấp | P2 | Nhập kho có PO, nhận hàng, chênh lệch, giá vốn theo lô |
| BR-10 | Chăm sóc khách/khiếu nại | P2 | Request có loại, SLA, người nhận, kết quả; không chỉ là nút bấm mất dấu |
| BR-11 | Báo cáo quản trị | P1 | Xem revenue, average check, top/bottom dish, void/waste, kitchen SLA, cash variance theo ca/ngày |

## 6. Quy tắc nghiệp vụ quan trọng

| Mã | Quy tắc | Lý do quản trị |
|---|---|---|
| R-01 | Giá, tên món, giá vốn cho order phải snapshot khi gửi order. Sửa menu không viết lại lịch sử. | Đối chiếu báo cáo/khiếu nại quá khứ |
| R-02 | Promotion có hiệu lực, điều kiện, quota; quota tăng cùng transaction settlement. | Chống dùng quá số lần khi nhiều bàn trả cùng lúc |
| R-03 | Void/discount thủ công vượt ngưỡng phải có manager approval. | Ngăn thất thoát ngụy trang giảm giá |
| R-04 | Không close session còn invoice phải trả, trừ forced-close có role, lý do, audit. | Không tạo bill mồ côi |
| R-05 | Refunded là terminal; không confirm/fail lại cùng payment. | Tránh đảo tiền/điểm nhiều lần |
| R-06 | Tồn kho không âm; thiếu recipe/tồn thì món không bán hoặc manager override có audit. | Bảo vệ kho và trải nghiệm khách |
| R-07 | Huỷ khi Preparing ghi wastage theo recipe/cost snapshot; huỷ Pending không trừ hao hụt bếp. | Đo thất thoát thực |
| R-08 | Business rule về tiền có ngày hiệu lực và snapshot vào chứng từ. | Không làm thay kết quả quá khứ |
| R-09 | Realtime chỉ báo giao diện reload; API/database là source of truth. | Client mất mạng không làm lệch trạng thái |
| R-10 | Token phiên, webhook secret, PII không có trong log/audit hiển thị rộng rãi. | Bảo mật và giảm rủi ro vận hành |

### 6.1 Điểm chuyển trạng thái cần chốt

| Đối tượng | Chuyển trạng thái | Actor chính | Điều kiện và hệ quả |
|---|---|---|---|
| Món trong đơn | Pending → Preparing | Kitchen | Bếp nhận làm; bắt đầu đo thời gian chuẩn bị |
| Món trong đơn | Preparing → Ready | Kitchen | Món đã xong; phát cảnh báo cho ServiceStaff/bàn |
| Món trong đơn | Ready → Served | ServiceStaff hoặc Kitchen theo chính sách | Xác nhận khách đã nhận món; lưu actor/timestamp |
| Món trong đơn | Pending/Preparing → Cancelled | Customer khi còn Pending; Manager/CounterStaff sau đó | Bắt buộc lý do khi huỷ muộn; cập nhật wastage nếu có recipe |
| Invoice | Chưa request → Pending | Customer tại bàn | Tính/snapshot payable lines, discount, loyalty, method; khóa thay đổi tiền |
| Invoice/Payment | Pending → Confirmed/Paid | CounterStaff hoặc webhook xác thực | Thu đúng amount/reference; close session, ghi ledger tiền/điểm/ca |
| Invoice/Payment | Pending → Cancelled | CounterStaff | Bỏ snapshot ưu đãi/method theo chính sách để có thể gọi món tiếp |
| Invoice/Payment | Confirmed/Paid → Refunded | CounterStaff + approval theo ngưỡng | Ghi chứng từ hoàn, đảo loyalty, chi cash nếu COD; không chuyển ngược lần hai |

## 7. Ma trận quyền vận hành mục tiêu

| Chức năng | Customer tại bàn | Kitchen | CounterStaff | Admin/Manager |
|---|---:|---:|---:|---:|
| Xem menu, giỏ, trạng thái bàn mình | Có | — | Có | Có |
| Gửi order round | Có | — | Hỗ trợ | Có |
| Cập nhật trạng thái món | — | Pending → Preparing → Ready | — | Override có audit |
| Xác nhận bưng món | — | Có thể hỗ trợ khi quán không có phục vụ riêng | Ready → Served tại bàn phụ trách | Có |
| Báo hết món, báo trễ | — | Có | Xem | Có |
| Mở/chốt ca, xác nhận COD | — | — | Có | Giám sát/override |
| Tạo/sửa menu, giá, ca phục vụ | — | Báo đề xuất | — | Có |
| Áp/duyệt giảm giá thủ công | — | — | Trong ngưỡng | Có |
| Hoàn tiền | — | — | Đề nghị/theo quyền | Duyệt hoặc thực hiện |
| Reservation, floor plan | — | Xem | Xem/check-in | Có |
| Inventory, recipe, purchase | — | Xác nhận tiêu hao | Xem | Có |

Vai Staff chung chung không phải đích cuối. Mô hình mục tiêu tách Kitchen, CounterStaff và Admin/Manager; nếu thật sự cần phục vụ, thêm ServiceStaff với quyền tối thiểu thay vì một role rộng quyền lẫn lộn.

**Quyết định giả lập:** quán này có ServiceStaff. Họ không được giảm giá, thu tiền, hoàn tiền hay đổi menu; họ chỉ xem bàn phụ trách, nhận cảnh báo Ready, xác nhận Served và tạo yêu cầu hỗ trợ. Nếu không có ServiceStaff trong ca, Kitchen được phép xác nhận Served nhưng quản lý phải biết đó là ngoại lệ báo cáo.

## 8. Dữ liệu và chỉ số chủ quán cần

### 8.1 Sổ cái không được mất

| Sổ cái | Dòng tối thiểu | Không được làm |
|---|---|---|
| Tiền | request, confirm, cancel, refund, cash shift adjustment | sửa amount/status lịch sử mà không audit |
| Điểm | earn, redeem, honour, expire, refund reversal | cập nhật số điểm mà không có ledger entry |
| Kho | receipt, consumption, waste, stock count adjustment, transfer | sửa on-hand như một con số đơn lẻ |
| Trạng thái món | status changed, actor, timestamp, exception reason | chỉ lưu trạng thái cuối |

### 8.2 Dashboard theo ca

- Covers, số bàn mở và turn time bàn.
- Gross sales, discount, net sales, payment mix COD/VietQR và average check.
- Món bán chạy/chậm, món hết, margin ước tính theo cost snapshot.
- Thời gian Placed → Preparing → Ready → Served; tỷ lệ món quá ETA.
- Số huỷ theo lý do; wastage cost của huỷ sau nấu.
- Tiền dự kiến, tiền thực, cash variance và payment pending quá ngưỡng.

Doanh thu một mình không cho biết bếp chậm, món hết, tiền mặt lệch hay lợi nhuận âm.

### 8.3 Công thức tài chính P0

| Chỉ số | Công thức chuẩn |
|---|---|
| Gross sales | Tổng line total của mọi món không Cancelled, theo giá snapshot lúc gửi order |
| Total discount | Promotion + loyalty redemption + manual comp đã duyệt; mỗi phần phải có chứng từ nguồn |
| Refund | Tổng tiền của invoice/payment đã Refunded trong kỳ báo cáo |
| Net sales | Gross sales − total discount − refund |
| Cash expected | opening float + COD confirmed − COD refund + signed cash adjustment |

P0 hiển thị giá gross cho khách, không thêm service charge/tip và không tự suy luận VAT. Khi cần thuế, phí phục vụ, tip hoặc hóa đơn điện tử, chúng phải là các dòng tiền riêng có effective date, rounding rule và báo cáo riêng; không sửa công thức lịch sử.

## 9. Mức độ đáp ứng của dự án hiện tại

| Nghiệp vụ | Mức độ | Bằng chứng/phạm vi hiện tại | Khoảng trống |
|---|---|---|---|
| QR, session, giỏ chung, resume state | Đã có | Backend: TableSessionService/CartService; UI: ordering web | Reservation/floor state chưa là context riêng; e2e cần Docker để chứng minh live flow |
| Nhiều lượt gọi món, item-level KDS | Đã có | Backend: OrderService; UI: KDS; realtime: STOMP | SLA món trễ/lý do huỷ cần thành số liệu rõ |
| Menu, category, availability, serving period, suất | Đã có | Menu controllers/services, admin/kitchen UI | Chưa có recipe/BOM và tồn nguyên liệu thật |
| Invoice, COD, VietQR/SePay, refund | Đã có | TableInvoicePaymentService, PaymentService, CounterService | Cần integration evidence khi Docker sẵn sàng |
| Loyalty/promotion | Đã có | LoyaltyService, PromotionService, admin UI | Cần rule versioning/audit chính sách tiền |
| Ca quầy | Đã có | CounterService/CounterController | Cần dashboard variance và policy điều chỉnh thống nhất |
| Báo cáo | Cơ bản | ReportController summary | Thiếu KPI theo ca, waste, margin, SLA, comparison |
| Reservation/waitlist | Chưa có | Không có context/API chuyên biệt | P1 |
| Kho/recipe/purchase/supplier | Chưa đủ | Có cost price và remaining quantity, chưa stock ledger/BOM | P1/P2 |
| Khiếu nại/service request có SLA | Một phần | Có trợ giúp tại bàn | Cần ticket lifecycle/owner/resolution |
| Nhân sự/chấm công/lương | Ngoài phạm vi | Không có module | Chỉ làm khi là mục tiêu sản phẩm |

## 10. Lộ trình từ góc nhìn chủ quán

### P0 — Không để mất tiền hoặc phục vụ sai

1. Nghiệm thu và đưa vào quy trình ca cơ chế giữ session còn nợ; quầy phải có dashboard/cảnh báo bàn overdue để xử lý, không chỉ có dữ liệu backend.
2. Chuẩn hóa role/approval: thay Staff mơ hồ bằng quyền theo nhiệm vụ; manual discount, void/refund có actor, reason, approval theo ngưỡng.
3. Hoàn thiện test payment–loyalty–cash-shift concurrency và webhook idempotency.
4. Chuẩn hóa chốt ca/cash variance trước khi mở rộng tính năng.

### P1 — Biết quán đang mất gì và chủ động phục vụ

1. Reservation, waitlist và floor status.
2. Recipe/BOM, stock ledger, waste từ huỷ sau nấu; bắt đầu top 20 món, không nhập toàn bộ menu một lần.
3. KPI ca: kitchen SLA, void/waste, top/bottom dish, cash variance, average check.
4. Business rule có hiệu lực theo thời gian cho chính sách tiền/điểm; không mở màn sửa tự do trước audit/approval.

### P2 — Mở rộng có kiểm soát

1. Purchase order, nhận hàng, supplier, kiểm kê và chênh lệch kho.
2. Ticket chăm sóc khách, đánh giá sau bữa và CRM segment.
3. Chỉ cân nhắc multi-branch sau ADR về data ownership, menu/price theo chi nhánh và báo cáo tách chi nhánh.

## 11. Câu hỏi xác nhận với chủ quán thật

1. Giá menu đã gồm thuế chưa? Có phí phục vụ, tip, hóa đơn điện tử?
2. Khách được huỷ món đến trạng thái nào? Ai duyệt và mỗi lý do ảnh hưởng tiền/kho thế nào?
3. Có đặt chỗ, giữ bàn, đặt cọc, phòng riêng? Quy tắc no-show là gì?
4. Menu/giá/khuyến mãi có khác theo giờ, ngày, chi nhánh hoặc kênh bán?
5. Nguyên liệu nào cần kiểm soát trước: món bán chạy, món đắt tiền hay nguyên liệu dễ hỏng?
6. Ai được giảm giá/hoàn tiền và ngưỡng nào cần quản lý duyệt?
7. Có một hay nhiều điểm thu? Có giao ca/đổi tiền lẻ?
8. KPI nào được xem mỗi ngày, tuần, tháng để quyết định mua hàng/nhân sự/menu?
9. Có tách hóa đơn, gộp bàn, chuyển bàn hoặc thanh toán nhiều phương thức?
10. Tích hợp ưu tiên là máy in bếp, POS, hóa đơn điện tử, ngân hàng hay sàn giao hàng?

## 12. Tiêu chí nghiệm thu nghiệp vụ

1. Hai điện thoại quét cùng bàn: cùng giỏ, cùng session, không tạo hai invoice.
2. Một bàn gọi ba lượt ở ba khu bếp: bếp/khách thấy đúng từng món.
3. VietQR webhook gửi lặp: chỉ ghi nhận và đóng session một lần.
4. Hoàn COD: cash shift, payment, invoice, loyalty đều đúng, có actor/reason.
5. Một món hết giữa ca: khách không checkout được; KDS/ops nhận update; order cũ không đổi lịch sử.
6. Chốt ca lệch: số chênh không biến mất, có lý do/người xác nhận.
7. Chủ quán xem dashboard cuối ca và nêu được doanh thu, tiền mặt lệch, món trễ, món hết, hao hụt.

## Phụ lục — tài liệu dự án liên quan

- Nghiệp vụ đang chạy: docs/THIET_KE_NGHIEP_VU.md
- Kiến trúc/API facts sinh từ source: docs/backend/ARCHITECTURE.md
- Hợp đồng API: docs/backend/API_CONTRACT.md
- Blueprint kỹ thuật: docs/THIET_KE_HE_THONG_BAM_THEO.md

Tài liệu này là điểm xuất phát để chủ quán xác nhận chính sách. Sau khi §11 được trả lời, mỗi quyết định phải trở thành business rule, acceptance test và task triển khai; không biến giả định trong tài liệu thành luật ngầm trong source.
