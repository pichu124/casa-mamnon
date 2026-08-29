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

Đây không phải quy ước cho đẹp — máy chủ kiểm tra thật và **từ chối chạy** tệp
không tuân thủ:

- Chỉ chấp nhận `CREATE TABLE / INDEX / VIEW / TRIGGER ... IF NOT EXISTS`.
  Mọi câu `DROP`, `ALTER`, `DELETE`, `UPDATE` đều bị chặn.
- Tên bảng phải là mã phân hệ hoặc bắt đầu bằng `<mã>_`.
- Chỉ mục và trigger phải gắn vào bảng của chính phân hệ này.

Sai một điều là cả phân hệ bị đánh dấu lỗi và không chạy, nhưng **dữ liệu của phần
còn lại không hề bị đụng tới** — đó mới là điều quan trọng.

### `routes.js`

```js
module.exports = (app, { db, modules }) => {
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

#### Đọc bảng của phân hệ KHÁC thì phải hỏi công tắc trước

Tham số thứ hai là `{ db, modules }`, không phải chỉ `{ db }`. `modules` có đúng
một việc, và là việc dễ quên nhất trong cả trang này:

```js
// SAI — đọc thẳng bảng của phân hệ khác
const td = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngay]);

// ĐÚNG — hỏi trước xem nhà trường còn bật phân hệ đó không
if (!modules.dangBat('thucdon')) return null;
const td = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngay]);
```

**Vì sao chặn ở HTTP là không đủ:** tắt một phân hệ thì máy chủ chặn *đường dẫn
API* của nó. Nhưng khi phân hệ của bạn đọc thẳng bảng của nó thì đường đi đó
**không qua HTTP** — không có gì để chặn. Nhà trường tắt Điểm danh xong, màn Báo
ăn vẫn trừ suất theo một quyển sổ không còn ai cập nhật, và bếp nấu thiếu.

Đây không phải chuyện giả định: **Báo ăn đã bỏ sót đúng bước này** (vá ở Đ46),
và trước đó Thực đơn (Y1) rồi Ghi nhanh (N24) cũng vậy. Ba lần cùng một chỗ.

`modules` có thể không được truyền vào ở vài đường nạp cũ. Khi đó **coi như đang
bật** — mặc định mở chứ không mặc định đóng, vì đóng nhầm thì tính năng biến mất
mà không ai hiểu vì sao.

#### Đường dẫn API mới mặc định BỊ TỪ CHỐI với tài khoản Cấp 2

Tầng chức vụ (`CHUC_VU` trong `lib/db.js`) chặn theo **danh sách cho phép**, cố ý
để "quên thì quên theo hướng đóng lại". Nghĩa là một `api` mới khai ở
`module.json` sẽ **không** tự có mặt trong phần việc của Kế toán, Nhân sự,
Marketing hay Văn phòng cơ sở.

Nếu phân hệ mới thuộc phần việc của một trong các chức vụ đó thì phải thêm đường
dẫn vào đúng mảng `api` của chức vụ ấy. `lib/db.js` là **tệp dùng chung**, nên
việc này phải là một **commit riêng** (xem `CLAUDE.md`).

Không thêm cũng không sao — người dùng vẫn vào được bằng tài khoản ban giám hiệu
hoặc quản lý cơ sở. Chỉ là tài khoản Cấp 2 bấm vào ô mới sẽ nhận 403 kèm câu
*"Cần thêm quyền thì nhờ ban giám hiệu đổi chức vụ giúp"* — mà ban giám hiệu
**không có** màn hình nào sửa được danh sách đó. `npm run test:chuc-vu` canh cho
hai danh sách khớp nhau.

Người dùng đã được xác thực sẵn khi đến đây (`req.user` luôn có). Việc **kiểm tra
quyền theo học sinh và theo lớp thì phân hệ phải tự làm** bằng
`db.canAccessStudent(req.user, studentId)` hoặc `db.canAccessClass(req.user, classId)`.

`app` truyền vào đây đã được bọc lại: phân hệ **chỉ đăng ký được đường dẫn nằm
trong vùng `api` đã khai báo**. Thử đăng ký `/api/remarks` hay `/api/students` sẽ
bị từ chối ngay khi khởi động, kèm thông báo nêu rõ lý do. Nhờ vậy một phân hệ
viết vội không thể vô tình chiếm mất đường dẫn của tính năng đang chạy.

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
2. **Đọc bảng của phân hệ khác thì gọi `modules.dangBat('<mã>')` trước.** Bước
   hay quên nhất, và đã bị quên ba lần — xem mục `routes.js` ở trên.
3. **Phần việc của một chức vụ Cấp 2?** Thêm đường dẫn vào mảng `api` của chức
   vụ đó trong `lib/db.js`, bằng một **commit riêng** vì đó là tệp dùng chung.
4. Khởi động lại máy chủ — trong log sẽ thấy dòng `Phân hệ mở rộng: <mã>`.
5. Đăng nhập bằng tài khoản quản trị → **Quản trị → Tính năng** → bật phân hệ.
6. Người dùng thấy biểu tượng mới ở màn hình chính ngay lần mở tiếp theo.
7. **Viết tệp kiểm thử riêng** `test/<mã>.test.mjs` và thêm vào `npm test` trong
   `package.json`. `npm run test:bai-canh-that` báo đỏ nếu có tệp test không ai
   chạy; Học phí là phân hệ cuối cùng còn thiếu tệp riêng, và thiếu tới tận Đ42.
8. Chạy `npm test` để chắc chắn phần đang chạy không bị ảnh hưởng. Bộ kiểm thử
   dựng máy chủ riêng với cơ sở dữ liệu tạm nên **không đụng dữ liệu thật**.

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
