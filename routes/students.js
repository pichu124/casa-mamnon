// Phân hệ Học sinh: hồ sơ học sinh, danh sách lớp (giáo viên).
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { publicUser } = require('./auth');

function decorate(s, nhomCua) {
  const cls = nhomCua ? nhomCua(s.classId).cls : (s.classId ? db.findClass(s.classId) : null);
  return {
    ...s,
    className: cls ? cls.name : '',
    room: cls ? cls.room : '',
    // Nhóm mầm non có 2–3 cô cùng phụ trách. `teacherName` giữ nguyên hình dạng
    // cũ (một cô — cô phụ trách chính) cho màn hình chưa đổi; `teachers` và
    // `teacherNames` là chỗ các cô còn lại hiện ra.
    ...(nhomCua ? nhomCua(s.classId).co : nl.tomTat(s.classId)),
  };
}

// MỘT NHÓM HỎI MỘT LẦN CHO CẢ DANH SÁCH.
//
// `decorate` hỏi hai câu cho MỖI bé, mà `/api/students` của hiệu trưởng trả về
// toàn bộ bé đang học của trường — cùng hình dạng, cùng lý do và cùng cách vá
// với `mePayload` ở routes/auth.js. Xem khối chú thích ở đó, gồm cả lý do bảng
// nhớ này PHẢI sống đúng một lượt gọi chứ không được nâng ra ngoài.
function taoNhoNhom() {
  const nho = new Map();
  return (classId) => {
    const khoa = classId || '';
    if (!nho.has(khoa)) {
      nho.set(khoa, {
        cls: classId ? db.findClass(classId) : null,
        co: nl.tomTat(classId),
      });
    }
    return nho.get(khoa);
  };
}

module.exports = (app) => {
  // Danh sách học sinh mà người dùng được xem, kèm thông tin lớp + GVCN.
  app.get('/api/students', (req, res) => {
    // Một bảng nhớ cho ĐÚNG lượt gọi này — xem `taoNhoNhom` ở trên.
    const nhomCua = taoNhoNhom();
    res.json(db.studentsOf(req.user).map(s => decorate(s, nhomCua)));
  });

  // Hồ sơ chi tiết một học sinh.
  app.get('/api/students/:id', (req, res) => {
    if (!db.canAccessStudent(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Không có quyền xem bé này' });
    }
    const s = db.findStudent(req.params.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bé' });
    const hoSo = db.hoSoBe(s.id);

    // SỐ CCCD CỦA PHỤ HUYNH có ranh giới KHÁC số định danh của bé.
    //
    // Nhà trường cần nó để đối chiếu khi ký hợp đồng và khi giao bé cho người
    // tới đón. Nhưng nó là giấy tờ của NGƯỜI LỚN, nên:
    //
    //   • quản trị đọc được — đó là việc của văn phòng;
    //   • CHÍNH NGƯỜI ĐÓ đọc được số của mình, để biết trường đang giữ gì;
    //   • cô KHÔNG đọc được — cô không cần số giấy tờ của bố mẹ để dạy bé;
    //   • PHỤ HUYNH CÒN LẠI của cùng một bé cũng KHÔNG đọc được. Bố mẹ ly hôn
    //     là chuyện có thật ở trường mầm non, và app không được là nơi một bên
    //     lấy được số giấy tờ của bên kia.
    //
    // Vì `publicUser` chỉ gạt `passwordHash`, mọi thứ khác trong hàng `users`
    // đi thẳng ra ngoài. Nên soCccd phải được GHÉP TAY vào đúng người, chứ
    // không phải lọc bớt sau khi đã lấy cả hàng ra.
    const chiQuanTri = req.user.role === 'admin';
    const parents = s.parentIds.map(pid => {
      const p = publicUser(db.findUser(pid));
      if (!p) return null;
      const duocXem = chiQuanTri || req.user.id === pid;
      return duocXem ? { ...p, soCccd: db.hoSoNguoiDung(pid).soCccd } : p;
    }).filter(Boolean);

    // SỐ ĐỊNH DANH CÁ NHÂN chỉ về tay quản trị và văn phòng.
    //
    // Đây là dữ liệu cá nhân theo Nghị định 13/2023. Cô cần biết tiền sử bệnh
    // và số gọi khẩn cấp của bé — cô KHÔNG cần số định danh để làm việc, nên
    // không gửi. Cắt ở máy chủ chứ không giấu ở giao diện: giấu ở giao diện thì
    // người biết đường dẫn vẫn lấy được. `chiQuanTri` đã tính ở trên.

    // Thông tin liên hệ của trường: cơ sở của nhóm bé trước, không có thì lùi
    // về thông tin chung của trường. Nhà trường yêu cầu phụ huynh gọi HOTLINE
    // VĂN PHÒNG chứ không gọi số riêng của cô.
    const truong = db.school() || {};
    const cs = db.findCampus(db.campusOfClass(s.classId)) || {};
    const lienHeTruong = {
      tenCoSo: cs.name || '',
      diaChi: cs.address || truong.address || '',
      hotline: cs.phone || truong.phone || '',
      email: cs.email || truong.email || '',
    };

    res.json({
      ...decorate(s),
      parents,
      lienHeTruong,
      tienSuBenh: hoSo.tienSuBenh,
      lienHeKhanCap: hoSo.lienHeKhanCap,
      ...(chiQuanTri ? { soDinhDanh: hoSo.soDinhDanh } : {}),
    });
  });

  // =========================================================================
  // GIẤY ĐỒNG Ý — GIA ĐÌNH XEM MÌNH ĐÃ KÝ GÌ, VÀ RÚT LẠI ĐƯỢC
  // =========================================================================
  //
  // VÌ SAO CẦN
  //
  // Ba ô đồng ý (① hồ sơ học tập ② chia sẻ ảnh cho gia đình khác ③ dùng ảnh
  // truyền thông) trước đây chỉ ghi được qua đường quản trị, và KHÔNG một màn
  // hình nào của phụ huynh chạm tới dữ liệu đó. Gia đình muốn rút phải gọi
  // điện cho văn phòng, và cũng không có chỗ nào để tự kiểm mình đã ký gì.
  //
  // `docs/KE-HOACH.md` ghi "rút lại được bất cứ lúc nào", và Nghị định
  // 13/2023 cho chủ thể dữ liệu quyền đó. Một quyền mà chỉ thực hiện được qua
  // điện thoại bàn thì trên thực tế là một quyền khó dùng.
  app.get('/api/dong-y', (req, res) => {
    const studentId = String((req.query || {}).studentId || '');
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem giấy đồng ý của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });
    res.json({
      be: { id: be.id, hoTen: be.name },
      dongY: db.dongYCuaBe(be.id),
      // Gia đình sửa được hay không — để màn hình khỏi phải đoán theo vai.
      tuRutDuoc: req.user.role === 'parent',
    });
  });

  // GIA ĐÌNH CHỈ RÚT ĐƯỢC, KHÔNG TỰ ĐỒNG Ý ĐƯỢC.
  //
  // Đây là chỗ dễ làm sai nhất của cả tính năng, nên nói rõ:
  //
  // Đồng ý là một tờ giấy CÓ CHỮ KÝ, do văn phòng thu và ghi lại. Nếu bấm một
  // nút trong app cũng ghi được "đã đồng ý" thì nhà trường sẽ có một bản ghi
  // đồng ý mà không có chữ ký nào đứng sau — và lúc có chuyện thì không ai
  // chứng minh được gia đình đã đồng ý thật.
  //
  // Rút lại thì ngược hẳn: nó KHÔNG cần chữ ký. Nghị định 13/2023 nói rút lại
  // là quyền, và một quyền thì không được đặt điều kiện thủ tục lên nó. Nên
  // đường này nhận đúng MỘT chiều: đưa một mục về "không đồng ý".
  app.put('/api/dong-y', (req, res) => {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        error: 'Đường này dành cho gia đình tự rút lại đồng ý. '
          + 'Văn phòng ghi giấy đồng ý ở màn Quản trị → Hồ sơ bé.',
      });
    }
    const b = req.body || {};
    const studentId = String(b.studentId || '');
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền sửa giấy đồng ý của bé này' });
    }
    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });

    const MUC = ['hoSoHocTap', 'chiaSeGiaDinh', 'truyenThong'];
    const nhan = {};
    for (const k of MUC) {
      if (!(k in b)) continue;
      if (b[k] !== false) {
        return res.status(400).json({
          error: 'Gia đình rút lại được bất cứ lúc nào, nhưng phần ĐỒNG Ý thì phải '
            + 'ký giấy ở văn phòng — app không thay được chữ ký.',
        });
      }
      nhan[k] = false;
    }
    if (!Object.keys(nhan).length) {
      return res.status(400).json({ error: 'Không có mục nào để rút lại' });
    }

    const ket = db.datDongY(be.id, nhan);
    // Ghi rõ CHÍNH GIA ĐÌNH tự rút, không phải văn phòng sửa hộ — khi có khiếu
    // nại thì hai chuyện đó khác hẳn nhau.
    db.audit(req.user.id, 'consent-rut-lai', be.id, { name: be.name, ...nhan });
    res.json({ id: be.id, dongY: ket });
  });
};
