# Phần 12 — Danh sách công việc cần làm

> Phần 9 nói hệ thống **thiếu gì**. Phần 10 nói **làm sao biết là xong**. Phần này nói **ai làm gì,
> theo thứ tự nào, và dấu hiệu nào cho phép đóng một việc lại**.
> Đây là phần duy nhất trong tài liệu được viết để giao việc, không phải để đọc hiểu.

---

## 12.1. Cách đọc danh sách này

Mỗi dòng trong tài liệu này là một **công việc đóng được**: có đầu ra cụ thể nêu tên tệp, tên
migration hoặc tên endpoint; có người chịu trách nhiệm; và có một phép kiểm quyết định việc đã xong
hay chưa. Một việc không có phép kiểm đóng thì không phải là việc, chỉ là một mong muốn.

Ba loại công việc được gom chung ở đây vì cả ba đều chặn đường nghiệm thu, dù bản chất khác nhau:

| Loại | Chặn cái gì | Ví dụ |
|---|---|---|
| **Cài đặt** (`CV-S`, `CV-B`, `CV-N`) | Hệ thống chưa chạy đúng hoặc chưa có nghiệp vụ | Sửa ghi chú món rơi mất |
| **Thiết kế** (`CV-QD`, `CV-TK`) | Chưa quyết được thì chưa viết mã được | Quán có xuất hoá đơn VAT không |
| **Nghiệm thu** (`CV-NT`) | Có mã rồi nhưng chưa có cách chứng minh là đúng | Chưa có kịch bản cho 10 yêu cầu |

**Quy ước mã công việc:**

| Tiền tố | Nghĩa |
|---|---|
| `CV-QD-n` | **Quyết định** chủ quán phải đưa ra. Không phải việc lập trình, nhưng chặn việc lập trình |
| `CV-S-nn` | **Sửa lỗi** — hệ thống làm sai so với chính thiết kế của nó |
| `CV-B-nn` | **Bổ sung** nghiệp vụ chưa từng có |
| `CV-N-nn` | **Trả nợ** kỹ thuật — đang chạy đúng nhưng cách làm sẽ sinh lỗi về sau |
| `CV-TK-nn` | Hoàn thiện **tài liệu thiết kế** cho phần chưa thiết kế chi tiết |
| `CV-NT-nn` | Hoàn thiện **nghiệm thu** — kịch bản, dữ liệu, biểu ghi, biên bản |

**Vai người làm:** `BE` backend · `FE` giao diện · `HT` hạ tầng/CI · `CQ` chủ quán · `TL` người
viết tài liệu · `NgT` người nghiệm thu.

**Số hiệu migration dưới đây là dự kiến.** Migration cao nhất hiện tại là `V40`; các số `V41` trở
đi được cấp theo thứ tự thực tế nhập kho, không theo thứ tự đọc trong tài liệu này.

---

## 12.2. Một hạng mục bị rơi khỏi lộ trình — KT-04b

Khi lập danh sách này, đối chiếu 25 hạng mục ở Phần 9 §9.2 với bốn đợt ở §9.5 thì chỉ có **24
hạng mục được xếp đợt**. Hạng mục rơi ra là **KT-04b — chuyển điểm giữa hai hồ sơ khi nhân viên gõ
nhầm số điện thoại**. Phần 11 §11.8 gộp nó vào dòng "KT-04a/b/c → Đợt 1", nhưng bảng Đợt 1 ở §9.5
chỉ nêu KT-04a và KT-04c. Hai bảng mâu thuẫn nhau, và hậu quả là một việc có thật không có ai nhận.

**Xử lý:** KT-04b được xếp vào **Đợt 3** (công việc `CV-B-16`), không phải Đợt 1. Lý do: chuyển
điểm từ hồ sơ này sang hồ sơ khác là một thao tác **dịch chuyển tài sản của khách**, và làm việc đó
trước khi có sổ nhật ký thao tác (`CV-B-02`) là mở một đường chuyển tiền không ai ghi lại. Sửa
KT-04a — hiện lại số điện thoại để khách xác nhận trước khi chốt — đã cắt phần lớn nguyên nhân gây
ra sai; KT-04b chỉ để dọn những trường hợp đã lỡ sai.

Phần 9 §9.5 và Phần 11 §11.8 đã được sửa cho khớp với quyết định này.

---

## 12.3. Nhóm 0 — Sáu quyết định của chủ quán

Sáu việc này không cần lập trình viên, nhưng **năm hạng mục lộ trình đứng chờ chúng**. Đặt ở đầu
danh sách vì thời gian chờ quyết định thường dài hơn thời gian viết mã cho chính việc đó.

| Mã | Câu hỏi phải trả lời | Ai | Chặn | Đầu ra |
|---|---|---|---|---|
| **CV-QD-01** | Quán có xuất hoá đơn VAT không, thuế suất bao nhiêu | CQ | CV-B-09 (KT-21) | Câu trả lời ghi vào Phần 9 §9.7 và Phần 5 §5.6 |
| **CV-QD-02** | Có thu phí phục vụ không, bao nhiêu phần trăm, tính **trước hay sau** giảm giá | CQ | CV-B-09 | Như trên, kèm **thứ tự tính** viết thành một dòng công thức |
| **CV-QD-03** | Tiền tip chia theo ca, theo người, hay vào quỹ chung | CQ | CV-B-09, CV-B-10 (NS-2) | Chính sách viết thành văn bản, vì nó là chính sách nhân sự |
| **CV-QD-04** | Ghép bàn xong, nhóm phụ có còn xem được hoá đơn chung không | CQ | CV-B-04 (KT-20) | Quyết định về quyền riêng tư, ghi vào Phần 2 §2.3 |
| **CV-QD-05** | Sổ nhật ký thao tác giữ bao lâu | CQ | CV-B-02 (KT-06) | Một con số tháng, ghi vào Phần 6 §6.7 |
| **CV-QD-06** | Nhân viên tích điểm vào số của chính mình thì **chặn**, **cảnh báo**, hay **chỉ ghi lại** | CQ | CV-B-11 (KT-05) | Quyết định ghi vào Phần 2 §2.6 |

> **CV-QD-05 gấp hơn vẻ ngoài của nó.** Sổ nhật ký nằm ở Đợt 1. Nếu câu trả lời chưa có khi bắt đầu
> `CV-B-02`, mặc định đề nghị là **24 tháng** — đủ dài để phủ một kỳ quyết toán thuế, và ghi rõ
> trong mã là giá trị tạm, đổi được bằng cấu hình chứ không phải bằng migration.

---

## 12.4. Đợt 1 — Chặn việc dùng thật (15 ngày công)

Không mở bán dựa vào hệ thống trước khi năm việc này xong. Mỗi việc dưới đây được mô tả đủ để một
người chưa đọc Phần 9 vẫn làm được.

### CV-S-01 — Ghi chú món phải tới được bếp *(KT-18 · 2 ngày · BE + FE)*

**Đầu ra:**

1. Migration `V41__them_ghi_chu_dong_mon.sql` — `ALTER TABLE order_items ADD COLUMN note varchar(500)`,
   cho phép NULL. Giới hạn 500 khớp `MAX_NOTE_LENGTH` đang dùng ở `PaymentService.java:31`.
2. `OrderDtos.java:14` — `CreateOrderItemRequest(String menuItemId, int quantity, String note)`.
3. `OrderItemEntity` — thêm `private String note` và tham số tương ứng vào hàm dựng.
4. `OrderService.java:205` — **chụp lại chuỗi ghi chú** từ dòng giỏ sang dòng đơn, không lưu khoá
   trỏ về dòng giỏ, vì `clearAfterOrderPlaced` ở dòng 244 sẽ xoá dòng giỏ ngay sau đó.
5. Đưa `note` vào bản tin đẩy lên `/topic/kitchen` và vào phản hồi hoá đơn bàn.
6. `kitchen-web` — hiện ghi chú **trên thẻ từng món**, không ở chân đơn.
7. Hoá đơn bàn in ghi chú dưới tên món.
8. Lớp kiểm `orders/GhiChuMonDiTuGioSangDonTest`.

**Phép kiểm đóng:** đặt một món có ghi chú "ít cay", mở màn bếp, **đọc bằng mắt** thấy đúng chữ đó
trên thẻ món. Không mở cơ sở dữ liệu, không mở công cụ nhà phát triển — vì màn bếp là nơi lỗi này
gây hại. Tương đương kịch bản **NT-KH-14**.

**Phụ thuộc:** không. Đây là việc duy nhất ở Đợt 1 bắt đầu được ngay hôm nay.

### CV-S-02 — Khách phải biết vừa được cộng bao nhiêu điểm *(KT-04c + KT-04a · 3 ngày · BE + FE)*

Hai khoảng trống làm chung một việc, vì sửa riêng KT-04a thì không có gì hiện ra để nhân viên biết
mình đã xác nhận đúng.

**Đầu ra:**

1. `LoyaltyService.accrue(...)` trả về một bản ghi kết quả gồm `diemVuaCong`, `tongDiemSauCong`,
   `hangHienTai`, `hangKeTiep`, `conThieuBaoNhieuDeLenHang` — thay vì trả `void`.
2. `TableInvoicePaymentService` **giữ** giá trị trả về đó (hiện đang bỏ) và đưa vào phản hồi HTTP
   của API thanh toán.
3. Màn quầy: sau khi gõ số điện thoại, **hiện lại số vừa gõ đủ lớn để đọc to cho khách nghe** trước
   khi chốt (đây là KT-04a).
4. Màn quầy: sau khi chốt, hiện một dòng dạng *"Đã cộng 45 điểm · tổng 1.230 điểm · còn 770 điểm
   nữa lên hạng Vàng"*.
5. Lớp kiểm `loyalty/KetQuaTichDiemTraVeDayDuTest`.

**Không cần migration.** Dữ liệu đã được tính và đã ghi vào sổ điểm; nó chỉ đang bị vứt đi trên
đường trả về.

**Phép kiểm đóng:** **NT-KH-11** — nhân viên đọc lại được số điểm vừa cộng và tổng điểm hiện có.

### CV-B-01 — Sao lưu hằng đêm và diễn tập khôi phục theo lịch *(KT-16 · 2 ngày · HT)*

**Đầu ra:**

1. `.github/workflows/sao-luu-hang-dem.yml` — chạy theo `cron` mỗi đêm, gọi `backup-postgres.sh`,
   đẩy bản sao ra nơi lưu ngoài máy chủ ứng dụng.
2. Vòng đời bản sao: giữ 30 ngày gần nhất, cộng bản cuối tháng giữ 12 tháng.
3. `thu-khoi-phuc.yml` chuyển từ chạy tay sang chạy theo lịch **hằng tuần** trên `staging`.
4. Báo thất bại: sao lưu hỏng phải nhắn cho người trực, không được im lặng. Việc này dùng lại đường
   cảnh báo của `CV-B-06`; nếu `CV-B-06` chưa xong thì tạm thời để workflow **thất bại rõ ràng** trong
   CI chứ không nuốt lỗi.

**Phép kiểm đóng:** **NT-SC-09** chạy được, và bản sao dùng để khôi phục phải là **bản do lịch sinh
ra**, không phải bản do người bấm tay. Đây là điều kiện ký Mức B số 10.

### CV-B-02 — Sổ nhật ký thao tác *(KT-06 ≡ NS-1 · 5 ngày · BE + FE)*

Việc lớn nhất ở Đợt 1, và là việc duy nhất **càng chậm làm càng mất giá trị**: sổ chỉ trả lời được
về những chuyện xảy ra sau khi nó được bật.

**Đầu ra:**

1. Migration `V42__so_nhat_ky_thao_tac.sql` — bảng `audit_log`: `id`, `thoi_diem`,
   `nguoi_thao_tac_id`, `vai`, `hanh_dong`, `doi_tuong_loai`, `doi_tuong_id`, `so_tien`, `ly_do`,
   `du_lieu_truoc` (jsonb), `du_lieu_sau` (jsonb), `dia_chi_ip`. Chỉ mục theo `thoi_diem` và theo
   `(doi_tuong_loai, doi_tuong_id)`.
2. Ghi nhật ký ở **sáu chỗ đang trống** mà Phần 11 §11.5 nêu: huỷ món, áp giảm giá, ép đóng phiên
   còn nợ, tích điểm, đổi giá món, hoàn tiền.
3. `GET /api/audit-log` — lọc theo khoảng ngày, theo người, theo bàn, theo loại hành động. Chỉ vai
   `Admin`, canh bằng `@PreAuthorize`.
4. Màn tra cứu trong `admin-web`: gõ "bàn 12" và một ngày, ra danh sách thao tác.
5. Vòng đời dữ liệu theo `CV-QD-05`.
6. Lớp kiểm `audit/GhiNhatKyMoiThaoTacDungTienTest`.

**Phép kiểm đóng:** **NT-QL-16** — sau một ngày có tranh chấp tiền, tra ra **tên người, thời điểm,
số tiền** đã áp giảm giá cho bàn 12, trên một màn hình. Đây là điều kiện ký Mức B số 11.

**Phụ thuộc:** `CV-QD-05` (chỉ chặn bước 5, không chặn bước 1–4).

### CV-B-03 — Màn bếp đọc được ở 2 mét, bấm được khi đeo găng *(KT-02 · 3 ngày · FE)*

**Đầu ra:**

1. `kitchen-web`: cỡ chữ tên món và số lượng tăng tới mức đọc được từ 2 mét ở vị trí đặt máy thật
   trong bếp — con số cuối cùng do phép thử quyết định, không do thiết kế quyết định trước.
2. Vùng bấm mỗi nút tối thiểu 64×64 px, khoảng cách giữa hai nút kề nhau tối thiểu 16 px.
3. Tương phản màu đủ đọc dưới ánh đèn bếp, không dựa vào màu nhạt để phân biệt trạng thái.
4. Nút đổi trạng thái không đặt sát nút huỷ món.

**Phép kiểm đóng:** hai phép thử tại chỗ ở Phần 10 §10.4 — **đứng lùi 2 mét** đọc được tên món và
số lượng mà không nheo mắt, và **đeo găng cao su chạm 20 lần** không lần nào trúng nút bên cạnh.
Hai phép thử này không cho điểm từng phần.

---

## 12.5. Đợt 2 — Nghiệp vụ nhà hàng thật (29 ngày công)

| Mã | Việc | Đầu ra cụ thể | Phụ thuộc | Ước lượng | Phép kiểm đóng |
|---|---|---|---|---:|---|
| **CV-B-04** | Chuyển bàn và ghép bàn *(KT-20)* | `V43` thêm trạng thái phiên `MergedInto` và cột `merged_into_session_id` · `POST /api/table-sessions/{id}/chuyen-ban`, `POST /api/table-sessions/{id}/ghep-vao` · `TableSessionService.chuyenBan/ghepBan` trong **một giao dịch**, dùng `@Version` đang bảo vệ V4 · ghi `order_status_history` + nhật ký · nút trên `staff-web` · kiểm `ChuyenBanTest`, `GhepBanTest`, `GhepBanDaTraMotPhanBiChanTest` | CV-QD-04, CV-TK-01, CV-B-02 | 8 ngày | **NT-QU-10**, **NT-QU-11** (mới, §12.9) |
| **CV-B-05** | Nhiều lần thanh toán trên một hoá đơn *(KT-19)* | `V44` cho phép nhiều dòng `payments` trên một `table_invoice` · hoá đơn chỉ đóng khi **tổng đã trả = tổng phải trả** · màn quầy hiện *còn thiếu bao nhiêu* sau mỗi lần trả · **không** phá bất biến V14 (một phiên → một hoá đơn) · kiểm `ChiaTienNhieuLanTraTest` | CV-B-02 | 5 ngày | **NT-QU-12** (mới) |
| **CV-B-06** | Cảnh báo khi hệ thống ngừng chạy *(KT-09)* | Phép kiểm ngoài mỗi phút gọi `/actuator/health` · **hai lần hỏng liên tiếp** mới nhắn, một lần thì im · nhắn tới chủ quán và người trực kỹ thuật · ghi lại mọi lần nhắn để đối chiếu về sau | — | 2 ngày | **NT-SC-11** (mới): tắt backend, trong vòng 3 phút người trực nhận được tin |
| **CV-B-07** | Thử tải 30 phiên bàn đồng thời *(KT-17)* | Kịch bản tải dựng 30 phiên cùng gọi món trong một phút · đo độ trễ tới màn bếp · **chốt ngưỡng đạt trước khi chạy**, không chốt sau khi nhìn kết quả · đưa vào CI chạy theo lịch, không chạy mỗi lần đẩy mã | — | 3 ngày | **NT-SC-10** — điều kiện ký Mức B số 9 |
| **CV-B-08** | Khoá mã ưu đãi theo lúc mở phiên *(KT-13)* | Mã ưu đãi hợp lệ tại thời điểm **mở phiên bàn** thì còn dùng được tới khi chốt, dù hết hạn giữa bữa · ghi mốc khoá vào phiên · kiểm `MaUuDaiHetHanGiuaBuaAnTest` | — | 2 ngày | Mở phiên lúc 20:55 với mã hết hạn 21:00, chốt lúc 21:30 vẫn áp được mã |
| **CV-S-03** | Giữ dữ liệu đang gõ khi đổi tab ở quầy *(KT-03)* | Giữ trạng thái tab khi chuyển, **hoặc** lưu bản nháp ô nhập theo từng bàn và khôi phục khi quay lại — cách thứ hai bền hơn vì sống qua cả lần tải lại trang | — | 3 ngày | **NT-QU-09** và phép thử tại chỗ *cắt ngang giữa chừng* |
| **CV-B-09** | VAT, phí phục vụ, tiền tip *(KT-21)* | `V45` thêm vào `table_invoices`: `tax_amount`, `tax_rate`, `service_charge_amount`, `service_charge_rate`, `tip_amount` — **lưu cả tỷ lệ**, không chỉ số tiền · thứ tự tính cố định: tiền món → trừ giảm giá → cộng phí phục vụ → tính thuế trên tổng sau phí → cộng tip · **tip không vào doanh thu** · báo cáo Phần 5 §5.5 trừ tip ra khỏi doanh thu · kiểm `ThuTuTinhThueVaPhiTest`, `TipKhongVaoDoanhThuTest` | **CV-QD-01, 02, 03**, CV-TK-02 | 6 ngày | **NT-QL-18** (mới): chốt một hoá đơn, cộng tay từng dòng theo đúng thứ tự, không lệch một đồng |

> **CV-B-09 không được bắt đầu khi ba câu hỏi CV-QD-01/02/03 chưa có trả lời.** Viết mã trước rồi
> sửa theo câu trả lời sau nghe có vẻ tiết kiệm thời gian, nhưng thứ tự tính thuế và phí là thứ ăn
> vào từng dòng hoá đơn; đổi thứ tự sau khi đã có hoá đơn thật nghĩa là có hai loại hoá đơn trong
> cùng một cơ sở dữ liệu, và không ai phân biệt được chúng khi quyết toán.

---

## 12.6. Đợt 3 — Quản lý và nhân sự (36 ngày công)

| Mã | Việc | Đầu ra cụ thể | Phụ thuộc | Ước lượng | Phép kiểm đóng |
|---|---|---|---|---:|---|
| **CV-B-10** | Xếp ca và chấm công *(NS-2)* | `V47` ba bảng: `ca_lam_viec`, `phan_ca`, `cham_cong` · màn xếp ca theo tuần · chấm vào/ra gắn với tài khoản, không gắn với máy · bảng công cuối tháng xuất được | CV-B-02, CV-QD-03, CV-TK-03 | 12 ngày | **NT-QL-20, 21, 22** (mới) |
| **CV-B-11** | Đo việc nhân viên tích điểm vào số của chính mình *(KT-05)* | Đối chiếu số điện thoại tích điểm với `users.phone_number` · **hành vi theo CV-QD-06** — tài liệu đề nghị *chỉ ghi lại*, không chặn · hiện lên báo cáo quản lý | CV-B-02, CV-QD-06 | 1 ngày | Nhân viên tích điểm vào số của mình, dòng đó nổi lên trong báo cáo trong ngày |
| **CV-B-12** | Mốc so sánh kỳ trước trong báo cáo *(KT-08)* | Mỗi con số trong báo cáo kèm giá trị cùng kỳ trước và chênh lệch · áp cho doanh thu, số hoá đơn, món bán chạy | — | 3 ngày | **NT-QL-11** và phép thử tại chỗ *đọc một con số* — chỉ vào một số bất kỳ, nói được ngay tốt hay tệ so với hôm qua |
| **CV-B-13** | Xuất CSV/Excel cho kế toán ngoài *(KT-15)* | `GET /api/reports/xuat-du-lieu` theo khoảng ngày · các tệp: hoá đơn, dòng món, thanh toán, sổ điểm · mã hoá UTF-8 có BOM để Excel tiếng Việt mở đúng · **không** chứa dữ liệu cá nhân ngoài những gì kế toán cần | CV-TK-05 | 3 ngày | **NT-QL-19** (mới): tải tệp, mở bằng Excel, tổng cột tiền bằng tổng báo cáo trên màn |
| **CV-B-14** | Đo thời gian nấu thật *(KT-10)* | Đo khoảng từ *Bếp nhận* tới *Xong* cho từng món, gom theo món và theo giờ · thay số phỏng đoán trong ước lượng chờ bằng số đo thật · giữ số phỏng đoán làm giá trị dự phòng khi chưa đủ mẫu | — | 4 ngày | **NT-KH-10** — con số hiện cho khách là số đo, và dài ra khi bếp báo chậm |
| **CV-B-15** | Đo năng suất theo người *(NS-3)* | Số đơn xử lý, thời gian trung bình mỗi món, số lần huỷ — theo người và theo ca · **chỉ báo cáo, không xếp hạng tự động** | CV-B-02, CV-B-10 | 5 ngày | **NT-QL-23** (mới) |
| **CV-B-16** | Chuyển điểm giữa hai hồ sơ *(KT-04b — xem §12.2)* | `POST /api/loyalty/chuyen-diem` · chỉ vai `Admin` · bắt buộc nhập lý do · ghi **hai dòng đối ứng** vào sổ điểm, không sửa dòng cũ · ghi nhật ký thao tác kèm số điểm và hai hồ sơ | CV-B-02, CV-S-02 | 3 ngày | Chuyển 45 điểm từ hồ sơ A sang B, sổ điểm có hai dòng đối ứng, nhật ký tra ra được ai làm |
| **CV-N-01** | Sáu hằng số tiền ra bảng cấu hình *(KT-14)* | `V48` bảng `business_rule` · chuyển `TranDoiDiem.TY_LE`, `TRAN_TUYET_DOI`, `TranGiamGiaHoaDon.TY_LE`, `VND_PER_POINT`, `MAX_NOTE_LENGTH` và hạn phiên bàn vào bảng · **đọc có nhớ đệm**, đổi giá trị không cần triển khai lại · mọi lần đổi ghi nhật ký | CV-B-02, CV-TK-04 | 5 ngày | **NT-QL-17** (mới): đổi trần giảm giá từ 50% xuống 40% trên màn quản lý, hoá đơn kế tiếp áp trần mới, **không** khởi động lại máy chủ |

> **Vì sao CV-N-01 nằm ở Đợt 3 chứ không sớm hơn.** Đổi được hằng số tiền từ màn hình là một quyền
> lực lớn: người đổi trần giảm giá đang đổi trực tiếp số tiền quán thu. Việc này chỉ nên mở sau khi
> sổ nhật ký (`CV-B-02`) đã chạy được vài tháng, để mọi lần đổi đều có dấu vết.

---

## 12.7. Đợt 4 — Trả nợ kỹ thuật (9 ngày công, làm xen kẽ)

Bốn việc này không cần một đợt riêng. Chúng được làm xen vào giữa các đợt trên, lúc có khoảng lặng.
Ước lượng ở đây là **mới, không có trong Phần 9 §9.5** — ở đó bốn dòng này cố ý không kèm số ngày.

| Mã | Việc | Đầu ra | Ước lượng | Phép kiểm đóng |
|---|---|---|---:|---|
| **CV-N-02** | Gộp hai bản cài của quy tắc "quay lại đúng chỗ đang dở" *(KT-07)* | Một nguồn sự thật duy nhất cho quy tắc khôi phục phiên · xoá bản còn lại · kiểm `KhoiPhucPhienMotDuongDuyNhatTest` | 3 ngày | **NT-KH-09** vẫn đạt sau khi gộp, và tìm trong mã chỉ còn **một** chỗ cài quy tắc |
| **CV-N-03** | Tách `available` thành hai cờ *(KT-11)* | `V49` thêm `ngung_ban` tách khỏi `het_hom_nay` · *hết hôm nay* tự bật lại đầu ngày, *ngừng bán* thì không · màn quản lý phân biệt hai trạng thái | 3 ngày | Tắt một món vì *hết hôm nay*, sang ngày hôm sau món tự bán lại; tắt vì *ngừng bán* thì không |
| **CV-N-04** | Xoá vai `Staff` khỏi 14 chỗ trong mã *(KT-01)* | Di trú tài khoản vai `Staff` còn sót sang `CounterStaff` **trước**, rồi mới xoá khỏi `UserRole` và 14 chỗ tham chiếu | 2 ngày | `PreAuthorizeExpressionTest` vẫn xanh, tìm `Staff` trong mã không còn kết quả nào ngoài `CounterStaff` |
| **CV-N-05** | Bỏ cờ `flashSale` *(KT-12)* | Xoá cờ khỏi thực thể, DTO và giao diện; giữ cột trong cơ sở dữ liệu tới migration dọn dẹp sau | 1 ngày | Tìm `flashSale` trong mã không còn kết quả |

---

## 12.8. Nhóm thiết kế — bảy việc hoàn thiện tài liệu (11 ngày công)

Phần 9 mô tả các khoảng trống đủ để **hiểu**, chưa đủ để **viết mã**. Bảy việc dưới đây lấp khoảng
cách đó. Mỗi việc phải xong **trước** công việc cài đặt mà nó phục vụ.

| Mã | Việc | Đầu ra | Ai | Phải xong trước | Ước lượng |
|---|---|---|---|---|---:|
| **CV-TK-01** | Thiết kế chi tiết chuyển bàn và ghép bàn | Sơ đồ tuần tự cho cả hai thao tác · cách giữ bất biến **V4** khi hai nhân viên chuyển cùng lúc · số phận `X-Order-Token` của nhóm phụ sau khi ghép · quy tắc **cấm ghép khi phiên phụ đã trả một phần** | TL + BE | CV-B-04 | 2 ngày |
| **CV-TK-02** | Thiết kế chi tiết VAT, phí phục vụ, tip | Công thức tính viết thành một dòng, có ví dụ số · bảng năm cột mới · quy tắc làm tròn từng bước (`RoundingMode.DOWN` nhất quán với phần còn lại) · cách hiển thị trên hoá đơn khách | TL + BE | CV-B-09 | 2 ngày |
| **CV-TK-03** | Thiết kế chi tiết xếp ca và chấm công | Ba bảng và quan hệ · quy tắc ca đêm vắt qua nửa đêm · xử lý quên chấm ra · cách tính bảng công khi có ca bù | TL | CV-B-10 | 2 ngày |
| **CV-TK-04** | Thiết kế bảng `business_rule` | Danh sách đủ sáu hằng số, kiểu dữ liệu, khoảng giá trị hợp lệ của từng cái · cách nhớ đệm và làm mới · ai được đổi | TL + BE | CV-N-01 | 1 ngày |
| **CV-TK-05** | Thiết kế định dạng xuất dữ liệu | Bốn tệp CSV, tên cột từng tệp · quy ước ngày giờ và dấu thập phân · những trường **không** được xuất ra | TL | CV-B-13 | 1 ngày |
| **CV-TK-06** | Phát biểu các bất biến mới vào `SPEC.md` | Ít nhất bốn bất biến mới: phiên `MergedInto` không nhận thêm lượt đặt · không ghép phiên đã trả một phần · tổng đã trả không vượt tổng phải trả · tip không vào doanh thu | TL | Nghiệm thu Mức B | 1 ngày |
| **CV-TK-07** | Cập nhật Phần 9 và Phần 11 sau mỗi đợt | Bảng truy vết đổi trạng thái `T` → `MP` → `Đ` theo từng việc đóng · bảng tóm tắt §11.10 tính lại | TL | Mỗi lần đóng đợt | 2 ngày |

> **CV-TK-07 là việc dễ bị bỏ nhất và tốn nhất nếu bỏ.** Một bảng truy vết không được cập nhật sau
> ba tháng sẽ sai tới mức không ai tin, và khi không ai tin thì nó thành một tệp chết. Đề nghị gắn
> việc này vào điều kiện đóng mỗi đợt, không để thành việc riêng ai đó sẽ làm sau.

---

## 12.9. Nhóm nghiệm thu — sáu việc (11 ngày công)

Phần 10 có **57 kịch bản**, nhưng Phần 11 §11.9 tự kiểm ra **10 yêu cầu chưa có phép kiểm nào**.
Đó là điều đúng ở giai đoạn viết thiết kế — không viết được kịch bản nghiệm thu cho một tính năng
chưa thiết kế chi tiết — nhưng nó phải được đóng lại trước khi ký Mức B.

### Mười một kịch bản còn thiếu *(bản nháp, chốt khi thiết kế chi tiết xong)*

| Mã mới | Yêu cầu đang trống | Đạt khi | Chốt sau việc |
|---|---|---|---|
| **NT-QU-10** | YC-VH-14 | Chuyển bàn 12 sang bàn 8: khách quét mã cũ vẫn vào đúng đơn của mình, bàn 12 trống ngay | CV-TK-01 |
| **NT-QU-11** | YC-VH-14 | Ghép bàn 5 và bàn 6: một hoá đơn chung, điện thoại của **cả hai nhóm** vẫn xem được hoá đơn đó | CV-TK-01, CV-QD-04 |
| **NT-QU-12** | YC-VH-15 | Bàn 6 người trả làm ba lần, hai phương thức khác nhau: hoá đơn chỉ đóng sau lần trả cuối, mỗi lần hiện đúng số còn thiếu | CV-B-05 |
| **NT-QL-17** | YC-QL-13 | Đổi trần giảm giá trên màn quản lý, hoá đơn kế tiếp áp trần mới, không khởi động lại máy chủ | CV-TK-04 |
| **NT-QL-18** | YC-QL-14 | Chốt một hoá đơn có thuế, phí phục vụ và tip; cộng tay theo đúng thứ tự, không lệch một đồng; tip **không** xuất hiện trong doanh thu | CV-TK-02 |
| **NT-QL-19** | YC-QL-15 | Tải tệp CSV một tuần, mở bằng Excel, tổng cột tiền bằng tổng trên màn báo cáo | CV-TK-05 |
| **NT-QL-20** | YC-NS-06 | Xếp ca cho một tuần, nhân viên mở máy thấy đúng ca của mình | CV-TK-03 |
| **NT-QL-21** | YC-NS-07 | Chấm vào rồi chấm ra; quên chấm ra thì hệ thống nêu rõ, **không** tự điền | CV-TK-03 |
| **NT-QL-22** | YC-NS-08 | Bảng công cuối tháng cộng tay bằng tổng hệ thống tính | CV-TK-03 |
| **NT-QL-23** | YC-NS-09 | Đọc được số đơn và thời gian trung bình theo từng người sau một ngày chạy thật | CV-B-15 |
| **NT-SC-11** | YC-PCN-09 | Tắt backend; trong vòng 3 phút người trực nhận được tin; bật lại thì nhận tin báo đã hồi phục | CV-B-06 |

Sau khi có đủ 11 kịch bản này, tổng số kịch bản nghiệm thu là **68**, và phép tự kiểm thứ hai ở
Phần 11 §11.9 chuyển từ *Không đạt* sang *Đạt*.

### Sáu việc nghiệm thu

| Mã | Việc | Đầu ra | Ai | Phụ thuộc | Ước lượng |
|---|---|---|---|---|---:|
| **CV-NT-01** | Viết 11 kịch bản còn thiếu vào Phần 10 §10.3 | 11 dòng đầy đủ cột *Đạt khi* và *Truy về*, viết **sau** khi thiết kế chi tiết tương ứng xong | TL | CV-TK-01..05 | 3 ngày |
| **CV-NT-02** | Dựng bộ dữ liệu nghiệm thu | Mở rộng `du-lieu-mau.yml` cho đủ điều kiện Phần 10 §10.5: 88 món có giá vốn, 30 bàn, hoá đơn của nhiều ngày trước, hồ sơ ở cả ba hạng · **không chứa số điện thoại hay tên người thật** | HT | — | 2 ngày |
| **CV-NT-03** | Biểu ghi kết quả nghiệm thu | Một bảng ký: 68 kịch bản + 5 phép thử tại chỗ, mỗi dòng có ô *Đạt / Không đạt / Chưa kiểm*, ô ghi chú và ô chữ ký · **ô "Chưa kiểm" là bắt buộc phải có**, vì ghi "đạt" cho việc chưa làm là cách nhanh nhất để mất giá trị của cả buổi nghiệm thu | TL | CV-NT-01 | 1 ngày |
| **CV-NT-04** | Chạy nghiệm thu | Chạy đủ 68 kịch bản và 5 phép thử tại chỗ, điền biểu · **ghi trung thực cả những dòng trượt** | NgT | CV-NT-02, 03 | 3 ngày |
| **CV-NT-05** | Biên bản ký Mức A | Đối chiếu 6 điều kiện Phần 10 §10.6 · nêu rõ các dòng *chưa kiểm* và lý do | CQ + NgT | Đợt 1 xong | 1 ngày |
| **CV-NT-06** | Biên bản ký Mức B | Đối chiếu 5 điều kiện còn lại · các mục hoãn phải có **văn bản chấp nhận hoãn của chủ quán, nêu lý do** | CQ + NgT | Đợt 2 xong | 1 ngày |

---

## 12.10. Việc nào phải xong trước khi ký

Bảng này đọc ngược: từ điều kiện ký ở Phần 10 §10.6 về danh sách việc ở trên. Dùng để kiểm tại
buổi nghiệm thu, không cần đọc lại cả tài liệu.

### Mức A — đủ điều kiện dùng thật

| # | Điều kiện Phần 10 §10.6 | Việc phải xong |
|---:|---|---|
| 1 | NT-SC-01 → NT-SC-09 đạt hết; NT-SC-10 được ghi *chưa kiểm* | CV-B-01 (cho NT-SC-09) |
| 2 | Toàn bộ nhóm NT-QU đạt, trừ NT-QU-09 nếu KT-03 chưa sửa | — (hệ thống hiện tại đã đạt phần còn lại) |
| 3 | ≥ 12/15 NT-KH, bắt buộc có NT-KH-06 và NT-KH-15 | **CV-S-01** (NT-KH-14), **CV-S-02** (NT-KH-11) |
| 4 | Toàn bộ NT-BP đạt về chức năng | — |
| 5 | Năm phép thử tại chỗ **đã chạy và đã ghi kết quả**, kể cả khi trượt | CV-NT-03, CV-NT-04 |
| 6 | Đợt 1 của lộ trình hoàn thành | CV-S-01, CV-S-02, CV-B-01, CV-B-02, CV-B-03 |

### Mức B — đủ điều kiện bàn giao

| # | Điều kiện Phần 10 §10.6 | Việc phải xong |
|---:|---|---|
| 7 | Đợt 2 hoàn thành, hoặc có văn bản chấp nhận hoãn | CV-B-04 → CV-B-09, CV-S-03 |
| 8 | Sáu câu hỏi ở Phần 9 §9.7 đã có trả lời | **CV-QD-01 → CV-QD-06** |
| 9 | NT-SC-10 (tải 30 bàn) đã chạy thật và đạt | **CV-B-07** |
| 10 | Diễn tập khôi phục đã chạy **theo lịch tự động** | **CV-B-01** |
| 11 | NT-QL-16 đạt — tra được ai đã làm gì | **CV-B-02** |
| — | *(thêm)* Phép tự kiểm thứ hai ở Phần 11 §11.9 chuyển sang *Đạt* | **CV-NT-01**, CV-TK-07 |

Dòng cuối là bổ sung của tài liệu này, không có trong §10.6. Lý do: ký bàn giao trong khi bảng truy
vết còn 10 dòng không có phép kiểm nghĩa là ký cho một thứ chưa ai kiểm được — và sáu tháng sau,
không ai nhớ mười dòng đó là gì.

---

## 12.11. Tổng hợp

| Nhóm | Số việc | Ngày công | Chặn mức ký nào |
|---|---:|---:|---|
| Quyết định của chủ quán | 6 | — | Mức B (điều kiện 8) |
| Đợt 1 — chặn việc dùng thật | 5 | 15 | **Mức A** |
| Đợt 2 — nghiệp vụ nhà hàng thật | 7 | 29 | Mức B |
| Đợt 3 — quản lý và nhân sự | 8 | 36 | Sau bàn giao |
| Đợt 4 — trả nợ kỹ thuật | 4 | 9 | Không chặn, làm xen kẽ |
| Hoàn thiện thiết kế | 7 | 11 | Chặn từng việc cài đặt tương ứng |
| Hoàn thiện nghiệm thu | 6 | 11 | Mức A và Mức B |
| **Tổng** | **43** | **111** | |

**111 ngày công cho một người làm.** Con số này là ước lượng để so sánh tương đối giữa các việc,
không phải cam kết tiến độ. Nó cũng không tính thời gian chờ sáu quyết định của chủ quán — và trong
thực tế, thời gian chờ quyết định thường dài hơn thời gian viết mã cho chính việc đó.

Ba mốc đáng nhớ:

| Mốc | Cần gì | Cộng ra | Ngày công tới mốc |
|---|---|---|---:|
| **Ký Mức A — dùng thật được** | Đợt 1 + CV-NT-02, 03, 04, 05 | 15 + 7 | **22** |
| **Ký Mức B — bàn giao được** | Thêm Đợt 2, toàn bộ nhóm thiết kế, nốt nhóm nghiệm thu | 22 + 29 + 11 + 4 | **66** |
| **Đủ nghiệp vụ một nhà hàng 30 bàn** | Thêm Đợt 3 và Đợt 4 | 66 + 36 + 9 | **111** |

---

## 12.12. Những việc cố ý không có trong danh sách

Sáu mục ở Phần 9 §9.6 — quản lý kho nguyên liệu, kế toán đầy đủ, giao hàng, ứng dụng cho khách cài
đặt, nhiều chi nhánh, đặt bàn trước — **không** xuất hiện trong danh sách này, và đó là chủ ý.
Chúng nằm ngoài phạm vi chủ quán chốt ở Phần 1 §1.5.

Một danh sách công việc chứa cả những việc sẽ không làm thì không ai dùng được: mỗi lần đọc phải
lọc lại. Nếu chủ quán đổi ý về bất kỳ mục nào trong sáu mục đó, việc đúng là **mở lại Phần 1 §1.5
trước**, vì năm trong sáu mục đòi thiết kế lại một phần tài liệu này chứ không phải thêm một dòng
vào bảng trên.

---

**Hết tài liệu.** Quay lại [Mục lục](00-MUC-LUC.md) · Xem lại [Phần 9 — Khoảng trống và lộ
trình](09-KHOANG-TRONG-VA-LO-TRINH.md) · [Phần 10 — Nghiệm thu](10-NGHIEM-THU.md) ·
[Phần 11 — Bảng truy vết](11-BANG-TRUY-VET.md)
