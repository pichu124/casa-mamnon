// XUẤT BÁO CÁO (Đ239c — góp ý của trường 16/10, mục 2 và 3).
//
// Nhà trường: *"Bổ sung phần xuất báo cáo dữ liệu"* — điểm danh bé và cô (theo
// giờ vào ra, hoặc theo có mặt / nghỉ phép / nghỉ không phép), báo cáo tháng
// và 6 tháng, kế hoạch của bé, hồ sơ bé; mỗi thứ cho một bé, một nhóm, một cơ
// sở hoặc cả trường. Mọi tệp là Excel thật (.xlsx) qua `lib/xlsx.js`. Đối
// chiếu tiền ăn nằm ở chính phân hệ Tiền ăn (`/api/tienan/thang.xlsx`); màn
// này chỉ trỏ tới đó.
//
// PHÂN HỆ NÀY KHÔNG CÓ DỮ LIỆU RIÊNG — nó ĐỌC bảng của phần khác rồi chép ra
// tệp. Ba điều dưới đây là toàn bộ lý do nó an toàn:
//
//   1. KHÔNG NỚI QUYỀN. Mỗi phần chỉ mở với người VỐN đã mở được API gốc của
//      dữ liệu ấy: cùng danh sách chức vụ (`db.apiChoPhep`, khớp tiền tố như
//      `chanApiNgoaiChucVu`), cùng chốt riêng của đường gốc (chụp công ở cổng,
//      Nhân sự, sổ tiền của văn phòng). Dòng '/api/xuatbaocao' trong danh sách
//      chức vụ chỉ là cửa vào màn, không phải quyền đọc thêm thứ gì.
//   2. TẦNG CƠ SỞ. Tài khoản một cơ sở chỉ xuất được cơ sở của mình; mỗi nhóm,
//      mỗi bé được hỏi `canAccessClass` / `canAccessStudent` trước khi đọc.
//   3. TẮT LÀ TẮT. Phân hệ nguồn đang tắt thì phần ấy báo tắt (404) và không
//      đọc bảng của nó — `dangBat` hỏi trước mọi câu truy vấn chéo.
//
// QUY TẮC 4: tệp không có tỉ lệ, không có cột thứ tự trên dưới; danh sách sắp
// theo TÊN (hay theo ngày rồi tên), không bao giờ theo một con số về đứa trẻ.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
const xlsx = require('../../lib/xlsx');
const nghiHoc = require('../../lib/nghi-hoc');
const ndg = require('../../lib/nhan-danh-gia');
const nhomCo = require('../../lib/nhom-co');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
// Một lần xuất tối đa một năm học — dài hơn thường là gõ nhầm năm.
const TOI_DA_NGAY = 366;
const KIEU_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Excel coi ô bắt đầu bằng = + - @ là CÔNG THỨC. Họ tên, nội dung báo cáo do
// người gõ, nên tệp đi ra khỏi app phải vô hiệu hoá chúng — cùng luật với
// `khoaCongThuc` của routes/admin.js và modules/tienan.
const DAU_CONG_THUC = /^[=+\-@\t\r]/;
function khoaO(v) {
  const t = v == null ? '' : String(v);
  return DAU_CONG_THUC.test(t) ? `'${t}` : t;
}

// Trạng thái điểm danh của bé: mã, chữ (đúng chữ màn Điểm danh đang hiện), ký
// hiệu trên lưới ngày.
const TRANG_THAI_BE = [
  ['present', 'Có mặt', 'C'],
  ['late', 'Đến muộn', 'M'],
  ['absent_excused', 'Nghỉ có phép', 'P'],
  ['absent_unexcused', 'Nghỉ không phép', 'K'],
];
const LOAI_CONG = [
  ['di-lam', 'Đi làm'],
  ['nua-ngay', 'Nửa ngày'],
  ['nghi-phep', 'Nghỉ phép'],
  ['nghi-khong-phep', 'Nghỉ không phép'],
  ['nghi-le', 'Nghỉ lễ'],
];

// BẢN CHÉP CÓ NGƯỜI CANH. Hai tệp gốc không xuất hàm ra ngoài, và phân hệ cắm
// thêm không phụ thuộc mã của nhau; `test/xuat-bao-cao.test.mjs` mục [12] đối
// chiếu từng chữ với bản gốc, trôi là đỏ.
//   • CHUC_VU_CHUP_CONG — `chupCongDuoc` ở routes/attendance.js
//   • CHUC_VU_NHAN_SU   — `chiNhanSu` ở modules/nhansu/routes.js
//   • GOC_LINH_VUC, CHUONG_TRINH_CUA_GOC, CHU_QUY_UOC — modules/kehoachbe
//   • tuoiCuaBe         — routes/admin.js (tệp danh sách bé)
const CHUC_VU_CHUP_CONG = ['baove', 'vanphong-coso', 'quanly-coso', 'hieu-truong', 'nhansu'];
const CHUC_VU_NHAN_SU = ['hieu-truong', 'nhansu'];
const GOC_LINH_VUC = [
  ['toan', 'Toán'],
  ['tieng-viet', 'Tiếng Việt'],
  ['cambridge', 'Tiếng Anh (Cambridge)'],
  ['thuc-hanh-cuoc-song', 'Thực hành cuộc sống'],
  ['giac-quan', 'Giác quan'],
  ['van-hoa', 'Văn hoá'],
  ['the-chat', 'Thể chất'],
];
const CHUONG_TRINH_CUA_GOC = {
  'toan': 'chu-nhiem',
  'tieng-viet': 'chu-nhiem',
  'thuc-hanh-cuoc-song': 'chu-nhiem',
  'giac-quan': 'chu-nhiem',
  'van-hoa': 'chu-nhiem',
  'cambridge': 'nuoc-ngoai',
  'the-chat': 'the-chat',
};
const CHU_QUY_UOC = { 'chua-day': 'NA', 'chua-quan-sat-thay': 'N', 'dang-hinh-thanh': 'W', 'da-vung': 'S', 'vuot-troi': 'M' };
const NHAN_BAI = { 'hoc-moi': 'Dạy mới', 'on-tap': 'Ôn tập', 'mo-rong': 'Mở rộng' };
const KET_LUAN_BAI = { 'da-thay': 'Đã thấy con làm được', 'tiep-tuc': 'Tiếp tục cùng con' };
const TIEP_TUC = { 'hoc-moi': 'Dạy mới ở tháng sau', 'on-tap': 'Ôn tập ở tháng sau' };
const TRANG_THAI_KE = { nhap: 'Nháp', 'cho-duyet': 'Chờ duyệt', 'da-duyet': 'Đã duyệt', 'tra-lai': 'Gửi lại cô sửa' };

const LOAI_BAO_CAO = { thang: 'Báo cáo tháng', hocky: 'Báo cáo 6 tháng' };
// Năm bước của một bản báo cáo — cùng nghĩa với `buocCua` của baocaohoctap.
const BUOC_BAN = {
  nhap: 'Nháp',
  'tra-lai': 'Nháp — quản lý gửi lại cô sửa',
  'cho-duyet': 'Chờ duyệt',
  'cho-ngay': 'Đã duyệt, chờ ngày gửi gia đình',
  'da-cong-bo': 'Đã gửi gia đình',
};

// Tuổi để đọc trong hồ sơ — dưới 36 tháng nói bằng tháng (xem routes/admin.js).
function tuoiCuaBe(dob) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dob || ''))) return '';
  const sinh = new Date(`${dob}T00:00:00Z`);
  const nay = new Date();
  if (Number.isNaN(sinh.getTime()) || sinh > nay) return '';
  let thang = (nay.getUTCFullYear() - sinh.getUTCFullYear()) * 12
    + (nay.getUTCMonth() - sinh.getUTCMonth());
  if (nay.getUTCDate() < sinh.getUTCDate()) thang -= 1;
  if (thang < 0) return '';
  if (thang < 36) return `${thang} tháng`;
  const nam = Math.floor(thang / 12);
  const du = thang % 12;
  return du ? `${nam} tuổi ${du} tháng` : `${nam} tuổi`;
}

const theoTen = (a, b) => String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'vi');
const dmy = (s) => (NGAY_RE.test(String(s || '')) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '');
const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

function cuoiThang(thang) {
  const [nam, th] = thang.split('-').map(Number);
  return new Date(Date.UTC(nam, th, 0)).toISOString().slice(0, 10);
}
function ngayThat(s) {
  if (!NGAY_RE.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}
// Ngày thứ Hai – thứ Sáu trong [tu, den].
function ngayThuong(tu, den) {
  const ra = [];
  for (let t = Date.parse(`${tu}T00:00:00Z`); t <= Date.parse(`${den}T00:00:00Z`); t += 86400000) {
    const thu = new Date(t).getUTCDay();
    if (thu >= 1 && thu <= 5) ra.push(new Date(t).toISOString().slice(0, 10));
  }
  return ra;
}

// Truy vấn theo lô 400 mã — giới hạn số tham số của SQLite.
function theoLo(ids, hoi) {
  const ra = [];
  for (let i = 0; i < ids.length; i += 400) {
    const lo = ids.slice(i, i + 400);
    ra.push(...hoi(lo, lo.map(() => '?').join(',')));
  }
  return ra;
}

function tuChoi(res, ma, loi) {
  res.status(ma).json({ error: loi });
  return null;
}

// Tên tệp: một tháng trọn thì ghi tháng, còn lại ghi hai đầu khoảng.
function nhanKhoang(k) {
  const th = k.tu.slice(0, 7);
  return k.tu === `${th}-01` && k.den === cuoiThang(th) ? th : `${k.tu}_${k.den}`;
}

function guiTep(res, ten, cacBang) {
  const buf = xlsx.ghi(cacBang.map(b => ({ ...b, hang: b.hang.map(h => h.map(khoaO)) })));
  res.setHeader('Content-Type', KIEU_XLSX);
  res.setHeader('Content-Disposition', `attachment; filename="${ten}.xlsx"`);
  res.send(buf);
}

module.exports = (app, { db, modules }) => {
  // Không được truyền `modules` (đường nạp cũ) thì coi như đang bật — cùng
  // nếp với các phân hệ khác (modules/README.md).
  function dangBat(ma) {
    if (!modules || typeof modules.dangBat !== 'function') return true;
    return !!modules.dangBat(ma);
  }
  function tenPhanHe(ma) {
    const m = modules && typeof modules.timTheoKey === 'function' ? modules.timTheoKey(ma) : null;
    return m ? m.name : ma;
  }

  // Người này có mở được đường gốc ấy không — đúng luật khớp của
  // `chanApiNgoaiChucVu` (lib/modules.js): khớp theo tiền tố, chữ thường.
  function apiMo(user, duong) {
    const cho = db.apiChoPhep(user);
    if (!cho) return true;
    const p = duong.toLowerCase();
    return cho.some(x => p === x || p.startsWith(`${x}/`));
  }
  function chupCongDuoc(user) {
    if (!user || user.role !== 'admin') return false;
    const cv = db.chucVu(user);
    return !cv || CHUC_VU_CHUP_CONG.includes(cv);
  }
  function laNhanSu(user) {
    if (!user || user.role !== 'admin') return false;
    const cv = db.chucVu(user);
    return cv === null || CHUC_VU_NHAN_SU.includes(cv);
  }

  // AI MỞ ĐƯỢC PHẦN NÀO — một chỗ quyết cho cả màn hình lẫn đường tải tệp.
  //
  // Hỏi quyền TRƯỚC, hỏi công tắc SAU: người không có phần ấy thì nghe "ngoài
  // phần việc" (403), người có phần ấy mà nhà trường tắt nguồn thì nghe "đang
  // tắt" (404, cùng mã `chanApiDaTat` trả cho phân hệ tắt).
  const MA_PHAN = ['diemDanhBe', 'diemDanhCo', 'tienAn', 'baoCaoHocTap', 'keHoachBe', 'hoSoBe'];
  function quyenPhan(user, ma) {
    const qt = !!user && user.role === 'admin';
    const khong = {
      duoc: false, lyDo: 'quyen',
      loi: 'Phần này nằm ngoài phần việc của tài khoản. Cần thêm quyền thì nhờ ban giám hiệu giúp.',
    };
    const tat = (nguon) => ({
      duoc: false, lyDo: 'tat',
      loi: `Phân hệ "${tenPhanHe(nguon)}" đang được nhà trường tắt nên chưa xuất được phần này.`,
    });
    if (ma === 'diemDanhBe') {
      if (!qt || !apiMo(user, '/api/attendance/class')) return khong;
      return dangBat('diemdanh') ? { duoc: true } : tat('diemdanh');
    }
    if (ma === 'diemDanhCo') {
      // Hai cửa gốc, đúng như hai màn đang có: người chụp công ở cổng thấy giờ
      // vào ra; Nhân sự và ban giám hiệu thấy thêm bảng công (nghỉ phép...).
      const cong = qt && apiMo(user, '/api/attendance/nhan-vien') && chupCongDuoc(user);
      const nhanSu = qt && apiMo(user, '/api/nhansu/cham-cong') && laNhanSu(user);
      if (!cong && !nhanSu) return khong;
      const docCong = dangBat('diemdanh');
      const coNhanSu = nhanSu && dangBat('nhansu');
      if (!docCong && !coNhanSu) return tat(nhanSu ? 'nhansu' : 'diemdanh');
      return {
        duoc: true, docCong, coNhanSu,
        viSaoKhongNhanSu: coNhanSu ? ''
          : (nhanSu
            ? `Phân hệ "${tenPhanHe('nhansu')}" đang được nhà trường tắt, nên tệp chỉ có số ngày có giờ vào ở cổng.`
            : 'Nghỉ phép, nghỉ không phép do bộ phận Nhân sự và ban giám hiệu giữ ở bảng công, '
              + 'nên tệp của tài khoản này chỉ có số ngày có giờ vào ở cổng.'),
      };
    }
    if (ma === 'tienAn') {
      // Sổ tiền là việc của văn phòng (`chiVanPhong` ở modules/tienan).
      if (!qt || !apiMo(user, '/api/tienan/thang')) return khong;
      return dangBat('tienan') ? { duoc: true } : tat('tienan');
    }
    if (ma === 'baoCaoHocTap') {
      if (!qt || !apiMo(user, '/api/baocaohoctap/nhom')) return khong;
      return dangBat('baocaohoctap') ? { duoc: true } : tat('baocaohoctap');
    }
    if (ma === 'keHoachBe') {
      if (!qt || !apiMo(user, '/api/kehoachbe')) return khong;
      return dangBat('kehoachbe') ? { duoc: true } : tat('kehoachbe');
    }
    if (ma === 'hoSoBe') {
      return qt && apiMo(user, '/api/admin/students/xuat.csv') ? { duoc: true } : khong;
    }
    return khong;
  }
  function chan(req, res, ma) {
    const q = quyenPhan(req.user, ma);
    if (q.duoc) return q;
    return tuChoi(res, q.lyDo === 'tat' ? 404 : 403, q.loi);
  }

  // Khoảng thời gian: `tu` / `den` (ngày, hoặc tháng YYYY-MM), hoặc `thang`.
  // Không gửi gì thì là tháng này.
  function khoangThoiGian(req, res) {
    let tu = String(req.query.tu || '').trim();
    let den = String(req.query.den || '').trim();
    if (!tu && !den) {
      const thang = String(req.query.thang || '').trim() || ngay.thangNay();
      if (!THANG_RE.test(thang)) return tuChoi(res, 400, 'Tháng chưa đúng dạng, ví dụ đúng: 2026-10');
      tu = `${thang}-01`;
      den = cuoiThang(thang);
    }
    if (!tu) tu = den;
    if (!den) den = tu;
    if (THANG_RE.test(tu)) tu = `${tu}-01`;
    if (THANG_RE.test(den)) den = cuoiThang(den);
    if (!ngayThat(tu) || !ngayThat(den)) return tuChoi(res, 400, 'Ngày chưa đúng dạng, ví dụ đúng: 2026-10-01');
    if (tu > den) return tuChoi(res, 400, 'Ngày bắt đầu phải trước ngày kết thúc');
    if ((Date.parse(den) - Date.parse(tu)) / 86400000 >= TOI_DA_NGAY) {
      return tuChoi(res, 400, 'Mỗi lần xuất tối đa một năm. Chọn khoảng ngắn hơn giúp nhé.');
    }
    return { tu, den };
  }

  function bangTenNhom() {
    return new Map(db.all('classes', 'SELECT id, name FROM classes').map(c => [c.id, c.name]));
  }

  // BÉ TRONG PHẠM VI MỘT LẦN XUẤT. Trả null khi đã gửi lỗi.
  //
  // Phạm vi xin phải nằm trong phạm vi người xin ("cả trường" chỉ cho tài
  // khoản không khoá cơ sở), rồi từng nhóm, từng bé vẫn được hỏi quyền riêng
  // trước khi đọc. `keCaNghi` (chỉ phần hồ sơ): kèm bé đã nghỉ, kể cả nhóm đã
  // đóng sau chuyển năm học — cùng luật `phamViNhomKeCaDaDong` của routes/admin.js.
  function beTrongPhamVi(req, res, { keCaNghi = false } = {}) {
    const user = req.user;
    const pham = String(req.query.pham || '');
    const khoa = db.phamViCoSo(user);
    let nhom = null;
    let moTa = '';
    if (pham === 'truong') {
      if (khoa !== null) return tuChoi(res, 403, 'Tài khoản này chỉ xuất được cơ sở của mình. Chọn "Một cơ sở" giúp nhé.');
      moTa = 'ca-truong';
    } else if (pham === 'coso') {
      const cs = String(req.query.campusId || '').trim() || khoa || '';
      if (!cs || !db.findCampus(cs)) return tuChoi(res, 404, 'Không tìm thấy cơ sở này');
      if (!db.canAccessCampus(user, cs)) return tuChoi(res, 403, 'Cơ sở này không thuộc phạm vi của tài khoản');
      nhom = keCaNghi ? db.classIdsEverOfCampus(cs) : db.classIdsOfCampus(cs).filter(id => db.canAccessClass(user, id));
      moTa = cs;
    } else if (pham === 'nhom') {
      const classId = String(req.query.classId || '').trim();
      if (!classId) return tuChoi(res, 400, 'Chưa chọn nhóm lớp');
      const duoc = db.canAccessClass(user, classId)
        || (keCaNghi && !!db.findClass(classId) && (khoa === null || db.campusOfClass(classId) === khoa));
      if (!duoc) return tuChoi(res, 403, 'Nhóm lớp này không thuộc phạm vi của tài khoản');
      nhom = [classId];
      moTa = classId;
    } else if (pham === 'be') {
      const studentId = String(req.query.studentId || '').trim();
      if (!studentId) return tuChoi(res, 400, 'Chưa chọn bé');
      if (!db.canAccessStudent(user, studentId)) return tuChoi(res, 403, 'Không có quyền xuất dữ liệu của bé này');
      const be = db.first('students', 'SELECT * FROM students WHERE id = ?', [studentId]);
      if (!be) return tuChoi(res, 404, 'Không tìm thấy bé');
      return { ds: [be], moTa: studentId };
    } else {
      return tuChoi(res, 400, 'Chưa chọn phạm vi: cả trường, một cơ sở, một nhóm hoặc một bé');
    }
    const loc = keCaNghi ? '' : ' AND active = 1';
    const ds = nhom === null
      ? db.all('students', `SELECT * FROM students WHERE 1 = 1${loc}`)
      : theoLo(nhom, (lo, m) => db.all('students', `SELECT * FROM students WHERE classId IN (${m})${loc}`, lo));
    return { ds: ds.filter(b => db.canAccessStudent(user, b.id)).sort(theoTen), moTa };
  }

  // NGƯỜI LỚN CỦA MỘT CƠ SỞ — cùng câu hỏi với `nhanVienTrongPhamVi` của
  // routes/attendance.js (danh sách ở cổng): cô có nhóm ĐANG MỞ ở cơ sở ấy,
  // và nhân viên được gắn vào cơ sở ấy. `null` = cả trường.
  function nguoiCuaCoSo(campusId) {
    const ds = db.all('users',
      "SELECT id, name, title, role FROM users WHERE active = 1 AND role IN ('teacher', 'admin')");
    if (!campusId) return ds.sort(theoTen);
    const coCo = new Set(db.all('class_teachers',
      `SELECT DISTINCT ct.teacherId AS id FROM class_teachers ct
       JOIN class_campus cc ON cc.classId = ct.classId
       JOIN classes c ON c.id = ct.classId AND c.active = 1 WHERE cc.campusId = ?`, [campusId]).map(r => r.id));
    const coNv = new Set(db.all('user_campus',
      'SELECT userId AS id FROM user_campus WHERE campusId = ?', [campusId]).map(r => r.id));
    return ds.filter(u => coCo.has(u.id) || coNv.has(u.id)).sort(theoTen);
  }
  function hoTenNguoi(u) { return `${u.title || ''} ${u.name}`.trim(); }
  function vaiCua(u) {
    if (u.role === 'teacher') return 'Cô';
    const mo = db.moTaChucVu(db.chucVu(u));
    return mo ? mo.ten : 'Nhân viên';
  }

  // Người lớn trong phạm vi một lần xuất. Trả null khi đã gửi lỗi.
  function nguoiTrongPhamVi(req, res) {
    const user = req.user;
    const pham = String(req.query.pham || '');
    const khoa = db.phamViCoSo(user);
    if (pham === 'truong') {
      if (khoa !== null) return tuChoi(res, 403, 'Tài khoản này chỉ xuất được cơ sở của mình. Chọn "Một cơ sở" giúp nhé.');
      return { ds: nguoiCuaCoSo(null), moTa: 'ca-truong' };
    }
    if (pham === 'coso') {
      const cs = String(req.query.campusId || '').trim() || khoa || '';
      if (!cs || !db.findCampus(cs)) return tuChoi(res, 404, 'Không tìm thấy cơ sở này');
      if (!db.canAccessCampus(user, cs)) return tuChoi(res, 403, 'Cơ sở này không thuộc phạm vi của tài khoản');
      return { ds: nguoiCuaCoSo(cs), moTa: cs };
    }
    if (pham === 'nhom') {
      const classId = String(req.query.classId || '').trim();
      if (!classId) return tuChoi(res, 400, 'Chưa chọn nhóm lớp');
      if (!db.canAccessClass(user, classId)) return tuChoi(res, 403, 'Nhóm lớp này không thuộc phạm vi của tài khoản');
      const coCuaNhom = new Set(db.teacherIdsOfClass(classId));
      return { ds: nguoiCuaCoSo(khoa).filter(u => coCuaNhom.has(u.id)), moTa: classId };
    }
    if (pham === 'nguoi') {
      const userId = String(req.query.userId || '').trim();
      const ds = nguoiCuaCoSo(khoa).filter(u => u.id === userId);
      if (!userId || !ds.length) return tuChoi(res, 404, 'Không tìm thấy người này trong phạm vi của tài khoản');
      return { ds, moTa: userId };
    }
    return tuChoi(res, 400, 'Chưa chọn phạm vi: cả trường, một cơ sở, cô của một nhóm hoặc một người');
  }

  // =========================================================================
  // PHẠM VI CHO MÀN HÌNH — phần nào mở, và chọn được cơ sở / nhóm / bé nào.
  // Danh sách bé chỉ gửi khi có ít nhất một phần về bé mở được: kế toán (chỉ
  // phần tiền ăn) và Nhân sự (chỉ phần chấm công) không nhận tên bé nào ở đây.
  // =========================================================================
  app.get('/api/xuatbaocao/pham-vi', requireRole('admin'), (req, res) => {
    const user = req.user;
    const phan = {};
    for (const ma of MA_PHAN) {
      const q = quyenPhan(user, ma);
      phan[ma] = { duoc: q.duoc, lyDo: q.duoc ? null : q.lyDo, loi: q.duoc ? '' : q.loi };
      if (ma === 'diemDanhCo') phan[ma].coNhanSu = !!q.coNhanSu;
    }
    phan.tienAn.duong = '/api/tienan/thang.xlsx';
    const khoa = db.phamViCoSo(user);
    const coBe = ['diemDanhBe', 'baoCaoHocTap', 'keHoachBe', 'hoSoBe'].some(k => phan[k].duoc);
    const coNhom = coBe || phan.tienAn.duoc || phan.diemDanhCo.duoc;
    res.json({
      caTruong: khoa === null,
      coSo: (khoa === null ? db.campuses() : [db.findCampus(khoa)].filter(Boolean))
        .map(c => ({ id: c.id, name: c.name })),
      nhom: coNhom
        ? db.classIdsOf(user).map(id => db.findClass(id))
          .filter(c => c && c.active !== false && c.active !== 0).sort(theoTen)
          .map(c => ({ id: c.id, name: c.name, campusId: db.campusOfClass(c.id) || '' }))
        : [],
      be: coBe ? db.studentsOf(user).map(b => ({ id: b.id, name: b.name, classId: b.classId || '' })) : [],
      nguoi: phan.diemDanhCo.duoc
        ? nguoiCuaCoSo(khoa).map(u => ({ id: u.id, hoTen: hoTenNguoi(u), vai: vaiCua(u) }))
        : [],
      phan,
    });
  });

  // =========================================================================
  // (a) ĐIỂM DANH CỦA BÉ
  // =========================================================================
  app.get('/api/xuatbaocao/diemdanh-be', requireRole('admin'), (req, res) => {
    if (!chan(req, res, 'diemDanhBe')) return;
    const kieu = String(req.query.kieu || 'trangthai');
    if (kieu !== 'gio' && kieu !== 'trangthai') return tuChoi(res, 400, 'Chưa chọn kiểu báo cáo');
    const k = khoangThoiGian(req, res);
    if (!k) return;
    const pv = beTrongPhamVi(req, res);
    if (!pv) return;
    const tenNhom = bangTenNhom();
    const beTheoId = new Map(pv.ds.map(b => [b.id, b]));
    const ghi = theoLo(pv.ds.map(b => b.id), (lo, m) => db.all('attendance',
      `SELECT studentId, date, status, checkIn, checkOut FROM attendance
        WHERE date BETWEEN ? AND ? AND studentId IN (${m})`, [k.tu, k.den, ...lo]));
    const chuTrangThai = (st) => (TRANG_THAI_BE.find(x => x[0] === st) || [st, st])[1];

    let cacBang;
    if (kieu === 'gio') {
      ghi.sort((a, b) => a.date.localeCompare(b.date) || theoTen(beTheoId.get(a.studentId), beTheoId.get(b.studentId)));
      cacBang = [{
        ten: 'Giờ vào ra', dongTieuDe: true, cot: [12, 12, 28, 16, 16, 10, 10],
        hang: [
          ['Ngày', 'Mã bé', 'Họ và tên', 'Nhóm lớp', 'Trạng thái', 'Giờ vào', 'Giờ ra'],
          ...ghi.map((r) => {
            const b = beTheoId.get(r.studentId);
            return [dmy(r.date), b.code || '', b.name, tenNhom.get(b.classId) || '', chuTrangThai(r.status),
              r.checkIn || '', r.checkOut || ''];
          }),
        ],
      }];
    } else {
      cacBang = bangTrangThaiBe(pv.ds, ghi, k, tenNhom);
    }
    db.audit(req.user.id, 'xuatbaocao-diemdanh-be', null,
      { pham: req.query.pham, phamVi: pv.moTa, tu: k.tu, den: k.den, kieu, soBe: pv.ds.length });
    guiTep(res, `diemdanh-be-${kieu}-${nhanKhoang(k)}`, cacBang);
  });

  // Tổng hợp mỗi bé một dòng + lưới ngày.
  //
  // "Chưa điểm danh" là việc của SỔ (ngày học mà sổ chưa có dòng nào), không
  // phải điều gì về đứa trẻ. Chỉ đếm thứ Hai – thứ Sáu, tới hôm nay, kể từ
  // ngày bé được nhận vào app, và không tính ngày trường nghỉ của cơ sở bé.
  // Ngày cuối tuần mà sổ có ghi thì vẫn hiện trên lưới và vẫn được đếm.
  function bangTrangThaiBe(dsBe, ghi, k, tenNhom) {
    const homNay = ngay.homNay();
    const ngayDem = k.tu <= homNay ? ngayThuong(k.tu, k.den < homNay ? k.den : homNay) : [];
    const nghiTheoCoSo = new Map();
    const ngayNghi = (b) => {
      const cs = db.campusOfClass(b.classId) || '';
      if (!nghiTheoCoSo.has(cs)) nghiTheoCoSo.set(cs, nghiHoc.ngayHocTruongNghi(k.tu, k.den, cs));
      return nghiTheoCoSo.get(cs);
    };
    const theoBe = new Map();
    for (const r of ghi) {
      if (!theoBe.has(r.studentId)) theoBe.set(r.studentId, new Map());
      theoBe.get(r.studentId).set(r.date, r.status);
    }
    const cotNgay = [...new Set([...ngayDem, ...ghi.map(r => r.date)])].sort();
    const tongHop = [['Mã bé', 'Họ và tên', 'Nhóm lớp', ...TRANG_THAI_BE.map(x => x[1]), 'Chưa điểm danh']];
    const luoi = [['Mã bé', 'Họ và tên', 'Nhóm lớp', ...cotNgay.map(dm)]];
    for (const b of dsBe) {
      const cua = theoBe.get(b.id) || new Map();
      const nghi = ngayNghi(b);
      const tuNgayBe = b.createdAt ? ngay.ngayCua(Date.parse(b.createdAt)) : '';
      const dem = TRANG_THAI_BE.map(([ma]) => [...cua.values()].filter(st => st === ma).length);
      const chua = ngayDem.filter(ng => !cua.has(ng) && !nghi.has(ng) && (!tuNgayBe || ng >= tuNgayBe)).length;
      const dau = [b.code || '', b.name, tenNhom.get(b.classId) || ''];
      tongHop.push([...dau, ...dem.map(String), String(chua)]);
      luoi.push([...dau, ...cotNgay.map((ng) => {
        const st = cua.get(ng);
        if (st) return (TRANG_THAI_BE.find(x => x[0] === st) || ['', '', st])[2];
        return nghi.has(ng) ? 'TN' : '';
      })]);
    }
    tongHop.push([], ['Ghi chú', `Từ ${dmy(k.tu)} đến ${dmy(k.den)}. "Chưa điểm danh" đếm ngày thứ Hai – thứ Sáu `
      + 'tới hôm nay mà sổ điểm danh chưa có dòng nào cho bé; không tính ngày trường nghỉ.']);
    luoi.push([], ['Ký hiệu', 'C = Có mặt · M = Đến muộn · P = Nghỉ có phép · K = Nghỉ không phép · '
      + 'TN = Trường nghỉ · ô trống = chưa điểm danh']);
    return [
      { ten: 'Tổng hợp', dongTieuDe: true, cot: [12, 28, 16, 10, 10, 12, 14, 14], hang: tongHop },
      { ten: 'Theo ngày', dongTieuDe: true, cot: [12, 28, 16, ...cotNgay.map(() => 6)], hang: luoi },
    ];
  }

  // =========================================================================
  // (b) ĐIỂM DANH CÔ VÀ NHÂN VIÊN — KHÔNG BAO GIỜ KÈM ẢNH
  //
  // Giờ vào ra lấy từ ảnh chụp ở cổng (`staff_checkin`); ngày cổng không ghi
  // giờ mà Nhân sự đã ghi tay thì lấy giờ ở bảng công — chỉ khi người tải là
  // Nhân sự / ban giám hiệu, đúng người vốn đọc được bảng công. Tên tệp ảnh
  // không bao giờ được đọc ra ở đây: ảnh khuôn mặt người lớn chỉ mở qua
  // `/api/nhansu/anh-cham-cong`.
  // =========================================================================
  app.get('/api/xuatbaocao/diemdanh-co', requireRole('admin'), (req, res) => {
    const q = chan(req, res, 'diemDanhCo');
    if (!q) return;
    const kieu = String(req.query.kieu || 'trangthai');
    if (kieu !== 'gio' && kieu !== 'trangthai') return tuChoi(res, 400, 'Chưa chọn kiểu báo cáo');
    const k = khoangThoiGian(req, res);
    if (!k) return;
    const pv = nguoiTrongPhamVi(req, res);
    if (!pv) return;
    const ids = pv.ds.map(u => u.id);
    const nguoiTheoId = new Map(pv.ds.map(u => [u.id, u]));
    const vai = new Map(pv.ds.map(u => [u.id, vaiCua(u)]));
    const cong = q.docCong ? theoLo(ids, (lo, m) => db.all('staff_checkin',
      `SELECT userId, ngay, gioVao, gioRa FROM staff_checkin
        WHERE ngay BETWEEN ? AND ? AND userId IN (${m})`, [k.tu, k.den, ...lo])) : [];
    const bangCong = q.coNhanSu ? theoLo(ids, (lo, m) => db.all('nhansu_cham_cong',
      `SELECT userId, ngay, loai, gioVao, gioRa FROM nhansu_cham_cong
        WHERE ngay BETWEEN ? AND ? AND userId IN (${m})`, [k.tu, k.den, ...lo])) : [];

    let cacBang;
    if (kieu === 'gio') {
      const theoNgay = new Map();
      for (const r of cong) theoNgay.set(`${r.userId}|${r.ngay}`, { ...r });
      for (const r of bangCong) {
        const cu = theoNgay.get(`${r.userId}|${r.ngay}`);
        if (!cu) {
          if (r.gioVao || r.gioRa) theoNgay.set(`${r.userId}|${r.ngay}`, { userId: r.userId, ngay: r.ngay, gioVao: r.gioVao, gioRa: r.gioRa });
          continue;
        }
        if (!cu.gioVao && r.gioVao) cu.gioVao = r.gioVao;
        if (!cu.gioRa && r.gioRa) cu.gioRa = r.gioRa;
      }
      const dong = [...theoNgay.values()].filter(r => r.gioVao || r.gioRa)
        .sort((a, b) => a.ngay.localeCompare(b.ngay) || theoTen(nguoiTheoId.get(a.userId), nguoiTheoId.get(b.userId)));
      cacBang = [{
        ten: 'Giờ vào ra', dongTieuDe: true, cot: [12, 30, 20, 10, 10],
        hang: [
          ['Ngày', 'Họ và tên', 'Vai / chức vụ', 'Giờ vào', 'Giờ ra'],
          ...dong.map((r) => {
            const u = nguoiTheoId.get(r.userId);
            return [dmy(r.ngay), hoTenNguoi(u), vai.get(u.id), r.gioVao || '', r.gioRa || ''];
          }),
        ],
      }];
    } else if (q.coNhanSu) {
      cacBang = [{
        ten: 'Bảng công', dongTieuDe: true, cot: [30, 20, 10, 10, 10, 14, 10],
        hang: [
          ['Họ và tên', 'Vai / chức vụ', ...LOAI_CONG.map(x => x[1])],
          ...pv.ds.map(u => [hoTenNguoi(u), vai.get(u.id),
            ...LOAI_CONG.map(([ma]) => String(bangCong.filter(r => r.userId === u.id && r.loai === ma).length))]),
          [], ['Ghi chú', `Từ ${dmy(k.tu)} đến ${dmy(k.den)}, theo bảng công của bộ phận Nhân sự.`],
        ],
      }];
    } else {
      cacBang = [{
        ten: 'Chấm công ở cổng', dongTieuDe: true, cot: [30, 20, 24],
        hang: [
          ['Họ và tên', 'Vai / chức vụ', 'Số ngày có chấm công vào'],
          ...pv.ds.map(u => [hoTenNguoi(u), vai.get(u.id),
            String(cong.filter(r => r.userId === u.id && r.gioVao).length)]),
          [], ['Ghi chú', `Từ ${dmy(k.tu)} đến ${dmy(k.den)}. ${q.viSaoKhongNhanSu}`],
        ],
      }];
    }
    db.audit(req.user.id, 'xuatbaocao-diemdanh-co', null,
      { pham: req.query.pham, phamVi: pv.moTa, tu: k.tu, den: k.den, kieu, soNguoi: pv.ds.length });
    guiTep(res, `diemdanh-co-${kieu}-${nhanKhoang(k)}`, cacBang);
  });

  // =========================================================================
  // (d) BÁO CÁO THÁNG / BÁO CÁO 6 THÁNG
  //
  // Đọc đúng ba bảng mà `/api/baocaohoctap/ban/:id` đọc (bản, ô, duyệt) cộng
  // mẫu và dòng của mẫu. Người tải là người vốn mở được sổ của nhóm ở phân hệ
  // ấy, nên cả bản nháp cũng ra — kèm chữ nói rõ bản đang ở bước nào. Bản nào
  // có kỳ CHẠM vào khoảng đang chọn thì vào tệp.
  // =========================================================================
  app.get('/api/xuatbaocao/baocao-hoctap', requireRole('admin'), (req, res) => {
    if (!chan(req, res, 'baoCaoHocTap')) return;
    const loai = String(req.query.loai || '');
    if (!LOAI_BAO_CAO[loai]) return tuChoi(res, 400, 'Chưa chọn loại báo cáo: báo cáo tháng hoặc báo cáo 6 tháng');
    const k = khoangThoiGian(req, res);
    if (!k) return;
    const pv = beTrongPhamVi(req, res);
    if (!pv) return;
    const tenNhom = bangTenNhom();
    const ban = theoLo(pv.ds.map(b => b.id), (lo, m) => db.all('baocaohoctap_ban',
      `SELECT b.* FROM baocaohoctap_ban b JOIN baocaohoctap_mau m ON m.id = b.mauId
        WHERE m.loai = ? AND b.tuNgay <= ? AND b.denNgay >= ? AND b.studentId IN (${m})`,
      [loai, k.den, k.tu, ...lo]));
    const banIds = ban.map(x => x.id);
    const oTheoBan = new Map();
    for (const o of theoLo(banIds, (lo, m) => db.all('baocaohoctap_o',
      `SELECT banId, dongId, chu, muc FROM baocaohoctap_o WHERE banId IN (${m})`, lo))) {
      if (!oTheoBan.has(o.banId)) oTheoBan.set(o.banId, new Map());
      oTheoBan.get(o.banId).set(o.dongId, o);
    }
    const duyet = new Map(theoLo(banIds, (lo, m) => db.all('baocaohoctap_duyet',
      `SELECT * FROM baocaohoctap_duyet WHERE banId IN (${m})`, lo)).map(d => [d.banId, d]));
    const mau = new Map();
    const dongMau = (mauId) => {
      if (!mau.has(mauId)) {
        mau.set(mauId, {
          mau: db.first('baocaohoctap_mau', 'SELECT * FROM baocaohoctap_mau WHERE id = ?', [mauId]) || {},
          dong: db.all('baocaohoctap_dong', 'SELECT * FROM baocaohoctap_dong WHERE mauId = ? ORDER BY thuTu, rowid', [mauId]),
        });
      }
      return mau.get(mauId);
    };
    const homNay = ngay.homNay();
    const buoc = (b, d) => {
      if (b.trangThai !== 'da-gui') return d && d.trangThai === 'tu-choi' ? 'tra-lai' : 'nhap';
      if (!d) return 'da-cong-bo';
      if (d.trangThai !== 'da-duyet') return 'cho-duyet';
      return d.ngayCongBo && d.ngayCongBo <= homNay ? 'da-cong-bo' : 'cho-ngay';
    };
    const nhanMuc = (ma) => {
      const t = ndg.MAC_DINH.find(x => x[0] === ma);
      return t ? `${t[1]} (${CHU_QUY_UOC[ma]})` : '';
    };

    const banTheoBe = new Map();
    for (const b of ban) {
      if (!banTheoBe.has(b.studentId)) banTheoBe.set(b.studentId, []);
      banTheoBe.get(b.studentId).push(b);
    }
    const hang = [['Mã bé', 'Họ và tên', 'Nhóm lớp', 'Kỳ báo cáo', 'Mẫu', 'Phần', 'Mục', 'Nội dung', 'Tình trạng bản']];
    for (const be of pv.ds) {
      const cua = (banTheoBe.get(be.id) || []).sort((a, b) => a.tuNgay.localeCompare(b.tuNgay));
      if (!cua.length) {
        hang.push([be.code || '', be.name, tenNhom.get(be.classId) || '', '', '', '', '', '', 'Chưa có bản trong kỳ này']);
        continue;
      }
      for (const b of cua) {
        const { mau: m, dong } = dongMau(b.mauId);
        const o = oTheoBan.get(b.id) || new Map();
        const dau = [be.code || '', be.name, tenNhom.get(b.classId) || '', `${dmy(b.tuNgay)} – ${dmy(b.denNgay)}`, m.ten || ''];
        const tinhTrang = BUOC_BAN[buoc(b, duyet.get(b.id))];
        for (const d of dong) {
          const x = o.get(d.id);
          const noiDung = !x ? '' : (d.kieu === 'muc' ? [nhanMuc(x.muc), x.chu].filter(Boolean).join(' — ') : x.chu);
          hang.push([...dau, d.nhom, d.tieuDe, noiDung, tinhTrang]);
        }
        for (const [phan, muc, chu] of [
          ['Tổng hợp', 'Cô nhắn gia đình', b.tongHop],
          ['Việc làm tiếp', 'Ở lớp cô sẽ làm tiếp', b.oLopLamGi],
          ['Việc làm tiếp', 'Ở nhà gia đình chơi cùng con', b.oNhaChoiGi],
        ]) if (chu) hang.push([...dau, phan, muc, chu, tinhTrang]);
      }
    }
    db.audit(req.user.id, 'xuatbaocao-baocao-hoctap', null,
      { pham: req.query.pham, phamVi: pv.moTa, loai, tu: k.tu, den: k.den, soBe: pv.ds.length, soBan: ban.length });
    guiTep(res, `bao-cao-${loai}-${nhanKhoang(k)}`, [{
      ten: LOAI_BAO_CAO[loai], dongTieuDe: true, cot: [12, 26, 14, 24, 22, 26, 30, 60, 22], hang,
    }]);
  });

  // =========================================================================
  // (e) KẾ HOẠCH CỦA BÉ — theo tháng, hoặc một khoảng nhiều tháng
  //
  // Đúng phần màn kế hoạch của nhà trường đang hiện: bài đã tích, mục theo
  // lĩnh vực, phần nhìn lại cuối tháng bằng chữ quy ước, việc tiếp tục ở
  // tháng sau, tình trạng duyệt. Không kèm nhận xét chữ của từng cô.
  // =========================================================================
  app.get('/api/xuatbaocao/kehoach-be', requireRole('admin'), (req, res) => {
    if (!chan(req, res, 'keHoachBe')) return;
    const k = khoangThoiGian(req, res);
    if (!k) return;
    const pv = beTrongPhamVi(req, res);
    if (!pv) return;
    const tenNhom = bangTenNhom();
    const ke = theoLo(pv.ds.map(b => b.id), (lo, m) => db.all('kehoachbe_ke',
      `SELECT * FROM kehoachbe_ke WHERE thang BETWEEN ? AND ? AND studentId IN (${m})`,
      [k.tu.slice(0, 7), k.den.slice(0, 7), ...lo]));
    const keIds = ke.map(x => x.id);
    const baiTheoKe = new Map();
    for (const r of theoLo(keIds, (lo, m) => db.all('kehoachbe_muc_bai',
      `SELECT mb.keId AS keId, mb.nhan AS nhan, mb.ketQua AS ketQua, mb.tiepTucThangSau AS tiepTucThangSau,
              b.ten AS ten, b.gocLinhVuc AS gocLinhVuc, d.mucDo AS mucDo, d.tiepTuc AS tiepTuc
         FROM kehoachbe_muc_bai mb LEFT JOIN kehoachbe_baihoc b ON b.id = mb.baiHocId
         LEFT JOIN kehoachbe_bai_muc_do d ON d.mucBaiId = mb.id
        WHERE mb.keId IN (${m}) ORDER BY mb.rowid`, lo))) {
      if (!baiTheoKe.has(r.keId)) baiTheoKe.set(r.keId, []);
      baiTheoKe.get(r.keId).push(r);
    }
    const mucTheoKe = new Map();
    for (const r of theoLo(keIds, (lo, m) => db.all('kehoachbe_muc',
      `SELECT keId, gocLinhVuc, noiDung, ketQua, tiepTucThangSau FROM kehoachbe_muc
        WHERE keId IN (${m}) ORDER BY rowid`, lo))) {
      if (!mucTheoKe.has(r.keId)) mucTheoKe.set(r.keId, []);
      mucTheoKe.get(r.keId).push(r);
    }
    const thuTuGoc = (g) => {
      const i = GOC_LINH_VUC.findIndex(x => x[0] === g);
      return i < 0 ? GOC_LINH_VUC.length : i;
    };
    const tenGoc = (g) => (GOC_LINH_VUC.find(x => x[0] === g) || [g, g || ''])[1];
    const chuongTrinh = (g) => nhomCo.CHUONG_TRINH[CHUONG_TRINH_CUA_GOC[g] || nhomCo.MAC_DINH] || '';

    const keTheoBe = new Map();
    for (const x of ke) {
      if (!keTheoBe.has(x.studentId)) keTheoBe.set(x.studentId, []);
      keTheoBe.get(x.studentId).push(x);
    }
    const hang = [['Mã bé', 'Họ và tên', 'Nhóm lớp', 'Tháng', 'Chương trình', 'Lĩnh vực', 'Bài', 'Dạy mới / Ôn tập',
      'Nhìn lại cuối tháng', 'Tiếp tục tháng sau', 'Tình trạng kế hoạch']];
    for (const be of pv.ds) {
      const cua = (keTheoBe.get(be.id) || []).sort((a, b) => a.thang.localeCompare(b.thang));
      if (!cua.length) {
        hang.push([be.code || '', be.name, tenNhom.get(be.classId) || '', '', '', '', '', '', '', '', 'Chưa lập trong khoảng này']);
        continue;
      }
      for (const x of cua) {
        const dau = [be.code || '', be.name, tenNhom.get(x.classId) || '', `${x.thang.slice(5, 7)}/${x.thang.slice(0, 4)}`];
        const tinhTrang = TRANG_THAI_KE[x.trangThai] || TRANG_THAI_KE.nhap;
        const dong = [
          ...(baiTheoKe.get(x.id) || []).map(b => ({
            goc: b.gocLinhVuc || '', bai: b.ten || '(bài đã gỡ khỏi danh mục)', nhan: NHAN_BAI[b.nhan] || '',
            nhinLai: b.mucDo ? (CHU_QUY_UOC[b.mucDo] || '') : (KET_LUAN_BAI[b.ketQua] || ''),
            tiepTuc: TIEP_TUC[b.tiepTuc] || (b.tiepTucThangSau ? 'Có' : ''),
          })),
          ...(mucTheoKe.get(x.id) || []).map(mc => ({
            goc: mc.gocLinhVuc || '', bai: mc.noiDung, nhan: '',
            nhinLai: CHU_QUY_UOC[mc.ketQua] || '', tiepTuc: mc.tiepTucThangSau ? 'Có' : '',
          })),
        ].map((d, i) => ({ ...d, i })).sort((a, b) => thuTuGoc(a.goc) - thuTuGoc(b.goc) || a.i - b.i);
        if (!dong.length) hang.push([...dau, '', '', '', '', '', '', tinhTrang]);
        for (const d of dong) {
          hang.push([...dau, chuongTrinh(d.goc), tenGoc(d.goc), d.bai, d.nhan, d.nhinLai, d.tiepTuc, tinhTrang]);
        }
      }
    }
    const chuGiai = [['Chữ', 'Nghĩa'],
      ...ndg.nhanDangDung(db).map(([ma, ten]) => [CHU_QUY_UOC[ma] || '', ten]),
      [],
      ['', 'Chữ chỉ là nhãn đọc kèm, đúng bộ chữ trên tờ giấy của trường; không dùng để so các bé với nhau.'],
      ['', `${CHU_QUY_UOC['chua-quan-sat-thay']}: cô chưa có dịp thấy con làm — không phải con không làm được.`]];
    db.audit(req.user.id, 'xuatbaocao-kehoach-be', null,
      { pham: req.query.pham, phamVi: pv.moTa, tu: k.tu.slice(0, 7), den: k.den.slice(0, 7), soBe: pv.ds.length });
    guiTep(res, `ke-hoach-be-${k.tu.slice(0, 7)}${k.tu.slice(0, 7) === k.den.slice(0, 7) ? '' : `_${k.den.slice(0, 7)}`}`, [
      { ten: 'Kế hoạch của bé', dongTieuDe: true, cot: [12, 26, 14, 10, 18, 22, 40, 14, 12, 22, 18], hang },
      { ten: 'Chú giải', dongTieuDe: true, cot: [8, 90], hang: chuGiai },
    ]);
  });

  // =========================================================================
  // (f) HỒ SƠ BÉ — cùng bộ cột, cùng nội dung từng ô với
  // `/api/admin/students/xuat.csv` (routes/admin.js), cắt theo phạm vi chọn.
  // Ghi nhật ký bằng CÙNG mã 'students-export': hỏi "ai đã tải danh sách bé
  // ra" thì một câu tra ra cả hai đường.
  // =========================================================================
  app.get('/api/xuatbaocao/ho-so-be', requireRole('admin'), (req, res) => {
    if (!chan(req, res, 'hoSoBe')) return;
    const keCaNghi = String(req.query.keCaNghi || '') === '1';
    const pv = beTrongPhamVi(req, res, { keCaNghi });
    if (!pv) return;
    const rows = pv.ds;
    const beIds = rows.map(s => s.id);
    const goms = (bang, sql, khoa) => {
      const ra = new Map();
      for (const r of theoLo(beIds, (lo, m) => db.all(bang, sql.replace('__IN__', m), lo))) {
        if (!khoa) ra.set(r.studentId, r);
        else {
          if (!ra.has(r[khoa])) ra.set(r[khoa], []);
          ra.get(r[khoa]).push(r);
        }
      }
      return ra;
    };
    const lopTheoId = new Map(db.all('classes', 'SELECT * FROM classes').map(c => [c.id, c]));
    const coSoCuaLop = new Map(db.all('class_campus', 'SELECT classId, campusId FROM class_campus')
      .map(r => [r.classId, r.campusId]));
    const coSoTheoId = new Map(db.all('campuses', 'SELECT * FROM campuses').map(c => [c.id, c]));
    const hoSoTheoBe = goms('student_profile', 'SELECT * FROM student_profile WHERE studentId IN (__IN__)');
    const lienHeTheoBe = goms('student_emergency_contacts',
      'SELECT * FROM student_emergency_contacts WHERE studentId IN (__IN__) ORDER BY taoLuc, rowid', 'studentId');
    const dongYTheoBe = db.dongYCuaCacBe(beIds);
    const phuHuynhTheoId = new Map(db.all('users',
      "SELECT id, title, name, phone FROM users WHERE role = 'parent'").map(u => [u.id, u]));
    const cccdTheoNguoi = new Map(db.all('user_profile',
      'SELECT userId, soCccd FROM user_profile').map(r => [r.userId, r.soCccd || '']));
    const noi = (v) => (v === true ? 'Đồng ý' : v === false ? 'Không đồng ý' : 'Chưa trả lời');

    const hang = [['Mã bé', 'Họ và tên', 'Ngày sinh', 'Tuổi', 'Giới tính', 'Nhóm lớp', 'Cơ sở',
      'Số định danh cá nhân', 'Dân tộc', 'Nhóm máu', 'Tiền sử bệnh / lưu ý đặc biệt',
      'Địa chỉ', 'Bố / mẹ', 'Số CCCD của bố / mẹ', 'Người liên hệ khẩn cấp',
      'Đồng ý hồ sơ học tập', 'Đồng ý chia sẻ ảnh', 'Đồng ý truyền thông',
      'Người ký giấy', 'Ngày ký', 'Tình trạng']];
    for (const s of db.withParents(rows)) {
      const lop = s.classId ? lopTheoId.get(s.classId) : null;
      const cs = s.classId ? coSoTheoId.get(coSoCuaLop.get(s.classId)) : null;
      const mr = hoSoTheoBe.get(s.id) || {};
      const d = dongYTheoBe.get(s.id) || db.dongYCuaBe(s.id);
      hang.push([
        s.code || '', s.name || '', s.dob || '', tuoiCuaBe(s.dob), s.gender || '',
        lop ? lop.name : '', cs ? cs.name : '',
        mr.soDinhDanh || '', s.ethnicity || '', s.bloodType || '',
        mr.tienSuBenh || s.allergies || '', s.address || '',
        (s.parentIds || []).map((id) => {
          const p = phuHuynhTheoId.get(id);
          return p ? `${p.title} ${p.name}${p.phone ? ` (${p.phone})` : ''}` : '';
        }).filter(Boolean).join(' · '),
        (s.parentIds || []).map((id) => {
          const p = phuHuynhTheoId.get(id);
          const so = p ? (cccdTheoNguoi.get(p.id) || '') : '';
          return so ? `${p.title} ${p.name}: ${so}` : '';
        }).filter(Boolean).join(' · '),
        (lienHeTheoBe.get(s.id) || [])
          .map(l => `${l.hoTen}${l.quanHe ? ` — ${l.quanHe}` : ''}${l.dienThoai ? ` (${l.dienThoai})` : ''}`)
          .join(' · '),
        noi(d.hoSoHocTap), noi(d.chiaSeGiaDinh), noi(d.truyenThong), d.nguoiKy, d.ngayKy,
        s.active === false || s.active === 0 ? 'Đã nghỉ' : 'Đang học',
      ]);
    }
    db.audit(req.user.id, 'students-export', null,
      { soBe: rows.length, keCaNghi, nguon: 'xuatbaocao', pham: req.query.pham, phamVi: pv.moTa });
    guiTep(res, `ho-so-be-${ngay.homNay()}`, [{
      ten: 'Hồ sơ bé', dongTieuDe: true,
      cot: [12, 26, 12, 12, 8, 14, 14, 16, 10, 8, 26, 30, 34, 30, 34, 14, 14, 14, 20, 12, 10],
      hang,
    }]);
  });
};
