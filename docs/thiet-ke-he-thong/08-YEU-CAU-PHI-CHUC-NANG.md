# Phần 8 — Yêu cầu phi chức năng

> Đáp ứng: YC-PCN-01 → YC-PCN-08, RB-5, RB-6

---

## 8.1. Bảo mật

### Mô hình đe doạ — ai có thể làm gì xấu

Một nhà hàng không phải ngân hàng, nhưng cũng không phải không có gì để mất. Liệt kê thật, xếp theo
xác suất xảy ra:

| # | Kẻ tấn công | Muốn gì | Che bằng |
|---|---|---|---|
| **1** | Khách tò mò | Xem hoá đơn bàn khác, đổi giá món | `X-Order-Token` theo từng đơn; giá tính ở máy chủ |
| **2** | Khách gian | Dùng lại mã QR chụp được để gọi món miễn phí | Phiên bàn gắn với bàn; xoay QR được |
| **3** | Người cầm điện thoại nhân viên bỏ quên | Vào thẳng tài khoản đã đăng nhập | Token trong kho an toàn HĐH; đăng xuất **không** dọn màn hình nếu xoá token hỏng |
| **4** | Nhân viên cũ đã nghỉ | Còn đăng nhập được | Xoá tài khoản; ca cũ giữ nguyên trong sổ |
| **5** | Người quét cổng từ Internet | Tìm endpoint hở | `@PreAuthorize` trên mọi endpoint không công khai |
| **6** | Giả mạo webhook thanh toán | Báo "đã trả tiền" giả | Khoá cấu hình phía máy chủ + `reference_code` duy nhất |

### Nguyên tắc áp dụng

**Mọi phép tính tiền chạy ở máy chủ.** Khách gửi lên *"tôi muốn 2 phở"*, không gửi lên *"2 phở =
90.000đ"*. Giá lấy từ `menu_items`, khuyến mãi xác thực lại, trần giảm giá áp lại. Không con số tiền
nào do client cung cấp được tin.

**Quyền tối thiểu theo vai.** Xem ma trận §2.3. Bếp không thấy tiền, quầy không sửa giá.

**Vé có phạm vi hẹp và có hạn.** `X-Order-Token` chỉ mở đúng một đơn, và chết khi phiên bàn đóng.
So sánh bằng thuật toán **thời gian hằng** để không rò rỉ qua thời gian phản hồi.

**Không bao giờ lưu mật khẩu bản rõ.** `password_hash`. Không có đường nào trong hệ thống đọc lại
được mật khẩu, kể cả `Admin`.

**Bí mật không nằm trong kho mã.** Khoá cổng thanh toán, khoá SSH, cấu hình Firebase — đều qua biến
môi trường và kho bí mật của GitHub Actions. Kho mã là công khai, nên đây không phải lựa chọn.

### Chi tiết: ứng dụng di động và kho an toàn của hệ điều hành

Ứng dụng Expo lưu token vào Android Keystore / iOS Keychain. Kho này **ném lỗi** khi khoá mã hoá bị
vô hiệu — người dùng đổi mã khoá màn hình, đổi vân tay, hoặc khôi phục máy từ bản sao lưu.

Quy tắc bắt buộc rút ra, và vì sao nó là vấn đề **bảo mật** chứ không chỉ là vấn đề khó dùng:

> Nút **Đăng xuất** gọi xoá token. Nếu việc xoá hỏng mà giao diện vẫn dọn sạch như đã đăng xuất
> thành công, thì token **còn nguyên** trong Keystore. Người dùng tin là mình đã ra. Người cầm máy
> tiếp theo mở app và vào thẳng tài khoản đó.
>
> Nguyên tắc: **thất bại ở bước ghi thì không được dọn màn hình.** Nói ra và đứng yên.

Cùng luật áp cho nút **Rời bàn**: xoá phiên hỏng mà vẫn dọn màn hình thì mở lại app là khách ngồi
lại đúng bàn vừa "rời" — một nút bấm xong tự hoàn tác.

### Quét bảo mật tự động

`security.yml` và `dependency-review.yml` chạy trên mỗi push và mỗi PR. Thư viện mới bị soát trước
khi vào nhánh chính.

> Một ràng buộc vận hành đã ghi lại: **không chạy `npm audit fix --force`** trên ứng dụng di động.
> Nó hạ cấp các gói và làm hỏng Expo. Sửa lỗ hổng phải làm có chọn lọc, không bằng một lệnh quét.

## 8.2. Tính đúng của tiền — YC-PCN-05 `[ĐỦ]`

| Biện pháp | Chi tiết |
|---|---|
| Kiểu dữ liệu | `BigDecimal` ↔ `numeric`. Không `double` ở bất kỳ đâu trên đường tiền |
| Làm tròn | `RoundingMode.DOWN` nhất quán ở mọi phép tính trần |
| Chụp lại | `unit_price`, `unit_cost`, `menu_item_name` chụp vào `order_items` |
| Cộng dồn | `RevenueLedger` — lớp domain riêng, kiểm được bằng phép kiểm đơn vị thuần |

Vì sao không `double`: nó là số nhị phân dấu phẩy động, không biểu diễn chính xác được những số thập
phân bình thường. Sai số tích luỹ qua vài trăm phép cộng mỗi ngày, và không ai phát hiện ra cho tới
khi đối chiếu sổ sách lệch vài nghìn đồng mà không tìm được nguồn.

Vì sao `RoundingMode.DOWN` **nhất quán** quan trọng hơn việc chọn cái nào: cùng một hoá đơn tính lại
bao nhiêu lần cũng phải ra cùng số. Một quy tắc làm tròn không nhất quán tạo ra những khoản lệch một
đồng, và những khoản đó phá hỏng mọi phép đối soát tự động.

## 8.3. Tin cậy khi mạng chập chờn — YC-PCN-01 `[ĐỦ]`

Yêu cầu gốc: *"Mạng chập chờn không được làm mất đơn hoặc tính tiền hai lần."*

### Ba lớp chống trùng, độc lập nhau

| Lớp | Cơ chế | Chặn được |
|---|---|---|
| Cơ sở dữ liệu | `reference_code` duy nhất (V23) | Webhook SePay gửi lại |
| Ứng dụng | Khoá bất biến (`idempotencyKey`) trên `POST /orders` và đường thanh toán | Khách bấm hai lần |
| Trạng thái | Chỉ hoá đơn `Pending` nhận thanh toán | Trả tiền cho hoá đơn đã trả |
| Đồng thời | `@Version` trên `table_sessions` và `payments` | Hai người sửa cùng lúc |

Lớp cơ sở dữ liệu mạnh nhất vì nó đúng kể cả khi chạy nhiều bản sao ứng dụng — thứ mà câu `if`
trong mã không bảo đảm được.

### Nguyên tắc chung

> **Mọi thao tác đụng tiền phải cho cùng kết quả khi lặp lại, không phải cho kết quả nhân đôi.**

Đây là tính chất cần kiểm riêng cho từng endpoint, không phải tính chất tự có.

## 8.4. Sẵn sàng và phục hồi — YC-PCN-06 `[MỘT PHẦN]`

### Trạng thái thật, ba mức

| Rủi ro | Che chưa? | Bằng gì |
|---|:---:|---|
| **Máy quầy hỏng** | ✔ | Máy quầy chỉ là trình duyệt. Mở máy khác, đăng nhập, làm tiếp |
| **Triển khai hỏng lược đồ** | ✔ | Sao lưu tự động trước mỗi migration; `rollback-vps.sh` quay lui được |
| **Máy chủ hỏng giữa ngày** | ✖ | **Không có sao lưu định kỳ** |

### Điểm mạnh đáng nêu: khả năng khôi phục đã được chứng minh

Phần lớn dự án có script sao lưu và chưa bao giờ thử khôi phục. Ở đây có một workflow riêng
(`thu-khoi-phuc.yml`) **cố ý làm hỏng dữ liệu trên `staging` rồi khôi phục lại**.

Lý do, ghi nguyên văn trong tệp đó: *"Có script sao lưu không bằng có khả năng khôi phục — và ngày
người ta cần tới nó là ngày tệ nhất để phát hiện nó hỏng."*

Diễn tập này đã tìm ra một lỗi thật trước khi cần dùng: `restore-postgres.sh` khai 4 biến bắt buộc
nhưng bước cuối thiếu một biến.

### Điểm yếu còn lại: cửa sổ mất dữ liệu

Không có sao lưu định kỳ nghĩa là **cửa sổ mất dữ liệu bằng khoảng cách giữa hai lần triển khai**.
Tuần nào không triển khai thì cửa sổ là một tuần.

Đề xuất đóng (Phần 9, **KT-16**): sao lưu hằng đêm + giữ 7 ngày gần nhất + mỗi tháng chạy diễn tập
khôi phục một lần. Chi phí gần như bằng 0 vì cả script sao lưu lẫn script khôi phục đều đã có và
đã chứng minh là chạy được — chỉ thiếu cái lịch.

## 8.5. Hiệu năng — YC-PCN-04 `[MỘT PHẦN]`

Xem Phần 7 §7.5. Tóm tắt: thiết kế có cơ sở (đẩy tin thay vì hỏi vòng, tách ứng dụng, chỉ mục), nhưng
**chưa có phép đo tải thật**. Hệ thống có thể đủ nhanh; hiện không ai chứng minh được.

### Ngưỡng đề xuất để đo

| Số đo | Ngưỡng đạt | Vì sao ngưỡng này |
|---|---|---|
| Đơn mới → hiện trên màn bếp | < 2 giây | Dài hơn thì bếp bắt đầu nhìn sang giấy |
| Tải thực đơn lần đầu | < 3 giây trên 4G chậm | Khách bỏ đi nếu lâu hơn |
| Đổi trạng thái món → khách thấy | < 3 giây | Đủ để khách không bấm lại |
| 30 phiên bàn đồng thời | Không số nào trên vượt gấp đôi | Đúng quy mô quán |

## 8.6. Tính dùng được

### Tiếng Việt toàn phần — YC-PCN-07 `[ĐỦ]`

Toàn bộ giao diện, **kể cả thông báo lỗi**, bằng tiếng Việt. Gói `i18n` dùng chung cho cả 5 ứng dụng
web.

Điểm đáng nêu: thông báo lỗi nói **việc phải làm**, không nói mã lỗi kỹ thuật.

| Thay vì | Hệ thống nói |
|---|---|
| `TABLE_SESSION_HAS_UNPAID_ITEMS` | *"Bàn còn món chưa thanh toán. Thu tiền trước, hoặc ép đóng kèm lý do."* |
| `TABLE_SESSION_CLOSE_REASON_REQUIRED` | *"Ép đóng bàn còn nợ tiền phải kèm lý do."* |
| `LOYALTY_DISCOUNT_OVER_CAP` | Khoản giảm bị **cắt về trần**, không từ chối hoá đơn |

Mã lỗi vẫn có trong phản hồi API — cho lập trình viên. Câu tiếng Việt là cho người đứng ở quầy.

### Thời gian đào tạo 15 phút — YC-PCN-08 `[ĐỦ]`

Xem Phần 7 §7.6. Nguyên tắc: **mỗi quy tắc hệ thống nhớ hộ là một quy tắc nhân viên mới không phải
học.**

### Môi trường bếp — YC-VH-11 `[THIẾU]`

Đây là chỗ duy nhất trong nhóm tính dùng được còn hở, và nó hở ở nhóm người dùng khắc nghiệt nhất.
Xem Phần 9, **KT-02**.

## 8.7. Khả năng vận hành và quan trắc

### Cái đang có

| Hạng mục | Trạng thái |
|---|---|
| Kiểm tra sức khoẻ `GET /api/health` | `[ĐỦ]` |
| `health-check.sh` sau triển khai | `[ĐỦ]` |
| Quay lui tự động | `[ĐỦ]` — `rollback-vps.sh`, `rollback-tu-xa.sh` |
| Nhật ký ứng dụng | `[ĐỦ]` — qua Docker |

### Cái đang thiếu

| Hạng mục | Trạng thái | Hậu quả |
|---|---|---|
| Cảnh báo chủ động khi hệ thống lỗi | `[THIẾU]` | Chủ quán biết hỏng vì nhân viên gọi, không vì hệ thống báo |
| Số đo vận hành theo thời gian | `[THIẾU]` | Không thấy xu hướng xấu đi trước khi nó thành sự cố |
| Sổ nhật ký thao tác tra cứu được | `[MỘT PHẦN]` | Xem NS-1, Phần 9 |

> Khoảng trống đầu tiên đáng nói trong buổi bảo vệ vì nó là **một câu hỏi nghiệp vụ, không phải kỹ
> thuật**: *"Ai là người đầu tiên biết hệ thống hỏng?"* Hiện câu trả lời là *"nhân viên đang đứng
> trước khách"* — vị trí tệ nhất có thể để phát hiện sự cố.

## 8.8. Chất lượng mã và quy trình

Chủ quán không yêu cầu mục này, nhưng nó là thứ giữ cho năm mục trên không xấu đi theo thời gian.

| Biện pháp | Chi tiết |
|---|---|
| Kiểu chặt | TypeScript strict, gồm `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Cổng CI | Kiểu, lint, định dạng, phép kiểm — không qua thì không merge |
| **Tài liệu sinh từ mã** | Kiểm kê endpoint, bảng module, chỉ mục tài liệu — có cổng CI đối chiếu |
| Phép kiểm đầu-cuối ranh giới | `realtime-e2e` — mã client thật với backend thật |
| **Kiểm đột biến** | Sửa hỏng mã có chủ ý để xác nhận phép kiểm thật sự bắt được |
| Nhật ký lỗi | `SPEC.md` ghi 80 lỗi đã xảy ra, kèm nguyên nhân và nơi sửa |

### Vì sao nhật ký 80 lỗi đáng nêu

Nó biến sai lầm thành tri thức tái dùng được. Phân tích cho thấy **bốn** lỗi nặng nhất có **cùng một
hình dạng**:

| Đã sai | Hình dạng |
|---|---|
| Ưu đãi đổi điểm trừ ở cấp đơn, hoá đơn tính ở cấp hoá đơn | Hai cấp cùng nói về "khoản giảm" |
| Tải bếp cộng `prep_minutes` mà quên `× quantity` | Mọi ca kiểm đều dùng `quantity: 1` |
| Frontend dùng SignalR khi backend đã sang STOMP | Mỗi bên tự kiểm bằng client của chính mình |
| Tài liệu khai 13 module/97 endpoint khi mã có 12/88 | Văn xuôi kể lại trạng thái mã |

**Hình dạng chung: hai nơi cùng mô tả một sự thật, và không có gì bắt chúng lệch nhau.**

Hai cách chống đã áp:

1. **Sinh ra thay vì viết lại** — tài liệu sinh từ mã, có cổng CI.
2. **Nối hai đầu thật lại** — `realtime-e2e` chạy đồ thật với đồ thật.

Chỗ **chưa** có cách chống: quy tắc "quay lại đúng chỗ đang dở" (§3.5) vẫn là hai bản cài đặt độc
lập ở backend và frontend. Xem Phần 9, **KT-07**.

> Đây là phần đáng trình bày nhất khi bảo vệ: không phải vì hệ thống không có lỗi, mà vì **lỗi đã
> được phân loại tới mức rút ra được quy luật, và quy luật đó đã sinh ra biện pháp chống cụ thể.**

---

**Trước:** [Phần 7 — Kiến trúc](07-KIEN-TRUC-HE-THONG.md) · **Tiếp:** [Phần 9 — Khoảng trống và lộ trình](09-KHOANG-TRONG-VA-LO-TRINH.md)
