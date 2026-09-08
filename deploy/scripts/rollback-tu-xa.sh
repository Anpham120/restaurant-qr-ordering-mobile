#!/usr/bin/env bash
set -euo pipefail

# Gọi `rollback-vps.sh` trên máy chủ, từ runner của GitHub Actions.
#
# Vì sao cần tệp này: `rollback-vps.sh` đã có sẵn, viết đủ và đúng — nhưng KHÔNG AI GỌI NÓ. Trước
# đây `cd.yml` chỉ chạy `deploy-vps.sh`; deploy hỏng giữa chừng là máy chủ nằm lại ở trạng thái
# hỏng cho tới khi có người SSH vào chữa tay. Một cơ chế cứu chỉ chạy khi có người nhớ ra nó thì
# không phải cơ chế cứu, nó là tài liệu.
#
# Chạy tự động ở bước `if: failure()` trong cd.yml.

: "${DEPLOY_ENV:?DEPLOY_ENV is required}"
: "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME is required}"

# Đặt ra ssh_base[], scp_base[], work_dir. Cùng lib với deploy-vps.sh — nếu cách xác thực đổi thì
# cả hai đường đổi cùng lúc.
# shellcheck source=deploy/scripts/lib-ssh.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-ssh.sh"

remote_root="/opt/cmc-restaurant/${DEPLOY_ENV}"

# KHÔNG có repo.previous thì không có gì để lùi về, và đó không phải lỗi.
#
# Lần triển khai ĐẦU TIÊN lên một máy trống hỏng giữa chừng thì đúng là chưa từng có bản chạy được
# nào. Thoát 0 ở đây để log ghi rõ "không có gì để lùi" thay vì chồng một lỗi rollback lên trên lỗi
# deploy — hai lỗi cho cùng một sự việc làm người đọc log đi tìm nhầm chỗ.
if ! "${ssh_base[@]}" "test -d '${remote_root}/repo.previous'"; then
  echo "Không có ${remote_root}/repo.previous — chưa từng có bản triển khai chạy được để lùi về." >&2
  echo "Máy chủ đang ở trạng thái của lần deploy vừa hỏng. Cần người xem trực tiếp." >&2
  exit 0
fi

# CHÉP SCRIPT RA NGOÀI `repo/` RỒI MỚI CHẠY.
#
# `rollback-vps.sh` đổi tên chính thư mục `repo/` chứa nó (`repo` -> `repo.failed.<stamp>`). Trên
# Linux đổi tên không làm hỏng file descriptor đang mở nên bash vẫn đọc tiếp được — nhưng đó là
# một chi tiết của hệ tệp, không phải một lời hứa. Chép ra `/tmp` là một dòng, và nó bỏ hẳn câu
# hỏi đó đi.
"${ssh_base[@]}" "cp '${remote_root}/repo.previous/deploy/scripts/rollback-vps.sh' /tmp/rollback-vps.sh 2>/dev/null \
  || cp '${remote_root}/repo/deploy/scripts/rollback-vps.sh' /tmp/rollback-vps.sh"

echo "Đang lùi ${DEPLOY_ENV} về bản triển khai trước..."
"${ssh_base[@]}" "DEPLOY_ENV='${DEPLOY_ENV}' COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' bash /tmp/rollback-vps.sh"
