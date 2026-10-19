#!/usr/bin/env bash
# Check của CASA Mầm non cho đội agent (scripts/check.sh gọi file này; Stop gate chạy nó mỗi lượt có thay đổi).
#
# Mặc định: BỘ NHANH (vài giây) gồm những bài chỉ đọc, chạy chồng với bất cứ thứ gì cũng an toàn:
#   cú pháp tệp JS vừa đổi, dữ liệu lạc trong kho, khế ước tệp dùng chung, QUY TẮC 3, phân quyền ảnh và
#   dữ liệu của bé, VERSION của service worker, hướng dẫn thử gửi trường (bảng mật khẩu trống, không
#   tên người, phụ đề khớp với bảng — chặn trước khi bản chép từ claude.ai lên kho).
# CỐ Ý KHÔNG có trong bộ nhanh: co-lap-loi, luoi-an-toan, quy-tac-2, quy-tac-4 (ghi tạm vào chính kho mã:
#   routes/, modules/, test/) và các bài dựng máy chủ ở cổng cố định. Chạy chồng với `npm test` thì chúng
#   phá nhau, có lần làm hỏng routes/surveys.js vĩnh viễn. Chúng chạy trong bộ đầy đủ.
#
#   CHECK_FULL=1   `npm test` đầy đủ (~12 phút), bắt buộc trước mỗi commit theo CLAUDE.md. Giữ khoá cả máy
#                  để hai bộ đầy đủ (hai phiên, hai worktree) không chạy chồng nhau.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

if [ ! -d node_modules ]; then
  echo "Chưa cài thư viện: chạy 'npm install' trước (phiên cloud tự cài qua .claude/hooks/session-start.sh)." >&2
  exit 1
fi

if [ "${CHECK_FULL:-0}" = 1 ]; then
  lock="${TMPDIR:-/tmp}/casa-mamnon-npm-test.lock"
  waited=0
  until mkdir "$lock" 2>/dev/null; do
    pid="$(cat "$lock/pid" 2>/dev/null)"
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      rm -rf "$lock"  # khoá bỏ lại của lần chạy đã chết
      continue
    fi
    if [ "$waited" -ge "${CHECK_LOCK_WAIT:-60}" ]; then
      echo "Đang có một bộ npm test khác của CASA chạy trên máy này (tiến trình ${pid:-?}, khoá $lock)." >&2
      echo "Chờ nó xong rồi chạy lại. Không chạy chồng: các bài test dùng chung cổng, thư mục tạm và ghi tạm vào kho mã." >&2
      exit 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo $$ > "$lock/pid"
  trap 'rm -rf "$lock"' EXIT
  npm test
  exit $?
fi

status=0
run() {
  printf '▶ %s\n' "$*"
  "$@" || { printf '✘ %s\n' "$*"; status=1; }
}

# Tệp JS đã đổi: chưa commit, cùng commit chưa push (có upstream thì so với upstream, chưa có thì lấy
# commit chưa nằm trên remote nào). Giống cách Stop gate xác định "có thay đổi".
changed="$(
  {
    git -c core.quotePath=false diff --name-only HEAD
    git -c core.quotePath=false ls-files --others --exclude-standard
    if git rev-parse --verify -q '@{upstream}' >/dev/null; then
      git -c core.quotePath=false diff --name-only '@{upstream}...HEAD'
    elif [ -n "$(git remote)" ]; then
      git -c core.quotePath=false log --name-only --format= HEAD --not --remotes
    fi
  } 2>/dev/null | grep -E '\.(js|mjs|cjs)$' | sort -u
)"
while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] && run node --check "$f"
done <<< "$changed"

run npm run -s test:quet-kho
for t in khe-uoc quy-tac-3 quyen-du-lieu-be anh-canh-quyen; do
  run npm run -s "test:$t"
done
run npm run -s test:sw-version
run npm run -s test:huong-dan-thu

if [ "$status" -eq 0 ]; then
  echo "Bộ nhanh xanh. Trước khi commit: CHECK_FULL=1 ./scripts/check.sh (npm test đầy đủ, ~12 phút)."
fi
exit "$status"
