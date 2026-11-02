// Cấp lại mật khẩu khi người dùng quên.
//
// Trường học thường không có máy chủ gửi thư điện tử, nên cách làm thực tế là:
// văn phòng cơ sở (hoặc quản lý cơ sở, ban giám hiệu) cấp một mật khẩu tạm,
// đọc cho phụ huynh, và phụ huynh buộc phải đổi ngay khi đăng nhập.
const crypto = require('crypto');
const db = require('../lib/db');
const password = require('../lib/password');
const nhomCo = require('../lib/nhom-co');
const { requireRole, destroyUserSessions } = require('../lib/auth');

// Mật khẩu tạm dễ đọc qua điện thoại: bỏ các ký tự dễ nhầm (0/O, 1/l/I).
const CHU = 'abcdefghjkmnpqrstuvwxyz';
const SO = '23456789';
function sinhMatKhauTam() {
  // `crypto.randomInt`, KHÔNG phải `Math.random`: mật khẩu tạm mở được hồ sơ
  // trẻ, mà Math.random đoán trước được khi biết vài giá trị nó từng sinh.
  const pick = (s) => s[crypto.randomInt(s.length)];
  let out = '';
  for (let i = 0; i < 5; i++) out += pick(CHU);
  for (let i = 0; i < 3; i++) out += pick(SO);
  return out;
}

// Ai được cấp lại mật khẩu cho ai: bảng `LUAT_CAP_LAI` ở dưới (L1). Các đoạn
// chú thích tiếp theo ghi lại vì sao từng ô của bảng bị đóng.
//
// ĐƯỜNG NÀY TỪNG LÀ LỐI LEO THANG QUYỀN NGẮN NHẤT TRONG CẢ APP (N15)
//
// Đường cấp lại mật khẩu TRẢ THẲNG mật khẩu tạm về cho người bấm — phải thế,
// vì cô đọc nó qua điện thoại cho phụ huynh. Nhưng cộng với `role === 'admin'
// thì được cấp cho mọi người`, một quản trị Cấp 3 chỉ cần ba lời gọi để thành
// Cấp 1: xem danh sách quản trị, cấp lại mật khẩu cho tài khoản Cấp 1, rồi
// đăng nhập bằng chính mật khẩu vừa nhận. Đã dựng lại được, và thành công.
//
// Mọi chốt chặn khác của tầng cơ sở đều vô nghĩa khi lối này còn mở, nên hai
// vế dưới đây là phần quan trọng nhất của N15:
//
//   1. Quản trị Cấp 3 KHÔNG cấp lại mật khẩu cho tài khoản quản trị nào khác.
//      Không phân biệt Cấp 1 hay Cấp 3 khác: cấp cho một Cấp 3 khác cũng là
//      chiếm được cơ sở của người ta.
//   2. Quản trị Cấp 3 chỉ cấp lại được cho cô và phụ huynh CỦA CƠ SỞ MÌNH.
//
// Trường chưa khai cơ sở nào thì `db.phamViCoSo` trả null và cả khối này nằm
// im — quản trị giữ nguyên quyền như trước khi có N4.
// CHỨC VỤ CẤP 2 CŨNG KHÔNG ĐỤNG TỚI TÀI KHOẢN QUẢN TRỊ
//
// N15 bịt lối leo thang cho Cấp 3 bằng cách hỏi `db.phamViCoSo`. Chức vụ Cấp 2
// (Nhân sự) đi lọt qua đúng chỗ đó: nó là tài khoản quản trị KHÔNG khoá vào cơ
// sở nào, nên `phamViCoSo` trả `null` và dòng `return true` ở trên nhận nó là
// ban giám hiệu. Ba lời gọi sau đó là thành Cấp 1: mở danh sách quản trị, cấp
// lại mật khẩu cho ban giám hiệu, đọc mật khẩu tạm ngay trên màn hình rồi đăng
// nhập. Đúng lối cũ, chỉ đổi người đi.
//
// Nên Cấp 2 dừng ở đây: cô và phụ huynh thì được, tài khoản quản trị thì không
// — kể cả một tài khoản Cấp 2 khác, vì chiếm được nó là chiếm được phần việc
// của người ta.
// CHỨC VỤ CHỈ LO TÀI KHOẢN CỦA TRƯỜNG, KHÔNG CHẠM TÀI KHOẢN CỦA GIA ĐÌNH.
//
// Nhân sự có `/api/accounts` vì họ lập, khoá và cấp lại mật khẩu cho tài khoản
// của CÔ. Nhưng chính mô tả chức vụ ấy hứa với nhà trường rằng họ "KHÔNG mở
// được hồ sơ bé, sức khoẻ, hay ảnh của trẻ" — mà hai đường dưới đây đi vòng
// qua đúng lời hứa đó:
//
//   • cấp lại mật khẩu cho một tài khoản PHỤ HUYNH thì người cấp cầm luôn mật
//     khẩu tạm, và tài khoản đó mở được cả ba thứ vừa kể;
//   • danh sách phụ huynh trả về kèm TÊN CÁC CON của từng nhà.
//
// Đây không phải lỗ hổng cần vá gấp — app buộc đổi mật khẩu ở lần đăng nhập kế,
// đá mọi thiết bị của gia đình ra, và ghi lại ai bấm cho ai. Nhưng "để lại dấu
// vết" là cách xử lý sau khi chuyện đã xảy ra, còn đây là chặn từ đầu, và chặn
// mà không ai mất việc: gia đình quên mật khẩu vẫn có văn phòng cơ sở, quản lý
// cơ sở và ban giám hiệu lo được (L1 bỏ phần của cô).
const CHUC_VU_KHONG_LO_GIA_DINH = ['nhansu'];

function chiLoTaiKhoanTruong(user) {
  return !!user && user.role === 'admin'
    && CHUC_VU_KHONG_LO_GIA_DINH.includes(db.chucVu(user));
}

const LOI_KHONG_LO_GIA_DINH = 'Tài khoản Nhân sự lo phần tài khoản của trường. '
  + 'Phần của gia đình do văn phòng cơ sở, quản lý cơ sở hoặc ban giám hiệu làm giúp.';

// L1 (góp ý 20/10 mục 12, chủ dự án chốt 02/11): cô thôi cấp lại mật khẩu và
// thôi đọc danh sách tài khoản của gia đình. Việc đó về văn phòng cơ sở.
const LOI_CO_CAP_LAI_GIA_DINH = 'Cấp lại mật khẩu cho gia đình nay do văn phòng cơ sở làm. '
  + 'Cô nhờ văn phòng hoặc quản lý cơ sở giúp nhé.';
const LOI_CO_DOC_DS_GIA_DINH = 'Danh sách tài khoản của gia đình nay do văn phòng cơ sở giữ. '
  + 'Gia đình quên mật khẩu: cô nhờ văn phòng cơ sở cấp lại nhé.';

// LUẬT CẤP LẠI MẬT KHẨU (L1) — một bảng thay cho chuỗi `if` cũ.
//
// Người cấp chia năm loại, tài khoản đích năm loại; một ô có trong bảng mới
// được cấp. Hai loại người cấp có phạm vi CẢ TRƯỜNG (cap1, nhansu), còn lại
// chỉ trong cơ sở mình (`phamViCoSo`).
//
// - cap1: ban giám hiệu (chưa khai chức vụ hoặc `hieu-truong`) VÀ không khoá
//   vào cơ sở nào — đúng hai chốt của `POST /api/admin/managers`. Khoá vào một
//   cơ sở thì là quản lý của cơ sở đó, không còn là cấp 1.
// - quanly: quản lý cơ sở. CHƯA khoá vào cơ sở nào thì phạm vi cả trường,
//   nhưng KHÔNG BAO GIỜ chạm tài khoản quản trị. Luật cũ nhận họ là ban giám
//   hiệu (`phamViCoSo` trả null) và cho cấp lại cả mật khẩu ban giám hiệu.
// - vanphong: chỉ gia đình trong cơ sở mình. Cửa `/api/accounts` của văn phòng
//   (lib/db.js) mở ở bước sau; tới lúc đó dòng này chưa với tới được.
// - Kế toán, Marketing, Bảo vệ, cô, phụ huynh: không cấp cho ai.
const LUAT_CAP_LAI = {
  cap1: ['quan-tri', 'quan-ly-co-so', 'nhan-vien-co-so', 'co', 'phu-huynh'],
  nhansu: ['co'],
  quanly: ['nhan-vien-co-so', 'co', 'phu-huynh'],
  vanphong: ['phu-huynh'],
  khong: [],
};

function loaiNguoiCap(actor) {
  if (!actor || actor.role !== 'admin') return 'khong';
  const cv = db.chucVu(actor);
  if (cv === null || cv === 'hieu-truong') return db.phamViCoSo(actor) === null ? 'cap1' : 'quanly';
  if (cv === 'nhansu') return 'nhansu';
  if (cv === 'quanly-coso') return 'quanly';
  // Văn phòng là việc của MỘT cơ sở. Chưa gắn cơ sở nào thì phạm vi rơi về
  // "cả trường" — tài khoản cấu hình dở, không phải người được giao cả trường:
  // không cấp lại cho ai (cùng luật với hồ sơ cô ở routes/admin.js).
  if (cv === 'vanphong-coso') return db.phamViCoSo(actor) === null ? 'khong' : 'vanphong';
  return 'khong';
}

// `cv` truyền vào được khi bên gọi đã đọc sẵn chức vụ của cả trường một lượt.
function loaiDich(target, cv) {
  if (target.role === 'parent') return 'phu-huynh';
  if (target.role === 'teacher') return 'co';
  if (target.role !== 'admin') return null;
  if (cv === undefined) cv = db.chucVu(target);
  if (cv === 'quanly-coso') return 'quan-ly-co-so';
  if (cv === 'vanphong-coso' || cv === 'baove') return 'nhan-vien-co-so';
  return 'quan-tri';
}

// Loại và phạm vi cơ sở của người cấp — tính MỘT lần cho cả màn danh sách.
function nguoiCap(actor) {
  return { loai: loaiNguoiCap(actor), pham: db.phamViCoSo(actor) };
}

// `ngu` (tuỳ chọn): những điều bên gọi ĐÃ BIẾT, để màn danh sách tài khoản
// khỏi hỏi máy cho từng dòng. Thiếu mục nào thì tự hỏi, đúng như đường cấp lại.
//   ngu.nguoi  — `nguoiCap(actor)`;
//   ngu.chucVu — chức vụ của tài khoản đích (null = chưa khai);
//   ngu.coSo   — một cơ sở mà tài khoản đích CHẮC CHẮN thuộc về. Chỉ dùng để
//                xác nhận; khác phạm vi của người cấp thì vẫn hỏi `trongCoSo`,
//                vì một nhà có con ở hai cơ sở thuộc về cả hai.
function quyenCapLai(actor, target, ngu = {}) {
  if (!target || !target.active) return false;
  if (actor.id === target.id) return false;
  const { loai, pham } = ngu.nguoi || nguoiCap(actor);
  if (!LUAT_CAP_LAI[loai].includes(loaiDich(target, ngu.chucVu))) return false;
  if (loai === 'cap1' || loai === 'nhansu') return true;
  if (pham === null) return target.role !== 'admin';
  if (ngu.coSo === pham) return true;
  return trongCoSo(target, pham);
}

// Một tài khoản có thuộc cơ sở này không.
//
// Nhân viên cơ sở (văn phòng, bảo vệ) là tài khoản quản trị KHOÁ vào một cơ
// sở (`user_campus`): thuộc đúng cơ sở ấy. Quản trị không khoá thì không thuộc
// cơ sở nào.
//
// Cô và phụ huynh KHÔNG có cơ sở của riêng mình — quan hệ đi vòng qua nhóm lớp:
// cô thì qua nhóm cô phụ trách, phụ huynh thì qua nhóm con đang học. Người nào
// không nối được tới nhóm nào của cơ sở này thì không thuộc về nó.
//
// Một ngoại lệ, cùng luật với danh sách cô ở routes/admin.js (Đ239d1): cô
// CHƯA TỪNG được phân vào nhóm nào (kể cả nhóm đã đóng) thì thuộc cơ sở của
// quản lý đã tạo ra cô (bảng `giao_vien_co_so`). Thiếu vế này thì quản lý cơ
// sở thấy cô mình vừa tạo mà không cấp lại được mật khẩu cho cô (Đ239d2). Cô
// đã từng có nhóm thì chỉ nhóm mới là sự thật — dòng ghi nhận ấy không được
// hỏi tới nữa, kể cả khi chuyển năm học đóng hết nhóm của cô: không thì quản lý
// cơ sở đã tạo cô lại "có" cô sau khi ban giám hiệu chuyển cô sang cơ sở khác.
function trongCoSo(target, campusId) {
  if (target.role === 'admin') return db.campusOfUser(target.id) === campusId;
  if (target.role === 'teacher') {
    if (!db.classIdsEverOfTeacher(target.id).length) {
      const r = db.first('giao_vien_co_so', 'SELECT campusId FROM giao_vien_co_so WHERE userId = ?', [target.id]);
      return !!r && r.campusId === campusId;
    }
  }
  const nhom = db.classIdsOfCampus(campusId);
  if (!nhom.length) return false;
  const marks = nhom.map(() => '?').join(',');
  if (target.role === 'teacher') {
    return db.classIdsOfTeacher(target.id).some(id => nhom.includes(id));
  }
  if (target.role === 'parent') {
    return db.count(
      `SELECT COUNT(*) FROM student_parents sp
       JOIN students s ON s.id = sp.studentId
       WHERE sp.parentId = ? AND s.classId IN (${marks}) AND s.active = 1`,
      [target.id, ...nhom]) > 0;
  }
  return false;
}

module.exports = (app) => {
  // Danh sách phụ huynh trong phạm vi người xem, kèm tên con — để nhà trường
  // tìm đúng người. Cô không còn mở được (1c-5, chủ dự án 02/11); giữ vai cô ở
  // `requireRole` để bản giao diện cũ trong máy nhận câu tiếng Việt, không phải
  // câu chung của máy chủ.
  app.get('/api/accounts/parents', requireRole('teacher', 'admin'), (req, res) => {
    if (req.user.role === 'teacher') {
      return res.status(403).json({ error: LOI_CO_DOC_DS_GIA_DINH });
    }
    if (chiLoTaiKhoanTruong(req.user)) {
      return res.status(403).json({ error: LOI_KHONG_LO_GIA_DINH });
    }
    const students = db.studentsOf(req.user);
    const seen = new Map();
    for (const s of students) {
      for (const pid of s.parentIds) {
        const p = db.findUser(pid);
        if (!p || !p.active) continue;
        if (!seen.has(pid)) {
          seen.set(pid, {
            userId: p.id,
            name: `${p.title} ${p.name}`,
            username: p.username,
            phone: p.phone,
            avatar: p.avatar,
            mustChangePassword: p.mustChangePassword,
            children: [],
          });
        }
        seen.get(pid).children.push(s.name);
      }
    }
    res.json([...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
  });

  // DANH SÁCH TÀI KHOẢN CHO TAB TÀI KHOẢN (L1): quản trị, rồi Cơ sở → nhóm lớp.
  //
  // Mỗi dòng mang cờ `capLai` tính bằng ĐÚNG `quyenCapLai` của đường cấp lại
  // ngay dưới, nên nút hiện ra là nút bấm được. Ai thấy phần nào:
  //   - chỉ cấp 1 nhận `quanTri` (tài khoản quản trị không khoá cơ sở);
  //   - Nhân sự chỉ nhận dòng cô — không nhân viên cơ sở, không gia đình;
  //   - quản lý và văn phòng cơ sở chỉ nhận cơ sở của mình (`classIdsOf`);
  //   - cô, phụ huynh: 403 (1c-5). Kế toán, Marketing, Bảo vệ không có
  //     `/api/accounts` trong danh sách chức vụ nên dừng ở `chanApiNgoaiChucVu`.
  //
  // Hỏi máy theo lô 400 nhóm một lượt, không hỏi từng phụ huynh hay từng cô.
  app.get('/api/accounts/danh-sach', requireRole('admin'), (req, res) => {
    const nguoi = nguoiCap(req.user);
    if (nguoi.loai === 'khong') {
      return res.status(403).json({ error: 'Tài khoản này không có việc ở danh sách tài khoản.' });
    }
    const pham = nguoi.pham;
    const chiCo = nguoi.loai === 'nhansu';
    const coTang = db.coTangCoSo();
    const hoTen = (u) => [u.title, u.name].filter(Boolean).join(' ');
    const COT = 'u.id, u.username, u.name, u.title, u.phone, u.role, u.active, u.mustChangePassword';
    const dong = (u, them, ngu) => ({
      id: u.id, hoTen: hoTen(u), username: u.username, loai: loaiDich(u, ngu.chucVu),
      sdt: u.phone || '', ...them, matKhauTam: !!u.mustChangePassword,
      capLai: quyenCapLai(req.user, u, { nguoi, ...ngu }),
    });

    // Khối cơ sở. Trường chưa khai cơ sở: một khối `''` duy nhất. Có cơ sở thì
    // khối `''` gom phần chưa gắn cơ sở nào, và chỉ người thấy cả trường nhận.
    const khoi = new Map();
    const moKhoi = (campusId, ten) => {
      if (!khoi.has(campusId)) khoi.set(campusId, { campusId, ten, nhanVien: [], nhom: [], coChuaNhom: [] });
      return khoi.get(campusId);
    };
    if (!coTang) moKhoi('', 'Toàn trường');
    else if (pham) moKhoi(pham, (db.findCampus(pham) || {}).name || '');
    else for (const c of db.campuses()) moKhoi(c.id, c.name);
    const khoiCua = (campusId) => khoi.get(campusId) || (pham ? null : moKhoi('', 'Chưa gắn cơ sở'));

    // Nhân viên cơ sở và quản trị.
    const quanTri = [];
    if (!chiCo) {
      const chucVu = new Map(db.all('user_chucvu', 'SELECT userId, chucVu FROM user_chucvu')
        .map(r => [r.userId, db.moTaChucVu(r.chucVu) ? r.chucVu : null]));
      const khoa = new Map(db.all('user_campus', 'SELECT userId, campusId FROM user_campus')
        .map(r => [r.userId, r.campusId]));
      for (const u of db.all('users', `SELECT ${COT} FROM users u
        WHERE u.role = 'admin' AND u.active = 1 ORDER BY u.name`)) {
        const cv = chucVu.get(u.id) || null;
        const campusId = khoa.get(u.id) || null;
        const them = { chucVuTen: cv ? db.moTaChucVu(cv).ten : '' };
        if (!campusId) {
          if (nguoi.loai === 'cap1') quanTri.push(dong(u, them, { chucVu: cv }));
          continue;
        }
        const k = khoiCua(coTang ? campusId : '');
        if (k) k.nhanVien.push(dong(u, them, { chucVu: cv, coSo: campusId }));
      }
    }

    // Nhóm lớp trong phạm vi người xem.
    const trongTam = new Set(db.classIdsOf(req.user));
    const nhom = db.classes().filter(c => trongTam.has(c.id) && db.canAccessClass(req.user, c.id));
    const coSoNhom = new Map(db.all('class_campus', 'SELECT classId, campusId FROM class_campus')
      .map(r => [r.classId, r.campusId]));
    const moiNhom = new Map();
    for (const c of nhom) {
      const campusId = coTang ? (coSoNhom.get(c.id) || '') : '';
      const k = khoiCua(campusId);
      if (!k) continue;
      const m = { classId: c.id, ten: c.name, co: [], phuHuynh: [], campusId, nhomCo: nhomCo.nhomTheoLop(db, c.id) };
      moiNhom.set(c.id, m);
      k.nhom.push(m);
    }

    const ids = [...moiNhom.keys()];
    const phTheoNhom = new Map(ids.map(id => [id, new Map()]));
    for (let i = 0; i < ids.length; i += 400) {
      const lo = ids.slice(i, i + 400);
      const marks = lo.map(() => '?').join(',');
      for (const r of db.all('users', `SELECT ct.classId AS lopId, ct.vaiTro, ${COT}
        FROM class_teachers ct JOIN users u ON u.id = ct.teacherId
        WHERE ct.classId IN (${marks}) AND u.role = 'teacher' AND u.active = 1
        ORDER BY CASE ct.vaiTro WHEN 'chinh' THEN 0 ELSE 1 END, u.name`, lo)) {
        const m = moiNhom.get(r.lopId);
        m.co.push(dong(r, { nhomCo: m.nhomCo[r.id] || nhomCo.MAC_DINH, coChinh: r.vaiTro === 'chinh' },
          { coSo: m.campusId }));
      }
      if (chiCo) continue;
      for (const r of db.all('users', `SELECT s.classId AS lopId, s.name AS tenBe, ${COT}
        FROM students s
        JOIN student_parents sp ON sp.studentId = s.id
        JOIN users u ON u.id = sp.parentId
        WHERE s.classId IN (${marks}) AND s.active = 1 AND u.role = 'parent' AND u.active = 1
        ORDER BY s.name`, lo)) {
        const nha = phTheoNhom.get(r.lopId);
        if (!nha.has(r.id)) nha.set(r.id, { u: r, con: [] });
        nha.get(r.id).con.push(r.tenBe);
      }
    }
    for (const [classId, nha] of phTheoNhom) {
      const m = moiNhom.get(classId);
      m.phuHuynh = [...nha.values()]
        .map(({ u, con }) => dong(u, { con }, { coSo: m.campusId }))
        .sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi'));
    }

    // Cô chưa phụ trách nhóm nào đang mở. Cô CHƯA TỪNG có nhóm thì thuộc cơ sở
    // của người đã tạo ra cô (`giao_vien_co_so`), cùng luật với `trongCoSo`;
    // còn lại chỉ người thấy cả trường nhận, ở khối `''`.
    for (const u of db.all('users', `SELECT ${COT}, g.campusId AS taoTai,
        EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.teacherId = u.id) AS tungCoNhom
      FROM users u LEFT JOIN giao_vien_co_so g ON g.userId = u.id
      WHERE u.role = 'teacher' AND u.active = 1
        AND NOT EXISTS (SELECT 1 FROM class_teachers ct JOIN classes c ON c.id = ct.classId
                        WHERE ct.teacherId = u.id AND c.active = 1)
      ORDER BY u.name`)) {
      const coSo = coTang && !u.tungCoNhom && u.taoTai && khoi.has(u.taoTai) ? u.taoTai : '';
      const k = coSo ? khoi.get(coSo) : khoiCua('');
      if (k) k.coChuaNhom.push(dong(u, {}, coSo ? { coSo } : {}));
    }

    const coSo = [...khoi.values()].map(({ campusId, ten, nhanVien, nhom: ds, coChuaNhom }) => ({
      campusId, ten, nhanVien,
      nhom: ds.map(({ classId, ten: tenNhom, co, phuHuynh }) => ({ classId, ten: tenNhom, co, phuHuynh })),
      coChuaNhom,
    }));
    res.json({ quanTri, coSo });
  });

  // Cấp mật khẩu tạm cho một tài khoản.
  app.post('/api/accounts/:id/reset-password', requireRole('teacher', 'admin'), (req, res) => {
    const target = db.findUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    if (!quyenCapLai(req.user, target)) {
      let error = 'Bạn không có quyền cấp lại mật khẩu cho tài khoản này';
      if (target.role === 'parent' && req.user.role === 'teacher') error = LOI_CO_CAP_LAI_GIA_DINH;
      else if (target.role === 'parent' && chiLoTaiKhoanTruong(req.user)) error = LOI_KHONG_LO_GIA_DINH;
      return res.status(403).json({ error });
    }

    const matKhauTam = sinhMatKhauTam();
    db.update('users', target.id, {
      passwordHash: password.hash(matKhauTam),
      mustChangePassword: true,
    });
    // Đăng xuất mọi thiết bị của người đó: nếu tài khoản bị chiếm dụng thì
    // việc cấp lại mật khẩu phải cắt được phiên của kẻ đang dùng trộm.
    const kicked = destroyUserSessions(target.id, null);
    db.audit(req.user.id, 'reset-password', target.id, {
      targetName: target.name, targetUsername: target.username, kicked,
    });

    res.json({
      ok: true,
      username: target.username,
      temporaryPassword: matKhauTam,
      message: `Đã cấp mật khẩu tạm cho ${target.title} ${target.name}. ` +
        'Vui lòng đọc cho phụ huynh và nhắc đổi lại ngay khi đăng nhập.',
    });
  });

  // NHỮNG LẦN CHÍNH NGƯỜI NÀY ĐÃ CẤP LẠI MẬT KHẨU CHO AI.
  //
  // CHÚ THÍCH CŨ NÓI SAI, và sai theo hướng nguy hiểm: nó ghi "nhật ký cấp lại
  // mật khẩu — để tra khi có tranh chấp", nghe như đây là chỗ tra "tài khoản
  // của nhà tôi bị ai đổi mật khẩu". Câu truy vấn thì lọc `userId = ?`, tức mã
  // NGƯỜI ĐI CẤP LẠI, không phải mã tài khoản BỊ cấp lại. Ai tin theo chú thích
  // mà mở đường này ra để điều tra một khiếu nại sẽ nhận về danh sách rỗng và
  // kết luận "không ai đụng vào" — trong khi người đụng vào là người khác.
  //
  // Chỗ tra khi có tranh chấp thật là **Quản trị → Nhật ký** (`/api/admin/audit`),
  // nơi đọc được cả bảng `audit_log` chứ không riêng phần của mình.
  //
  // GIỮ ĐƯỜNG NÀY, chỉ sửa lại lời: nó đúng cho một câu hỏi có thật — "tuần này
  // tôi đã cấp lại cho những ai" — và chưa màn hình nào gọi tới, nên bỏ đi thì
  // ngày mai dựng màn ấy lại phải viết lại. Xoá dữ liệu hay đường dẫn là việc
  // phải hỏi nhà trường trước (CLAUDE.md).
  app.get('/api/accounts/reset-log', requireRole('teacher', 'admin'), (req, res) => {
    const rows = db.all('audit_log',
      `SELECT * FROM audit_log WHERE action = 'reset-password' AND userId = ?
       ORDER BY at DESC LIMIT 50`, [req.user.id]);
    res.json(rows.map(r => {
      let detail = {};
      try { detail = JSON.parse(r.detail || '{}'); } catch (_) {}
      return { at: r.at, targetName: detail.targetName || '', targetUsername: detail.targetUsername || '' };
    }));
  });
};

module.exports.sinhMatKhauTam = sinhMatKhauTam;
