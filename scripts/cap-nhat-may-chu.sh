#!/usr/bin/env bash
# CẬP NHẬT CASA MẦM NON TRÊN MÁY CHỦ — có đường lui (Đ261g).
#
# Cài một lần (bản chép nằm NGOÀI kho mã, để `git pull` không thay tệp đang chạy):
#     cp /opt/casa-mamnon/scripts/cap-nhat-may-chu.sh ~/cap-nhat.sh && chmod +x ~/cap-nhat.sh
# Mỗi lần cập nhật:
#     ~/cap-nhat.sh
#
# Thứ tự, và bước nào hỏng thì sao:
#   1. Kho mã có sửa tay chưa commit → DỪNG, không đụng gì.
#   2. Sao lưu (npm run backup). Hỏng → DỪNG, không đụng gì.
#   3. Lấy mã mới (git fetch). Không có gì mới → thoát.
#   4. package.json / package-lock.json đổi → `npm ci` vào THƯ MỤC TẠM. Hỏng
#      (mất mạng giữa chừng) → DỪNG: mã và node_modules đang chạy còn nguyên.
#      Bản cũ `npm ci` xoá node_modules TRƯỚC khi cài: mất mạng giữa chừng là
#      app đang chạy mất thư viện nạp muộn (web-push), và lần tự khởi động lại
#      kế tiếp thì chết hẳn.
#   5. Đổi sang mã mới, đổi chỗ node_modules (bản cũ giữ ở node_modules.truoc-cap-nhat).
#   6. Khởi động lại HAI LẦN, mỗi lần chờ /healthz trả {"ok":true}. Lần hai bắt lỗi
#      lược đồ dữ liệu chỉ chết từ lần chạy thứ hai.
#   7. Hỏng ở bước 6 → QUAY LUI: mã cũ + node_modules cũ, khởi động lại, kiểm lại,
#      rồi báo người trực (scripts/canh-may.js --gui, nếu đã đặt kênh báo).
#      Dữ liệu KHÔNG tự khôi phục — xem mục "Quay lui" của docs/MAY-CHU-THU-INTERDATA.md.
#
# Biến môi trường (đều có mặc định cho máy InterData):
#   MA_NGUON=/opt/casa-mamnon  DATA_DIR=/var/lib/casa-mamnon  DICH_VU=casa-mamnon
#   NHANH=main  PORT=3000  TEN_MIEN=(trống; có thì kiểm thêm https://TEN_MIEN/healthz)
#   CANH_ENV=/etc/casa-mamnon/canh-may.env (kênh báo của scripts/canh-may.js, nếu có)
#   CHO_GIAY=40 (chờ /healthz tối đa bao lâu mỗi lần khởi động)
set -Eeuo pipefail

MA_NGUON="${MA_NGUON:-/opt/casa-mamnon}"
DATA_DIR="${DATA_DIR:-/var/lib/casa-mamnon}"
DICH_VU="${DICH_VU:-casa-mamnon}"
NHANH="${NHANH:-main}"
PORT="${PORT:-3000}"
TEN_MIEN="${TEN_MIEN:-}"
CANH_ENV="${CANH_ENV:-/etc/casa-mamnon/canh-may.env}"
CHO_GIAY="${CHO_GIAY:-40}"
export DATA_DIR

loi() { printf '\n✘ %s\n' "$*" >&2; }
buoc() { printf '\n▶ %s\n' "$*"; }

bao_nguoi_truc() {
  local tin="$1"
  (
    set +e
    if [ -r "$CANH_ENV" ]; then set -a; . "$CANH_ENV"; set +a; fi
    node "$MA_NGUON/scripts/canh-may.js" --gui "$tin"
  ) || loi "Chưa gửi được tin cho người trực (xem dòng trên). Tự báo bằng tay."
}

cho_healthz() {
  local i
  for ((i = 0; i < CHO_GIAY; i += 2)); do
    if curl -fsS -m 5 -H 'X-Forwarded-Proto: https' "http://127.0.0.1:$PORT/healthz" 2>/dev/null | grep -q '"ok":true'; then
      if [ -z "$TEN_MIEN" ] || curl -fsS -m 10 "https://$TEN_MIEN/healthz" 2>/dev/null | grep -q '"ok":true'; then
        return 0
      fi
    fi
    sleep 2
  done
  return 1
}

khoi_dong_va_kiem() {
  sudo systemctl restart "$DICH_VU" && cho_healthz
}

cd "$MA_NGUON"

buoc "1/6 Soát kho mã"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  loi "Kho mã ở $MA_NGUON có sửa tay chưa commit — không cập nhật đè lên:"
  git status --short --untracked-files=no >&2
  exit 1
fi
CU="$(git rev-parse HEAD)"
echo "Bản đang chạy: $(git log --oneline -1)"

buoc "2/6 Sao lưu trước khi cập nhật"
if ! node scripts/backup.js; then
  loi "Sao lưu hỏng — dừng, chưa đổi gì. App vẫn chạy bản cũ."
  exit 1
fi
BAN_SAO="$(ls -1t "$DATA_DIR"/backups/school-*.db.gz 2>/dev/null | head -1 || true)"
echo "Bản sao trước cập nhật: ${BAN_SAO:-không thấy}"

buoc "3/6 Lấy mã mới ($NHANH)"
git fetch -q origin "$NHANH"
MOI="$(git rev-parse "origin/$NHANH")"
if [ "$MOI" = "$CU" ]; then
  echo "Đã là bản mới nhất, không có gì để cập nhật."
  exit 0
fi
git log --oneline -20 "$CU..$MOI"

TAM=""
CAI_THU_VIEN=0
if ! git diff --quiet "$CU" "$MOI" -- package.json package-lock.json; then
  CAI_THU_VIEN=1
  buoc "4/6 Thư viện đổi — cài vào thư mục tạm (node_modules đang chạy còn nguyên)"
  TAM="$(mktemp -d "$MA_NGUON/.cai-thu-vien.XXXXXX")"
  git show "$MOI:package.json" > "$TAM/package.json"
  git show "$MOI:package-lock.json" > "$TAM/package-lock.json"
  # Bỏ mục scripts: "prepare" của kho gọi scripts/cai-hook.js, không có trong thư mục tạm.
  node -e 'const f=process.argv[1],fs=require("fs"),p=JSON.parse(fs.readFileSync(f));delete p.scripts;fs.writeFileSync(f,JSON.stringify(p,null,2))' "$TAM/package.json"
  if ! (cd "$TAM" && npm ci --omit=dev --no-audit --no-fund); then
    rm -rf "$TAM"
    loi "Cài thư viện hỏng (thường là mất mạng) — dừng, chưa đổi gì. App vẫn chạy bản cũ."
    exit 1
  fi
else
  buoc "4/6 Thư viện không đổi — bỏ qua npm ci"
fi

quay_lui() {
  loi "Bản mới không lên được — QUAY LUI về $(git log --oneline -1 "$CU")"
  git reset -q --hard "$CU"
  if [ "$CAI_THU_VIEN" = 1 ] && [ -d node_modules.truoc-cap-nhat ]; then
    rm -rf node_modules.hong && mv node_modules node_modules.hong 2>/dev/null || true
    mv node_modules.truoc-cap-nhat node_modules
    rm -rf node_modules.hong
  fi
  local tt="bản cũ đã chạy lại"
  if ! khoi_dong_va_kiem; then
    tt="BẢN CŨ CŨNG KHÔNG LÊN — app đang ngừng, cần người vào máy ngay"
  fi
  sudo journalctl -u "$DICH_VU" -n 30 --no-pager >&2 || true
  bao_nguoi_truc "Cập nhật $(git rev-parse --short "$MOI") HỎNG, đã quay lui mã về $(git rev-parse --short "$CU"): $tt. Bản sao trước cập nhật: ${BAN_SAO##*/}. Xem: sudo journalctl -u $DICH_VU -n 100"
  loi "Đã quay lui: $tt. Nếu bản mới đã kịp ghi dữ liệu kiểu mới, xem mục \"Quay lui\" trong docs/MAY-CHU-THU-INTERDATA.md."
  exit 1
}

buoc "5/6 Đổi sang bản mới"
git merge -q --ff-only "$MOI"
if [ "$CAI_THU_VIEN" = 1 ]; then
  rm -rf node_modules.truoc-cap-nhat
  [ -d node_modules ] && mv node_modules node_modules.truoc-cap-nhat
  mv "$TAM/node_modules" node_modules
  rm -rf "$TAM"
fi

buoc "6/6 Khởi động lại hai lần, mỗi lần chờ /healthz"
khoi_dong_va_kiem || quay_lui
khoi_dong_va_kiem || quay_lui

echo
echo "✔ Đã cập nhật: $(git log --oneline -1)"
if [ -n "$TEN_MIEN" ]; then
  curl -s "https://$TEN_MIEN/sw.js" | grep "const VERSION" || true
fi
echo "Điện thoại đã cài app: mở, đóng hẳn, mở lại — lần mở thứ hai mới là bản mới."
