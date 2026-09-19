# CMC Restaurant — chỉ mục tài liệu

**31 tài liệu**, nhóm theo mục đích. Trang này **được SINH RA** bởi
`docs/build_docs_index.py` từ chính các tệp có thật — nên nó không thể trỏ vào tệp không
tồn tại, và không thể bỏ sót tệp mới.

> Vì sao sinh chứ không viết tay: bản chỉ mục viết tay của `docs/archive/` từng khai đã
> chuyển 7 tệp vào đó trong khi thư mục rỗng, còn trang này thì chỉ trỏ tới 11/37 tài liệu.
> Văn xuôi kể lại trạng thái thư mục thì luôn trôi khỏi thư mục.

Thêm tài liệu mới: đặt đúng thư mục rồi chạy `python docs/build_docs_index.py`.

## Bắt đầu ở đây

| Tài liệu | Nội dung |
|---|---|
| [README.md](../README.md) | README |
| [SPEC.md](../SPEC.md) | CMC Restaurant QR Ordering |
| [CONTEXT.md](../CONTEXT.md) | Restaurant Table Ordering |
| [CHANGELOG.md](../CHANGELOG.md) | Changelog |

## Kiến trúc và hợp đồng

| Tài liệu | Nội dung |
|---|---|
| [API_CONTRACT.md](backend/API_CONTRACT.md) | Hop Dong API - CMC Restaurant |
| [ARCHITECTURE.md](backend/ARCHITECTURE.md) | Kiến trúc backend |
| [DATABASE.md](backend/DATABASE.md) | Database Setup Guide |
| [KHUON_BAO_CAO.md](bao-cao/KHUON_BAO_CAO.md) | BÁO CÁO BÀI TẬP LỚN |
| [cau-hinh-firebase-sepay.md](cau-hinh-firebase-sepay.md) | Cấu hình Firebase, Google và SePay |
| [DAC_TA_THIET_KE_VAN_HANH.md](DAC_TA_THIET_KE_VAN_HANH.md) | Đặc tả thiết kế lại giao diện vận hành |
| [PIPELINE_AND_DEPLOY.md](devops/PIPELINE_AND_DEPLOY.md) | CI/CD, triển khai và vận hành |
| [OPS_APP.md](frontend/OPS_APP.md) | Ứng dụng vận hành — workspace và quầy |
| [KE_HOACH_GIAO_DIEN.md](KE_HOACH_GIAO_DIEN.md) | Kế hoạch làm lại giao diện |
| [PHAN_TICH_HE_THONG.md](PHAN_TICH_HE_THONG.md) | Phân tích thiết kế hệ thống — CMC Restaurant QR |
| [KE_HOACH_HOC_KY_2026-2.md](pm/KE_HOACH_HOC_KY_2026-2.md) | Kế hoạch học kỳ 2026-2 — fork cá nhân CMC Restaurant |
| [00-MUC-LUC.md](thiet-ke-he-thong/00-MUC-LUC.md) | Tài liệu Thiết kế Hệ thống Quản lý Nhà hàng có Đặt món bằng QR |
| [01-YEU-CAU-CHU-QUAN.md](thiet-ke-he-thong/01-YEU-CAU-CHU-QUAN.md) | Phần 1 — Lời đặt hàng của chủ nhà hàng |
| [02-TAC-NHAN-VA-PHAN-QUYEN.md](thiet-ke-he-thong/02-TAC-NHAN-VA-PHAN-QUYEN.md) | Phần 2 — Tác nhân và phân quyền |
| [03-NGHIEP-VU-DAT-MON.md](thiet-ke-he-thong/03-NGHIEP-VU-DAT-MON.md) | Phần 3 — Nghiệp vụ đặt món bằng QR |
| [04-NGHIEP-VU-VAN-HANH.md](thiet-ke-he-thong/04-NGHIEP-VU-VAN-HANH.md) | Phần 4 — Nghiệp vụ vận hành: bếp, quầy, tiền |
| [05-NGHIEP-VU-QUAN-LY.md](thiet-ke-he-thong/05-NGHIEP-VU-QUAN-LY.md) | Phần 5 — Nghiệp vụ quản lý: thực đơn, khuyến mãi, khách quen, báo cáo, nhân sự |
| [06-MO-HINH-DU-LIEU.md](thiet-ke-he-thong/06-MO-HINH-DU-LIEU.md) | Phần 6 — Mô hình dữ liệu |
| [07-KIEN-TRUC-HE-THONG.md](thiet-ke-he-thong/07-KIEN-TRUC-HE-THONG.md) | Phần 7 — Kiến trúc hệ thống |
| [08-YEU-CAU-PHI-CHUC-NANG.md](thiet-ke-he-thong/08-YEU-CAU-PHI-CHUC-NANG.md) | Phần 8 — Yêu cầu phi chức năng |
| [09-KHOANG-TRONG-VA-LO-TRINH.md](thiet-ke-he-thong/09-KHOANG-TRONG-VA-LO-TRINH.md) | Phần 9 — Khoảng trống và lộ trình |
| [10-NGHIEM-THU.md](thiet-ke-he-thong/10-NGHIEM-THU.md) | Phần 10 — Kế hoạch kiểm thử và nghiệm thu |
| [11-BANG-TRUY-VET.md](thiet-ke-he-thong/11-BANG-TRUY-VET.md) | Phần 11 — Bảng truy vết yêu cầu |
| [12-DANH-SACH-CONG-VIEC.md](thiet-ke-he-thong/12-DANH-SACH-CONG-VIEC.md) | Phần 12 — Danh sách công việc cần làm |
| [THIET_KE_NGHIEP_VU.md](THIET_KE_NGHIEP_VU.md) | Thiết kế nghiệp vụ — CMC Restaurant |
| [trien-khai-may-chu.md](trien-khai-may-chu.md) | Triển khai lên máy chủ |

## Quy trình nhóm

| Tài liệu | Nội dung |
|---|---|
| [GIT_AND_TEAM.md](devops/GIT_AND_TEAM.md) | Quy trình Git và làm việc nhóm |
