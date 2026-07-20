#!/bin/zsh

set -u

project_root="$(cd "$(dirname "$0")/.." && pwd)"
preview_url="http://127.0.0.1:3000"
docker_compose_plugin="/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"

cd "$project_root" || exit 1

printf '\n正在停止源素库本机预览……\n'

health_response="$(curl --silent --show-error --max-time 2 "$preview_url/api/health" 2>/dev/null || true)"
if [[ "$health_response" == *'"service":"yuansu-assets-platform"'* ]]; then
  preview_pids="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$preview_pids" ]]; then
    for preview_pid in ${(f)preview_pids}; do
      kill "$preview_pid" >/dev/null 2>&1 || true
    done
  fi
  printf '网站服务已停止。\n'
else
  printf '网站服务当前没有运行。\n'
fi

if docker info >/dev/null 2>&1; then
  typeset -a compose_command
  if docker compose version >/dev/null 2>&1; then
    compose_command=(docker compose)
  elif [[ -x "$docker_compose_plugin" ]]; then
    compose_command=("$docker_compose_plugin")
  else
    compose_command=()
  fi

  if (( ${#compose_command[@]} > 0 )); then
    "${compose_command[@]}" down
    printf '本地 PostgreSQL 已停止，数据库内容仍会保留。\n'
  else
    printf '未找到 Docker Compose，未操作数据库。\n'
  fi
else
  printf 'Docker 当前没有运行，数据库无需停止。\n'
fi

printf '本机预览已结束。\n'
