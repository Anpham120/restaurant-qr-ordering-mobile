#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_ENV:?DEPLOY_ENV is required}"
: "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME is required}"

remote_root="/opt/cmc-restaurant/${DEPLOY_ENV}"
cd "$remote_root"

if [ ! -d repo.previous ]; then
  echo "No repo.previous directory found for rollback." >&2
  exit 1
fi

rollback_stamp="$(date -u +"%Y%m%d%H%M%S")"
if [ -d repo ]; then
  mv repo "repo.failed.${rollback_stamp}"
fi
mv repo.previous repo

# LÙI CẢ `.env`, KHÔNG CHỈ MÃ.
#
# `.env` mang tên ảnh của lượt triển khai. Lùi mã mà giữ `.env` mới là chạy ảnh MỚI với mã CŨ —
# không lùi gì cả. Tệ hơn: `--build` sẽ dựng lại mã cũ rồi GẮN NHÃN nó bằng tag của bản mới, nên
# một lần `pull` về sau có thể bỏ qua vì tag đó đã có sẵn trên máy.
if [ -f .env.previous ]; then
  mv .env.previous .env
  chmod 600 .env
  echo "Đã lùi .env về bản trước."
fi

set -a
. ./.env
set +a

# Có tên ảnh thì KÉO, không dựng. Ảnh của bản trước vẫn còn trên máy sau lần triển khai trước đó,
# nên `pull` thường không tải gì thêm — nhưng nó bảo đảm chạy đúng nhị phân cũ chứ không dựng lại
# một cái mới từ cùng mã nguồn.
if [ -n "${BACKEND_JAVA_IMAGE:-}" ] && [ -n "${FRONTEND_IMAGE:-}" ]; then
  docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p "$COMPOSE_PROJECT_NAME" pull api frontend || true
  docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
else
  docker compose --env-file .env -f repo/deploy/docker-compose.java.yml -p "$COMPOSE_PROJECT_NAME" up -d --build --remove-orphans
fi
bash repo/deploy/scripts/backup-postgres.sh "rollback-${rollback_stamp}"
bash repo/deploy/scripts/write-nginx-config.sh
bash repo/deploy/scripts/health-check.sh

echo "Rollback completed for ${DEPLOY_ENV}"
