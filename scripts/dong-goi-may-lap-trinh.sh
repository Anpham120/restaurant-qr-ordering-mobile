#!/usr/bin/env bash
#
# Đóng gói những thứ MÁY LẬP TRÌNH có mà kho mã KHÔNG có, để dựng lại môi trường trên máy khác.
#
# Chạy ở thư mục gốc kho mã:
#
#     bash scripts/dong-goi-may-lap-trinh.sh
#
# ---------------------------------------------------------------------------------------------
# KHÁC VỚI `deploy/scripts/dong-goi-chuyen-may.sh`
#
# Kịch bản kia đóng gói MÁY CHỦ: cơ sở dữ liệu production và staging, thứ mất là mất hẳn. Kịch
# bản này đóng gói MÁY LẬP TRÌNH, và gần như mọi thứ ở đây đều dựng lại được — trừ đúng ba tệp.
#
# ---------------------------------------------------------------------------------------------
# CÁI GÌ CẦN MANG
#
#   mobile-rn/google-services.json   cấu hình Firebase cho app Android. Bị `.gitignore` chặn vì
#                                    kho mã CÔNG KHAI. Thiếu nó thì không dựng được APK.
#   deploy/.env                      biến môi trường để chạy docker-compose tại máy. CHỨA BÍ MẬT:
#                                    mật khẩu cơ sở dữ liệu, khoá ký JWT, token thanh toán.
#   ~/.ssh/cmc-deploy-2026           khoá SSH vào máy chủ triển khai. Không có thì không xem được
#                                    log hay cơ sở dữ liệu trên máy chủ.
#
# ---------------------------------------------------------------------------------------------
# CÁI GÌ KHÔNG MANG, và vì sao
#
#   node_modules/        `npm ci` dựng lại, và bản cài trên Windows KHÁC bản cài trên Linux
#   mobile-rn/android/   `npx expo prebuild` sinh lại
#   tools/runtime/       bộ công cụ tải về, tải lại được
#   build/ dist/ .gradle/ __pycache__/   đều là kết quả dựng
#   chứng chỉ, cấu hình nginx, secrets của CI   nằm trên máy chủ hoặc trong GitHub, không ở đây
#
# TỆP GÓI RA CHỨA BÍ MẬT. Đừng commit, đừng gửi qua chat, đừng đẩy lên đâu cả. Chép thẳng bằng USB
# hoặc `scp`, rồi xoá sau khi dùng xong.
set -euo pipefail

if [ ! -d .git ]; then
  echo "Phải chạy ở thư mục gốc kho mã." >&2
  exit 1
fi

# Ghi ra NGOÀI kho mã. Ghi vào trong là một ngày nào đó có người `git add -A` và đẩy bí mật lên
# một kho công khai.
dau_ra="${HOME}/cmc-may-lap-trinh-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${dau_ra}"

echo "==> Gói vào ${dau_ra}"

thieu=0
chep() {
  local nguon="$1" dich="$2"
  if [ -f "${nguon}" ]; then
    mkdir -p "${dau_ra}/$(dirname "${dich}")"
    cp "${nguon}" "${dau_ra}/${dich}"
    echo "    có   ${dich}"
  else
    echo "    THIẾU ${dich}  (${nguon})"
    thieu=$((thieu + 1))
  fi
}

chep "mobile-rn/google-services.json" "mobile-rn/google-services.json"
chep "deploy/.env" "deploy/.env"
chep "${HOME}/.ssh/cmc-deploy-2026" "ssh/cmc-deploy-2026"
chep "${HOME}/.ssh/cmc-deploy-2026.pub" "ssh/cmc-deploy-2026.pub"

# Ghi lại ĐỊA CHỈ kho mã để máy mới clone đúng chỗ. Dự án này có hai remote và chỉ một cái được
# dùng để đẩy — nhầm chỗ là đẩy vào kho của nhóm.
git remote -v > "${dau_ra}/git-remote.txt"
git rev-parse --abbrev-ref HEAD > "${dau_ra}/nhanh-dang-o.txt"

cat > "${dau_ra}/DOC-TRUOC.md" <<'HUONGDAN'
# Dựng lại môi trường trên máy mới

## 1. Cài công cụ

- **Docker Desktop** — bắt buộc. Máy này không cài JDK, Python hay Android SDK; mọi thứ cần
  chúng đều chạy trong container.
- **Node 20** — để chạy test và dựng frontend.
- **Git**.

## 2. Lấy kho mã

Xem `git-remote.txt` để biết địa chỉ. Có HAI remote:

- `personal` — kho cá nhân, là nơi DUY NHẤT được đẩy lên.
- `origin` — kho khác, **không đẩy vào đây**.

Nhánh đang làm việc ghi trong `nhanh-dang-o.txt`.

## 3. Chép ba tệp không nằm trong kho mã

Từ gói này, chép về đúng chỗ:

    mobile-rn/google-services.json  ->  <kho mã>/mobile-rn/google-services.json
    deploy/.env                     ->  <kho mã>/deploy/.env
    ssh/cmc-deploy-2026             ->  ~/.ssh/cmc-deploy-2026
    ssh/cmc-deploy-2026.pub         ->  ~/.ssh/cmc-deploy-2026.pub

Khoá SSH phải đúng quyền, nếu không OpenSSH từ chối dùng:

    chmod 600 ~/.ssh/cmc-deploy-2026

## 4. Cài phụ thuộc

    cd frontend && npm ci
    cd ../mobile-rn && npm ci

`node_modules` KHÔNG mang theo được: bản cài trên Windows khác bản cài trên Linux, và vài gói có
mã máy riêng cho từng hệ điều hành.

## 5. Kiểm tra máy mới chạy được

    cd frontend && npm test && npm run build
    cd ../mobile-rn && npm test

Backend không có JDK tại máy, chạy trong container:

    docker run --rm -v "$PWD:/repo" -w /repo/backend-java gradle:8.10.2-jdk21 \
      gradle --console=plain checkstyleMain test --tests '*LichPhucVu*'

Kiểm khoá SSH vào được máy chủ:

    ssh -i ~/.ssh/cmc-deploy-2026 root@<địa chỉ máy chủ> 'echo OK'

## 6. Dựng APK

Thư mục `mobile-rn/android/` không mang theo. Sinh lại:

    cd mobile-rn && npx expo prebuild --platform android

Rồi dựng trong container. Xem lại kịch bản dựng đã dùng ở máy cũ nếu còn giữ.

**Lưu ý bộ nhớ:** máy cũ chỉ có 7,6 GB RAM nên bản dựng phải khoá container xuống 3 nhân, nếu
không ninja sinh một trình biên dịch C++ cho mỗi nhân và tiến trình Gradle bị hệ điều hành giết vì
hết bộ nhớ. Máy mới nhiều RAM hơn thì bỏ giới hạn đó đi cho nhanh.

## 7. Xoá gói này

Nó chứa mật khẩu cơ sở dữ liệu, khoá ký JWT, token thanh toán và khoá SSH. Xoá sau khi dựng xong.
HUONGDAN

echo
echo "==> Nén lại"
tar -C "$(dirname "${dau_ra}")" -czf "${dau_ra}.tar.gz" "$(basename "${dau_ra}")"
rm -rf "${dau_ra}"
ls -lh "${dau_ra}.tar.gz" | awk '{print "    " $5, $9}'

echo
if [ "${thieu}" -gt 0 ]; then
  echo "!! THIẾU ${thieu} tệp — xem danh sách ở trên. Máy mới sẽ dựng được nhưng không đủ chức năng."
fi
echo "!! TỆP NÀY CHỨA BÍ MẬT. Chép bằng USB hoặc scp, đừng gửi qua chat, xoá sau khi dùng."
