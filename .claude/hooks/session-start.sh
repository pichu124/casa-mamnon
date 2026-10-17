#!/usr/bin/env bash
# SessionStart: phiên Claude Code trên cloud clone kho mã mới tinh (nông, chưa có node_modules), nên
# Stop gate (scripts/check.sh) và npm test đều đỏ. Chuẩn bị trước khi phiên bắt đầu. Chỉ chạy trên cloud.
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# npm test cần lịch sử tới điểm tách bc9dfa3 (test/nen-chung) và so với nhánh chính (sw-version, commit
# riêng). Cả kho chỉ vài chục MB: lấy đủ lịch sử.
if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
  git fetch --quiet --unshallow origin 2>/dev/null || git fetch --quiet --depth=100000 origin \
    || echo "session-start: không lấy được đủ lịch sử git; test/nen-chung sẽ đỏ" >&2
fi

# Đã cài đúng bản package-lock.json này thì thôi (trạng thái máy được lưu đệm sau lần chạy đầu).
# So NỘI DUNG, không so giờ sửa tệp: checkout mới luôn làm package-lock.json "mới hơn".
stamp=node_modules/.casa-lock-da-cai
if [ -d node_modules ] && cmp -s package-lock.json "$stamp"; then
  exit 0
fi
# npm ci cài đúng theo package-lock.json và không sửa nó (sửa thì Stop gate tưởng có thay đổi).
if npm ci --no-audit --no-fund >&2; then
  cp package-lock.json "$stamp"
else
  echo "session-start: npm ci lỗi (mạng?). Chạy lại 'npm ci' trong phiên trước khi chạy test." >&2
fi
exit 0
