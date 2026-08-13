# Thêm tính năng mới mà không đụng vào phần đang chạy

Mỗi thư mục con ở đây là một **phân hệ cắm thêm**. Máy chủ tự tìm thấy khi khởi
động, nhà trường bật/tắt trong **Quản trị → Tính năng**.

Nguyên tắc quan trọng: **một phân hệ lỗi chỉ tự nó không dùng được, toàn bộ phần
còn lại của ứng dụng vẫn chạy bình thường.** Máy chủ bắt lỗi khi nạp từng phân hệ
và ghi ra log, không để cả hệ thống sập.

---

## Cấu trúc một phân hệ

```
modules/hocphi/
├── module.json     bắt buộc — khai báo tên, biểu tượng, đường dẫn API
├── schema.sql      tùy chọn — bảng riêng của phân hệ
├── routes.js       tùy chọn — các đường dẫn API
└── view.js         tùy chọn — màn hình hiển thị
```

### `module.json`

```json
{
  "key": "hocphi",
  "name": "Học phí",
  "desc": "Phụ huynh xem các khoản phải nộp",
  "hash": "#/hocphi",
  "view": "hocphi",
  "emoji": "💳",
  "bg": "linear-gradient(135deg,#f2994a,#e07b39)",
  "api": ["/api/hocphi"],
  "roles": ["parent", "teacher", "admin"],
  "defaultEnabled": false
}
```

| Trường | Ý nghĩa |
|---|---|
| `key` | Mã duy nhất, không trùng phân hệ nào khác |
| `name` | Tên hiển thị dưới biểu tượng |
| `hash` | Đường dẫn trong ứng dụng, phải khớp `#/` + `view` |
| `view` | Tên đăng ký `App.views.<view>` trong `view.js` |
| `emoji` hoặc `icon` | Biểu tượng; `icon` dùng bộ có sẵn trong `public/js/ui.js` |
| `api` | **Các đường dẫn API của phân hệ — dùng để chặn khi tắt** |
| `roles` | Vai trò được thấy phân hệ này |
| `defaultEnabled` | `false` thì mặc định tắt, nhà trường tự bật |

### `schema.sql`

Đặt tên bảng có tiền tố là mã phân hệ (`hocphi_khoan`) để không đụng bảng của
phần khác. Luôn dùng `CREATE TABLE IF NOT EXISTS` vì tệp này chạy mỗi lần khởi
động máy chủ.

### `routes.js`

```js
module.exports = (app, { db }) => {
  const { requireRole } = require('../../lib/auth');

  app.get('/api/hocphi', (req, res) => {
    const studentId = req.query.studentId;
    // Dùng lại đúng hàm kiểm tra quyền của phần lõi
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem' });
    }
    res.json(db.all('hocphi_khoan',
      'SELECT * FROM hocphi_khoan WHERE studentId = ?', [studentId]));
  });
};
```

Người dùng đã được xác thực sẵn khi đến đây (`req.user` luôn có). Việc **kiểm tra
quyền theo học sinh và theo lớp thì phân hệ phải tự làm** bằng
`db.canAccessStudent(req.user, studentId)` hoặc `db.canAccessClass(req.user, classId)`.

### `view.js`

```js
App.views.hocphi = {
  async render(root) {
    const d = await API.get('/api/hocphi?studentId=' + App.currentStudent().id);
    root.innerHTML = UI.pageHeader('Học phí') + '…';
  },
};
```

Dùng được toàn bộ hàm trợ giúp sẵn có: `UI.pageHeader`, `UI.esc`, `UI.modal`,
`UI.badge`, `UI.studentBar`, `App.state`, `API.get/post/put/del`… nên giao diện
của phân hệ mới trông đồng bộ với phần còn lại.

**Luôn bọc dữ liệu động bằng `UI.esc(...)`** trước khi chèn vào HTML.

---

## Quy trình thêm một phân hệ

1. Tạo thư mục và bốn tệp như trên.
2. Khởi động lại máy chủ — trong log sẽ thấy dòng `Phân hệ mở rộng: <mã>`.
3. Đăng nhập bằng tài khoản quản trị → **Quản trị → Tính năng** → bật phân hệ.
4. Người dùng thấy biểu tượng mới ở màn hình chính ngay lần mở tiếp theo.
5. Chạy `npm run test:tinh-nang` để chắc chắn phần đang chạy không bị ảnh hưởng.
   Bộ này dựng máy chủ riêng với cơ sở dữ liệu tạm nên **không đụng dữ liệu thật**.

Gỡ phân hệ: tắt trong trang quản trị, hoặc xóa hẳn thư mục rồi khởi động lại.
Bảng dữ liệu của nó vẫn nằm trong cơ sở dữ liệu, không mất.

---

## Vì sao tắt một phân hệ là an toàn

Khi tắt, máy chủ **chặn luôn các đường dẫn API** khai báo trong `api` và trả lỗi
404. Người biết đường dẫn cũng không lấy được dữ liệu — giấu biểu tượng ngoài
giao diện là chưa đủ.

Dữ liệu đã có được giữ nguyên. Bật lại là dùng tiếp bình thường.

---

## Ví dụ có sẵn

Thư mục `hocphi/` là một phân hệ hoàn chỉnh làm mẫu: có bảng riêng, ba đường dẫn
API kèm kiểm tra quyền, và màn hình cho cả phụ huynh lẫn giáo viên. Mặc định tắt,
bật lên trong trang quản trị để xem cách hoạt động.
