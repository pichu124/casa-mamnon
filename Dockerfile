# Ảnh chạy SchoolConnect. Dùng được cho Render, Railway, Fly.io hoặc máy chủ riêng.
FROM node:22-alpine

# Chạy bằng người dùng thường thay vì root cho an toàn.
WORKDIR /app

# Cài phụ thuộc trước để tận dụng bộ nhớ đệm khi chỉ đổi mã nguồn.
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# Thư mục dữ liệu: gắn ổ đĩa ngoài vào đây để không mất dữ liệu khi triển khai lại.
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=3000
RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# ---------------------------------------------------------------------------
# LẦN CHẠY ĐẦU TIÊN — đọc trước khi bấm chạy
#
# Ổ đĩa mới gắn vào /data là ổ TRỐNG. Với NODE_ENV=production, máy chủ DỪNG có
# chủ ý khi cơ sở dữ liệu trống, thay vì tự sinh dữ liệu mẫu — vì dữ liệu mẫu
# kèm 9 tài khoản dùng chung mật khẩu "123456", và sinh chúng ra trên một máy
# chủ đang mở ra Internet là tự mở cửa cho người lạ.
#
# Vậy nên phải tạo tài khoản quản trị TRƯỚC, trên chính ổ đĩa đó:
#
#   docker run --rm -v casa-data:/data <tên-ảnh> \
#     npm run create-admin "Nguyễn Văn Hiệu" hieutruong
#
# Script in ra một mật khẩu tạm — ghi lại, lần đăng nhập đầu app bắt đổi ngay.
# Sau bước đó mới chạy dịch vụ như bình thường.
# ---------------------------------------------------------------------------
CMD ["node", "server.js"]
