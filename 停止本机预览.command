#!/bin/zsh

project_root="$(cd "$(dirname "$0")" && pwd)"

/bin/zsh -l "$project_root/scripts/stop-local-preview.sh"
preview_status=$?

printf '\n按任意键关闭本窗口……'
read -k 1
printf '\n'

exit "$preview_status"
