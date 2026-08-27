// Hồ sơ của con ĐÃ RA TRƯỜNG hoặc đã chuyển đi.
//
// Vì sao cần: quyền đọc hồ sơ một em đi theo quan hệ cha mẹ – con
// (`db.canAccessStudent`), và quan hệ đó KHÔNG mất khi em rời trường. Nhưng
// `db.studentsOf` lọc `active = 1`, nên em biến khỏi ô chọn con trên màn hình —
// phụ huynh mất luôn học bạ và sổ liên lạc của 5 năm tiểu học, dù máy chủ vẫn
// sẵn sàng trả về. Đây là mất mát lớn hơn hẳn việc mất album lớp cũ.
//
// CỐ Ý làm thành màn hình RIÊNG thay vì nhét con cũ vào ô chọn con:
// `App.state.students` và `UI.studentBar` nằm trong nhóm tệp dùng chung, mà quy
// định của kho mã là chỉ được thêm chứ không đổi thứ đang có. Một màn hình riêng
// đạt đúng mục tiêu mà không chạm vào chúng.
const db = require('../lib/db');

// Giữ quyền bao lâu sau khi em rời trường.
//
// Nhà trường chọn 1 năm: đủ để phụ huynh tải học bạ về khi con chuyển cấp, rồi
// tự đóng lại. Dữ liệu trẻ em thuộc nhóm nhạy cảm theo Nghị định 13/2023 nên
// việc mở quyền truy cập vô thời hạn là không nên.
//
// Hết hạn thì chỉ ĐÓNG ĐƯỜNG XEM, tuyệt đối không xóa gì: nhà trường vẫn phải
// giữ hồ sơ theo quy định lưu trữ, và quản trị vẫn tra được.
const SO_THANG_GIU = 12;

function hetHan(leftAt) {
  if (!leftAt) return false;
  const d = new Date(`${leftAt}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  d.setUTCMonth(d.getUTCMonth() + SO_THANG_GIU);
  return new Date() > d;
}

module.exports = (app) => {
  // Danh sách con đã rời trường mà phụ huynh còn được xem.
  app.get('/api/hocsinh-cu', (req, res) => {
    if (req.user.role !== 'parent') {
      // Giáo viên và quản trị đã có đường riêng để tra học sinh cũ
      // (Quản trị → Năm học). Không nhân đôi ở đây.
      return res.json({ soThangGiu: SO_THANG_GIU, students: [] });
    }
    const rows = db.all('students',
      `SELECT s.* FROM students s
       JOIN student_parents sp ON sp.studentId = s.id
       WHERE sp.parentId = ? AND s.active = 0
       ORDER BY s.leftAt DESC, s.name`, [req.user.id]);

    const students = rows
      .filter(s => !hetHan(s.leftAt))
      .map(s => {
        const cls = s.classId ? db.findClass(s.classId) : null;
        return {
          id: s.id,
          name: s.name,
          code: s.code,
          avatar: s.avatar,
          dob: s.dob,
          leftAt: s.leftAt,
          lopCuoi: cls ? cls.name : '',
          namCuoi: cls ? cls.year || '' : '',
        };
      });

    res.json({
      soThangGiu: SO_THANG_GIU,
      // Để giao diện nói được "còn N em nữa đã quá hạn xem" thay vì im lặng.
      soDaQuaHan: rows.length - students.length,
      students,
    });
  });

  // Toàn bộ hồ sơ lưu lại của một em đã rời trường, gom vào một lượt gọi.
  //
  // Gom một lượt thay vì để giao diện gọi bốn đường: mỗi đường kia đều lọc theo
  // học sinh đang học ở một chỗ nào đó, và sửa cả bốn là đụng vào bốn phân hệ
  // đang chạy. Đọc gọn ở đây an toàn hơn.
  app.get('/api/hocsinh-cu/:id', (req, res) => {
    const hs = db.findStudent(req.params.id);
    if (!hs) return res.status(404).json({ error: 'Không tìm thấy bé' });
    if (!db.canAccessStudent(req.user, hs.id)) {
      return res.status(403).json({ error: 'Không có quyền xem hồ sơ của bé này' });
    }
    if (req.user.role === 'parent' && hetHan(hs.leftAt)) {
      return res.status(403).json({
        error: `Hồ sơ của bé chỉ tra cứu được trong ${SO_THANG_GIU} tháng sau khi rời trường. `
          + 'Xin liên hệ nhà trường nếu gia đình cần bản sao.',
      });
    }

    const cls = hs.classId ? db.findClass(hs.classId) : null;
    const baoCao = db.all('reports',
      'SELECT * FROM reports WHERE studentId = ? ORDER BY year DESC, term DESC', [hs.id]);
    const nhanXet = db.all('remarks',
      'SELECT * FROM remarks WHERE studentId = ? ORDER BY date DESC, id DESC LIMIT 200', [hs.id])
      .map(r => {
        const t = r.teacherId ? db.findUser(r.teacherId) : null;
        return { ...r, teacherName: t ? `${t.title} ${t.name}` : '' };
      });
    const chuyenCan = db.first('attendance',
      `SELECT
         COUNT(*) AS tong,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS coMat,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS muon,
         SUM(CASE WHEN status LIKE 'absent%' THEN 1 ELSE 0 END) AS vang
       FROM attendance WHERE studentId = ?`, [hs.id]) || {};

    res.json({
      student: {
        id: hs.id, name: hs.name, code: hs.code, avatar: hs.avatar,
        dob: hs.dob, gender: hs.gender, address: hs.address, leftAt: hs.leftAt,
        lopCuoi: cls ? cls.name : '',
        namCuoi: cls ? cls.year || '' : '',
      },
      baoCao,
      nhanXet,
      chuyenCan: {
        tong: Number(chuyenCan.tong) || 0,
        coMat: Number(chuyenCan.coMat) || 0,
        muon: Number(chuyenCan.muon) || 0,
        vang: Number(chuyenCan.vang) || 0,
      },
    });
  });
};
