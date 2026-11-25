// CHUÔNG CỦA CÔ, VĂN PHÒNG VÀ QUẢN LÝ (Đ260c).
//
// Nhà trường 18/11: *"Khi phụ huynh xin nghỉ học cho con, không hiện lên thông
// báo cho GV và văn phòng mà chỉ hiện ở thư mục xin phép. Tất cả những tác vụ
// của phụ huynh→giáo viên, quản lý↔giáo viên đều được thông báo ở tab thông
// báo (hình cái chuông) đồng thời báo đỏ ở trong từng thư mục."*
//
// `lib/thong-bao-be.js` là tin của GIA ĐÌNH một bé. Tệp này là chiều ngược
// lại: một dòng cho MỘT người của nhà trường (bảng `thongbao_nv`). Đây là bảng
// thứ ba mà lib/bao-nha-truong.js từng cố ý không dựng — chủ dự án đã đảo
// quyết định ấy ở đợt này (QL2).
//
// BA CHỐT CẤU TRÚC
//
//   1. `gui` chỉ ghi được cho tài khoản cô hoặc quản trị ĐANG HOẠT ĐỘNG. Không
//      có đường nào ghi một dòng của tệp này cho phụ huynh.
//   2. Chỉ chép SỰ KIỆN: không lý do nghỉ, không tên thuốc, không chữ tin
//      nhắn. Dòng này hiện cả trên màn khoá điện thoại (Nghị định 13/2023).
//   3. Danh sách, số trên chuông và số trên từng ô đọc cùng MỘT cửa sổ
//      (`cuaSo`), nên con số không bao giờ nói khác danh sách (P1).
//
// KHÔNG BAO GIỜ NÉM LỖI: chỗ gọi là đường ghi của gia đình, của cô. Chuông
// hỏng thì việc chính vẫn xong.
const db = require('./db');
const modules = require('./modules');
const nhomCo = require('./nhom-co');
const baoNT = require('./bao-nha-truong');

const TOI_DA_TIEU_DE = 120;
const TOI_DA_NOI_DUNG = 300;
// Màn Thông báo tải bao nhiêu dòng một lượt — và chuông đếm trong đúng chừng đó.
const TRANG_DAU = 50;

// MỘT DANH SÁCH LOẠI TIN DUY NHẤT.
//
// `phanHe`: phân hệ đang tắt thì không ghi, không đếm, không hứa.
// `nhanDay`: chữ hiện ở thẻ "Thông báo trên điện thoại" của CÔ (routes/push.js
//   đọc đúng danh sách này). Rỗng = không kể ra (loại giữ chỗ, hay loại cô
//   không nhận).
// `dayQuanTri`: loại mà quản trị ĐÃ được đẩy về máy từ trước đợt này (Đ154).
//   Loại mới chỉ vào chuông của quản trị, không đẩy: văn phòng chưa có đường
//   đẩy (lib/db.js), và danh sách loại tin của quản lý ở Cài đặt giữ nguyên.
const LOAI = [
  { ma: 'xin-nghi', phanHe: 'xinphep', nhanDay: 'gia đình gửi đơn xin nghỉ cho bé' },
  { ma: 'xin-nghi-ket-qua', phanHe: 'xinphep', nhanDay: 'văn phòng duyệt đơn xin nghỉ của bé' },
  // Giữ chỗ: chưa có đường nào để gia đình huỷ đơn.
  { ma: 'xin-nghi-huy', phanHe: 'xinphep', nhanDay: '' },
  { ma: 'dan-thuoc', phanHe: 'danthuoc', nhanDay: 'gia đình dặn thuốc cho bé' },
  { ma: 'tin-nhan', phanHe: 'nhantin', nhanDay: 'gia đình nhắn tin cho cô' },
  { ma: 'khao-sat', phanHe: 'khaosat', nhanDay: 'gia đình trả lời khảo sát cô tạo' },
  { ma: 'ke-hoach-gui', phanHe: 'kehoachbe', nhanDay: '', dayQuanTri: true },
  { ma: 'ke-hoach-duyet', phanHe: 'kehoachbe', nhanDay: 'kế hoạch của bé được duyệt hoặc gửi lại', dayQuanTri: true },
  { ma: 'ke-hoach-tra-lai', phanHe: 'kehoachbe', nhanDay: 'kế hoạch của bé được duyệt hoặc gửi lại', dayQuanTri: true },
  { ma: 'de-xuat', phanHe: 'kehoachbe', nhanDay: '', dayQuanTri: true },
  { ma: 'de-xuat-quyet', phanHe: 'kehoachbe', nhanDay: 'đề xuất sửa kế hoạch được trả lời', dayQuanTri: true },
  { ma: 'bao-cao-gui', phanHe: 'baocaohoctap', nhanDay: '', dayQuanTri: true },
  { ma: 'bao-cao-duyet', phanHe: 'baocaohoctap', nhanDay: 'báo cáo học tập được duyệt hoặc gửi lại' },
  { ma: 'bao-cao-tra-lai', phanHe: 'baocaohoctap', nhanDay: 'báo cáo học tập được duyệt hoặc gửi lại' },
  // Gia đình đề xuất thêm người liên hệ khẩn cấp cho bé (Đ260j, routes/students.js).
  { ma: 'lien-he-khan', phanHe: 'hocsinh', nhanDay: '' },
];
const LOAI_THEO_MA = Object.fromEntries(LOAI.map(l => [l.ma, l]));

// Chức vụ quản trị được tính là "văn phòng" của một cơ sở: nhận đơn xin nghỉ,
// dặn thuốc, tin gia đình nhắn văn phòng.
const CHUC_VU_VAN_PHONG = ['quanly-coso', 'vanphong-coso'];

// Văn phòng của MỘT cơ sở. Ban giám hiệu Cấp 1 (không khoá vào cơ sở nào)
// KHÔNG nhận — người điều phối chốt 25/11: họ chỉ nhận việc chờ duyệt.
function laVanPhong(u) {
  if (!u || u.role !== 'admin') return false;
  const cv = db.chucVu(u);
  if (cv !== null && !CHUC_VU_VAN_PHONG.includes(cv)) return false;
  return db.phamViCoSo(u) !== null;
}

// Cô của nhóm có bé này. `nhom` (tuỳ chọn) lọc theo nhóm cô ở chính nhóm lớp
// đó: dặn thuốc chỉ tới cô phụ trách nhóm và cô nước ngoài.
function coCuaBe(studentId, nhom = null) {
  const be = studentId ? db.findStudent(studentId) : null;
  if (!be || !be.classId) return [];
  return db.teachersOfClass(be.classId)
    .filter(t => !nhom || nhom.includes(nhomCo.nhomCua(db, be.classId, t.id)))
    .filter(t => db.canAccessStudent(t, studentId));
}

function vanPhongCuaBe(studentId) {
  if (!studentId) return [];
  return db.all('users', "SELECT * FROM users WHERE role = 'admin' AND active = 1")
    .filter(u => laVanPhong(u) && db.canAccessStudent(u, studentId));
}

function nguoiNhan(toi, tru) {
  const ids = new Set();
  const them = (ds) => { for (const u of ds || []) { const id = typeof u === 'object' ? u && u.id : u; if (id) ids.add(String(id)); } };
  them(toi.userIds);
  if (toi.coCuaBe) them(coCuaBe(toi.coCuaBe, toi.nhomCo || null));
  if (toi.vanPhongCuaBe) them(vanPhongCuaBe(toi.vanPhongCuaBe));
  if (toi.quanLyCuaBe) them(baoNT.quanLyCuaBe(toi.quanLyCuaBe));
  if (toi.quanLyCuaNhom) them(baoNT.quanLyCuaNhom(toi.quanLyCuaNhom));
  if (tru) ids.delete(String(tru));
  if (!ids.size) return [];
  const ds = [...ids];
  // Chốt cấu trúc số 1: chỉ cô hoặc quản trị đang hoạt động.
  return db.all('users',
    `SELECT id, role FROM users WHERE id IN (${ds.map(() => '?').join(',')})
       AND role IN ('teacher', 'admin') AND active = 1`, ds);
}

function manCua(hash) {
  return String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0].slice(0, 40);
}

// Ghi chuông cho mọi người nhận và đẩy về điện thoại. Trả về số người nhận.
//
// GỘP: có `gop` và người này đang có dòng CHƯA ĐỌC cùng khoá thì cộng vào dòng
// ấy, không đẩy lại. Dòng cùng khoá đã đọc rồi thì mở lại thành tin mới và đẩy:
// gia đình nhắn tiếp sau khi cô đã đọc là chuyện mới.
function gui({
  toi = {}, studentId = null, classId = null, loai, tieuDe, tieuDeGop = null, noiDung = '',
  hash = '', gop = '', xemLaDoc = true, nguoiTao = null, tru = null,
} = {}) {
  try {
    const kieu = LOAI_THEO_MA[loai];
    if (!kieu || !tieuDe || !toi || typeof toi !== 'object') return 0;
    if (kieu.phanHe && !modules.dangBat(kieu.phanHe)) return 0;
    const ds = nguoiNhan(toi, tru);
    if (!ds.length) return 0;
    let lop = classId || null;
    if (studentId && !lop) { const be = db.findStudent(studentId); lop = be ? be.classId || null : null; }
    const chuDe = (n) => String(n > 1 && typeof tieuDeGop === 'function' ? tieuDeGop(n) : tieuDe).trim().slice(0, TOI_DA_TIEU_DE);
    const than = String(noiDung || '').trim().slice(0, TOI_DA_NOI_DUNG);
    const khoa = String(gop || '').slice(0, 120);
    const duongDan = String(hash || '').slice(0, 200);
    const luc = new Date().toISOString();
    const canDay = [];
    db.tx(() => {
      for (const u of ds) {
        const cu = khoa ? db.first('thongbao_nv',
          'SELECT id, soLan, docLuc FROM thongbao_nv WHERE userId = ? AND gop = ? ORDER BY taoLuc DESC LIMIT 1', [u.id, khoa]) : null;
        if (cu && !cu.docLuc) {
          const n = Number(cu.soLan || 1) + 1;
          db.run('UPDATE thongbao_nv SET soLan = ?, tieuDe = ?, noiDung = ?, taoLuc = ? WHERE id = ?',
            [n, chuDe(n), than, luc, cu.id]);
          continue;
        }
        if (cu) {
          db.run('UPDATE thongbao_nv SET soLan = 1, tieuDe = ?, noiDung = ?, taoLuc = ?, docLuc = NULL WHERE id = ?',
            [chuDe(1), than, luc, cu.id]);
        } else {
          db.insert('thongbao_nv', {
            id: db.nextId('tbn'), userId: u.id, studentId: studentId || null, classId: lop,
            loai: kieu.ma, tieuDe: chuDe(1), noiDung: than, hash: duongDan, man: manCua(duongDan),
            gop: khoa, soLan: 1, xemLaDoc: xemLaDoc ? 1 : 0, nguoiTao: nguoiTao || null, taoLuc: luc, docLuc: null,
          });
        }
        if (u.role === 'teacher' || kieu.dayQuanTri) canDay.push(u.id);
      }
    });
    if (canDay.length) {
      try {
        const duong = require('./day');
        for (const id of canDay) {
          duong.guiChoNguoi(id, { tieuDe: chuDe(1), noiDung: than, hash: duongDan, gop: khoa ? `nv:${khoa}` : '' }).catch(() => {});
        }
      } catch (_) { /* đẩy là việc phụ */ }
    }
    return ds.length;
  } catch (_) {
    return 0;
  }
}

// Phân hệ của một màn: '' hay màn lạ thì không chặn.
function phanHeCuaMan(man) {
  if (!man) return null;
  return modules.tatCa().find(m => m.view === man) || null;
}

// CỬA SỔ DUY NHẤT: 50 dòng mới nhất của người này, giữ dòng mà người ấy VẪN
// được xem (bé, nhóm) và phân hệ của nó đang bật.
function cuaSo(user) {
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return [];
  const rows = db.all('thongbao_nv',
    'SELECT * FROM thongbao_nv WHERE userId = ? ORDER BY taoLuc DESC LIMIT ?', [user.id, TRANG_DAU]);
  const batCache = new Map();
  const dangBat = (key) => {
    if (!batCache.has(key)) batCache.set(key, modules.dangBat(key));
    return batCache.get(key);
  };
  const beCache = new Map();
  const xemBe = (id) => {
    if (!beCache.has(id)) beCache.set(id, db.canAccessStudent(user, id));
    return beCache.get(id);
  };
  const nhomMo = new Set(db.classIdsOf(user));
  return rows.filter((r) => {
    const kieu = LOAI_THEO_MA[r.loai];
    if (kieu && kieu.phanHe && !dangBat(kieu.phanHe)) return false;
    const m = phanHeCuaMan(r.man);
    if (m && !dangBat(m.key)) return false;
    if (r.studentId && !xemBe(r.studentId)) return false;
    if (r.classId && !r.studentId && !nhomMo.has(r.classId)) return false;
    return true;
  });
}

function danhSachCua(user) {
  try {
    const rows = cuaSo(user);
    const ten = (bang, ids) => {
      const ds = [...new Set(ids.filter(Boolean))];
      if (!ds.length) return new Map();
      return new Map(db.all(bang, `SELECT id, name FROM ${bang} WHERE id IN (${ds.map(() => '?').join(',')})`, ds)
        .map(r => [r.id, r.name]));
    };
    const tenBe = ten('students', rows.map(r => r.studentId));
    const tenNhom = ten('classes', rows.map(r => r.classId));
    return rows.map(r => ({
      id: r.id,
      laRiengNv: true,
      studentId: r.studentId || null,
      tenBe: r.studentId ? tenBe.get(r.studentId) || '' : '',
      tenNhom: r.classId ? tenNhom.get(r.classId) || '' : '',
      loai: r.loai,
      title: r.tieuDe,
      body: r.noiDung,
      hash: r.hash,
      soLan: Number(r.soLan || 1),
      createdAt: r.taoLuc,
      createdBy: r.nguoiTao,
      read: !!r.docLuc,
      pinned: false,
      category: 'Việc của mình',
      audience: 'nv',
    }));
  } catch (_) {
    return [];
  }
}

function demChuaDoc(user) {
  try { return cuaSo(user).filter(r => !r.docLuc).length; } catch (_) { return 0; }
}

// Số dòng chưa đọc theo Ô trên trang chủ (mã phân hệ), suy từ `man`.
function demTheoO(user) {
  const ra = {};
  try {
    for (const r of cuaSo(user)) {
      if (r.docLuc) continue;
      const m = phanHeCuaMan(r.man);
      if (!m) continue;
      ra[m.key] = (ra[m.key] || 0) + 1;
    }
  } catch (_) { /* thiếu số còn hơn hỏng trang chủ */ }
  return ra;
}

// Dòng của người khác thì trả 404 như không có: không để lộ là có dòng ấy.
function danhDaDoc(user, id) {
  const r = db.first('thongbao_nv', 'SELECT id, userId FROM thongbao_nv WHERE id = ?', [String(id || '')]);
  if (!r || !user || r.userId !== user.id) return { ok: false, ma: 404 };
  db.run('UPDATE thongbao_nv SET docLuc = ? WHERE id = ? AND docLuc IS NULL', [new Date().toISOString(), r.id]);
  return { ok: true };
}

function docTatCa(user) {
  if (!user) return 0;
  return db.run('UPDATE thongbao_nv SET docLuc = ? WHERE userId = ? AND docLuc IS NULL',
    [new Date().toISOString(), user.id]).changes;
}

// Mở một màn là đã đọc mọi dòng của màn ấy — trừ dòng phải mở đúng mục mới
// tính là đọc (tin nhắn: mở đúng cuộc trò chuyện).
function docTheoMan(user, man) {
  const m = manCua(`#/${String(man || '')}`);
  if (!user || !m) return 0;
  return db.run(
    'UPDATE thongbao_nv SET docLuc = ? WHERE userId = ? AND man = ? AND xemLaDoc = 1 AND docLuc IS NULL',
    [new Date().toISOString(), user.id, m]).changes;
}

function docTheoGop(userId, gop) {
  try {
    if (!userId || !gop) return 0;
    return db.run('UPDATE thongbao_nv SET docLuc = ? WHERE userId = ? AND gop = ? AND docLuc IS NULL',
      [new Date().toISOString(), userId, String(gop)]).changes;
  } catch (_) {
    return 0;
  }
}

function laMa(id) { return /^tbn_/.test(String(id || '')); }

// Chữ cho thẻ "Thông báo trên điện thoại" của CÔ — chỉ loại đang có phân hệ bật.
function nhanDayCuaCo() {
  const ra = [];
  for (const l of LOAI) {
    if (!l.nhanDay || ra.includes(l.nhanDay)) continue;
    if (l.phanHe && !modules.dangBat(l.phanHe)) continue;
    ra.push(l.nhanDay);
  }
  return ra;
}

module.exports = {
  LOAI, TRANG_DAU, gui, laVanPhong, coCuaBe, vanPhongCuaBe, cuaSo, danhSachCua, demChuaDoc, demTheoO,
  danhDaDoc, docTatCa, docTheoMan, docTheoGop, laMa, nhanDayCuaCo,
};
