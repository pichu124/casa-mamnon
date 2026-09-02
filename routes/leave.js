// Phân hệ Xin phép nghỉ học: phụ huynh tạo đơn, VĂN PHÒNG duyệt / từ chối.
//
// AI DUYỆT — VÀ VÌ SAO ĐỔI
//
// Bản kế thừa từ app 1 cho cô duyệt. Nhà trường mầm non yêu cầu khác: "cô chỉ
// biết, văn phòng mới duyệt, và khi duyệt thì ghi luôn có hoàn tiền ăn hay
// không". Lý do rất thực tế — duyệt một đơn nghỉ ở đây không chỉ là gật đầu,
// nó kéo theo tiền ăn của tháng đó, mà tiền thì cô không cầm và không đối
// chiếu. Cô vẫn ĐỌC được mọi đơn của nhóm mình để biết hôm nào bé vắng.
const db = require('../lib/db');
const { requireRole } = require('../lib/auth');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOI_DA_LY_DO = 1000;
// Trần độ dài KHOẢNG NGÀY của một đơn xin nghỉ.
//
// Cùng lý do với trần độ dài lý do ngay trên: đây là đường PHỤ HUYNH gọi được,
// và app chưa có đường nào xoá một đơn đã gửi. Nhưng hậu quả ở đây nặng hơn hẳn
// một màn hình dài: đơn đã duyệt kéo theo hai thứ có thật ngoài đời — bé bị
// đánh dấu nghỉ suốt khoảng đó ở màn Điểm danh, và màn Báo ăn gợi ý cho văn
// phòng HOÀN TIỀN ĂN đúng số ngày ấy.
//
// Gõ nhầm một chữ số ở ô năm (2026 → 2027) là bé "nghỉ" cả năm và văn phòng
// nhận gợi ý hoàn hơn hai trăm ngày tiền ăn. 60 ngày đủ rộng cho một đợt nghỉ
// dài thật (mổ, về quê một học kỳ hè), và một đợt dài hơn thì đúng ra phải là
// cuộc nói chuyện với nhà trường chứ không phải một đơn gửi qua app.
const TOI_DA_NGAY_NGHI = 60;
const TOI_DA_GHI_CHU_DUYET = 500;

// Hai giá trị, cố ý là CHỮ chứ không phải 0/1 — xem chú thích bảng `leave_refund`.
const HOAN = ['co', 'khong'];

// Số ngày dương lịch một đơn trải qua, tính cả ngày đầu và ngày cuối.
function soNgayTrongDon(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

// Số ngày ĐI HỌC trong đơn — chỉ là CON SỐ GỢI Ý cho văn phòng bấm một nhát,
// không phải con số app tự chốt.
//
// Nó đếm thứ Hai đến thứ Sáu, khớp với thực đơn của trường (bảng `menus` chỉ
// có năm ngày mỗi tuần). Nhưng lịch nghỉ lễ, ngày trường có sự kiện, hay tuần
// trường mở cửa thứ Bảy thì app KHÔNG biết — nên văn phòng sửa lại được, và
// con số văn phòng gõ mới là con số được lưu.
function soNgayHocTrongDon(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  let dem = 0;
  for (let t = a; t <= b; t += 86400000) {
    const thu = new Date(t).getUTCDay();
    if (thu >= 1 && thu <= 5) dem += 1;
  }
  return dem;
}

module.exports = (app) => {
  // Danh sách đơn xin phép người dùng được xem.
  // Phụ huynh: đơn của các con mình. Giáo viên: đơn của học sinh lớp chủ nhiệm.
  app.get('/api/leave', (req, res) => {
    const ids = db.studentIdsOf(req.user);
    if (!ids.length) return res.json([]);
    const marks = ids.map(() => '?').join(',');

    // Đơn CHỜ DUYỆT: lấy hết, không bao giờ cắt. Đây là việc cô phải làm, và màn
    // hình đếm "Chờ duyệt (N)" ngay trên danh sách này — cắt bớt là con số đó sai
    // mà không có lỗi nào báo.
    const cho = db.all('leave_requests',
      `SELECT * FROM leave_requests WHERE studentId IN (${marks}) AND status = 'pending'
       ORDER BY createdAt DESC`, ids);

    // Đơn ĐÃ XỬ LÝ chỉ là lịch sử, và nó dày lên mãi theo năm. Giữ 60 đơn gần
    // nhất là đủ cho việc tra cứu thường ngày.
    const TOI_DA_LICH_SU = 60;
    const gioiHan = Math.min(Math.max(Number(req.query.gioiHan) || TOI_DA_LICH_SU, 1), 500);
    const xong = db.all('leave_requests',
      `SELECT * FROM leave_requests WHERE studentId IN (${marks}) AND status != 'pending'
       ORDER BY createdAt DESC LIMIT ?`, [...ids, gioiHan]);

    res.json(decorateNhieu([...cho, ...xong]));
  });

  // Phụ huynh tạo đơn xin phép cho con.
  app.post('/api/leave', requireRole('parent'), (req, res) => {
    const { studentId, fromDate, toDate, reason } = req.body || {};
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền tạo đơn cho bé này' });
    }
    if (!DATE_RE.test(String(fromDate || '')) || !DATE_RE.test(String(toDate || ''))) {
      return res.status(400).json({ error: 'Ngày nghỉ không hợp lệ' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc' });
    }
    // TRẦN SỐ ĐƠN ĐANG CHỜ — trần chống bơm rác, KHÔNG phải trần nghiệp vụ.
    // Không có trần thì một tài khoản (hay một vòng lặp viết ẩu) tạo được vô
    // hạn đơn chờ duyệt — màn của văn phòng ngập, và bảng này không có đường
    // xoá. 30 đơn chờ cùng lúc cho MỘT bé thì không tình huống thật nào chạm
    // tới; đơn được duyệt/từ chối xong thì gửi tiếp bình thường.
    const dangCho = db.count(
      `SELECT COUNT(*) FROM leave_requests WHERE studentId = ? AND status = 'pending'`, [studentId]);
    if (dangCho >= 30) {
      return res.status(400).json({
        error: 'Bé đang có quá nhiều đơn chờ duyệt — chờ văn phòng duyệt xong rồi gửi thêm giúp trường nhé',
      });
    }
    const soNgay = Math.round(
      (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000) + 1;
    if (!Number.isFinite(soNgay) || soNgay > TOI_DA_NGAY_NGHI) {
      return res.status(400).json({
        error: `Đơn xin nghỉ dài ${Number.isFinite(soNgay) ? soNgay : '?'} ngày — `
          + `mỗi đơn chỉ xin nghỉ tối đa ${TOI_DA_NGAY_NGHI} ngày. `
          + 'Xin gia đình kiểm lại năm ở hai ô ngày giúp; nghỉ dài hơn thì nhờ liên hệ nhà trường.',
      });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do xin nghỉ cho con' });
    }
    // Cắt độ dài: đây là đường mà PHỤ HUYNH gọi được. Không cắt thì một đơn dài
    // vài MB đủ làm màn hình Xin nghỉ của cả lớp không mở nổi trên điện thoại,
    // mà app lại chưa có đường nào để xóa hay ẩn một đơn đã gửi.
    if (String(reason).trim().length > TOI_DA_LY_DO) {
      return res.status(400).json({ error: `Lý do xin nghỉ quá dài, vui lòng viết ngắn gọn trong ${TOI_DA_LY_DO} ký tự` });
    }
    const rec = {
      id: db.nextId('lv'),
      studentId,
      parentId: req.user.id,
      fromDate,
      toDate,
      reason: String(reason).trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewedBy: null,
      reviewNote: '',
    };
    db.insert('leave_requests', rec);
    res.status(201).json(decorate(rec));
  });

  // VĂN PHÒNG duyệt / từ chối một đơn đang chờ.
  app.post('/api/leave/:id/review', requireRole('teacher', 'admin'), (req, res) => {
    // Cô vào được đường này thì nhận một câu giải thích, không phải câu
    // "Không có quyền thực hiện" cụt lủn. Hôm qua cô còn bấm duyệt được, nên
    // im lặng chặn là cô tưởng app hỏng và gọi điện hỏi văn phòng.
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Đơn xin nghỉ do văn phòng duyệt. Cô vẫn xem được đơn của nhóm mình '
          + 'để biết hôm nào bé nghỉ, còn phần duyệt và hoàn tiền ăn là việc của văn phòng.',
      });
    }
    const rec = db.first('leave_requests', 'SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!rec) return res.status(404).json({ error: 'Không tìm thấy đơn xin phép' });
    if (!db.canAccessStudent(req.user, rec.studentId)) {
      return res.status(403).json({ error: 'Đơn này không phải của bé nào thuộc cơ sở mình' });
    }
    if (rec.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn này đã được xử lý trước đó' });
    }
    const { status, reviewNote, hoanTienAn, soNgayHoan, ghiChuHoan } = req.body || {};
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Trạng thái duyệt không hợp lệ' });
    }

    // DUYỆT LÀ PHẢI CHỐT LUÔN TIỀN ĂN.
    //
    // Nhà trường nói "khi duyệt thì ghi luôn có hoàn tiền ăn hay không". Cho
    // phép bỏ trống là cuối tháng bảng đối chiếu (Y3) có một cột trống mà
    // không ai nhớ vì sao — rồi gia đình hỏi thì không tra lại được.
    let hoan = null;
    if (status === 'approved') {
      const ht = String(hoanTienAn || '').trim();
      if (!HOAN.includes(ht)) {
        return res.status(400).json({
          error: 'Duyệt đơn thì chọn giúp có hoàn tiền ăn cho gia đình hay không',
        });
      }
      let ngay = null;
      if (ht === 'co') {
        const toiDa = soNgayTrongDon(rec.fromDate, rec.toDate);
        // Bỏ trống thì lấy con số gợi ý — văn phòng bấm Duyệt một nhát là xong
        // cho trường hợp thường gặp nhất (nghỉ mấy ngày đi học liền nhau).
        ngay = (soNgayHoan === undefined || soNgayHoan === null || soNgayHoan === '')
          ? soNgayHocTrongDon(rec.fromDate, rec.toDate)
          : Number(soNgayHoan);
        if (!Number.isInteger(ngay) || ngay < 1 || ngay > toiDa) {
          return res.status(400).json({
            error: `Số ngày hoàn tiền ăn phải là số nguyên từ 1 đến ${toiDa}`,
          });
        }
      }
      hoan = {
        hoanTienAn: ht,
        soNgay: ngay,
        ghiChu: String(ghiChuHoan || '').trim().slice(0, TOI_DA_GHI_CHU_DUYET),
      };
    }

    rec.status = status;
    rec.reviewedBy = req.user.id;
    rec.reviewNote = String(reviewNote || '').trim().slice(0, TOI_DA_GHI_CHU_DUYET);
    // Một giao dịch: không để đơn thành "đã duyệt" mà phần tiền ăn thì rơi mất.
    db.tx(() => {
      db.update('leave_requests', rec.id, {
        status: rec.status, reviewedBy: rec.reviewedBy, reviewNote: rec.reviewNote,
      });
      if (hoan) {
        db.upsert('leave_refund', {
          leaveId: rec.id,
          ...hoan,
          nguoiGhi: req.user.id,
          capNhatLuc: new Date().toISOString(),
        }, ['leaveId']);
      }
    });
    db.audit(req.user.id, 'leave-review', rec.id, {
      status,
      hoanTienAn: hoan ? hoan.hoanTienAn : null,
      soNgay: hoan ? hoan.soNgay : null,
    });
    res.json(decorate(rec));
  });
};

// Ghép thêm tên học sinh, lớp, phụ huynh, người duyệt cho một đơn.
function decorate(l) {
  const s = db.findStudent(l.studentId);
  const cls = s ? db.findClass(s.classId) : null;
  const parent = db.findUser(l.parentId);
  const reviewer = l.reviewedBy ? db.findUser(l.reviewedBy) : null;
  const hoan = db.first('leave_refund', 'SELECT * FROM leave_refund WHERE leaveId = ?', [l.id]);
  return {
    ...l,
    studentName: s ? s.name : '',
    studentAvatar: s ? s.avatar : null,
    className: cls ? cls.name : '',
    parentName: parent ? `${parent.title} ${parent.name}` : '',
    reviewerName: reviewer ? `${reviewer.title} ${reviewer.name}` : '',
    // KHÔNG có hàng = văn phòng chưa quyết, khác hẳn "đã quyết là không hoàn".
    hoanTien: hoan
      ? { hoanTienAn: hoan.hoanTienAn, soNgay: hoan.soNgay, ghiChu: hoan.ghiChu }
      : null,
    soNgayTrongDon: soNgayTrongDon(l.fromDate, l.toDate),
    soNgayHocDeXuat: soNgayHocTrongDon(l.fromDate, l.toDate),
  };
}

// BẢN LÔ CỦA `decorate` — cho đường danh sách, nơi có hàng chục đơn một lượt.
//
// `decorate` hỏi ~6 câu cho MỖI đơn (bé + phụ huynh của bé + lớp + người gửi +
// người duyệt + hoàn tiền). Danh sách của văn phòng sau vài năm là hàng nghìn
// câu cho một lần mở màn. Bản lô tra mỗi bảng MỘT lần bằng IN (...), rồi ghép
// trong bộ nhớ — hình dạng từng dòng trả về GIỮ NGUYÊN từng trường so với
// `decorate`, các đường một-đơn vẫn dùng bản cũ.
function decorateNhieu(list) {
  const ds = list || [];
  if (!ds.length) return [];
  const lo = (arr) => {
    const ra = [];
    for (let i = 0; i < arr.length; i += 400) ra.push(arr.slice(i, i + 400));
    return ra;
  };
  const traTheoId = (bang, cot, ids, cauSql) => {
    const ra = new Map();
    for (const nhom of lo([...new Set(ids.filter(Boolean))])) {
      const m = nhom.map(() => '?').join(',');
      for (const r of db.all(bang, cauSql.replace('__IN__', m), nhom)) ra.set(r[cot], r);
    }
    return ra;
  };

  const be = traTheoId('students', 'id', ds.map(l => l.studentId),
    'SELECT id, name, avatar, classId FROM students WHERE id IN (__IN__)');
  const lop = traTheoId('classes', 'id', [...be.values()].map(s => s.classId),
    'SELECT id, name FROM classes WHERE id IN (__IN__)');
  const nguoi = traTheoId('users', 'id', ds.flatMap(l => [l.parentId, l.reviewedBy]),
    'SELECT id, title, name FROM users WHERE id IN (__IN__)');
  const hoan = traTheoId('leave_refund', 'leaveId', ds.map(l => l.id),
    'SELECT * FROM leave_refund WHERE leaveId IN (__IN__)');

  return ds.map(l => {
    const s = be.get(l.studentId);
    const cls = s ? lop.get(s.classId) : null;
    const parent = nguoi.get(l.parentId);
    const reviewer = l.reviewedBy ? nguoi.get(l.reviewedBy) : null;
    const h = hoan.get(l.id);
    return {
      ...l,
      studentName: s ? s.name : '',
      studentAvatar: s ? s.avatar : null,
      className: cls ? cls.name : '',
      parentName: parent ? `${parent.title} ${parent.name}` : '',
      reviewerName: reviewer ? `${reviewer.title} ${reviewer.name}` : '',
      hoanTien: h
        ? { hoanTienAn: h.hoanTienAn, soNgay: h.soNgay, ghiChu: h.ghiChu }
        : null,
      soNgayTrongDon: soNgayTrongDon(l.fromDate, l.toDate),
      soNgayHocDeXuat: soNgayHocTrongDon(l.fromDate, l.toDate),
    };
  });
}
