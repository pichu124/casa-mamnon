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
const { requireRole } = require('../lib/auth');
const modules = require('../lib/modules');
const nghiHoc = require('../lib/nghi-hoc');
const nl = require('../lib/nhom-lop');

function todayStr() {
  return ngay.homNay();
}

function audienceFilter(user) {
  return tb.audienceFilter(user, 'n.');
}

function unreadNotifications(user) {
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
  const rows = db.all('messages',
    `SELECT c.id AS convId, c.type AS type, c.classId AS classId, COUNT(*) AS n
       FROM messages m
       JOIN conversation_members cm ON cm.conversationId = m.conversationId AND cm.userId = ?
       JOIN conversations c ON c.id = m.conversationId
      WHERE m.senderId != ?
        AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)
      GROUP BY c.id, c.type, c.classId`,
    [user.id, user.id]);
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
    if (hn.donCho.has(id)) dem.donCho++;
    const t = hn.thuoc.get(id);
    if (t === 'cho') dem.thuocCho++;
    else if (t === 'dang') dem.thuocDang++;
  }
  return dem;
}

function gopDem(ds) {
  const KHOA = ['soBe', 'coMat', 'denMuon', 'nghiPhep', 'nghiKhongPhep', 'chuaDiemDanh',
    'nhatKyDaGhi', 'daTra', 'donCho', 'thuocCho', 'thuocDang'];
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

  app.get('/api/dashboard/badges', (req, res) => {
    const user = req.user;
    const ids = db.studentIdsOf(user);
    const marks = ids.map(() => '?').join(',');
    const today = todayStr();

    const badges = {
      thongbao: unreadNotifications(user),
      nhantin: unreadMessages(user),
    };

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
