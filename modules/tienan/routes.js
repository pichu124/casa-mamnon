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

module.exports = (app, { db }) => {
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

  // Bé nào có đơn nghỉ ĐÃ DUYỆT phủ lên ngày này.
  //
  // Chỉ đơn đã duyệt. Đơn đang chờ mà đã trừ suất là bếp nấu thiếu cho một bé
  // vẫn đến lớp — hỏng theo kiểu đứa trẻ phải chịu.
  function nghiCoPhep(ids, ngay) {
    if (!ids.length) return new Map();
    const marks = ids.map(() => '?').join(',');
    const ra = new Map();
    for (const l of db.all('leave_requests',
      `SELECT * FROM leave_requests
       WHERE status = 'approved' AND studentId IN (${marks})
         AND fromDate <= ? AND toDate >= ?`, [...ids, ngay, ngay])) {
      ra.set(l.studentId, l);
    }
    return ra;
  }

  function diemDanh(ids, ngay) {
    if (!ids.length) return new Map();
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
    if (ids.length) {
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
    if (ids.length) {
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

    const danhSach = ds.map(b => {
      const d = dem.get(b.id) || {};
      const dsHoan = hoan.get(b.id) || [];
      return {
        studentId: b.id,
        maBe: b.code || '',
        hoTen: b.name,
        tenNhom: b.tenNhom || '',
        soNgayAnOTruong: (d.present || 0) + (d.late || 0),
        soNgayVangCoPhep: d.absent_excused || 0,
        soNgayVangKhongPhep: d.absent_unexcused || 0,
        soNgayHoanTienAn: dsHoan.reduce((s, x) => s + (Number(x.soNgay) || 0), 0),
        donHoan: dsHoan.map(x => ({
          fromDate: x.fromDate, toDate: x.toDate, soNgay: x.soNgay,
          ghiChu: x.ghiChu, vatThang: x.vatThang,
        })),
        donVatSangThangNay: (vatSang.get(b.id) || []).map(x => ({
          fromDate: x.fromDate, toDate: x.toDate, soNgay: x.soNgay,
        })),
      };
    });

    return {
      thang, tuNgay: tu, denNgay: den,
      danhSach,
      tong: {
        soBe: danhSach.length,
        soNgayAnOTruong: danhSach.reduce((s, x) => s + x.soNgayAnOTruong, 0),
        soNgayHoanTienAn: danhSach.reduce((s, x) => s + x.soNgayHoanTienAn, 0),
        soDonVatThang: danhSach.reduce((s, x) =>
          s + x.donHoan.filter(d => d.vatThang).length + x.donVatSangThangNay.length, 0),
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
      'Số ngày vắng có phép', 'Số ngày vắng không phép', 'Số ngày trường hoàn tiền ăn',
      'Đơn cần kiểm tra tay'];
    const duLieu = bang.danhSach.map(x => khoaCongThuc({
      'Mã bé': x.maBe,
      'Họ và tên': x.hoTen,
      'Nhóm lớp': x.tenNhom,
      'Số ngày ăn ở trường': x.soNgayAnOTruong,
      'Số ngày vắng có phép': x.soNgayVangCoPhep,
      'Số ngày vắng không phép': x.soNgayVangKhongPhep,
      'Số ngày trường hoàn tiền ăn': x.soNgayHoanTienAn,
      // Nói thẳng chỗ máy không chia được, thay vì để một con số trông như đã
      // đúng rồi. Kế toán nhìn cột này là biết dòng nào phải mở đơn ra xem.
      'Đơn cần kiểm tra tay': [
        ...x.donHoan.filter(d => d.vatThang)
          .map(d => `${d.fromDate} → ${d.toDate} (${d.soNgay} ngày, kéo sang tháng sau)`),
        ...x.donVatSangThangNay
          .map(d => `${d.fromDate} → ${d.toDate} (${d.soNgay} ngày, đã tính ở tháng trước)`),
      ].join(' · '),
    }));

    db.audit(req.user.id, 'tienan-xuat', null, { thang, soBe: duLieu.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="doi-chieu-tien-an-${thang}.csv"`);
    res.send(csv.stringify(COT, duLieu));
  });
};
