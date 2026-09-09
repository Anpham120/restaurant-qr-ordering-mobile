#!/usr/bin/env bash
# DỮ LIỆU MẪU CHO BÁO CÁO HAO HỤT — chạy qua API THẬT, không chèn thẳng vào cơ sở dữ liệu.
#
# VÌ SAO KHÔNG DÙNG SQL: chèn thẳng vài hàng vào `order_items` sẽ tạo ra dữ liệu trông đúng mà
# không chứng minh được gì. Thứ cần chứng minh là ĐƯỜNG ĐI: đặt món có chụp giá vốn không, huỷ món
# có ghi trạng thái cũ không, báo cáo có cộng đúng không. Chỉ có gọi API thật mới trả lời được, và
# nếu một mắt xích hỏng thì script này hỏng theo — đó là điểm của nó.
#
# CHỈ CHẠY TRÊN STAGING. Bài này tạo đơn giả và huỷ món giả; làm thế trên dữ liệu thật là làm bẩn
# sổ sách của quán.
set -euo pipefail

required_vars=(DEPLOY_ENV API_BASE_URL ADMIN_EMAIL ADMIN_PASSWORD)
for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Thiếu biến bắt buộc: ${var_name}" >&2
    exit 1
  fi
done

if [ "$DEPLOY_ENV" = "production" ]; then
  echo "Từ chối tạo dữ liệu mẫu trên production." >&2
  exit 1
fi

api="${API_BASE_URL%/}"

goi() {
  # $1 phương thức, $2 đường dẫn, $3 thân (có thể rỗng), $4.. thêm header
  local pt="$1" duong="$2" than="${3:-}"
  shift 3 || true
  if [ -n "$than" ]; then
    curl -fsS -X "$pt" "${api}${duong}" -H 'Content-Type: application/json' "$@" -d "$than"
  else
    curl -fsS -X "$pt" "${api}${duong}" "$@"
  fi
}

# `jq` có sẵn trên runner của GitHub. Không tự viết bộ tách JSON bằng sed: một dấu ngoặc trong tên
# món là đủ để nó trả về rác, và rác đó sẽ đi tiếp vào các lời gọi sau.
command -v jq >/dev/null || { echo "Cần jq." >&2; exit 1; }

echo "=== 1/6  Đăng nhập quản trị ==="
token="$(goi POST /api/auth/login \
  "{\"identifier\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" | jq -r '.accessToken')"
[ -n "$token" ] && [ "$token" != "null" ] || { echo "Không lấy được token." >&2; exit 1; }
auth=(-H "Authorization: Bearer ${token}")
echo "OK"

echo "=== 2/6  Nhập giá vốn cho 3 món ==="
# Giá vốn ƯỚC LƯỢNG, chỉ để thấy phép tính chạy. KHÔNG phải giá nguyên liệu thật của quán — con số
# thật phải do người biết bếp nhập. Đặt ~35% giá bán, một tỉ lệ thô cho món ăn tại chỗ.
mon_json="$(goi GET /api/admin/menu-items '' "${auth[@]}")"
ids="$(printf '%s' "$mon_json" | jq -r '[.[] | select(.isAvailable)] | .[0:3] | .[].id')"
[ -n "$ids" ] || { echo "Không có món nào đang bán." >&2; exit 1; }

for id in $ids; do
  cu="$(printf '%s' "$mon_json" | jq -c --arg id "$id" '.[] | select(.id == $id)')"
  gia="$(printf '%s' "$cu" | jq -r '.price')"
  von="$(awk -v p="$gia" 'BEGIN { printf "%.0f", p * 0.35 }')"
  than="$(printf '%s' "$cu" | jq -c --argjson von "$von" \
    '{categoryId, name, description, price, imageUrl, isAvailable, tags, prepMinutes, costPrice: $von}')"
  goi PUT "/api/admin/menu-items/${id}" "$than" "${auth[@]}" >/dev/null
  echo "  $(printf '%s' "$cu" | jq -r '.name'): giá bán ${gia} -> giá vốn ${von}"
done

echo "=== 3/6  Mở phiên bàn ==="
ban="$(goi GET /api/admin/tables '' "${auth[@]}" | jq -r '.items[0].tableCode')"
[ -n "$ban" ] && [ "$ban" != "null" ] || { echo "Không có bàn nào." >&2; exit 1; }
phien="$(goi POST /api/table-sessions "{\"orderType\":\"DineIn\",\"tableCode\":\"${ban}\"}")"
phien_id="$(printf '%s' "$phien" | jq -r '.sessionId')"
phien_token="$(printf '%s' "$phien" | jq -r '.tableSessionToken')"
echo "  bàn ${ban}, phiên ${phien_id}"

echo "=== 4/6  Đặt món ==="
dat_items="$(printf '%s\n' $ids | jq -R . | jq -s '[.[] | {menuItemId: ., quantity: 1}]' -c)"
don="$(goi POST /api/orders \
  "{\"orderType\":\"DineIn\",\"tableCode\":\"${ban}\",\"tableSessionId\":\"${phien_id}\",\"items\":${dat_items}}" \
  -H "X-Table-Session-Token: ${phien_token}")"
ma_don="$(printf '%s' "$don" | jq -r '.orderCode')"
echo "  đơn ${ma_don}, $(printf '%s' "$don" | jq -r '.items | length') món"

echo "=== 5/6  Một món vào bếp rồi bị huỷ, một món huỷ lúc còn chờ ==="
mon_1="$(printf '%s' "$don" | jq -r '.items[0].orderItemId')"
mon_2="$(printf '%s' "$don" | jq -r '.items[1].orderItemId')"

# Món 1: Pending -> Preparing -> Cancelled. Đây là ca HAO HỤT: bếp đã bắt tay vào.
goi PATCH "/api/orders/${ma_don}/items/${mon_1}/status" '{"status":"Preparing"}' "${auth[@]}" >/dev/null
goi PATCH "/api/orders/${ma_don}/items/${mon_1}/status" '{"status":"Cancelled"}' "${auth[@]}" >/dev/null
echo "  ${mon_1}: Preparing -> Cancelled  (hao hụt)"

# Món 2: Pending -> Cancelled. Không mất gì.
goi PATCH "/api/orders/${ma_don}/items/${mon_2}/status" '{"status":"Cancelled"}' "${auth[@]}" >/dev/null
echo "  ${mon_2}: Pending -> Cancelled  (không hao hụt)"

echo "=== 6/6  Đọc lại báo cáo ==="
tu="$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"
den="$(date -u -d '1 hour' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"
bao_cao="$(goi GET "/api/admin/reports/summary?from=${tu}&to=${den}" '' "${auth[@]}")"
printf '%s' "$bao_cao" | jq '.waste'

dang_nau="$(printf '%s' "$bao_cao" | jq -r '.waste.huyKhiDangNau')"
gia_von="$(printf '%s' "$bao_cao" | jq -r '.waste.giaVonHuyKhiDangNau')"

# Không chỉ in ra rồi thôi: KIỂM. Một script "chạy xong" mà số vẫn 0 thì nó chứng minh điều ngược
# lại với thứ nó định chứng minh.
if [ "$dang_nau" -lt 1 ]; then
  echo "HỎNG: báo cáo đếm ${dang_nau} món huỷ lúc đang nấu, đáng lẽ ít nhất 1." >&2
  exit 1
fi
if [ "$(awk -v v="$gia_von" 'BEGIN { print (v > 0) ? 1 : 0 }')" != "1" ]; then
  echo "HỎNG: giá vốn hao hụt là ${gia_von} — giá vốn vừa nhập không đi vào đơn." >&2
  exit 1
fi

echo
echo "ĐẠT: hao hụt ${dang_nau} món, giá vốn ${gia_von}đ — cả đường chụp giá vốn lẫn đường ghi"
echo "     trạng thái huỷ đều chạy."
