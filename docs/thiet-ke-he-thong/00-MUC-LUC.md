# Tài liệu Thiết kế Hệ thống Quản lý Nhà hàng có Đặt món bằng QR

**Mã tài liệu:** TKHT-CMC-2026
**Phiên bản:** 1.0
**Ngày lập:** 2026-09-19
**Bên đặt hàng:** Chủ nhà hàng (xem Phần 1 — lời đặt hàng)
**Bên thiết kế:** Nhóm thực hiện đồ án

---

## 0.1. Tài liệu này là gì

Đây là tài liệu thiết kế hệ thống, viết theo trình tự của một dự án thật: **bên khách hàng nêu bài
toán trước, bên thiết kế trả lời sau, và mỗi câu trả lời phải truy ngược được về một yêu cầu có mã
số.**

Tài liệu không mô tả một hệ thống tưởng tượng. Mọi cấu trúc dữ liệu, mọi endpoint, mọi quy tắc
nghiệp vụ nêu ở đây đều đối chiếu được với mã nguồn đang chạy. Những chỗ hệ thống **chưa** đáp ứng
được yêu cầu của chủ quán đều được đánh dấu rõ bằng nhãn `[THIẾU]` và gom lại thành lộ trình ở
Phần 9 — đó là phần trung thực nhất của tài liệu, và cũng là phần đáng thảo luận nhất.

## 0.2. Viết cho ai

| Người đọc | Nên đọc phần nào |
|---|---|
| Người duyệt/chấm chỉ có 10 phút | Phần 1 (§1.3 bảng yêu cầu), Phần 9 (khoảng trống), Phần 11 (bảng truy vết) |
| Người muốn hiểu nghiệp vụ | Phần 1 → 2 → 3 → 4 → 5 |
| Người muốn hiểu kỹ thuật | Phần 6 (dữ liệu) → 7 (kiến trúc) → 8 (phi chức năng) |
| Người sẽ nghiệm thu | Phần 10, rồi Phần 12 §12.10 (việc nào phải xong trước khi ký) |
| Người sẽ làm tiếp | Phần 9 → **Phần 12** |

## 0.3. Mục lục

| Phần | Tên | Nội dung |
|---|---|---|
| [1](01-YEU-CAU-CHU-QUAN.md) | **Lời đặt hàng của chủ nhà hàng** | Bài toán kinh doanh, ràng buộc, phạm vi, tiêu chí thành công. Viết bằng giọng của bên đặt hàng |
| [2](02-TAC-NHAN-VA-PHAN-QUYEN.md) | **Tác nhân và phân quyền** | 5 vai, ma trận quyền, mô hình định danh, vì sao khách không cần tài khoản |
| [3](03-NGHIEP-VU-DAT-MON.md) | **Nghiệp vụ đặt món bằng QR** | Vòng đời bữa ăn: quét QR → phiên bàn → giỏ → lượt đặt → trạng thái món |
| [4](04-NGHIEP-VU-VAN-HANH.md) | **Nghiệp vụ vận hành** | Bếp, quầy, hoá đơn bàn, thanh toán, ca quầy, đối soát tiền |
| [5](05-NGHIEP-VU-QUAN-LY.md) | **Nghiệp vụ quản lý** | Thực đơn, khuyến mãi, tích điểm, báo cáo, **quản lý nhân sự** |
| [6](06-MO-HINH-DU-LIEU.md) | **Mô hình dữ liệu** | Sơ đồ thực thể, từ điển dữ liệu, bất biến, chiến lược migration |
| [7](07-KIEN-TRUC-HE-THONG.md) | **Kiến trúc hệ thống** | Phân tầng, 12 module, 97 endpoint, realtime, triển khai |
| [8](08-YEU-CAU-PHI-CHUC-NANG.md) | **Yêu cầu phi chức năng** | Bảo mật, hiệu năng, độ tin cậy, khả năng vận hành, pháp lý |
| [9](09-KHOANG-TRONG-VA-LO-TRINH.md) | **Khoảng trống và lộ trình** | Những gì hệ thống còn thiếu so với nghiệp vụ thật, xếp theo thứ tự ưu tiên |
| [10](10-NGHIEM-THU.md) | **Kế hoạch kiểm thử và nghiệm thu** | Kịch bản nghiệm thu theo vai, phép thử tại chỗ, tiêu chí đạt |
| [11](11-BANG-TRUY-VET.md) | **Bảng truy vết yêu cầu** | Mỗi yêu cầu ↔ thiết kế ↔ nơi cài đặt ↔ phép kiểm |
| [12](12-DANH-SACH-CONG-VIEC.md) | **Danh sách công việc cần làm** | 43 việc có người nhận, đầu ra cụ thể và phép kiểm đóng — chia theo đợt và theo mức ký nghiệm thu |

## 0.4. Quy ước đánh mã

| Tiền tố | Nghĩa | Ví dụ |
|---|---|---|
| `YC-KH-nn` | Yêu cầu phía **khách ăn** | YC-KH-03 — gọi thêm món giữa bữa |
| `YC-VH-nn` | Yêu cầu **vận hành** (bếp, quầy) | YC-VH-05 — đối soát tiền cuối ca |
| `YC-QL-nn` | Yêu cầu **quản lý** (thực đơn, doanh thu) | YC-QL-02 — tắt món hết hàng tức thì |
| `YC-NS-nn` | Yêu cầu **nhân sự** | YC-NS-04 — chấm công theo ca |
| `YC-PCN-nn` | Yêu cầu **phi chức năng** | YC-PCN-01 — không mất tiền khi mạng chập chờn |

Trạng thái đáp ứng, ghi cạnh mỗi yêu cầu:

| Nhãn | Nghĩa |
|---|---|
| `[ĐỦ]` | Hệ thống hiện tại đáp ứng đầy đủ, có mã và có phép kiểm |
| `[MỘT PHẦN]` | Có cài đặt nhưng còn lỗ hổng đã biết, nêu rõ lỗ hổng ở chỗ đó |
| `[THIẾU]` | Chưa có gì. Đưa vào lộ trình Phần 9 |

Mã hạng mục lộ trình:

| Tiền tố | Nghĩa | Ví dụ |
|---|---|---|
| `KT-nn` | **Khoảng trống** — việc còn thiếu, còn sai, hoặc món nợ kỹ thuật | KT-18 — ghi chú món rơi mất giữa giỏ và lượt đặt |
| `NS-n` | Ba **thiết kế nhân sự** đề xuất ở Phần 5 §5.4 | NS-1 — sổ nhật ký thao tác |
| `NT-<vai>-nn` | **Kịch bản nghiệm thu** ở Phần 10 | NT-QU-06 — thử đóng bàn còn nợ tiền |

Mã công việc ở Phần 12:

| Tiền tố | Nghĩa | Ví dụ |
|---|---|---|
| `CV-QD-n` | **Quyết định** chủ quán phải đưa ra, chặn việc lập trình | CV-QD-01 — quán có xuất hoá đơn VAT không |
| `CV-S-nn` | **Sửa lỗi** | CV-S-01 — ghi chú món phải tới được bếp |
| `CV-B-nn` | **Bổ sung** nghiệp vụ chưa từng có | CV-B-02 — sổ nhật ký thao tác |
| `CV-N-nn` | **Trả nợ** kỹ thuật | CV-N-04 — xoá vai `Staff` khỏi mã |
| `CV-TK-nn` | Hoàn thiện **tài liệu thiết kế** | CV-TK-02 — thiết kế chi tiết VAT và phí phục vụ |
| `CV-NT-nn` | Hoàn thiện **nghiệm thu** | CV-NT-01 — viết 11 kịch bản còn thiếu |

> **Sáu yêu cầu không có trong bảng chủ quán ký.** Chủ quán nêu 57 yêu cầu ở Phần 1. Khi đối
> chiếu hệ thống với một ngày làm việc thật, bên thiết kế thêm 6 yêu cầu nữa — **YC-KH-14,
> YC-VH-14, YC-VH-15, YC-QL-14, YC-QL-15, YC-PCN-09** — nêu ở [Phần 9 §9.2](09-KHOANG-TRONG-VA-LO-TRINH.md).
> Tổng 63 yêu cầu, truy vết đầy đủ ở [Phần 11](11-BANG-TRUY-VET.md).

## 0.5. Nguồn đối chiếu

Tài liệu này không tự khai số liệu. Các con số dưới đây **sinh từ mã nguồn** bằng
`docs/build_system_facts.py` và `docs/build_api_inventory.py`, có cổng CI đối chiếu:

| Số đo | Giá trị tại ngày lập |
|---|---:|
| Module backend | 12 |
| Endpoint HTTP | 97 |
| Migration cơ sở dữ liệu | 40 |
| Thực thể JPA | 23 |
| Ứng dụng frontend | 5 web + 1 mobile |
| Bất biến nghiệp vụ đã phát biểu | 61 (V1–V61 trong `SPEC.md`) |
| Lỗi đã ghi nhận và xử lý | 80 (B1–B80 trong `SPEC.md`) |

Những mục **không** sinh tự động — ý nghĩa nghiệp vụ, quy tắc phân quyền, đánh giá khoảng trống —
là phần do người viết chịu trách nhiệm, và máy không kiểm được. Khi hai bên mâu thuẫn, **mã nguồn
đúng, tài liệu sai.**

## 0.6. Tài liệu liên quan trong kho mã

| Tệp | Vai trò |
|---|---|
| `SPEC.md` | Đặc tả nén: mục tiêu, ràng buộc, 61 bất biến, nhật ký 80 lỗi |
| `docs/THIET_KE_NGHIEP_VU.md` | Tài liệu nghiệp vụ gốc, chi tiết hơn về lý do từng quyết định |
| `docs/backend/ARCHITECTURE.md` | Kiến trúc backend, phần bảng module sinh từ mã |
| `docs/backend/API_CONTRACT.md` | Hợp đồng API, phần kiểm kê endpoint sinh từ mã |
| `docs/backend/DATABASE.md` | Lược đồ cơ sở dữ liệu và danh sách migration |

Tài liệu bạn đang đọc **tổng hợp** các nguồn trên theo góc nhìn "khách hàng đặt hàng → bên thiết kế
trả lời", chứ không thay thế chúng.
