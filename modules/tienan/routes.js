// BÁO ĂN & TIỀN ĂN — hai việc, một phân hệ.
//
//   1. BÁO ĂN HẰNG NGÀY. Sáng sớm bếp cần biết nấu bao nhiêu suất. Số liệu đã
//      có sẵn: sĩ số nhóm, đơn nghỉ đã duyệt, và sổ điểm danh. Việc còn thiếu
//      là gom lại thành một con số rồi CHỐT nó, vì con số tính ra đổi theo giờ
//      còn bếp thì đong gạo một lần.
//
//   2. ĐỐI CHIẾU CUỐI THÁNG. Kế toán cần biết mỗi bé tháng này đi học mấy
//      ngày, vắng mấy ngày, và trường đã duyệt hoàn tiền ăn mấy ngày (con số
//      văn phòng chốt ở Y2, ngay lúc duyệt đơn nghỉ).
//
// QUY TẮC 4 Ở PHÂN HỆ NÀY
//
// Bảng đối chiếu đặt các bé cạnh nhau kèm con số, nên phải nói rõ nó là cái
// gì: đây là SỔ TIỀN của văn phòng, không phải nhận định về đứa trẻ. Nó không
// bao giờ sắp các bé theo số ngày vắng, không tính tỉ lệ chuyên cần, và không
// đi ra khỏi tay quản trị. Bé nghỉ nhiều là chuyện của gia đình và của khoản
// tiền ăn, không phải một chỗ đứng cao thấp so với bạn.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
const nghiHoc = require('../../lib/nghi-hoc');
const csv = require('../../lib/csv');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TOI_DA_GHI_CHU = 300;

// Chốt cho ngày quá xa hai đầu gần như luôn là gõ nhầm năm hoặc tháng.
const TOI_DA_LECH_NGAY = 31;

// Trạng thái điểm danh nào tính là CÓ ĂN ở trường.
const CO_MAT = ['present', 'late'];

function homNay() {
  return ngay.homNay();
}

function lechNgay(a, b) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

// Ngày đầu và ngày cuối của một tháng YYYY-MM.
function khoangThang(thang) {
  const [nam, th] = thang.split('-').map(Number);
  const cuoi = new Date(Date.UTC(nam, th, 0));
  return [`${thang}-01`, cuoi.toISOString().slice(0, 10)];
}

// Excel coi ô bắt đầu bằng = + - @ là CÔNG THỨC và chạy nó. Họ tên do người
// nhập gõ, nên tệp đi ra khỏi app phải vô hiệu hoá chúng. Cùng luật với A6.
const DAU_CONG_THUC = /^[=+\-@\t\r]/;
function khoaCongThuc(hang) {
  const ra = {};
  for (const [k, v] of Object.entries(hang)) {
    const t = v == null ? '' : String(v);
    ra[k] = DAU_CONG_THUC.test(t) ? `'${t}` : t;
  }
  return ra;
}

module.exports = (app, { db, modules }) => {
  // Nhóm người dùng được xem. `db.classIdsOf` đã lo tầng cơ sở: quản trị Cấp 3
  // chỉ thấy nhóm của cơ sở mình, cô chỉ thấy nhóm mình phụ trách.
  function nhomCuaToi(user) {
    return db.classIdsOf(user)
      .map(id => db.findClass(id))
      .filter(c => c && c.active !== false && c.active !== 0)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  }

  function beCuaNhom(classId) {
    return db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
  }

  // TẮT MỘT PHÂN HỆ THÌ DỮ LIỆU CỦA NÓ PHẢI THÔI CHẢY SANG ĐÂY.
  //
  // Báo ăn đọc thẳng ba bảng của phần lõi: `attendance`, `leave_requests`,
  // `leave_refund`. Chặn ở HTTP không đủ, vì đường đi này KHÔNG qua HTTP —
  // cùng một chỗ hở mà Y1 đã vá cho Thực đơn và N24 đã vá cho Ghi nhanh.
  //
  // Nhà trường tắt Điểm danh xong, màn báo ăn vẫn nói "bé Bin đã điểm danh
  // vắng" dựa trên một bảng không còn ai cập nhật. Bếp nấu thiếu một suất, và
  // không ai lần ra vì sao — trên màn Quản trị thì Điểm danh đang tắt hẳn.
  //
  // `modules` có thể không được truyền vào (bài kiểm thử cũ, hoặc phiên bản
  // nạp khác): khi đó coi như ĐANG BẬT. Mặc định mở chứ không mặc định đóng —
  // đóng nhầm là bếp nấu thiếu, đúng thứ nặng nhất ở phân hệ này.
  function dangBat(ma) {
    if (!modules || typeof modules.dangBat !== 'function') return true;
    return !!modules.dangBat(ma);
  }

  // Bé nào có đơn nghỉ ĐÃ DUYỆT phủ lên ngày này.
  //
  // Chỉ đơn đã duyệt. Đơn đang chờ mà đã trừ suất là bếp nấu thiếu cho một bé
  // vẫn đến lớp — hỏng theo kiểu đứa trẻ phải chịu.
  // Gọi thẳng `lib/nghi-hoc.js` — cùng một câu hỏi với màn Nhật ký ngày và màn
  // Đón trả bé, nên phải cùng một câu trả lời. Bản trước giữ một bản sao riêng
  // ở đây, và chính vì chỉ MÀN NÀY có nó mà hai màn kia không biết bé nghỉ.
  const nghiCoPhep = (ids, ngayD) => nghiHoc.nghiCoPhep(ids, ngayD);

  function diemDanh(ids, ngay) {
    if (!ids.length || !dangBat('diemdanh')) return new Map();
    const marks = ids.map(() => '?').join(',');
    const ra = new Map();
    for (const a of db.all('attendance',
      `SELECT * FROM attendance WHERE date = ? AND studentId IN (${marks})`, [ngay, ...ids])) {
      ra.set(a.studentId, a);
    }
    return ra;
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // Gom một nhóm cho một ngày. Trả về cả DANH SÁCH TÊN bé nghỉ, không chỉ con
  // số: bếp thì cần số, nhưng người chốt cần nhìn thấy mình đang trừ ai ra.
  function nhomTrongNgay(lop, ngay) {
    const ds = beCuaNhom(lop.id);
    const ids = ds.map(b => b.id);
    const donNghi = nghiCoPhep(ids, ngay);
    const cham = diemDanh(ids, ngay);

    const khongAn = [];
    for (const b of ds) {
      const don = donNghi.get(b.id);
      const dd = cham.get(b.id);
      // Điểm danh đã ghi thì NGHE THEO ĐIỂM DANH, kể cả khi có đơn nghỉ: bé có
      // đơn mà sáng vẫn tới lớp là chuyện có thật, và bé đó phải có suất ăn.
      if (dd) {
        if (!CO_MAT.includes(dd.status)) {
          khongAn.push({ studentId: b.id, hoTen: b.name, vi: 'đã điểm danh vắng' });
        }
        continue;
      }
      if (don) {
        khongAn.push({ studentId: b.id, hoTen: b.name, vi: 'có đơn nghỉ đã duyệt' });
      }
    }

    const chot = db.first('tienan_chot',
      'SELECT * FROM tienan_chot WHERE ngay = ? AND classId = ?', [ngay, lop.id]);

    return {
      classId: lop.id,
      tenNhom: lop.name,
      siSo: ds.length,
      khongAn,
      suatDuKien: ds.length - khongAn.length,
      chot: chot ? {
        soSuat: chot.soSuat,
        soSuatMay: chot.soSuatMay,
        ghiChu: chot.ghiChu,
        nguoiChotTen: tenNguoi(chot.nguoiChot),
        chotLuc: chot.chotLuc,
      } : null,
    };
  }

  // -------------------------------------------------------------------------
  // BÁO ĂN HẰNG NGÀY
  // -------------------------------------------------------------------------
  app.get('/api/tienan/bao-an', requireRole('teacher', 'admin'), (req, res) => {
    const ngay = NGAY_RE.test(String(req.query.ngay || '')) ? req.query.ngay : homNay();
    const nhom = nhomCuaToi(req.user).map(lop => nhomTrongNgay(lop, ngay));
    res.json({
      ngay,
      nhom,
      tong: {
        siSo: nhom.reduce((s, n) => s + n.siSo, 0),
        suatDuKien: nhom.reduce((s, n) => s + n.suatDuKien, 0),
        soNhom: nhom.length,
        soNhomDaChot: nhom.filter(n => n.chot).length,
        // Con số đã chốt mới là con số bếp nấu. Chưa chốt thì không cộng vào —
        // cộng lẫn số dự kiến vào đây là bếp tưởng đã có người xác nhận.
        suatDaChot: nhom.reduce((s, n) => s + (n.chot ? n.chot.soSuat : 0), 0),
      },
    });
  });

  // Chốt số suất cho bếp.
  //
  // CÔ CHỐT ĐƯỢC NHÓM MÌNH — khác với duyệt đơn nghỉ (Y2, chỉ văn phòng). Hai
  // việc khác hẳn nhau: duyệt đơn là quyết định về tiền của gia đình, còn chốt
  // báo ăn là đếm đầu người lúc 7 giờ sáng, và người đứng ở lớp lúc đó là cô.
  app.post('/api/tienan/bao-an', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const ngay = String(b.ngay || '').trim();
    if (!NGAY_RE.test(ngay)) return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-09-07' });
    if (Math.abs(lechNgay(ngay, homNay())) > TOI_DA_LECH_NGAY) {
      return res.status(400).json({
        error: `Chỉ chốt báo ăn trong khoảng ${TOI_DA_LECH_NGAY} ngày quanh hôm nay. `
          + 'Ngày xa quá thường là gõ nhầm tháng hoặc nhầm năm.',
      });
    }
    const lop = db.findClass(String(b.classId || ''));
    if (!lop) return res.status(404).json({ error: 'Không tìm thấy nhóm lớp' });
    if (!db.canAccessClass(req.user, lop.id)) {
      return res.status(403).json({ error: 'Không có quyền chốt báo ăn cho nhóm này' });
    }

    const hienTai = nhomTrongNgay(lop, ngay);
    const so = Number(b.soSuat);
    if (!Number.isInteger(so) || so < 0 || so > hienTai.siSo) {
      return res.status(400).json({
        error: `Số suất phải là số nguyên từ 0 đến ${hienTai.siSo} (sĩ số nhóm ${lop.name}). `
          + 'Suất của cô hay của khách thì ghi vào ô ghi chú giúp bếp.',
      });
    }

    const rec = {
      ngay,
      classId: lop.id,
      soSuat: so,
      // Con số máy tính ra ĐÚNG LÚC chốt — để cuối tháng còn đối chiếu được.
      soSuatMay: hienTai.suatDuKien,
      ghiChu: String(b.ghiChu || '').trim().slice(0, TOI_DA_GHI_CHU),
      nguoiChot: req.user.id,
      chotLuc: new Date().toISOString(),
    };
    const cu = db.first('tienan_chot',
      'SELECT * FROM tienan_chot WHERE ngay = ? AND classId = ?', [ngay, lop.id]);
    if (cu) db.update('tienan_chot', cu.id, rec);
    else db.insert('tienan_chot', { id: db.nextId('ta'), ...rec });

    db.audit(req.user.id, 'tienan-chot', lop.id, { ngay, soSuat: so, soSuatMay: rec.soSuatMay });
    res.json({ ok: true, ...nhomTrongNgay(lop, ngay) });
  });

  // -------------------------------------------------------------------------
  // ĐỐI CHIẾU CUỐI THÁNG
  // -------------------------------------------------------------------------

  // Gom số liệu một tháng cho mọi bé trong phạm vi người gọi.
  function bangThang(user, thang) {
    const [tu, den] = khoangThang(thang);
    const lopCuaToi = nhomCuaToi(user);
    const tenLop = new Map(lopCuaToi.map(c => [c.id, c.name]));
    const ds = [];
    for (const lop of lopCuaToi) ds.push(...beCuaNhom(lop.id).map(b => ({ ...b, tenNhom: tenLop.get(lop.id) })));
    // Xếp theo TÊN, không bao giờ theo con số. Xếp theo số ngày vắng là biến
    // sổ tiền thành một cách sắp các bé trên dưới nhau.
    ds.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));

    const ids = ds.map(b => b.id);
    const dem = new Map();
    // Cùng công tắc với `diemDanh` ở đường theo-ngày phía trên: phân hệ Điểm
    // danh TẮT thì bảng đối chiếu tháng cũng không đọc bảng của nó — "tắt là
    // biến khỏi màn hình" phải đúng ở mọi đường, kể cả đường đọc thẳng bảng.
    if (ids.length && dangBat('diemdanh')) {
      const marks = ids.map(() => '?').join(',');
      for (const r of db.all('attendance',
        `SELECT studentId, status, COUNT(*) AS n FROM attendance
         WHERE date BETWEEN ? AND ? AND studentId IN (${marks})
         GROUP BY studentId, status`, [tu, den, ...ids])) {
        if (!dem.has(r.studentId)) dem.set(r.studentId, {});
        dem.get(r.studentId)[r.status] = Number(r.n);
      }
    }

    // Đơn nghỉ ĐÃ DUYỆT có hoàn tiền ăn.
    //
    // GẮN VÀO THÁNG CỦA NGÀY BẮT ĐẦU, và nói thẳng ra là như vậy. Văn phòng gõ
    // TỔNG số ngày hoàn cho cả đơn chứ không gõ từng ngày, nên một đơn vắt qua
    // hai tháng thì app KHÔNG biết chia thế nào — và đoán hộ là bịa ra con số
    // không ai gõ. Nên: tính trọn vào tháng bắt đầu, rồi ĐÁNH DẤU đơn vắt tháng
    // để văn phòng tự chia tay.
    const hoan = new Map();
    const vatSang = new Map();
    // Hoàn tiền ăn là một cột của đơn nghỉ — tắt Xin phép thì cột đó cũng thôi
    // được cập nhật, và bảng đối chiếu tháng không được lấy số cũ ra dùng tiếp.
    if (ids.length && dangBat('xinphep')) {
      const marks = ids.map(() => '?').join(',');
      const cauChung = `SELECT l.id AS id, l.studentId AS studentId, l.fromDate AS fromDate,
                               l.toDate AS toDate, r.soNgay AS soNgay, r.ghiChu AS ghiChu
                        FROM leave_requests l JOIN leave_refund r ON r.leaveId = l.id
                        WHERE l.status = 'approved' AND r.hoanTienAn = 'co'
                          AND l.studentId IN (${marks})`;
      for (const d of db.all('leave_refund', `${cauChung} AND l.fromDate BETWEEN ? AND ?`, [...ids, tu, den])) {
        if (!hoan.has(d.studentId)) hoan.set(d.studentId, []);
        hoan.get(d.studentId).push({ ...d, vatThang: d.toDate > den });
      }
      // Đơn bắt đầu từ tháng trước nhưng kéo sang tháng này — ĐÃ tính vào tháng
      // trước, nêu ra để văn phòng khỏi tính hai lần.
      for (const d of db.all('leave_refund', `${cauChung} AND l.fromDate < ? AND l.toDate >= ?`, [...ids, tu, tu])) {
        if (!vatSang.has(d.studentId)) vatSang.set(d.studentId, []);
        vatSang.get(d.studentId).push(d);
      }
    }

    // NGÀY TRƯỜNG NGHỈ TRONG THÁNG (Đ147).
    //
    // Không phải đơn của nhà nào cả — trường đóng cửa thì không bé nào ăn ở
    // trường ngày đó, nên tiền ăn phải được hoàn mà không ai phải gửi gì.
    //
    // Tính THEO CƠ SỞ CỦA NHÓM: đợt nghỉ riêng của một cơ sở không cắt tiền ăn
    // của hai cơ sở còn lại. Tra mỗi nhóm một lần rồi dùng lại, vì một tháng
    // của cả trường là hàng trăm bé mà chỉ vài nhóm.
    const nghiTheoNhom = new Map();
    for (const lop of lopCuaToi) {
      const cs = db.campusOfClass(lop.id) || '';
      nghiTheoNhom.set(lop.id, {
        tatCa: nghiHoc.ngayHocTruongNghi(tu, den, cs),
        hoanTien: nghiHoc.ngayHocTruongNghi(tu, den, cs, { chiKhiHoanTien: true }),
        dot: nghiHoc.truongNghiTrongKhoang(tu, den, cs),
      });
    }

    // BÉ CÓ MẶT ĐÚNG NGÀY TRƯỜNG NGHỈ THÌ KHÔNG HOÀN TIỀN ĂN NGÀY ĐÓ.
    //
    // Nghe như chuyện không xảy ra, nhưng nó xảy ra theo hai đường có thật:
    //
    //   • Văn phòng đặt lịch nghỉ LÙI LẠI, sau khi sổ điểm danh đã ghi xong —
    //     mà sổ đã ghi thì cố ý không sửa ngược (xem routes/attendance.js).
    //   • Ngày trường "nghỉ" vẫn nhận trông vài bé mà gia đình không nghỉ được.
    //
    // Bé ấy đã ăn một bữa có thật ở trường. Hoàn tiền bữa đó là trả lại tiền
    // cho thứ nhà trường đã nấu — và đây là sổ tiền, nên không được đoán rộng
    // ra một chiều rồi để kế toán đi dò ngược.
    //
    // Hỏi ĐÚNG những ngày nghỉ, không quét cả tháng: một tháng thường chỉ có
    // vài ngày trường nghỉ, còn quét cả tháng là hàng nghìn dòng cho một con số.
    const moiNgayNghi = new Set();
    for (const n of nghiTheoNhom.values()) for (const ng of n.hoanTien) moiNgayNghi.add(ng);
    const coMatNgayNghi = new Map();
    if (ids.length && moiNgayNghi.size && dangBat('diemdanh')) {
      const dsNgay = [...moiNgayNghi];
      const mN = dsNgay.map(() => '?').join(',');
      const mT = CO_MAT.map(() => '?').join(',');
      for (let i = 0; i < ids.length; i += 400) {
        const lo = ids.slice(i, i + 400);
        const mB = lo.map(() => '?').join(',');
        for (const r of db.all('attendance',
          `SELECT studentId, date FROM attendance
            WHERE studentId IN (${mB}) AND date IN (${mN}) AND status IN (${mT})`,
          [...lo, ...dsNgay, ...CO_MAT])) {
          if (!coMatNgayNghi.has(r.studentId)) coMatNgayNghi.set(r.studentId, new Set());
          coMatNgayNghi.get(r.studentId).add(r.date);
        }
      }
    }

    // NGÀY NẰM TRONG ĐƠN HOÀN MÀ BÉ VẪN CÓ MẶT (Đ155, DD-13).
    //
    // Gia đình gửi đơn xin nghỉ ba ngày và văn phòng duyệt hoàn tiền ăn ba
    // ngày; rồi sáng thứ Tư nhà đổi ý cho con đi học, và bé được chụp ảnh tới
    // lớp. Từ Đ131 tấm ảnh ấy THẮNG đơn nghỉ — sổ điểm danh ghi bé có mặt.
    // Nhưng con số hoàn thì vẫn là ba ngày, vì nó do văn phòng gõ tay lúc
    // duyệt đơn, và không ai quay lại sửa. Nhà trường mất tiền một bữa đã nấu,
    // và không ai biết để mà tính lại.
    //
    // MÁY ĐÁNH DẤU, NGƯỜI QUYẾT — cố ý không tự trừ.
    //
    // Với ngày TRƯỜNG nghỉ thì trừ thẳng được, vì chính app tính ra từng ngày
    // ấy. Còn đơn của gia đình thì văn phòng chỉ gõ TỔNG số ngày, không gõ
    // từng ngày — nên app không biết được tổng ấy đã trừ sẵn hôm bé đi học
    // hay chưa. Trừ hộ là đoán, mà đây là sổ tiền: đoán sai thì kế toán phải
    // dò ngược cả tháng để tìm ra chỗ lệch. Nên chỉ nói ra, cùng một cách đã
    // dùng cho `vatThang` và `trungLichNghi`.
    //
    // Chỉ hỏi những bé CÓ đơn hoàn, và chỉ trong khoảng ngày các đơn ấy chạm
    // tới — một tháng của cả trường thường chỉ vài chục đơn.
    const coMatTrongDon = new Map();
    const idsCoDon = [...hoan.keys()];
    if (idsCoDon.length && dangBat('diemdanh')) {
      let som = null;
      let muon = null;
      for (const ds2 of hoan.values()) {
        for (const d of ds2) {
          const a = d.fromDate < tu ? tu : d.fromDate;
          const b = d.toDate > den ? den : d.toDate;
          if (a > b) continue;
          if (!som || a < som) som = a;
          if (!muon || b > muon) muon = b;
        }
      }
      if (som && muon) {
        const mT = CO_MAT.map(() => '?').join(',');
        for (let i = 0; i < idsCoDon.length; i += 400) {
          const lo = idsCoDon.slice(i, i + 400);
          const mB = lo.map(() => '?').join(',');
          for (const r of db.all('attendance',
            `SELECT studentId, date FROM attendance
              WHERE studentId IN (${mB}) AND date BETWEEN ? AND ? AND status IN (${mT})`,
            [...lo, som, muon, ...CO_MAT])) {
            if (!coMatTrongDon.has(r.studentId)) coMatTrongDon.set(r.studentId, new Set());
            coMatTrongDon.get(r.studentId).add(r.date);
          }
        }
      }
    }
    // Số ngày bé có mặt nằm trong đúng một đơn, cắt theo tháng đang xem.
    function ngayCoMatCuaDon(studentId, don) {
      const co = coMatTrongDon.get(studentId);
      if (!co || !co.size) return 0;
      const a = don.fromDate < tu ? tu : don.fromDate;
      const b = don.toDate > den ? den : don.toDate;
      if (a > b) return 0;
      let n = 0;
      for (const ng of co) if (ng >= a && ng <= b) n += 1;
      return n;
    }

    const RONG = { tatCa: new Set(), hoanTien: new Set(), dot: [] };
    const danhSach = ds.map(b => {
      const d = dem.get(b.id) || {};
      const dsHoan = hoan.get(b.id) || [];
      const nghiTruong = nghiTheoNhom.get(b.classId) || RONG;
      const daAn = coMatNgayNghi.get(b.id) || null;
      const ngayNghiDuocHoan = daAn
        ? [...nghiTruong.hoanTien].filter(ng => !daAn.has(ng)).length
        : nghiTruong.hoanTien.size;
      return {
        studentId: b.id,
        maBe: b.code || '',
        hoTen: b.name,
        tenNhom: b.tenNhom || '',
        soNgayAnOTruong: (d.present || 0) + (d.late || 0),
        soNgayVangCoPhep: d.absent_excused || 0,
        soNgayVangKhongPhep: d.absent_unexcused || 0,
        // Hai con số khác nhau, cố ý để cạnh nhau: TRƯỜNG nghỉ mấy ngày, và
        // trong đó BÉ NÀY được hoàn mấy ngày. Chúng chỉ lệch khi bé vẫn tới
        // trường đúng ngày ấy, và lúc đó kế toán cần thấy cả hai.
        soNgayTruongNghi: nghiTruong.tatCa.size,
        soNgayTruongNghiHoan: ngayNghiDuocHoan,
        soNgayHoanTienAn: dsHoan.reduce((s, x) => s + (Number(x.soNgay) || 0), 0)
          + ngayNghiDuocHoan,
        // Tổng số ngày bé vẫn tới lớp tuy nằm trong đơn đã duyệt hoàn — con số
        // kế toán phải TRỪ ĐI bằng tay khi chốt tháng.
        soNgayCoMatTrongDonHoan: dsHoan.reduce((s2, x) => s2 + ngayCoMatCuaDon(b.id, x), 0),
        donHoan: dsHoan.map(x => ({
          fromDate: x.fromDate, toDate: x.toDate, soNgay: x.soNgay,
          ghiChu: x.ghiChu, vatThang: x.vatThang,
          // Bé vẫn tới lớp mấy hôm trong chính đơn này (Đ155, DD-13).
          soNgayBeCoMat: ngayCoMatCuaDon(b.id, x),
          // ĐƠN NGHỈ CHỒNG LÊN ĐỢT TRƯỜNG NGHỈ — nói thẳng ra chỗ máy không
          // chia được, thay vì để một con số trông như đã đúng rồi.
          //
          // Văn phòng gõ TỔNG số ngày hoàn cho cả đơn, không gõ từng ngày, nên
          // khi một đơn nghỉ của gia đình vắt qua đúng mấy ngày trường cũng
          // nghỉ thì app KHÔNG biết đơn ấy đã trừ những ngày đó ra hay chưa —
          // và đoán hộ là cộng đôi tiền ăn cho một ngày. Kế toán nhìn cột này
          // là biết dòng nào phải mở đơn ra xem.
          trungLichNghi: nghiTruong.dot.some(k => k.hoanTienAn === 'co'
            && k.tuNgay <= x.toDate && k.denNgay >= x.fromDate),
        })),
        donVatSangThangNay: (vatSang.get(b.id) || []).map(x => ({
          fromDate: x.fromDate, toDate: x.toDate, soNgay: x.soNgay,
        })),
      };
    });

    // Các đợt trường nghỉ chạm vào tháng này, gộp mọi cơ sở đang xem — để bảng
    // nói được TÊN đợt nghỉ chứ không chỉ một con số.
    const dotTrongThang = [];
    const daCo = new Set();
    for (const n of nghiTheoNhom.values()) {
      for (const k of n.dot) {
        if (daCo.has(k.id)) continue;
        daCo.add(k.id);
        dotTrongThang.push({
          id: k.id, ten: k.ten, tuNgay: k.tuNgay, denNgay: k.denNgay,
          loai: k.loai, campusId: k.campusId || '', hoanTienAn: k.hoanTienAn,
        });
      }
    }
    dotTrongThang.sort((a, b) => String(a.tuNgay).localeCompare(String(b.tuNgay)));

    return {
      thang, tuNgay: tu, denNgay: den,
      danhSach,
      dotTruongNghi: dotTrongThang,
      tong: {
        soBe: danhSach.length,
        soNgayAnOTruong: danhSach.reduce((s, x) => s + x.soNgayAnOTruong, 0),
        soNgayHoanTienAn: danhSach.reduce((s, x) => s + x.soNgayHoanTienAn, 0),
        soDonVatThang: danhSach.reduce((s, x) =>
          s + x.donHoan.filter(d => d.vatThang).length + x.donVatSangThangNay.length, 0),
        soNgayCoMatTrongDonHoan: danhSach.reduce((s, x) => s + x.soNgayCoMatTrongDonHoan, 0),
      },
    };
  }

  // BẢNG TIỀN LÀ VIỆC CỦA VĂN PHÒNG, KHÔNG PHẢI CỦA CÔ.
  //
  // Cùng lý do đã đưa ở Y2: tiền thì cô không cầm và không đối chiếu. Cô có
  // màn Báo ăn hằng ngày cho nhóm mình, đó là phần thuộc về cô.
  function chiVanPhong(req, res) {
    if (req.user.role === 'admin') return false;
    res.status(403).json({
      error: 'Bảng đối chiếu tiền ăn là sổ của văn phòng. Cô xem phần Báo ăn hằng ngày '
        + 'của nhóm mình ở tab bên cạnh nhé.',
    });
    return true;
  }

  function thangHopLe(req, res) {
    const thang = String(req.query.thang || '').trim() || homNay().slice(0, 7);
    if (!THANG_RE.test(thang)) {
      res.status(400).json({ error: 'Tháng chưa đúng dạng, ví dụ đúng: 2026-09' });
      return null;
    }
    return thang;
  }

  app.get('/api/tienan/thang', requireRole('teacher', 'admin'), (req, res) => {
    if (chiVanPhong(req, res)) return;
    const thang = thangHopLe(req, res);
    if (!thang) return;
    res.json(bangThang(req.user, thang));
  });

  app.get('/api/tienan/thang.csv', requireRole('teacher', 'admin'), (req, res) => {
    if (chiVanPhong(req, res)) return;
    const thang = thangHopLe(req, res);
    if (!thang) return;
    const bang = bangThang(req.user, thang);

    const COT = ['Mã bé', 'Họ và tên', 'Nhóm lớp', 'Số ngày ăn ở trường',
      'Số ngày vắng có phép', 'Số ngày vắng không phép', 'Số ngày trường nghỉ',
      'Số ngày trường hoàn tiền ăn', 'Số ngày bé vẫn đi học trong đơn hoàn',
      'Đơn cần kiểm tra tay'];
    const duLieu = bang.danhSach.map(x => khoaCongThuc({
      'Mã bé': x.maBe,
      'Họ và tên': x.hoTen,
      'Nhóm lớp': x.tenNhom,
      'Số ngày ăn ở trường': x.soNgayAnOTruong,
      'Số ngày vắng có phép': x.soNgayVangCoPhep,
      'Số ngày vắng không phép': x.soNgayVangKhongPhep,
      'Số ngày trường nghỉ': x.soNgayTruongNghi,
      'Số ngày trường hoàn tiền ăn': x.soNgayHoanTienAn,
      // Con số PHẢI TRỪ ĐI khi chốt tháng: bé vẫn ăn ở trường những hôm ấy.
      'Số ngày bé vẫn đi học trong đơn hoàn': x.soNgayCoMatTrongDonHoan,
      // Nói thẳng chỗ máy không chia được, thay vì để một con số trông như đã
      // đúng rồi. Kế toán nhìn cột này là biết dòng nào phải mở đơn ra xem.
      'Đơn cần kiểm tra tay': [
        ...x.donHoan.filter(d => d.vatThang)
          .map(d => `${d.fromDate} → ${d.toDate} (${d.soNgay} ngày, kéo sang tháng sau)`),
        ...x.donVatSangThangNay
          .map(d => `${d.fromDate} → ${d.toDate} (${d.soNgay} ngày, đã tính ở tháng trước)`),
        ...x.donHoan.filter(d => d.trungLichNghi)
          .map(d => `${d.fromDate} → ${d.toDate} (${d.soNgay} ngày, trùng đợt trường nghỉ)`),
        ...x.donHoan.filter(d => d.soNgayBeCoMat > 0)
          .map(d => `${d.fromDate} → ${d.toDate} (${d.soNgay} ngày, bé vẫn đi học ${d.soNgayBeCoMat} hôm — trừ ra)`),
      ].join(' · '),
    }));

    db.audit(req.user.id, 'tienan-xuat', null, { thang, soBe: duLieu.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="doi-chieu-tien-an-${thang}.csv"`);
    res.send(csv.stringify(COT, duLieu));
  });
};
