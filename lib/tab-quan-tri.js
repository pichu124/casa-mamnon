// DẢI TAB CỦA MÀN QUẢN TRỊ THEO CHỨC VỤ (L6 — góp ý 20/10, mục 12).
//
// Bảng `loại tài khoản → mã tab` mà màn hình vẽ ra. Đây chỉ là chỉ đường cho
// màn hình: chốt thật vẫn nằm ở từng đường API, và KHÔNG đường đọc nào bị
// siết theo bảng này (màn khác có thể đang đọc chúng).
//
// routes/auth.js nạp tệp này NGAY LÚC GỌI, trong khối bắt lỗi: tệp hỏng hay
// bị gỡ thì `tabQuanTri` là null và màn hình vẽ đủ tab như cũ — đăng nhập
// không bao giờ phụ thuộc vào tệp này (test/tab-quan-tri.test.mjs canh).

const TAT_CA = ['taikhoan', 'thongtin', 'motngay', 'danhgia', 'coso', 'quantam', 'tinhnang', 'namhoc', 'nhatky'];

const TAB_QUAN_TRI = {
  cap1: TAT_CA,
  // Cài đặt đánh giá: chỉ xem và gửi đề xuất. Năm học: xem trước.
  quanly: ['taikhoan', 'thongtin', 'motngay', 'danhgia', 'quantam', 'namhoc', 'nhatky'],
  vanphong: ['taikhoan', 'thongtin', 'motngay', 'quantam', 'nhatky'],
  // Nhân sự: tài khoản cô, và ở "Thông tin bé & nhân sự" CHỈ mục Nhân sự (hồ
  // sơ cô, nhập cô từ tệp — chủ dự án 02/11: Nhân sự giữ đủ quyền hồ sơ nhân
  // sự). Không mục nào về bé: màn hình lọc mục con theo chức vụ.
  nhansu: ['taikhoan', 'thongtin'],
  // Kế toán, Marketing, Bảo vệ cổng.
  khac: [],
};

// Cấp 1 = chưa khai chức vụ hoặc ban giám hiệu, VÀ không khoá vào cơ sở nào —
// đúng hai chốt của `POST /api/admin/managers`. Khoá vào một cơ sở thì là quản
// lý của cơ sở ấy, như từ trước tới nay.
function loaiQuanTri(db, user) {
  if (!user || user.role !== 'admin') return null;
  const cv = db.chucVu(user);
  if (cv === null || cv === 'hieu-truong') return db.phamViCoSo(user) === null ? 'cap1' : 'quanly';
  if (cv === 'quanly-coso') return 'quanly';
  if (cv === 'vanphong-coso') return 'vanphong';
  if (cv === 'nhansu') return 'nhansu';
  return 'khac';
}

// Danh sách mã tab, hoặc null với tài khoản không phải quản trị.
function tabQuanTri(db, user) {
  const loai = loaiQuanTri(db, user);
  return loai ? [...TAB_QUAN_TRI[loai]] : null;
}

module.exports = { TAB_QUAN_TRI, loaiQuanTri, tabQuanTri };
