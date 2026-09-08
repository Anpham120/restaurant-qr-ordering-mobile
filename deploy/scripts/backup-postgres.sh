#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_ENV:?DEPLOY_ENV is required}"
: "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

backup_reason="${1:-manual}"
remote_root="/opt/cmc-restaurant/${DEPLOY_ENV}"
compose_file="${remote_root}/repo/deploy/docker-compose.java.yml"
env_file="${remote_root}/.env"
backup_dir="${remote_root}/backups"
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_file="${backup_dir}/${POSTGRES_DB}-${timestamp}-${backup_reason}.dump"

mkdir -p "$backup_dir"

# CHỜ POSTGRES NHẬN KẾT NỐI TRƯỚC KHI DUMP.
#
# `deploy-vps.sh` gọi script này ngay sau `up -d --build postgres`, và `up -d` trả về khi container
# ĐÃ CHẠY chứ không phải khi postgres đã nhận kết nối — compose khai healthcheck với
# `start_period: 20s` đúng vì lý do đó. Không chờ thì `pg_dump` đập vào một cổng chưa mở, deploy
# dừng ngay ở bước sao lưu, và thứ chặn deploy lại chính là cái lưới an toàn.
#
# 2 giây × 30 = 60 giây, gấp ba `start_period`.
for _ in $(seq 1 30); do
  if docker compose --env-file "$env_file" -f "$compose_file" -p "$COMPOSE_PROJECT_NAME" exec -T postgres \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker compose --env-file "$env_file" -f "$compose_file" -p "$COMPOSE_PROJECT_NAME" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl > "$backup_file"

sha256sum "$backup_file" > "${backup_file}.sha256"
find "$backup_dir" -type f -name "*.dump" -mtime +14 -delete
find "$backup_dir" -type f -name "*.sha256" -mtime +14 -delete

echo "PostgreSQL backup created: $backup_file"
