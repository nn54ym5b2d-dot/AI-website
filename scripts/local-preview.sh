#!/bin/zsh

set -u

project_root="$(cd "$(dirname "$0")/.." && pwd)"
preview_url="http://127.0.0.1:3000"
preview_path="${YUANSU_PREVIEW_PATH:-/}"
docker_app="/Applications/Docker.app"
docker_app_bin="$docker_app/Contents/Resources/bin"
docker_compose_plugin="/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"

case "$preview_path" in
  /|/local-auth-outbox) ;;
  *) preview_path="/" ;;
esac
preview_target_url="$preview_url"
if [[ "$preview_path" != "/" ]]; then
  preview_target_url="${preview_url}${preview_path}"
fi

# Finder 启动的 .command 不一定继承 Docker Desktop 的命令路径。
# 显式加入应用内目录，避免凭据程序 docker-credential-desktop 因失效的系统软链接而找不到。
if [[ -d "$docker_app_bin" ]]; then
  export PATH="$docker_app_bin:$PATH"
fi

cd "$project_root" || exit 1

print_step() {
  printf '\n[%s] %s\n' "$1" "$2"
}

fail() {
  printf '\n启动失败：%s\n' "$1" >&2
  exit 1
}

project_is_running() {
  local health_response
  health_response="$(curl --silent --show-error --max-time 2 "$preview_url/api/health" 2>/dev/null || true)"
  [[ "$health_response" == *'"service":"yuansu-assets-platform"'* ]]
}

command -v node >/dev/null 2>&1 || fail "没有找到 Node.js。项目需要 Node.js 24。"
command -v npm >/dev/null 2>&1 || fail "没有找到 npm。"
command -v docker >/dev/null 2>&1 || fail "没有找到 Docker。请先安装 Docker Desktop。"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$node_major" == "24" ]] || fail "当前 Node.js 为 $(node -v)，项目需要 24.x。"

if project_is_running; then
  print_step "完成" "源素库本机预览已经在运行，正在打开浏览器。"
  open "$preview_target_url"
  exit 0
fi

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  fail "端口 3000 已被其他程序占用。请先关闭该程序，再重新双击启动。"
fi

if [[ ! -f ".env" ]]; then
  print_step "1/6" "首次运行：正在创建仅限本机使用的环境配置。"
  cp ".env.example" ".env" || fail "无法从 .env.example 创建 .env。"

  if command -v openssl >/dev/null 2>&1; then
    local_auth_secret="$(openssl rand -hex 32)"
  else
    local_auth_secret="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  fi

  LOCAL_AUTH_SECRET="$local_auth_secret" perl -0pi -e 's/replace_with_a_long_random_local_secret/$ENV{LOCAL_AUTH_SECRET}/g' ".env"
  chmod 600 ".env"
else
  print_step "1/6" "已找到本机环境配置。"
fi

if ! docker info >/dev/null 2>&1; then
  [[ -d "$docker_app" ]] || fail "Docker 服务没有运行，也没有找到 Docker Desktop。"
  print_step "2/6" "正在启动 Docker Desktop，请稍候。"
  open -a Docker || fail "无法启动 Docker Desktop。"

  docker_ready="false"
  for _ in {1..90}; do
    if docker info >/dev/null 2>&1; then
      docker_ready="true"
      break
    fi
    sleep 1
  done
  [[ "$docker_ready" == "true" ]] || fail "Docker Desktop 在 90 秒内没有准备好，请打开 Docker 检查状态。"
else
  print_step "2/6" "Docker 已运行。"
fi

typeset -a compose_command
if docker compose version >/dev/null 2>&1; then
  compose_command=(docker compose)
elif [[ -x "$docker_compose_plugin" ]]; then
  compose_command=("$docker_compose_plugin")
else
  fail "没有找到 Docker Compose。请更新或重新安装 Docker Desktop。"
fi

if [[ ! -d "node_modules" ]]; then
  print_step "3/6" "首次运行：正在安装项目依赖。"
  npm ci || fail "依赖安装失败，请检查网络后重试。"
else
  print_step "3/6" "项目依赖已安装。"
fi

print_step "4/6" "正在启动本地 PostgreSQL。"
"${compose_command[@]}" up -d postgres || fail "PostgreSQL 启动失败。"

database_ready="false"
for _ in {1..60}; do
  postgres_container="$("${compose_command[@]}" ps -q postgres 2>/dev/null)"
  if [[ -n "$postgres_container" ]]; then
    postgres_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$postgres_container" 2>/dev/null || true)"
    if [[ "$postgres_health" == "healthy" || "$postgres_health" == "running" ]]; then
      database_ready="true"
      break
    fi
  fi
  sleep 1
done
[[ "$database_ready" == "true" ]] || fail "PostgreSQL 在 60 秒内没有准备好。"

print_step "5/6" "正在应用数据库更新并补充非真实测试数据。"
npm run db:migrate || fail "数据库更新失败。"
npm run db:seed || fail "测试数据准备失败。"

export NEXT_PUBLIC_APP_URL="$preview_url"
export AUTH_PROVIDER="local"
export AUTH_LOCAL_ENABLED="true"
export ASSET_STORAGE_PROVIDER="local_test"
export ASSET_LOCAL_TEST_ENABLED="true"

print_step "6/6" "正在启动源素库，本窗口需要保持打开。"
printf '网页地址：%s\n' "$preview_target_url"
printf '页面启动后会自动打开浏览器；代码更新会自动刷新。\n'
printf '需要结束时，可在本窗口按 Control+C，或双击“停止本机预览.command”。\n\n'

(
  for _ in {1..60}; do
    if project_is_running; then
      open "$preview_target_url"
      exit 0
    fi
    sleep 1
  done
  printf '\n提示：浏览器未自动打开，请手动访问 %s\n' "$preview_target_url" >&2
) &
browser_wait_pid=$!

cleanup_browser_waiter() {
  kill "$browser_wait_pid" >/dev/null 2>&1 || true
}
trap cleanup_browser_waiter EXIT INT TERM

npm run dev -- --hostname 127.0.0.1 --port 3000
