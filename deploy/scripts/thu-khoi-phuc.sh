#!/usr/bin/env bash
# DIỄN TẬP KHÔI PHỤC — chạy từ runner, thao tác qua SSH lên máy chủ.
#
# VÌ SAO CẦN: `restore-postgres.sh` nằm trong repo từ lâu, viết đủ và đúng nhìn bằng mắt, và CHƯA
# TỪNG CHẠY. Có script sao lưu không bằng có khả năng khôi phục. Ngày người ta cần tới nó là ngày
# tệ nhất để phát hiện nó hỏng.
#
# BÀI DIỄN TẬP PHẢI CHỨNG MINH ĐƯỢC ĐIỀU GÌ:
#
# Khôi phục "chạy xong không lỗi" chưa chứng minh gì cả — một lệnh `dropdb` + `createdb` rồi
# `pg_restore` thất bại im lặng cũng thoát 0 và để lại một cơ sở dữ liệu RỖNG. Nên bài này kiểm hai
# chiều ngược nhau, và phải đúng CẢ HAI:
#
#   1. Thứ tạo ra SAU bản sao lưu phải BIẾN MẤT  -> chứng minh khôi phục thật sự thay nội dung
#   2. Dữ liệu có TRƯỚC bản sao lưu phải CÒN NGUYÊN -> chứng minh nó không chỉ xoá sạch
#
# Chỉ kiểm (1) thì một lần xoá sạch cũng "đạt". Chỉ kiểm (2) thì không khôi phục gì cũng "đạt".
#
# AN TOÀN: chỉ chạy trên staging. Thứ duy nhất mất đi là bảng đánh dấu do chính script tạo ra, và
# bản sao lưu được tạo NGAY TRƯỚC khi thử — nên trạng thái sau bài diễn tập bằng đúng trạng thái
# trước nó.
set -euo pipefail

required_vars=(
  DEPLOY_ENV
  SSH_HOST
  SSH_USER
  SSH_KEY
  COMPOSE_PROJECT_NAME
  POSTGRES_DB
  POSTGRES_USER
  FRONTEND_SERVER_NAMES
  API_SERVER_NAME
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Thiếu biến bắt buộc: ${var_name}" >&2
    exit 1
  fi
done

# KHÔNG diễn tập trên production. Bài này CỐ Ý làm hỏng dữ liệu rồi khôi phục lại; đúng thao tác đó
# trên dữ liệu thật là một sự cố, không phải một bài kiểm.
if [ "$DEPLOY_ENV" = "production" ]; then
  echo "Từ chối chạy diễn tập khôi phục trên production." >&2
  exit 1
fi

# shellcheck source=deploy/scripts/lib-ssh.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-ssh.sh"

remote_root="/opt/cmc-restaurant/${DEPLOY_ENV}"
dau_moc="thu_khoi_phuc_$(date -u +%Y%m%d%H%M%S)"

# Chạy một câu lệnh SQL, in ra đúng một giá trị.
psql_ra() {
  "${ssh_base[@]}" "cd '${remote_root}' && docker compose --env-file .env \
    -f repo/deploy/docker-compose.java.yml -p '${COMPOSE_PROJECT_NAME}' exec -T postgres \
    psql -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' -tAc \"$1\""
}

echo "=== 1/6  Sao lưu điểm mốc ==="
sao_luu="$("${ssh_base[@]}" "cd '${remote_root}' && \
  DEPLOY_ENV='${DEPLOY_ENV}' COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' \
  POSTGRES_DB='${POSTGRES_DB}' POSTGRES_USER='${POSTGRES_USER}' \
  bash repo/deploy/scripts/backup-postgres.sh truoc-thu-khoi-phuc" | tail -1)"
echo "$sao_luu"
tep_sao_luu="${sao_luu##*: }"
case "$tep_sao_luu" in
  /*.dump) ;;
  *)
    echo "Không đọc được đường dẫn bản sao lưu từ: ${sao_luu}" >&2
    exit 1
    ;;
esac

echo "=== 2/6  Đếm dữ liệu THẬT trước khi thử ==="
# `menu_items` là bảng có dữ liệu ổn định nhất và không đổi trong lúc diễn tập.
so_mon_truoc="$(psql_ra 'select count(*) from menu_items;' | tr -d '[:space:]')"
echo "menu_items: ${so_mon_truoc} hàng"
if [ "${so_mon_truoc}" = "0" ]; then
  echo "menu_items rỗng — bài diễn tập không chứng minh được gì. Dừng." >&2
  exit 1
fi

echo "=== 3/6  Tạo dấu mốc SAU bản sao lưu ==="
psql_ra "create table ${dau_moc} (ghi_chu text); insert into ${dau_moc} values ('dien tap');" >/dev/null
co_dau_moc="$(psql_ra "select count(*) from information_schema.tables where table_name = '${dau_moc}';" | tr -d '[:space:]')"
if [ "${co_dau_moc}" != "1" ]; then
  echo "Không tạo được bảng dấu mốc — bài diễn tập không hợp lệ." >&2
  exit 1
fi
echo "Đã tạo bảng ${dau_moc}"

echo "=== 4/6  KHÔI PHỤC từ bản sao lưu ==="
"${ssh_base[@]}" "cd '${remote_root}' && \
  DEPLOY_ENV='${DEPLOY_ENV}' COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' \
  POSTGRES_DB='${POSTGRES_DB}' POSTGRES_USER='${POSTGRES_USER}' \
  FRONTEND_SERVER_NAMES='${FRONTEND_SERVER_NAMES}' API_SERVER_NAME='${API_SERVER_NAME}' \
  bash repo/deploy/scripts/restore-postgres.sh '${tep_sao_luu}'"

echo "=== 5/6  Dấu mốc phải BIẾN MẤT ==="
con_dau_moc="$(psql_ra "select count(*) from information_schema.tables where table_name = '${dau_moc}';" | tr -d '[:space:]')"
if [ "${con_dau_moc}" != "0" ]; then
  echo "HỎNG: bảng ${dau_moc} vẫn còn sau khi khôi phục — nội dung KHÔNG được thay." >&2
  exit 1
fi
echo "Bảng ${dau_moc} đã biến mất — khôi phục thật sự thay nội dung."

echo "=== 6/6  Dữ liệu thật phải CÒN NGUYÊN ==="
so_mon_sau="$(psql_ra 'select count(*) from menu_items;' | tr -d '[:space:]')"
if [ "${so_mon_sau}" != "${so_mon_truoc}" ]; then
  echo "HỎNG: menu_items ${so_mon_truoc} -> ${so_mon_sau}. Khôi phục làm mất dữ liệu." >&2
  exit 1
fi
echo "menu_items: ${so_mon_sau} hàng — khớp trước khi thử."

echo
echo "DIỄN TẬP ĐẠT: khôi phục thay đúng nội dung, và không mất dữ liệu."
