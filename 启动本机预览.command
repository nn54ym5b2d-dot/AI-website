#!/bin/zsh

project_root="$(cd "$(dirname "$0")" && pwd)"

/bin/zsh -l "$project_root/scripts/local-preview.sh"
preview_status=$?

if (( preview_status != 0 )); then
  printf '\n按任意键关闭本窗口……'
  read -k 1
  printf '\n'
fi

exit "$preview_status"
