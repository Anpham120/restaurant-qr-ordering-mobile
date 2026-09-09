#!/usr/bin/env bash
set -euo pipefail

# Ghi chú này phải nằm NGOÀI mảng.  DeploymentConfigTest (backend-java) đọc khối
# required_vars và tách theo khoảng trắng để kiểm .github/workflows/cd.yml có cấp đủ mọi tên hay
# không, nên một ghi chú nằm TRONG ngoặc sẽ thành danh sách tên biến giả — bash bỏ qua, phép kiểm
# đó thì không.
#
# Ghi chú cũ trỏ tới frontend/src/utils/deploymentWorkflowEnv.test.ts. Tệp đó không còn tồn tại
# trong repo này; luật được dựng lại ở DeploymentConfigTest.theWorkflowSuppliesEveryRequiredVariable.
required_vars=(
  DEPLOY_ENV
  SSH_HOST
  SSH_USER
  SSH_KEY
  COMPOSE_PROJECT_NAME
  FRONTEND_PORT
  BACKEND_PORT
  POSTGRES_PORT
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  FRONTEND_SERVER_NAMES
  API_SERVER_NAME
  PUBLIC_API_BASE_URL
  JWT_SIGNING_KEY
  CORS_ALLOWED_ORIGINS
  PAYMENTS_VIETQR_BANKID
  PAYMENTS_VIETQR_ACCOUNTNUMBER
  PAYMENTS_VIETQR_ACCOUNTNAME
  PAYMENTS_SEPAY_APIKEY
  FIREBASE_API_KEY
  FIREBASE_PROJECT_ID
  GOOGLE_CLIENT_ID
)
# Mọi tên liên quan tới trợ lý AI đã ra khỏi danh sách cùng với chính trợ lý. Nguyên tắc giữ lại:
# đòi một biến không mô-đun nào đọc là dựng một cái bẫy — deploy DỪNG vì thiếu thứ không có tác
# dụng gì, và người sửa phải đi tìm hiểu một biến đã chết để biết nên đặt giá trị nào.

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required variable: ${var_name}" >&2
    exit 1
  fi
done

root_dir="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Đặt ra work_dir, key_file, known_hosts_file, ssh_base[], scp_base[]. Dùng chung với
# `rollback-tu-xa.sh` — xem ghi chú trong chính lib-ssh.sh về lý do không chép đôi.
# shellcheck source=deploy/scripts/lib-ssh.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-ssh.sh"

tarball="${work_dir}/release.tgz"

tar -C "$root_dir" \
  --exclude='.git' \
  --exclude='.playwright-cli' \
  --exclude='tmp' \
  --exclude='**/node_modules' \
  --exclude='**/dist' \
  --exclude='**/bin' \
  --exclude='**/obj' \
  --exclude='*.log' \
  -czf "$tarball" .

remote_root="/opt/cmc-restaurant/${DEPLOY_ENV}"

"${ssh_base[@]}" "mkdir -p '${remote_root}' '${remote_root}/reports' '${remote_root}/backups'"
"${scp_base[@]}" "$tarball" "${SSH_USER}@${SSH_HOST}:${remote_root}/release.tgz"

env_quote() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//\$/\\$}"
  value="${value//\`/\\\`}"
  printf '"%s"' "$value"
}

env_file="${work_dir}/deploy.env"
cat > "$env_file" <<EOF
DEPLOY_ENV=$(env_quote "$DEPLOY_ENV")
COMPOSE_PROJECT_NAME=$(env_quote "$COMPOSE_PROJECT_NAME")
BACKEND_JAVA_IMAGE=$(env_quote "${BACKEND_JAVA_IMAGE:-}")
FRONTEND_IMAGE=$(env_quote "${FRONTEND_IMAGE:-}")
FRONTEND_PORT=$(env_quote "$FRONTEND_PORT")
BACKEND_PORT=$(env_quote "$BACKEND_PORT")
POSTGRES_PORT=$(env_quote "$POSTGRES_PORT")
POSTGRES_DB=$(env_quote "$POSTGRES_DB")
POSTGRES_USER=$(env_quote "$POSTGRES_USER")
POSTGRES_PASSWORD=$(env_quote "$POSTGRES_PASSWORD")
DB_MIN_POOL_SIZE=$(env_quote "${DB_MIN_POOL_SIZE:-2}")
DB_MAX_POOL_SIZE=$(env_quote "${DB_MAX_POOL_SIZE:-50}")
FRONTEND_SERVER_NAMES=$(env_quote "$FRONTEND_SERVER_NAMES")
  API_SERVER_NAME=$(env_quote "$API_SERVER_NAME")
  PUBLIC_API_BASE_URL=$(env_quote "$PUBLIC_API_BASE_URL")
  # '/hub/orders' SỐ ÍT. Bản .NET dùng '/hubs/orders', và giá trị suy ra ở đây từng chép theo bản
  # đó — trong khi 'WebSocketConfig.addEndpoint' khai '/hub/orders', có hẳn chú thích giải thích vì
  # sao hai bên khác nhau (giao thức khác: STOMP chứ không phải SignalR).
  #
  # Sai một chữ 's' thì WebSocket không bao giờ kết nối, và nó hỏng IM LẶNG: bếp không tự thấy đơn
  # mới, quầy không tự thấy trạng thái đổi, phải tải lại trang mới có dữ liệu. Không lỗi nào hiện
  # lên vì kết nối hỏng chỉ là một lần thử bất thành trong nền.
  PUBLIC_ORDER_HUB_URL=$(env_quote "${PUBLIC_ORDER_HUB_URL:-${PUBLIC_API_BASE_URL%/api}/hub/orders}")
  # Hai địa chỉ này đi vào BUNDLE lúc build, không đọc lúc chạy — sai là phải dựng lại cả ảnh.
  #
  # Bỏ sót thì compose rơi về mặc định 'http://127.0.0.1:8080', và mọi link QR bàn trong cổng quản
  # trị trỏ về MÁY CỦA NGƯỜI ĐANG XEM. Trang mở ra tưởng như đang tải rồi đứng im, không lỗi nào
  # hiện lên. Đã gặp thật.
  PUBLIC_ORDERING_BASE_URL=$(env_quote "${PUBLIC_ORDERING_BASE_URL:-}")
  PUBLIC_MARKETING_BASE_URL=$(env_quote "${PUBLIC_MARKETING_BASE_URL:-}")
  CORS_ALLOWED_ORIGINS=$(env_quote "$CORS_ALLOWED_ORIGINS")
  JWT_SIGNING_KEY=$(env_quote "$JWT_SIGNING_KEY")
  ADMIN_BOOTSTRAP_EMAIL=$(env_quote "${ADMIN_BOOTSTRAP_EMAIL:-}")
  ADMIN_BOOTSTRAP_PASSWORD=$(env_quote "${ADMIN_BOOTSTRAP_PASSWORD:-}")
  ADMIN_BOOTSTRAP_FULL_NAME=$(env_quote "${ADMIN_BOOTSTRAP_FULL_NAME:-}")
  PAYMENTS_VIETQR_BANKID=$(env_quote "$PAYMENTS_VIETQR_BANKID")
  PAYMENTS_VIETQR_ACCOUNTNUMBER=$(env_quote "$PAYMENTS_VIETQR_ACCOUNTNUMBER")
  PAYMENTS_VIETQR_ACCOUNTNAME=$(env_quote "$PAYMENTS_VIETQR_ACCOUNTNAME")
  PAYMENTS_VIETQR_TEMPLATE=$(env_quote "${PAYMENTS_VIETQR_TEMPLATE:-compact2}")
  PAYMENTS_SEPAY_APIKEY=$(env_quote "$PAYMENTS_SEPAY_APIKEY")
  FIREBASE_API_KEY=$(env_quote "$FIREBASE_API_KEY")
  FIREBASE_PROJECT_ID=$(env_quote "$FIREBASE_PROJECT_ID")
  GOOGLE_CLIENT_ID=$(env_quote "$GOOGLE_CLIENT_ID")
  BACKEND_JAVA_BIND=$(env_quote "${BACKEND_JAVA_BIND:-127.0.0.1}")
  # Thư mục chứng chỉ TLS. Bỏ trống = nginx chạy HTTP thuần.
  #
  # PHẢI đi qua đây, không thể chỉ đặt tay trên máy chủ một lần: script này cũng gọi
  # 'write-nginx-config.sh', nên mỗi lượt triển khai ghi đè cấu hình nginx. Đặt TLS bằng tay rồi
  # triển khai lại là mất TLS — và mất một cách khó thấy, vì trang vẫn lên trên HTTP trong khi
  # bundle đã được dựng để gọi API qua HTTPS. Đã gặp thật.
  TLS_CERT_DIR=$(env_quote "${TLS_CERT_DIR:-}")
RUN_DB_MIGRATIONS_ON_STARTUP=$(env_quote "${RUN_DB_MIGRATIONS_ON_STARTUP:-false}")
# Giữ lại dù không còn profile nào: compose vẫn đọc biến này, và để trống là hành vi mặc định.
COMPOSE_PROFILES=$(env_quote "${COMPOSE_PROFILES:-}")
VITE_USE_MOCK_ORDER=$(env_quote "${VITE_USE_MOCK_ORDER:-false}")
BOOTSTRAP_ADMIN_EMAIL=$(env_quote "${BOOTSTRAP_ADMIN_EMAIL:-}")
BOOTSTRAP_ADMIN_PASSWORD=$(env_quote "${BOOTSTRAP_ADMIN_PASSWORD:-}")
SEED_DEMO_USERS=$(env_quote "${SEED_DEMO_USERS:-false}")
DEMO_ADMIN_EMAIL=$(env_quote "${DEMO_ADMIN_EMAIL:-}")
DEMO_ADMIN_PASSWORD=$(env_quote "${DEMO_ADMIN_PASSWORD:-}")
DEMO_COUNTER_EMAIL=$(env_quote "${DEMO_COUNTER_EMAIL:-}")
DEMO_COUNTER_PASSWORD=$(env_quote "${DEMO_COUNTER_PASSWORD:-}")
DEMO_STAFF_EMAIL=$(env_quote "${DEMO_STAFF_EMAIL:-}")
DEMO_STAFF_PASSWORD=$(env_quote "${DEMO_STAFF_PASSWORD:-}")
DEMO_KITCHEN_EMAIL=$(env_quote "${DEMO_KITCHEN_EMAIL:-}")
DEMO_KITCHEN_PASSWORD=$(env_quote "${DEMO_KITCHEN_PASSWORD:-}")
EOF

# GỬI SANG TÊN TẠM, KHÔNG GHI ĐÈ `.env` NGAY.
#
# `.env` nay mang cả TÊN ẢNH. Ghi đè nó trước khi chuyển `repo` -> `repo.previous` là để lại một
# trạng thái không lùi được: mã cũ nằm ở `repo.previous`, còn `.env` đã trỏ sang ảnh MỚI. Lùi lại
# sẽ chạy ảnh mới với mã cũ — tức không lùi gì cả, chỉ làm mọi thứ khó hiểu hơn.
#
# Nên `.env` cũ được giữ thành `.env.previous`, đi cùng cặp với `repo.previous`.
"${scp_base[@]}" "$env_file" "${SSH_USER}@${SSH_HOST}:${remote_root}/.env.new"

# KÉO ẢNH ĐÃ DỰNG, HAY DỰNG TẠI CHỖ?
#
# Có đủ hai tên ảnh thì máy chủ KÉO thứ CI đã dựng và đã kiểm. Thiếu một trong hai thì quay về
# đường cũ — dựng trên VPS. Đường cũ phải còn sống: chạy tay và chạy local không có registry.
#
# Vì sao đáng đổi: trước đây thứ CI kiểm và thứ máy chủ chạy là HAI lần build khác nhau, trên hai
# máy khác nhau, vào hai thời điểm khác nhau. "CI xanh" không nói gì chắc chắn về nhị phân đang
# phục vụ khách. Kéo ảnh làm hai thứ đó thành MỘT.
#
# Lợi thêm, không nhỏ: `up -d --build` trên VPS là vài phút im lặng, và chính khoảng im lặng đó đã
# làm đứt SSH ngày 08/08 (xem lib-ssh.sh). `pull` in tiến độ đều nên kết nối không bị coi là chết.
if [ -n "${BACKEND_JAVA_IMAGE:-}" ] && [ -n "${FRONTEND_IMAGE:-}" ]; then
  che_do_anh="pull"
else
  che_do_anh="build"
  echo "Không có tên ảnh — dựng trên máy chủ như trước."
fi

# Đăng nhập registry bằng STDIN, không bằng tham số dòng lệnh: tham số hiện trong `ps` của mọi
# người dùng trên máy chủ. Chạy như một lệnh riêng để token không lọt vào chuỗi lệnh dài bên dưới.
if [ "$che_do_anh" = "pull" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  printf '%s' "$GHCR_TOKEN" \
    | "${ssh_base[@]}" "docker login ghcr.io -u '${GHCR_USER:-x}' --password-stdin" >/dev/null
  echo "Đã đăng nhập ghcr.io trên máy chủ."
fi

if [ "$che_do_anh" = "pull" ]; then
  # `pull` trước, rồi `up -d` KHÔNG kèm `--build`: compose sẽ dùng đúng ảnh vừa kéo.
  lenh_anh="docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p '${COMPOSE_PROJECT_NAME}' pull api frontend"
  co_build=""
else
  lenh_anh="true"
  co_build="--build"
fi

"${ssh_base[@]}" "cd '${remote_root}' && \
  rm -rf repo.previous && \
  if [ -d repo ]; then mv repo repo.previous; fi && \
  if [ -f .env ]; then cp .env .env.previous && chmod 600 .env.previous; fi && \
  mv .env.new .env && \
  chmod 600 .env && \
  mkdir -p repo && \
  tar -xzf release.tgz -C repo && \
  rm -f release.tgz && \
  set -a && . ./.env && set +a && \
  docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p '${COMPOSE_PROJECT_NAME}' up -d ${co_build} postgres && \
  bash repo/deploy/scripts/backup-postgres.sh truoc-migration && \
  ${lenh_anh} && \
  docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p '${COMPOSE_PROJECT_NAME}' --profile migrate run --rm ${co_build} migrate && \
  docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p '${COMPOSE_PROJECT_NAME}' up -d ${co_build} --remove-orphans && \
  bash repo/deploy/scripts/write-nginx-config.sh && \
  bash repo/deploy/scripts/health-check.sh"
