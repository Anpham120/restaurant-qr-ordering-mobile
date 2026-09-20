# Phần 10 — Kế hoạch kiểm thử và nghiệm thu

> Trả lời một câu: **làm sao biết hệ thống chạy đúng?**
> Kế hoạch này viết để chủ quán tự làm được, không cần biết lập trình.

---

## 10.1. Ba tầng kiểm, và giới hạn của từng tầng

Không có một phép kiểm nào bắt được mọi thứ. Kế hoạch này chia ba tầng, và điều quan trọng nhất
là biết **tầng nào không bắt được gì** — vì đó là chỗ lỗi trốn.

| Tầng | Ai làm | Bắt được | **Không** bắt được |
|---|---|---|---|
| **1. Máy kiểm tự động** | Chạy mỗi lần đẩy mã, trong CI | Sai quy tắc nghiệp vụ, sai tính tiền, vỡ bất biến, lệch tài liệu | Mọi thứ liên quan tới con người: chữ quá nhỏ, nút quá gần, câu thông báo khó hiểu |
| **2. Kịch bản nghiệm thu theo vai** | Người làm, theo kịch bản viết sẵn | Luồng nghiệp vụ đứt quãng, thiếu bước, màn hình không dẫn được người dùng đi hết việc | Điều kiện thực tế của quán: tay ướt, ánh sáng, tiếng ồn, khách đang đợi |
| **3. Phép thử tại chỗ** | Người làm, trong bếp và tại quầy thật | Khoảng cách giữa màn hình và con người | Lỗi logic — tầng này không kiểm đúng/sai, chỉ kiểm dùng được/không |

Ba tầng bổ cho nhau và **không thay thế nhau**. Một hệ thống qua hết 53 lớp kiểm tự động vẫn có
thể là hệ thống mà bếp không đọc nổi màn hình.

---

## 10.2. Tầng 1 — Máy đã kiểm sẵn những gì

Backend hiện có **53 lớp kiểm** trong `backend-java/src/test`. Chúng được đặt tên theo **nghiệp
vụ**, không theo tên lớp mã — đọc danh sách tệp là đọc được danh sách quy tắc đang được canh.

| Nhóm | Lớp kiểm tiêu biểu | Canh quy tắc nào |
|---|---|---|
| Phiên bàn | `tables/domain/TableSessionTest`, `tables/domain/PhienQuaGioConNoTest`, `tables/QuetPhienQuaHanJobTest`, `tables/DongPhienBanTest` | V4 (một phiên sống/bàn), phiên quá giờ **còn nợ tiền thì không tự đóng**, chặn đóng phiên còn nợ |
| Tiền và hoá đơn | `tables/domain/TienKhachDuaTest`, `tables/domain/TranGiamGiaHoaDonTest`, `loyalty/domain/TranDoiDiemTest`, `payments/DoiSoatHoaDonBanTest` | Tính tiền thối, trần giảm giá 50%, trần đổi điểm 30% / 200.000đ, đối soát hoá đơn bàn |
| Đặt món | `orders/domain/OrderTest`, `orders/DatDonNgoaiCaTest`, `orders/UocLuongTheoTramTest`, `orders/application/OrderItemEstimationServiceTest` | Vòng đời đơn, chặn đặt ngoài ca phục vụ, ước lượng thời gian chờ |
| Thực đơn | `menu/ThucDonTheoCaTest`, `menu/LichPhucVuTest`, `menu/MenuItemPrepMinutesTest`, `menu/ChuanBiThucDonHomNayTest` | Món theo ca, lịch phục vụ, thời gian chuẩn bị |
| Tích điểm | `loyalty/domain/TichDiemTheoHangTest`, `loyalty/domain/HetHanDiemTest`, `loyalty/domain/MemberTierTest`, `loyalty/RedeemConcurrencyTest`, `loyalty/HoanTienTraLaiDiemTest`, `loyalty/TuNoiSoTest` | Hệ số hạng, hạn điểm 12 tháng, **đổi điểm hai lần cùng lúc**, hoàn tiền thì trừ lại điểm |
| Khuyến mãi | `promotions/GioiHanLuotDungTest`, `promotions/domain/PromotionIsActiveAtTest` | Giới hạn lượt dùng (V32), hiệu lực theo thời điểm |
| Ca quầy | `counter/domain/CounterShiftTest`, `counter/HoanTienMatTest` | Mở/đóng ca, hoàn tiền mặt |
| Phân quyền | `PreAuthorizeExpressionTest`, `auth/AdminBootstrapTest`, `auth/GoogleSignInTest` | Mọi endpoint có canh quyền, tài khoản quản trị đầu tiên |
| Kiến trúc | `HexagonalArchitectureTest`, `DeploymentConfigTest` | Tầng miền không phụ thuộc Spring/JPA, cấu hình triển khai hợp lệ |

**Các cổng CI ngoài phép kiểm đơn vị** — đây là phần dễ bị bỏ quên khi nói về kiểm thử, nhưng
chính chúng canh những lỗi từng xảy ra thật:

| Cổng | Chặn điều gì | Vì sao có nó |
|---|---|---|
| `realtime-e2e` | Đơn mới không tới được màn bếp | Sự cố realtime ở Phần 4 §4.1: mã biên dịch được, phép kiểm đơn vị xanh, nhưng bếp không nhận đơn |
| *Kiểm kê endpoint khớp mã* | Tài liệu nói 97 endpoint mà mã có 88 | Sự cố lệch tài liệu ở Phần 7 §7.3 |
| *Kiểm bảng module và workflow khớp mã* | Bảng module trong tài liệu lạc hậu | Cùng gốc với trên |
| *Kiểm chỉ mục tài liệu khớp thư mục* | Mục lục trỏ tới tệp không tồn tại | — |
| *Kiểm nhãn cơ sở dữ liệu khớp thực đơn* | Nhãn dị nguyên / nhãn mùa trong CSDL lệch với từ điển | Nhãn dị nguyên sai là vấn đề an toàn thực phẩm, không phải vấn đề hiển thị |
| *Không file nguồn nào bị `.gitignore` loại bỏ* | Một tệp mã lọt vào `.gitignore` rồi biến mất khỏi kho | — |
| `Integration test (Testcontainers)` | Quy tắc chỉ đúng trên bộ nhớ, sai trên PostgreSQL thật | Khoá lạc quan và ràng buộc duy nhất chỉ kiểm được trên cơ sở dữ liệu thật |

> **Cách đọc bảng trên khi trình bày.** Mỗi dòng ở cột "vì sao có nó" là một lỗi đã xảy ra. Không
> có cổng nào được thêm vì "nên có" — tất cả được thêm sau khi một thứ hỏng theo đúng cách đó.

---

## 10.3. Tầng 2 — Kịch bản nghiệm thu theo vai

Mã kịch bản: `NT-<vai>-nn`. Mỗi kịch bản có **tiền đề**, **các bước**, **đạt khi**, và **truy về**
yêu cầu nào ở Phần 1.

Người nghiệm thu đánh dấu Đạt / Không đạt cho từng dòng. Không có ô "gần đạt".

### 10.3.1. Vai khách ăn

| Mã | Kịch bản | Đạt khi | Truy về |
|---|---|---|---|
| **NT-KH-01** | Quét mã QR trên bàn bằng điện thoại chưa từng dùng hệ thống | Mở được thực đơn, **không** bị hỏi cài ứng dụng, **không** bị hỏi đăng ký | YC-KH-01, RB-1 |
| **NT-KH-02** | Duyệt thực đơn, xem một món đang hết hàng | Có ảnh, giá, mô tả, nhóm món; món hết **hiện rõ là hết**, không chọn được | YC-KH-02 |
| **NT-KH-03** | Chọn 3 món, gửi bếp; 10 phút sau gọi thêm 2 món | Hai lượt đặt hiện riêng, nhưng **chỉ một hoá đơn** cho cả bàn | YC-KH-03, V14 |
| **NT-KH-04** | Theo dõi màn hình trong lúc bếp đổi trạng thái từng món | Trạng thái đổi **không cần tải lại trang**, trong vòng vài giây, và **từng món một** | YC-KH-04 |
| **NT-KH-05** | Huỷ một món khi bếp chưa nhận, rồi thử huỷ một món bếp đang nấu | Món thứ nhất huỷ được; món thứ hai **bị từ chối**, có lý do | YC-KH-05 |
| **NT-KH-06** | Xem hoá đơn cả bàn trước khi trả | Tổng tiền trên màn khách **bằng** tổng trên màn quầy, từng dòng khớp | YC-KH-06 |
| **NT-KH-07** | Trả bằng chuyển khoản: quét mã ngân hàng hiện trên màn | Hệ thống **tự** ghi nhận đã nhận tiền, không cần nhân viên bấm xác nhận tay | YC-KH-07 |
| **NT-KH-08** | Bấm nút gọi nhân viên từ điện thoại | Quầy nhận được, biết là bàn nào | YC-KH-08 |
| **NT-KH-09** | Khoá màn hình, mở lại sau 5 phút | Quay về đúng chỗ đang dở: đúng phiên bàn, đúng đơn, không phải quét lại | YC-KH-09 |
| **NT-KH-10** | Xem thời gian chờ dự kiến của một món vừa đặt | Có hiện một con số, và con số đó dài ra khi bếp báo chậm | YC-KH-10 |
| **NT-KH-11** | Đọc số điện thoại để tích điểm lúc trả tiền | Nhân viên đọc lại được **số điểm vừa cộng** và tổng điểm hiện có | YC-KH-11 |
| **NT-KH-12** | Đổi điểm lấy ưu đãi cho hoá đơn đang mở | Điểm trừ đúng, giảm giá áp đúng, không vượt trần | YC-KH-12 |
| **NT-KH-13** | Gọi lại món đã ăn lần trước | Thấy lịch sử món cũ và đặt lại được bằng ít thao tác | YC-KH-13 |
| **NT-KH-14** | Gõ ghi chú "ít cay" cho một món rồi gửi bếp | Màn bếp hiện **đúng chữ "ít cay"** trên thẻ món đó | YC-KH-14 |
| **NT-KH-15** | Sửa mã bàn trên thanh địa chỉ thành bàn khác đang có khách | **Bị từ chối.** Không xem được đơn hay hoá đơn của bàn đó | YC-PCN-02 |

> **Ba kịch bản dưới đây dự kiến KHÔNG ĐẠT ở phiên bản hiện tại.**
>
> - **NT-KH-14** — ghi chú bị mất giữa giỏ và lượt đặt (Phần 9, **KT-18**).
> - **NT-KH-11** — kết quả tích điểm bị vứt bỏ, không có gì để đọc cho khách (Phần 9, **KT-04c**).
> - **NT-KH-10** — con số thời gian chờ có hiện, nhưng là số phỏng đoán chưa đo (Phần 9, **KT-10**).
>
> Chúng vẫn nằm trong kế hoạch, và cố ý để nguyên ở trạng thái sẽ trượt. Một kế hoạch nghiệm thu
> chỉ chứa những phép thử chắc chắn đạt thì không kiểm gì cả — nó chỉ xác nhận lại điều người viết
> đã biết.

### 10.3.2. Vai bếp

| Mã | Kịch bản | Đạt khi | Truy về |
|---|---|---|---|
| **NT-BP-01** | Mở màn bếp, để yên, nhờ người đặt đơn ở bàn khác | Đơn mới **tự hiện**, không chạm vào máy | YC-VH-01 |
| **NT-BP-02** | Đổi trạng thái một món sang *Đang nấu* rồi *Xong* | Khách và quầy thấy đổi; các món khác cùng đơn **không** bị đổi theo | YC-VH-02 |
| **NT-BP-03** | Tắt một món vì hết nguyên liệu | Món biến khỏi thực đơn khách; khách đang có món đó trong giỏ **cũng không gửi được** | YC-VH-03 |
| **NT-BP-04** | Bật báo chậm chung khi bếp quá tải | Thời gian chờ hiện cho khách dài ra ở **mọi** bàn | YC-VH-04 |
| **NT-BP-05** | Huỷ một món **trước** khi nấu, và một món **sau** khi đã nấu | Báo cáo hao hụt phân biệt được hai trường hợp, chỉ tính giá vốn cho món thứ hai | YC-VH-13 |
| **NT-BP-06** | Tìm nút hoặc con số nào hiển thị tiền trên toàn màn bếp | **Không tìm thấy.** Bếp không thấy giá, không thấy tổng, không thấy doanh thu | YC-PCN-02 |
| **NT-BP-07** | Rút mạng máy bếp 30 giây rồi cắm lại | Tự nối lại, hiện đủ các đơn phát sinh trong lúc mất mạng | YC-PCN-01 |

### 10.3.3. Vai quầy

| Mã | Kịch bản | Đạt khi | Truy về |
|---|---|---|---|
| **NT-QU-01** | Mở màn quầy vào giờ cao điểm | Thấy **toàn bộ** bàn đang mở, bàn nào còn nợ tiền, bàn nào quá giờ — trên một màn | YC-VH-05 |
| **NT-QU-02** | Chốt hoá đơn một bàn, khách trả tiền mặt dư; bàn khác trả chuyển khoản | Tiền thối tính đúng; chuyển khoản xác nhận được; hoá đơn chuyển *Đã trả*; phiên bàn đóng | YC-VH-06 |
| **NT-QU-03** | Áp giảm giá vượt quá 50% tổng hoá đơn | Hệ thống **cắt xuống đúng trần** và vẫn chốt được hoá đơn, **không** từ chối cả hoá đơn | YC-VH-07 |
| **NT-QU-04** | Đổi điểm cho hoá đơn 1.000.000đ với khách có nhiều điểm | Giảm tối đa 200.000đ (trần tuyệt đối thắng trần 30%) | YC-VH-07, YC-KH-12 |
| **NT-QU-05** | Mở ca đầu giờ với tiền quỹ ban đầu; cuối ca đếm tiền mặt thật rồi nhập vào | Ghi đúng người mở ca và thời điểm; cuối ca hiện chênh lệch giữa *tiền phải có* và *tiền đếm được*, **không** tự làm tròn cho khớp | YC-VH-08 |
| **NT-QU-06** | Thử đóng phiên của một bàn **còn nợ tiền**, rồi ép đóng kèm lý do | Lần đầu **bị từ chối**, nêu rõ còn thiếu bao nhiêu; lần ép đóng ghi lại lý do và người thao tác | YC-VH-09 |
| **NT-QU-07** | Để một bàn còn nợ ngồi quá 4 giờ | Bàn **nổi lên** trên màn quầy để xử lý; **không** tự đóng | YC-VH-10 |
| **NT-QU-08** | Thử đổi giá một món từ màn quầy | **Không có chức năng đó.** Giá chỉ đổi được ở vai quản lý | YC-PCN-02 |
| **NT-QU-09** | Đang gõ dở số tiền khách đưa → đổi tab → quay lại | Số còn nguyên | YC-VH-12 |

> **NT-QU-09 dự kiến KHÔNG ĐẠT** — Phần 9, **KT-03**.

### 10.3.4. Vai quản lý

| Mã | Kịch bản | Đạt khi | Truy về |
|---|---|---|---|
| **NT-QL-01** | Thêm một món mới, đặt giá và giá vốn, gắn ảnh và nhóm món | Món hiện trên thực đơn khách trong vòng một lần tải trang | YC-QL-01 |
| **NT-QL-02** | Tăng giá một món, rồi mở lại hoá đơn hôm qua có món đó | Hoá đơn cũ giữ **giá cũ** | YC-QL-01, V19 |
| **NT-QL-03** | Bật/tắt một món theo tình trạng nguyên liệu từ màn quản lý | Có hiệu lực tức thì trên thực đơn khách | YC-QL-02 |
| **NT-QL-04** | Đặt một món chỉ bán buổi sáng, thử đặt món đó lúc chiều | **Bị từ chối**, thông báo nêu đúng khung giờ bán | YC-QL-03 |
| **NT-QL-05** | Đặt 5 suất chuẩn bị cho một món, cho khách đặt đủ 5 suất | Hệ thống trừ dần và **tự tắt** món khi hết suất | YC-QL-04 |
| **NT-QL-06** | Thêm một bàn mới, sinh mã QR, rồi xoay mã QR của một bàn đang dùng | Mã mới dùng được; **mã cũ hết tác dụng ngay** | YC-QL-05, YC-PCN-03 |
| **NT-QL-07** | Tạo một mã khuyến mãi theo %, một mã theo số tiền, cả hai có thời hạn | Áp đúng loại, hết hạn thì không dùng được | YC-QL-06 |
| **NT-QL-08** | Tạo mã ưu đãi giới hạn 10 lượt, cho 12 người cùng dùng | Đúng 10 người được giảm, 2 người còn lại bị từ chối | YC-QL-07, V32 |
| **NT-QL-09** | Cho một khách ăn đủ mức lên hạng, rồi tích điểm lần kế tiếp | Hạng lên đúng mốc; hệ số hạng mới được áp cho lần tích sau | YC-QL-08 |
| **NT-QL-10** | Xem báo cáo doanh thu một ngày, cộng tay tổng các hoá đơn ngày đó | Hai con số **bằng nhau**; đọc được món bán chạy | YC-QL-09 |
| **NT-QL-11** | Mở báo cáo doanh thu hôm nay, tìm mốc so với hôm qua | Có mốc so sánh ngay trên màn, không phải mở hai lần rồi trừ trong đầu | YC-QL-10 |
| **NT-QL-12** | Xem báo cáo hao hụt và thời gian phục vụ sau một ngày chạy thật | Đọc được: huỷ bao nhiêu phần, mất bao nhiêu tiền vốn, món nào huỷ nhiều nhất, giờ nào cao điểm | YC-QL-11, YC-QL-12 |
| **NT-QL-13** | Tạo tài khoản cho nhân viên mới, chọn vai quầy; sau đó đặt lại mật khẩu cho họ | Nhân viên đăng nhập được, vào đúng màn quầy, **không** vào được màn quản lý; mật khẩu mới dùng được | YC-NS-01, YC-NS-02, YC-NS-03 |
| **NT-QL-14** | Nhập sai mật khẩu nhiều lần liên tiếp | Tài khoản bị khoá tạm; quản lý mở khoá được | YC-NS-04 |
| **NT-QL-15** | Thử tự gỡ vai Quản lý của chính tài khoản mình | **Bị từ chối** — nếu cho phép, quán có thể mất sạch quyền quản trị | YC-NS-02 |
| **NT-QL-16** | Sau một ngày có tranh chấp tiền: tra xem ai đã áp giảm giá cho bàn 12 | Tra được ra tên người, thời điểm, số tiền — trên một màn | YC-NS-05, YC-NS-10 |

> **Hai kịch bản dự kiến KHÔNG ĐẠT:** **NT-QL-11** (chưa có mốc so kỳ trước — **KT-08**) và
> **NT-QL-16** (chưa có sổ nhật ký thao tác — **KT-06**). NT-QL-16 là phép thử quan trọng nhất của
> nhóm này, vì nó đúng bằng câu hỏi chủ quán nêu ở Phần 1 §1.1: *vì sao két lệch?*

### 10.3.5. Kịch bản sự cố

Đây là nhóm quan trọng nhất và hay bị bỏ qua nhất: nghiệm thu đường thẳng thì hệ thống nào cũng
qua, còn tiền mất ở đường vòng.

| Mã | Kịch bản | Đạt khi | Truy về |
|---|---|---|---|
| **NT-SC-01** | Bấm *Gửi bếp*, tắt wifi giữa chừng, bật lại, bấm *Gửi bếp* lần nữa | **Đúng một đơn** vào bếp, không phải hai | YC-PCN-01 |
| **NT-SC-02** | Hai nhân viên cùng quét QR mở phiên cho **một** bàn, gần như cùng lúc | Đúng một phiên được tạo; người kia nhận thông báo rõ ràng | V4 |
| **NT-SC-03** | Hai khách ở hai bàn cùng gọi **phần cuối cùng** của một món | Đúng một người đặt được; người kia nhận *"chỉ còn 0 phần"* | YC-QL-04, YC-VH-03 |
| **NT-SC-04** | Hai nhân viên cùng đổi điểm cho một khách, cùng lúc | Điểm chỉ bị trừ **một** lần | YC-KH-12, `RedeemConcurrencyTest` |
| **NT-SC-05** | Để một bàn còn nợ tiền vượt quá giờ hết hạn phiên | Phiên **không** tự đóng; được gia hạn; mốc quá hạn gốc vẫn giữ nguyên để đối soát | YC-VH-10, V17 |
| **NT-SC-06** | Hoàn tiền một hoá đơn đã tích điểm | Điểm đã cộng **bị trừ lại**; sổ điểm có dòng đối ứng, không xoá dòng cũ | YC-PCN-05 |
| **NT-SC-07** | Chốt một hoá đơn có số tiền lẻ, đối chiếu từng dòng với máy tính tay | Không lệch một đồng nào do làm tròn | YC-PCN-05 |
| **NT-SC-08** | Tắt backend, thao tác trên màn quầy | Thông báo **tiếng Việt** nói rõ mất kết nối; **không** hiện lỗi kỹ thuật tiếng Anh; không mất dữ liệu đang gõ | YC-PCN-07 |
| **NT-SC-09** | Chạy diễn tập khôi phục: dựng lại cơ sở dữ liệu từ bản sao lưu gần nhất trên `staging` | Khôi phục thành công, dữ liệu đúng tới thời điểm sao lưu | YC-PCN-06 |
| **NT-SC-10** | 30 bàn cùng gọi món trong vòng một phút | Màn bếp vẫn nhận đủ đơn và không chậm quá ngưỡng đã thoả thuận | YC-PCN-04 |

> **NT-SC-09 đạt được hôm nay**, bằng quy trình `thu-khoi-phuc.yml` mô tả ở Phần 7 §7.4 — nhưng
> chỉ đạt *khi có người bấm chạy*. Phép thử đúng nghĩa là chạy nó theo lịch, và đó là **KT-16**.
>
> **NT-SC-10 chưa làm được** vì chưa có công cụ tạo tải (**KT-17**). Đây là kịch bản duy nhất
> trong nhóm sự cố mà hệ thống hiện **không tự biết** mình đạt hay không — và nó lại là kịch bản
> mô tả đúng giờ cao điểm thứ Bảy của quán.

---

## 10.4. Tầng 3 — Năm phép thử tại chỗ

Bốn phép thử đầu làm xong trong 10 phút, **không cần công cụ, không cần tài khoản, không cần biết
lập trình**; phép thử thứ năm cần thêm 15 phút và một người chưa từng thấy hệ thống. Chúng bắt được thứ mà không phép kiểm tự động nào bắt được, vì vấn đề nằm ở
khoảng cách giữa màn hình và con người, không nằm trong mã.

| Phép thử | Vai | Làm thế nào | Đạt khi |
|---|---|---|---|
| **Đứng lùi 2 mét** | Bếp | Đặt máy tính bảng ở vị trí thật trong bếp, lùi lại hai bước, đọc | Đọc được tên món và số lượng mà **không nheo mắt** |
| **Đeo găng cao su chạm 20 lần** | Bếp | Đeo găng đang dùng thật, bấm 20 nút bất kỳ trên màn bếp | **Không lần nào** trúng nút bên cạnh |
| **Cắt ngang giữa chừng** | Quầy | Gõ dở số tiền khách đưa → đổi tab → quay lại | Số **còn nguyên** |
| **Đọc một con số** | Quản lý | Mở báo cáo, chỉ vào một con số bất kỳ | Nói được **ngay** nó tốt hay tệ so với hôm qua |

Bốn phép thử này không cho điểm từng phần. Đọc được hay không đọc được; trúng hay không trúng.

**Vì sao bốn phép thử này lại quan trọng ngang 53 lớp kiểm tự động.** Vì mỗi cái bắt một dạng hỏng
mà phần mềm không tự biết mình đang hỏng:

- *Đứng lùi 2 mét* — bếp không đọc được thì bếp sẽ đi hỏi, và hệ thống trở thành thứ làm chậm việc.
- *Đeo găng chạm 20 lần* — bấm nhầm ở màn bếp nghĩa là đổi trạng thái sai món, và khách nhận sai.
- *Cắt ngang giữa chừng* — mất dữ liệu khi bị cắt ngang dạy nhân viên **đừng tra cứu**, mà quầy
  không tra cứu thì quầy đoán, và quầy đoán thì két lệch.
- *Đọc một con số* — một con số không so được với gì thì không phải thông tin, chỉ là chữ số. Đây
  chính là **KT-08**, và nó được nêu thành phép thử vì đó là cách duy nhất để thấy nó thiếu.

Hai phép thử đầu hiện **chưa đạt** (**KT-02**), phép thứ ba **chưa đạt** (**KT-03**), phép thứ tư
**chưa đạt** (**KT-08**).

### Phép thử thứ năm — 15 phút

Chủ quán nêu một yêu cầu ở Phần 1 mà không phép kiểm nào ở trên chạm tới: **nhân viên mới dùng
được sau 15 phút hướng dẫn** (YC-PCN-08). Cách kiểm:

| Phép thử | Vai | Làm thế nào | Đạt khi |
|---|---|---|---|
| **Người mới, 15 phút** | Quầy hoặc bếp | Lấy một người chưa từng thấy hệ thống. Hướng dẫn đúng 15 phút rồi **im lặng đứng nhìn** | Người đó tự chốt được một hoá đơn, hoặc tự đưa được một đơn từ *Chờ* sang *Xong*, **không hỏi câu nào** |

Điều kiện "im lặng đứng nhìn" là phần quan trọng nhất và hay bị bỏ. Người hướng dẫn mà còn nói
thêm một câu thì phép thử hỏng, vì cái đang được kiểm là **màn hình**, không phải người hướng dẫn.

---

## 10.5. Dữ liệu dùng để nghiệm thu

Nghiệm thu trên cơ sở dữ liệu trống thì không thấy gì, nghiệm thu trên dữ liệu thật thì nguy hiểm.
Kho mã đã có quy trình nạp dữ liệu mẫu (`du-lieu-mau.yml`), và kế hoạch này dựa vào nó.

| Yêu cầu về dữ liệu nghiệm thu | Vì sao |
|---|---|
| Đủ 88 món thật, có giá và giá vốn | Báo cáo lãi lỗ và hao hụt chỉ có nghĩa khi giá vốn có thật |
| Ít nhất 30 bàn | Đúng quy mô quán; số bàn ít hơn giấu mất vấn đề danh sách dài |
| Hoá đơn của **nhiều ngày trước** | Không có lịch sử thì không kiểm được báo cáo, cũng không kiểm được NT-QL-02 |
| Vài hồ sơ tích điểm ở cả ba hạng | Hệ số hạng khác nhau, phải thấy khác nhau |
| **Không** chứa số điện thoại hay tên người thật | Dữ liệu nghiệm thu nằm trên máy chủ thử nghiệm, không được coi là kín |

---

## 10.6. Điều kiện ký nghiệm thu

Đề nghị chia hai mức, vì gộp làm một sẽ dẫn tới thoả hiệp ở phút chót.

**Mức A — Đủ điều kiện dùng thật.** Ký được khi:

1. **NT-SC-01 → NT-SC-09 đạt hết.** Không nhân nhượng — đây là nhóm giữ tiền. NT-SC-10 (tải 30
   bàn) được miễn ở mức A vì nó chờ **KT-17**, nhưng phải ghi rõ là *chưa kiểm*, không được ghi
   là *đạt*.
2. Toàn bộ nhóm **NT-QU** (quầy) đạt, trừ NT-QU-09 nếu **KT-03** chưa sửa.
3. Ít nhất 12/15 kịch bản **NT-KH**, với điều kiện **NT-KH-06** (tổng tiền khớp hai màn) và
   **NT-KH-15** (không xem được bàn khác) **bắt buộc** đạt — một cái giữ tiền, một cái giữ riêng
   tư, không cái nào đổi được.
4. Toàn bộ nhóm **NT-BP** (bếp) đạt về mặt chức năng, kể cả khi hai phép thử tại chỗ về màn hình
   bếp còn trượt.
5. Năm phép thử tại chỗ được **thực hiện và ghi kết quả**, kể cả khi trượt. Ghi nhận trung thực
   quan trọng hơn kết quả đẹp.
6. Đợt 1 của lộ trình Phần 9 đã hoàn thành.

**Mức B — Đủ điều kiện bàn giao.** Ký được khi thêm:

7. Đợt 2 của lộ trình Phần 9 hoàn thành, hoặc các mục còn lại được chủ quán chấp nhận hoãn **bằng
   văn bản, có nêu lý do**.
8. Sáu câu hỏi còn mở ở Phần 9 §9.7 đã có câu trả lời.
9. **NT-SC-10** (tải 30 bàn) đã chạy thật và đạt.
10. Diễn tập khôi phục (**NT-SC-09**) đã chạy ít nhất một lần **theo lịch tự động**, không phải do
    người bấm.
11. **NT-QL-16** (tra được ai đã làm gì) đạt — tức **KT-06** đã xong. Không có mục này thì mọi
    tranh chấp tiền về sau đều là lời kể.

---

## 10.7. Những gì kế hoạch này không kiểm được

Ghi rõ để không ai hiểu nhầm rằng "nghiệm thu xong là an toàn".

| Không kiểm được | Vì sao | Cần gì để kiểm |
|---|---|---|
| Hệ thống chịu được 30 bàn cùng gọi món | Chưa có phép thử tải | **KT-17** |
| Số liệu báo cáo đúng sau **nhiều tháng** dữ liệu | Dữ liệu nghiệm thu chỉ có vài ngày | Chạy thật một mùa rồi đối chiếu |
| Nhân viên **thật sự** dùng đúng khi quán đông | Kịch bản làm trong điều kiện yên tĩnh | Quan sát tại chỗ giờ cao điểm, tuần đầu |
| Ai đã làm gì khi có tranh chấp tiền | Chưa có sổ nhật ký thao tác | **KT-06** |
| Hệ thống hỏng lúc nửa đêm có ai biết không | Chưa có cảnh báo | **KT-09** |
| Ước lượng thời gian chờ có sát thực tế không | Số hiện tại là phỏng đoán, chưa đo | **KT-10** |

Sáu dòng trên đều trỏ về Phần 9. Đó là chủ ý: **mỗi thứ kế hoạch nghiệm thu không kiểm được đều
phải có một hạng mục trong lộ trình chịu trách nhiệm.** Không có dòng nào để trống.

---

**Phần tiếp theo:** [Phần 11 — Bảng truy vết yêu cầu](11-BANG-TRUY-VET.md)
