#!/usr/bin/env bash
# Dựng kết nối SSH tới máy chủ triển khai. Được `source`, không chạy trực tiếp.
#
# Tách ra vì có HAI đường đi tới cùng một máy chủ: `deploy-vps.sh` lúc mọi thứ suôn sẻ, và
# `rollback-tu-xa.sh` lúc không. Đường thứ hai chỉ chạy khi đường thứ nhất đã hỏng — tức là đúng
# lúc không ai muốn phát hiện ra rằng hai bản chép của cùng một đoạn dựng SSH đã trôi khỏi nhau.
#
# Đặt ra: work_dir, key_file, known_hosts_file, ssh_base[], scp_base[].
# Người gọi phải có sẵn SSH_HOST, SSH_USER, SSH_KEY.

: "${SSH_HOST:?SSH_HOST is required}"
: "${SSH_USER:?SSH_USER is required}"
: "${SSH_KEY:?SSH_KEY is required}"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

key_file="${work_dir}/deploy_key"
known_hosts_file="${work_dir}/known_hosts"

printf '%s\n' "$SSH_KEY" > "$key_file"
chmod 600 "$key_file"
ssh-keyscan -H "$SSH_HOST" > "$known_hosts_file" 2>/dev/null

# Giữ kết nối sống trong lúc build im lặng.
#
# Deploy staging ngày 08/08 hỏng với `client_loop: send disconnect: Broken pipe` ngay giữa một
# bước build chạy vài phút mà không in gì. Không có gì đi qua kết nối trong khoảng đó, nên nó bị
# coi là chết và bị cắt; build trên VPS vẫn chạy tiếp nhưng workflow đã thoát với mã 255.
#
# Đây là hỏng do IM LẶNG, không do lỗi. Nó sẽ quay lại mỗi khi có một bước build đủ lâu.
#
# 30 giây × 20 lần = chịu được 10 phút im lặng trước khi thật sự bỏ cuộc.
keepalive=(-o ServerAliveInterval=30 -o ServerAliveCountMax=20)

ssh_base=(ssh -i "$key_file" -o UserKnownHostsFile="$known_hosts_file" -o StrictHostKeyChecking=yes "${keepalive[@]}" "${SSH_USER}@${SSH_HOST}")
scp_base=(scp -i "$key_file" -o UserKnownHostsFile="$known_hosts_file" -o StrictHostKeyChecking=yes "${keepalive[@]}")
