// Số huy hiệu (badge) hiển thị trên lưới icon và thanh điều hướng.
//
// Mỗi con số là một câu đếm riêng trên cơ sở dữ liệu — nhanh hơn nhiều so với
// việc nạp toàn bộ dữ liệu lên rồi lọc trong bộ nhớ.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const st = require('../lib/sua-thu-hoi');
// Luật "ai thấy thông báo nào" nằm ở MỘT chỗ — lib/thong-bao.js — thay cho hai
// bản chép tay từng trôi lệch giữa tệp này và routes/notifications.js.
const tb = require('../lib/thong-bao');
const tbb = require('../lib/thong-bao-be');
const kvp = require('../lib/kenh-van-phong');
const { requireRole } = require('../lib/auth');
const modules = require('../lib/modules');
const nghiHoc = require('../lib/nghi-hoc');
const nl = require('../lib/nhom-lop');
const huyHieu = require('../lib/huy-hieu');

function todayStr() {
  return ngay.homNay();
}

function audienceFilter(user) {
  return tb.audienceFilter(user, 'n.');
}

function unreadNotifications(user) {
  return unreadCuaTruong(user) + tbb.demChuaDoc(user);
}

function unreadCuaTruong(user) {
  const f = audienceFilter(user);
  // Thông báo ĐÃ THU HỒI phải bị loại khỏi bộ đếm này. Nếu không, phụ huynh sẽ
  // thấy một con số "chưa đọc" không bao giờ về 0: thông báo đã biến khỏi danh
  // sách nên không còn cách nào bấm vào để đánh dấu đã đọc.
  return db.count(
    `SELECT COUNT(*) FROM notifications n
     WHERE ${f.sql}
       AND n.createdBy IS NOT ?
       AND ${st.dieuKienConHien('notifications', 'n.id')}
       AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notificationId = n.id AND r.userId = ?)`,
    [...f.params, user.id, user.id]);
}

function unreadMessages(user) {
  // ĐẾM THEO CÙNG LUẬT VỚI DANH SÁCH HỘI THOẠI (routes/messages.js): phòng
  // chung gắn nhóm mà người này không còn mở được — cô đã rời nhóm, nhóm đã
  // đóng sau chuyển năm — thì không được đếm vào huy hiệu. Bản cũ đếm tuốt,
  // nên tin chưa đọc trong một phòng đã khoá làm con số trên ô Nhắn tin đứng
  // mãi không về 0, mà bấm vào thì không thấy phòng nào để đọc.
  // TIN ĐÃ THU HỒI KHÔNG ĐƯỢC ĐẾM VÀO HUY HIỆU (Đ196, việc 25).
  //
  // Thiếu điều kiện `dieuKienConHien` dưới đây thì gia đình thấy con số 1 trên
  // ô Nhắn tin cho một lời nhắn mà mở ra chỉ còn chỗ trống — huy hiệu hứa một
  // thứ mà màn hình không có. Cùng hình dạng với ba chỗ `test:thu-hoi` đã bắt
  // được trước đây, chỉ khác bảng; chính bộ canh ấy bắt được chỗ này.
  //
  // HỘP THƯ VĂN PHÒNG VÀ KÊNH PHÍA GIA ĐÌNH (Đ239m) đếm cùng MỘT luật với
  // danh sách, lấy từ lib/kenh-van-phong.js: người đã hết quyền đọc một cuộc
  // thì tin trong đó thôi được đếm.
  //
  // CUỘC ĐÃ ĐÓNG (Đ239n) cũng vậy: danh sách loại nó và mở ra là 404, nên tin
  // chưa đọc trong đó không còn đường nào để đọc. Thiếu điều kiện
  // `hoi_thoai_dong` dưới đây thì huy hiệu đứng mãi — lỗi có từ Đ192.
  const dieuKienKenh = kvp.dieuKienDanhSach(user);
  const rows = db.all('messages',
    `SELECT c.id AS convId, c.type AS type, c.classId AS classId, COUNT(*) AS n
       FROM messages m
       JOIN conversation_members cm ON cm.conversationId = m.conversationId AND cm.userId = ?
       JOIN conversations c ON c.id = m.conversationId
      WHERE m.senderId != ?
        AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)
        AND ${st.dieuKienConHien('messages', 'm.id')}
        AND ${dieuKienKenh.sql}
        AND c.id NOT IN (SELECT conversationId FROM hoi_thoai_dong)
      GROUP BY c.id, c.type, c.classId`,
    [user.id, user.id, ...dieuKienKenh.params]);
  if (!rows.length) return 0;
  // Cùng MỘT luật với danh sách hội thoại (lib/thong-bao.js) — quản trị thấy
  // cả phòng nhóm đã đóng trong cơ sở mình, nên huy hiệu cũng phải đếm chúng.
  const nhomMoDuoc = new Set(tb.nhomPhongChat(user));
  return rows
    .filter(r => !(r.type === 'group' && r.classId) || nhomMoDuoc.has(r.classId))
    .reduce((s, r) => s + Number(r.n || 0), 0);
}

// ===========================================================================
// HAI ĐƯỜNG "HÔM NAY" CHO CÔ VÀ VĂN PHÒNG (Đ124)
// ===========================================================================
//
// Cô mở app là để làm việc với 20–25 bé của nhóm mình TRONG HÔM NAY: ai có mặt,
// ai chưa được chấm, ai đang nghỉ có đơn, ai có thuốc gia đình gửi, nhật ký
// ngày đã ghi cho ai, ai đã được đón về. Trang chủ cũ chỉ có lưới biểu tượng —
// mỗi câu hỏi đó là một lượt mở màn. Đường /hom-nay gom về MỘT câu trả lời
// cho một nhóm.
//
// Văn phòng và ban giám hiệu thì theo dõi theo CẤP: cơ sở → nhóm → bé. Đường
// /tong-quan trả cây đó kèm số đếm hôm nay, để trang chủ của họ không còn là
// một ô chọn bé phẳng của cả trường.
//
// LUẬT CỦA HAI ĐƯỜNG NÀY:
//   • Chỉ ĐẾM và chỉ trạng thái VIỆC — điểm danh, đơn, thuốc, sổ đã ghi. Không
//     một con số nào là đánh giá về đứa trẻ (QUY TẮC 4). "Chưa điểm danh" là
//     việc người lớn chưa làm, không phải một lời nào về bé (QUY TẮC 2).
//   • Bảng của phân hệ khác chỉ đọc khi phân hệ đó ĐANG BẬT, và trong khối bắt
//     lỗi: phân hệ tắt hay hỏng thì vế đó về null, trang chủ vẫn lên.
//   • Một câu cho CẢ danh sách bé, không một câu cho mỗi bé (Đ113).

function docBangPhanHe(key, bang, sql, params) {
  if (!modules.dangBat(key)) return null;
  try { return db.all(bang, sql, params); } catch (_) { return null; }
}

// Trạng thái hôm nay của một danh sách bé, gom theo từng loại.
function tinhHomNay(ids, today) {
  const marks = ids.map(() => '?').join(',');
  const diemDanh = new Map();
  if (ids.length && modules.dangBat('diemdanh')) {
    for (const r of db.all('attendance',
      `SELECT studentId, status, checkIn, checkOut FROM attendance
        WHERE date = ? AND studentId IN (${marks})`, [today, ...ids])) {
      diemDanh.set(r.studentId, r);
    }
  }
  const nghiPhep = ids.length ? nghiHoc.nghiCoPhep(ids, today) : new Map();
  const donCho = new Set();
  if (ids.length && modules.dangBat('xinphep')) {
    for (const r of db.all('leave_requests',
      `SELECT studentId FROM leave_requests WHERE status = 'pending' AND studentId IN (${marks})`, ids)) {
      donCho.add(r.studentId);
    }
  }
  // 'cho' = gia đình gửi mà cô chưa xác nhận; 'dang' = đã nhận và hôm nay còn
  // trong khoảng ngày dùng thuốc.
  const thuoc = new Map();
  if (ids.length && modules.dangBat('danthuoc')) {
    for (const r of db.all('medicine_requests',
      `SELECT studentId, status, fromDate, toDate FROM medicine_requests
        WHERE status IN ('pending', 'received') AND studentId IN (${marks})`, ids)) {
      if (r.status === 'pending') thuoc.set(r.studentId, 'cho');
      else if (r.fromDate <= today && r.toDate >= today && !thuoc.has(r.studentId)) thuoc.set(r.studentId, 'dang');
    }
  }
  const nk = ids.length
    ? docBangPhanHe('nhatky', 'nhatky_ngay',
      `SELECT studentId FROM nhatky_ngay WHERE ngay = ? AND studentId IN (${marks})`, [today, ...ids])
    : (modules.dangBat('nhatky') ? [] : null);
  const tra = ids.length
    ? docBangPhanHe('dontra', 'dontra_ghi',
      `SELECT studentId FROM dontra_ghi WHERE ngay = ? AND studentId IN (${marks})`, [today, ...ids])
    : (modules.dangBat('dontra') ? [] : null);
  return {
    // Điểm danh có đang bật không — để vế "đã về" (giờ ra về của sổ lõi) là
    // null khi điểm danh tắt, đúng luật null ≠ 0 của Đ112.
    coDiemDanh: modules.dangBat('diemdanh'),
    diemDanh, nghiPhep, donCho, thuoc,
    nhatKy: nk ? new Set(nk.map(r => r.studentId)) : null,
    daTra: tra ? new Set(tra.map(r => r.studentId)) : null,
  };
}

// Số đếm của một nhóm. Vế của phân hệ đang tắt là null, không phải 0 — 0 là
// "chưa ai ghi", null là "không có phần này".
function demNhom(ids, hn) {
  const dem = {
    soBe: ids.length, coMat: 0, denMuon: 0, nghiPhep: 0, nghiKhongPhep: 0, chuaDiemDanh: 0,
    nhatKyDaGhi: hn.nhatKy ? 0 : null, daTra: hn.daTra ? 0 : null,
    // ĐÃ VỀ theo giờ ra về của sổ điểm danh lõi (Đ227). Từ Đ210 ra về ghi ở
    // màn Điểm danh; góp ý 06/10 bỏ phân hệ Đón trả bé (tắt sẵn) — vế `daTra`
    // của phân hệ ấy giữ nguyên nghĩa cũ, vế này là của lõi.
    daVe: hn.coDiemDanh ? 0 : null,
    donCho: 0, thuocCho: 0, thuocDang: 0,
  };
  for (const id of ids) {
    const d = hn.diemDanh.get(id);
    if (!d) dem.chuaDiemDanh++;
    else if (d.status === 'present') dem.coMat++;
    else if (d.status === 'late') dem.denMuon++;
    else if (d.status === 'absent_excused') dem.nghiPhep++;
    else if (d.status === 'absent_unexcused') dem.nghiKhongPhep++;
    if (hn.nhatKy && hn.nhatKy.has(id)) dem.nhatKyDaGhi++;
    if (hn.daTra && hn.daTra.has(id)) dem.daTra++;
    if (hn.coDiemDanh && d && d.checkOut) dem.daVe++;
    if (hn.donCho.has(id)) dem.donCho++;
    const t = hn.thuoc.get(id);
    if (t === 'cho') dem.thuocCho++;
    else if (t === 'dang') dem.thuocDang++;
  }
  return dem;
}

function gopDem(ds) {
  const KHOA = ['soBe', 'coMat', 'denMuon', 'nghiPhep', 'nghiKhongPhep', 'chuaDiemDanh',
    'nhatKyDaGhi', 'daTra', 'daVe', 'donCho', 'thuocCho', 'thuocDang'];
  const ra = {};
  for (const k of KHOA) {
    const co = ds.filter(d => d[k] !== null && d[k] !== undefined);
    ra[k] = co.length ? co.reduce((s, d) => s + Number(d[k] || 0), 0) : (ds.length ? null : 0);
  }
  ra.soNhom = ds.length;
  return ra;
}

function phanHeDangBat() {
  return {
    diemdanh: modules.dangBat('diemdanh'), nhatky: modules.dangBat('nhatky'),
    dontra: modules.dangBat('dontra'), thuchup: modules.dangBat('thuchup'),
    xinphep: modules.dangBat('xinphep'), danthuoc: modules.dangBat('danthuoc'),
    hocsinh: modules.dangBat('hocsinh'),
  };
}

// Chức vụ không được mở hồ sơ bé (Nhân sự, Kế toán, Marketing) thì cũng không
// xem được bảng tên + trạng thái từng bé. Cùng luật với routes/auth.js.
function duocXemTungBe(user) {
  const api = db.apiChoPhep(user);
  return api === null || api.includes('/api/students');
}

module.exports = (app) => {
  // Một nhóm, hôm nay: từng bé và số đếm.
  app.get('/api/dashboard/hom-nay', requireRole('teacher', 'admin'), (req, res) => {
    const user = req.user;
    if (!duocXemTungBe(user)) {
      return res.status(403).json({ error: 'Phần này nằm ngoài phần việc của tài khoản này' });
    }
    let classId = String(req.query.classId || '').trim();
    if (!classId && user.role === 'teacher') {
      const ds = nl.nhomCuaCo(user.id);
      if (ds.length === 1) classId = ds[0].id;
    }
    if (!classId) return res.status(400).json({ error: 'Cần chọn nhóm' });
    if (!db.canAccessClass(user, classId)) {
      return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
    }
    const cls = db.findClass(classId);
    if (!cls) return res.status(404).json({ error: 'Không tìm thấy nhóm' });

    const today = todayStr();
    const be = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    const ids = be.map(b => b.id);
    const hn = tinhHomNay(ids, today);
    const csId = db.campusOfClass(classId);
    const cs = csId ? db.findCampus(csId) : null;
    res.json({
      ngay: today,
      nhom: { id: cls.id, name: cls.name, coSo: cs ? { id: cs.id, name: cs.name } : null },
      co: nl.tomTat(classId).teachers.map(t => ({ id: t.id, title: t.title, name: t.name, vaiTro: t.vaiTro })),
      dem: demNhom(ids, hn),
      be: be.map(b => {
        const d = hn.diemDanh.get(b.id);
        return {
          id: b.id, name: b.name, code: b.code || '', avatar: b.avatar, dob: b.dob,
          diemDanh: d ? d.status : null,
          gioVao: d && d.checkIn ? d.checkIn : '',
          gioRa: d && d.checkOut ? d.checkOut : '',
          nghiCoPhep: hn.nghiPhep.has(b.id),
          donCho: hn.donCho.has(b.id),
          thuoc: hn.thuoc.get(b.id) || null,
          nhatKy: hn.nhatKy ? hn.nhatKy.has(b.id) : null,
          daTra: hn.daTra ? hn.daTra.has(b.id) : null,
        };
      }),
      phanHe: phanHeDangBat(),
    });
  });

  // Cả trường (hoặc cả cơ sở mình bị khoá vào), hôm nay: cơ sở → nhóm → số đếm.
  app.get('/api/dashboard/tong-quan', requireRole('admin'), (req, res) => {
    const user = req.user;
    const today = todayStr();
    const pham = db.phamViCoSo(user);
    const dsCoSo = db.campuses().filter(c => !pham || c.id === pham);
    const coSoCua = new Map(db.all('class_campus', 'SELECT classId, campusId FROM class_campus')
      .map(r => [r.classId, r.campusId]));
    const nhomTrongPham = db.classes().filter(c => !pham || coSoCua.get(c.id) === pham);

    const beTheoNhom = new Map();
    const ids = [];
    if (nhomTrongPham.length) {
      const marks = nhomTrongPham.map(() => '?').join(',');
      for (const s of db.all('students',
        `SELECT id, classId FROM students WHERE active = 1 AND classId IN (${marks})`,
        nhomTrongPham.map(c => c.id))) {
        if (!beTheoNhom.has(s.classId)) beTheoNhom.set(s.classId, []);
        beTheoNhom.get(s.classId).push(s.id);
        ids.push(s.id);
      }
    }
    const hn = tinhHomNay(ids, today);
    const taNhom = (c) => {
      const co = nl.tomTat(c.id);
      return {
        id: c.id, name: c.name,
        coChinh: co.teacherName, cacCo: co.teacherNames,
        ...demNhom(beTheoNhom.get(c.id) || [], hn),
      };
    };
    const coSo = dsCoSo.map(cs => {
      const nhom = nhomTrongPham.filter(c => coSoCua.get(c.id) === cs.id).map(taNhom);
      return { id: cs.id, name: cs.name, nhom, dem: gopDem(nhom) };
    });
    const khongCoSo = nhomTrongPham.filter(c => !coSoCua.get(c.id)).map(taNhom);
    res.json({
      ngay: today,
      coSo,
      khongCoSo,
      tong: gopDem([...coSo.flatMap(c => c.nhom), ...khongCoSo]),
      xemTungBe: duocXemTungBe(user),
      phanHe: phanHeDangBat(),
    });
  });

  // -------------------------------------------------------------------------
  // GIA ĐÌNH QUAN TÂM ĐIỀU GÌ — ĐẾM GỘP, KHÔNG THEO DÕI AI (Đ149)
  //
  // Nhà trường 10/09: *"mình chỉ muốn xem PH khi vào app quan tâm những gì:
  // kiểu về ăn uống thực đơn, hay thời gian biểu, hay kế hoạch của bé hay là
  // hình ảnh"*.
  //
  // BỐN ĐIỀU CỐ Ý, và cả bốn đều có bài canh riêng ở `test:quan-tam-gop`:
  //
  //   1. KHÔNG GHI AI. Câu lệnh dưới đây không có `req.user.id` ở bất kỳ đâu,
  //      và bảng `luot_quan_tam` không có cột nào chỉ ra một người. Đây không
  //      phải chuyện "hôm nay chưa ai truy vấn" — không có dữ liệu để truy vấn.
  //   2. CHỈ ĐẾM GIA ĐÌNH. Cô mở màn Thực đơn hai chục lần một ngày để soạn
  //      bữa; đếm cả cô thì con số nói về việc của trường, không nói về mối
  //      quan tâm của gia đình — tức là trả lời sai câu trường hỏi.
  //   3. CHỈ ĐẾM MỤC CÓ THẬT. `muc` phải là tên màn của một phân hệ đang có,
  //      nếu không thì bỏ qua. Không có danh sách trắng thì bảng này nhận mọi
  //      chuỗi ai đó gửi lên và thành một chỗ chứa rác không giới hạn.
  //   4. HỎNG THÌ IM. Đây là con số cho marketing, không phải việc của gia
  //      đình. Ghi không được thì màn hình của họ tuyệt đối không được biết.
  app.post('/api/dashboard/quan-tam', requireRole('parent'), (req, res) => {
    try {
      const muc = String((req.body || {}).muc || '').trim().slice(0, 40);
      if (muc && modules.tatCa().some(m => m.view === muc)) {
        // Cơ sở suy ra từ nhóm của con — để trường ba cơ sở tách được ra.
        // Không suy ra được thì để trống, KHÔNG đoán bừa một cơ sở.
        const lop = db.classIdsOf(req.user)[0] || null;
        const campusId = (lop && db.campusOfClass(lop)) || '';
        db.run(
          `INSERT INTO luot_quan_tam (ngay, muc, campusId, soLuot) VALUES (?, ?, ?, 1)
           ON CONFLICT(ngay, muc, campusId) DO UPDATE SET soLuot = soLuot + 1`,
          [todayStr(), muc, campusId]);
      }
    } catch (err) {
      console.error('[quan-tam] không ghi được lượt mở:', err.message);
    }
    // Luôn 204, kể cả khi bỏ qua: màn hình của gia đình không có việc gì phải
    // biết về con số của marketing, và một lời từ chối ở đây chỉ tổ làm nó
    // hiện một dòng lỗi cho thứ họ không hề bấm.
    res.status(204).end();
  });

  app.get('/api/dashboard/badges', (req, res) => {
    const user = req.user;
    const ids = db.studentIdsOf(user);
    const marks = ids.map(() => '?').join(',');
    const today = todayStr();

    const badges = {
      thongbao: unreadNotifications(user),
      nhantin: unreadMessages(user),
    };

    // HUY HIỆU CỦA PHÂN HỆ CẮM THÊM (Đ154).
    //
    // Đặt TRƯỚC lối ra `if (!ids.length)` bên dưới, có chủ ý: quản lý cơ sở
    // không phải bố mẹ ai và không đứng lớp nào, nên `studentIdsOf` của họ
    // rỗng — chính người cần thấy "có bản chờ tôi duyệt" lại là người rơi ra
    // ở đúng dòng ấy.
    //
    // Cả khối trong `try` riêng: một phân hệ đếm sai câu SQL thì màn hình
    // chính vẫn hiện đủ, chỉ thiếu con số của nó (Nguyên tắc số 1).
    try { Object.assign(badges, huyHieu.demTatCa(user)); } catch (_) { /* lưới cuối */ }

    if (!ids.length) return res.json(badges);

    if (user.role === 'parent') {
      // Điểm danh: số lượt điểm danh hôm nay của các con
      badges.diemdanh = db.count(
        `SELECT COUNT(*) FROM attendance WHERE date = ? AND studentId IN (${marks})`, [today, ...ids]);
      // Nhận xét mới chưa xem. Bản ĐÃ THU HỒI phải bị loại, cùng lý do đã ghi
      // ở `unreadNotifications` bên trên: thu hồi rồi thì không còn cách nào
      // bấm vào để đánh dấu đã xem, nên con số ấy sẽ đứng mãi không về 0.
      //
      // Phân hệ Nhận xét hằng ngày đang TẮT (A2) nên hôm nay chưa ai gặp. Vá
      // sẵn vì nó cùng một hình dạng với hai chỗ vừa vá trong đợt này, và vì
      // ngày nhà trường bật lại thì không ai còn nhớ để đi tìm.
      badges.nhanxet = db.count(
        `SELECT COUNT(*) FROM remarks
          WHERE parentSeen = 0 AND studentId IN (${marks})
            AND ${st.dieuKienConHien('remarks', 'id')}`, ids);
      // Khảo sát đang mở mà mình chưa trả lời — TRONG PHẠM VI mình được thấy.
      // Từ Đ119 khảo sát gửi riêng được cho một nhóm, và cột `audience` của
      // nó mang đúng nghĩa với cột cùng tên của thông báo, nên dùng chung một
      // luật lọc (lib/thong-bao.js). Không lọc thì huy hiệu đếm cả khảo sát
      // gia đình không mở được — một con số không bao giờ về 0.
      const fKs = tb.audienceFilter(user, 's.');
      badges.khaosat = db.count(
        `SELECT COUNT(*) FROM surveys s
         WHERE s.status = 'open'
           AND ${fKs.sql}
           AND NOT EXISTS (SELECT 1 FROM survey_responses r WHERE r.surveyId = s.id AND r.userId = ?)`,
        [...fKs.params, user.id]);
    }

    if (user.role === 'teacher' || user.role === 'admin') {
      badges.xinphep = db.count(
        `SELECT COUNT(*) FROM leave_requests WHERE status = 'pending' AND studentId IN (${marks})`, ids);
      badges.danthuoc = db.count(
        `SELECT COUNT(*) FROM medicine_requests WHERE status = 'pending' AND studentId IN (${marks})`, ids);
      // Số học sinh chưa được điểm danh hôm nay
      const marked = db.count(
        `SELECT COUNT(*) FROM attendance WHERE date = ? AND studentId IN (${marks})`, [today, ...ids]);
      badges.diemdanh = ids.length - marked;
    }

    res.json(badges);
  });
};
