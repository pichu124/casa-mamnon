// Luật "ai thấy thông báo nào" — MỘT bản, dùng chung cho danh sách thông báo
// (routes/notifications.js) và bộ đếm huy hiệu (routes/dashboard.js).
//
// Trước tệp này, hai nơi ấy mỗi nơi chép một bản `audienceFilter` gần giống
// nhau (khác đúng tiền tố cột). Hai bản của cùng một luật là hai bản sẽ trôi
// khỏi nhau ở lần sửa thứ hai — mà luật này quyết định gia đình nào đọc được
// thông báo nào, không phải chỗ để trôi.
//
// Tệp này KHÔNG thuộc nhóm bốn tệp dùng chung bị siết commit riêng. Nó chỉ
// đọc, không giữ trạng thái, mọi thứ nó cần nằm sau `db.classIdsOf`.
const db = require('./db');
const ngay = require('./ngay');
const st = require('./sua-thu-hoi');

// Điều kiện SQL cho các thông báo người dùng được xem. `tienTo` là tiền tố
// cột trong câu gọi (ví dụ 'n.' khi bảng notifications mang bí danh n).
function audienceFilter(user, tienTo = '') {
  const classIds = db.classIdsOf(user);
  const marks = classIds.map(() => '?').join(',');
  const cot = `${tienTo}audience`;
  return {
    sql: classIds.length ? `(${cot} = 'all' OR ${cot} IN (${marks}))` : `${cot} = 'all'`,
    params: classIds,
  };
}

// MỐC THỜI GIAN CỦA GIA ĐÌNH (góp ý 20/10, P2).
//
// Bé vừa nhập học, tài khoản phụ huynh vừa tạo, mà mở app ra là cả lịch sử
// thông báo của trường — lịch nghỉ lễ đã qua, nhắc học phí tháng trước — đổ
// về, kèm một huy hiệu chuông vài chục. Gia đình chỉ thấy thông báo tạo từ
// NGÀY tài khoản của mình được tạo (ngày Việt Nam, tính từ 0 giờ — tin văn
// phòng gửi sáng nay vẫn tới nhà được tạo tài khoản chiều nay). Thông báo GHIM
// vẫn hiện: đó là thứ nhà trường muốn MỌI gia đình đọc, kể cả nhà mới.
//
// Chỉ vai phụ huynh. Cô và văn phòng cần lịch sử để tra. Tài khoản không có
// `createdAt` (dữ liệu nhập từ bản rất cũ) thì không có mốc: thà thấy thừa còn
// hơn giấu nhầm.
function mocGiaDinh(user) {
  if (!user || user.role !== 'parent' || !user.createdAt) return null;
  const t = Date.parse(user.createdAt);
  if (!Number.isFinite(t)) return null;
  return ngay.khoangUtcCuaNgay(ngay.ngayCua(t))[0] || null;
}

// Điều kiện SQL đầy đủ cho "thông báo nhà trường người này thấy": phạm vi gửi
// cộng mốc của gia đình. Danh sách và huy hiệu chuông dùng chung hàm này để
// hai con số không lệch nhau. `audienceFilter` giữ nguyên vì khảo sát cũng
// dùng nó — bảng `surveys` không có cột `pinned`.
function boLocThongBao(user, tienTo = '') {
  const pv = audienceFilter(user, tienTo);
  const nn = locNguoiNhan(user, 'notifications', `${tienTo}id`);
  const f = { sql: `${pv.sql} AND ${nn.sql}`, params: [...pv.params, ...nn.params] };
  const moc = mocGiaDinh(user);
  if (!moc) return f;
  return {
    sql: `${f.sql} AND (${tienTo}pinned = 1 OR ${tienTo}createdAt >= ?)`,
    params: [...f.params, moc],
  };
}

// GỬI RIÊNG MỘT SỐ GIA ĐÌNH TRONG NHÓM (Đ260b).
//
// Cô chọn "Cả nhóm" hoặc tích từng bé. Người nhận lưu theo BÉ ở bảng phụ
// (`notification_nguoi_nhan`, `survey_nguoi_nhan`): có dòng thì chỉ phụ huynh
// của các bé ấy thấy; không có dòng thì y như cũ — cả phạm vi `audience`.
// Chỉ siết vai phụ huynh: cô và quản trị của nhóm vẫn thấy tin mình gửi.
//
// Một luật, ba chỗ hỏi: điều kiện SQL cho danh sách / huy hiệu
// (`locNguoiNhan`), câu hỏi cho MỘT bản ghi (`duocNhan`), và danh sách người
// nhận tin đẩy (`nguoiNhanCua`). Tên bảng chỉ lấy từ bảng tra dưới đây, không
// bao giờ từ chỗ gọi.
const BANG_NGUOI_NHAN = {
  notifications: { bang: 'notification_nguoi_nhan', khoa: 'notificationId' },
  surveys: { bang: 'survey_nguoi_nhan', khoa: 'surveyId' },
};

function locNguoiNhan(user, loai, cotId) {
  const b = BANG_NGUOI_NHAN[loai];
  if (!b || !user || user.role !== 'parent') return { sql: '1 = 1', params: [] };
  return {
    sql: `(NOT EXISTS (SELECT 1 FROM ${b.bang} nn WHERE nn.${b.khoa} = ${cotId})
       OR EXISTS (SELECT 1 FROM ${b.bang} nn JOIN student_parents sp ON sp.studentId = nn.studentId
                   WHERE nn.${b.khoa} = ${cotId} AND sp.parentId = ?))`,
    params: [user.id],
  };
}

function duocNhan(user, loai, id) {
  const b = BANG_NGUOI_NHAN[loai];
  if (!b || !user || user.role !== 'parent') return true;
  if (!db.count(`SELECT COUNT(*) FROM ${b.bang} WHERE ${b.khoa} = ?`, [id])) return true;
  return db.count(
    `SELECT COUNT(*) FROM ${b.bang} nn JOIN student_parents sp ON sp.studentId = nn.studentId
      WHERE nn.${b.khoa} = ? AND sp.parentId = ?`, [id, user.id]) > 0;
}

// Mã các bé nhận riêng một bản ghi; rỗng = gửi cả phạm vi.
function beNhanRieng(loai, id) {
  const b = BANG_NGUOI_NHAN[loai];
  if (!b || !id) return [];
  return db.all(b.bang, `SELECT studentId FROM ${b.bang} WHERE ${b.khoa} = ?`, [id]).map(r => r.studentId);
}

// Kiểm danh sách bé người gửi tích chọn. Không gửi ô này (`undefined`/`null`)
// = cả nhóm, như mọi bản app cũ. Gửi một danh sách RỖNG thì KHÔNG hiểu thành
// "cả nhóm": hiểu rộng ra một lựa chọn hẹp là đúng kiểu hỏng làm lộ tin.
// Mỗi bé phải đang học ở đúng nhóm nhận, và người gửi được phép với bé đó.
const TOI_DA_BE_NHAN = 200;
function kiemNguoiNhan(user, classId, ds) {
  if (ds === undefined || ds === null) return { ids: [] };
  if (!Array.isArray(ds)) return { ma: 400, loi: 'Danh sách gia đình nhận không hợp lệ' };
  const ids = [...new Set(ds.map(x => String(x || '').trim()).filter(Boolean))];
  if (!ids.length) return { ma: 400, loi: 'Vui lòng tích chọn ít nhất một gia đình' };
  if (ids.length > TOI_DA_BE_NHAN) return { ma: 400, loi: 'Danh sách gia đình nhận dài quá — gửi cho cả nhóm nhé' };
  if (!classId || classId === 'all') return { ma: 400, loi: 'Chọn gia đình chỉ dùng được khi gửi cho một nhóm' };
  for (const id of ids) {
    const be = db.findStudent(id);
    if (!be || !be.active || be.classId !== classId) {
      return { ma: 400, loi: 'Có bé không thuộc nhóm đã chọn — vui lòng chọn lại gia đình nhận' };
    }
    if (!db.canAccessStudent(user, id)) return { ma: 403, loi: 'Tài khoản không được gửi tin cho gia đình bé này' };
  }
  return { ids };
}

// Ghi danh sách bé nhận riêng. Chỗ gọi đã kiểm từng bé (thuộc nhóm nhận, người
// tạo được phép với bé); ở đây chỉ ghi.
function ghiNguoiNhan(loai, id, studentIds) {
  const b = BANG_NGUOI_NHAN[loai];
  if (!b || !id) return;
  for (const studentId of [...new Set(studentIds || [])]) {
    db.run(`INSERT OR IGNORE INTO ${b.bang} (${b.khoa}, studentId) VALUES (?, ?)`, [id, studentId]);
  }
}

// Trang đầu của màn Thông báo: bao nhiêu thông báo nhà trường một lượt. Huy
// hiệu chuông đếm tin chưa đọc TRONG đúng cửa sổ này (P1) — đếm rộng hơn là
// huy hiệu báo "1" mà mở màn ra không thấy tin nào chưa đọc.
const TRANG_DAU = 100;

// Cùng câu hỏi, cho MỘT thông báo đã nằm trong tay.
function canSee(user, notification) {
  return (notification.audience === 'all' || db.classIdsOf(user).includes(notification.audience))
    && duocNhan(user, 'notifications', notification.id);
}

// NHÓM NÀO CÓ PHÒNG CHAT VỚI NGƯỜI NÀY — dùng chung cho danh sách hội thoại
// (routes/messages.js) và huy hiệu Nhắn tin (routes/dashboard.js), để hai
// con số không trôi khỏi nhau lần nữa.
//
// Cô và gia đình: nhóm ĐANG MỞ (classIdsOf). Quản trị: MỌI nhóm trong cơ sở
// mình, kể cả nhóm đã đóng sau chuyển năm học — findConv đã cho quản trị mở
// lại phòng nhóm cũ để tra lịch sử khi có khiếu nại, thì danh sách và huy hiệu
// phải nói cùng một chuyện. Quan hệ nhóm–cơ sở nằm ở bảng class_campus, KHÔNG
// phải cột trên classes (lược đồ lõi cấm ALTER TABLE).
function nhomPhongChat(user) {
  if (!user) return [];
  if (user.role !== 'admin') return db.classIdsOf(user);
  const coSo = db.phamViCoSo(user);
  const rows = coSo
    ? db.all('classes',
      'SELECT c.id AS id FROM classes c JOIN class_campus cc ON cc.classId = c.id WHERE cc.campusId = ?',
      [coSo])
    : db.all('classes', 'SELECT id FROM classes');
  return rows.map(r => r.id);
}

// MÔ TẢ PHẠM VI GỬI CHO NGƯỜI ĐỌC (Đ124).
//
// Cột `audience` chỉ là mã: 'all' hoặc mã nhóm. Trên màn hình gia đình hai con
// và trên màn văn phòng ba cơ sở, một thông báo phải nói rõ nó gửi cho ai:
// "Toàn trường", hay "Nhóm Chồi 2 · Cơ sở 1". Trả về một hàm có bảng nhớ cho
// ĐÚNG lượt gọi này — một danh sách 100 thông báo thường chỉ có vài nhóm khác
// nhau, không tra cơ sở dữ liệu 100 lần cho cùng một tên.
//
// Đọc `findClass` (kể cả nhóm đã đóng) chứ không phải `classes()`: thông báo
// của năm cũ vẫn phải gọi đúng tên nhóm cũ. Không có tầng cơ sở thì `tenCoSo`
// là chuỗi rỗng, giao diện tự bỏ vế đó.
function taoMoTaPhamVi() {
  const nho = new Map();
  return function moTa(audience) {
    if (!audience || audience === 'all') return { toanTruong: true, tenNhom: '', tenCoSo: '' };
    if (!nho.has(audience)) {
      const c = db.findClass(audience);
      const csId = c ? db.campusOfClass(c.id) : null;
      const cs = csId ? db.findCampus(csId) : null;
      nho.set(audience, {
        toanTruong: false,
        tenNhom: c ? c.name : '',
        tenCoSo: cs ? cs.name : '',
      });
    }
    return nho.get(audience);
  };
}

// AI NHẬN ĐƯỢC MỘT TIN CỦA PHẠM VI NÀY — dùng để ĐẨY về điện thoại (Đ194,
// việc 16).
//
// Cùng luật với `audienceFilter` ở đầu tệp, chỉ khác chiều hỏi: ở đó là "cho
// một người, lọc ra những tin họ xem được"; ở đây là "cho một tin, lọc ra
// những người xem được nó". Hai chiều của MỘT luật, nên nằm cùng một tệp —
// tách ra hai nơi là hai bản sẽ trôi khỏi nhau, đúng lý do tệp này ra đời.
//
// LỌC THEO MÁY ĐÃ ĐĂNG KÝ NGAY TỪ CÂU HỎI ĐẦU. Trường ba cơ sở có hàng trăm
// tài khoản mà chỉ một phần bật đẩy; hỏi cả trường rồi mới biết ai có máy là
// mỗi tin toàn trường một lượt quét vô ích qua từng tài khoản.
//
// Bé đã thôi học thì gia đình KHÔNG nhận tin mới của nhóm cũ — `active = 1`.
// Thiếu vế đó là nhà đã chuyển trường vẫn kêu chuông theo lịch của nhóm cũ.
//
// `beRieng` (Đ260b): tin gửi riêng vài gia đình thì chỉ phụ huynh của đúng các
// bé ấy nhận — cùng luật với `locNguoiNhan`. Cô của nhóm vẫn nhận như cũ.
function nguoiNhanCua(audience, beRieng = []) {
  try {
    const dangKy = new Set(db.all('push_dang_ky',
      'SELECT DISTINCT userId AS userId FROM push_dang_ky').map(r => r.userId).filter(Boolean));
    if (!dangKy.size) return [];
    if (!audience || audience === 'all') return [...dangKy];
    const ra = new Set();
    const chiBe = new Set(beRieng || []);
    for (const r of db.all('student_parents',
      `SELECT sp.parentId AS id, s.id AS studentId FROM student_parents sp
         JOIN students s ON s.id = sp.studentId
        WHERE s.classId = ? AND s.active = 1`, [audience])) {
      if (chiBe.size && !chiBe.has(r.studentId)) continue;
      if (dangKy.has(r.id)) ra.add(r.id);
    }
    for (const r of db.all('class_teachers',
      'SELECT teacherId AS id FROM class_teachers WHERE classId = ?', [audience])) {
      if (dangKy.has(r.id)) ra.add(r.id);
    }
    return [...ra];
  } catch (_) {
    return [];
  }
}

// ĐẨY MỘT TIN ĐÃ GHI VỀ ĐIỆN THOẠI (Đ194, việc 16).
//
// Nhà trường (A11, A12): album công khai, thực đơn tuần, lịch sinh hoạt,
// thông báo nhà trường phải về tới điện thoại, và bấm vào mở ĐÚNG MÀN.
//
// KHÔNG BAO GIỜ NÉM, KHÔNG BAO GIỜ ĐỨNG CHỜ: chỗ gọi là đường ghi của cô hay
// của văn phòng. Trần số tin gửi đồng thời nằm trong `lib/day.js`.
//
// `gop` là MÃ CỦA CHÍNH TIN ẤY, nên hai tin khác nhau không bao giờ ăn mất
// nhau trên màn hình chờ (việc 18), mà cùng một tin đẩy lại thì vẫn gộp.
function dayTin(rec, hash) {
  try {
    const ds = nguoiNhanCua(rec.audience, beNhanRieng('notifications', rec.id));
    if (!ds.length) return 0;
    return require('./day').guiChoNhieuNguoi(ds, {
      tieuDe: rec.title,
      noiDung: rec.body,
      hash: String(hash || '#/notifications'),
      gop: `tb-${rec.id}`,
    });
  } catch (_) {
    return 0;
  }
}

// Hai bảng phụ của một tin vừa ghi (Đ260b): bé nhận riêng — ghi TRƯỚC khi
// đẩy, vì `dayTin` đọc đúng bảng này — và liên kết mở màn.
function ghiKemTin(id, beRieng, lienKet) {
  if (beRieng.length) ghiNguoiNhan('notifications', id, beRieng);
  if (!lienKet) return;
  try {
    db.run('INSERT OR IGNORE INTO notification_lien_ket (notificationId, lienKet) VALUES (?, ?)', [id, lienKet]);
  } catch (_) { /* thiếu liên kết thì dòng mở hộp chi tiết như cũ */ }
}

// GỬI MỘT THÔNG BÁO NHÀ TRƯỜNG CHO MỘT HAY NHIỀU NHÓM (Đ137) — dùng khi một
// việc của văn phòng đáng để gia đình biết ngay: thực đơn tuần vừa đăng, lịch
// sinh hoạt vừa đổi. Cùng hình dạng bản ghi với POST /api/notifications, nên
// màn Thông báo và bộ đếm chuông không phải học thêm gì.
//
// `chongLap`: cùng tiêu đề, cùng nhóm, trong cùng ngày thì KHÔNG gửi lần hai —
// văn phòng bấm Lưu năm lần khi sửa thực đơn không được thành năm cái chuông.
// Không bao giờ ném lỗi: thông báo là việc phụ của đường ghi.
//
// `hash` dạng '#/…' (Đ260b) còn được GHI LẠI ở `notification_lien_ket`, không
// chỉ đi kèm tin đẩy: bấm vào dòng thông báo trong app cũng mở thẳng đúng màn
// (album ấy, Thực đơn, Lịch sinh hoạt…), chứ không phải một hộp chữ. Liên kết
// không mở thêm quyền: màn đích tự hỏi máy chủ.
//
// `nguoiNhan` (Đ260b): mã các bé nhận riêng, chỉ dùng với MỘT nhóm. Gửi riêng
// thì không chống lặp theo tiêu đề — hai lần gửi cho hai nhóm gia đình khác
// nhau không phải là một tin bấm Lưu hai lần.
function guiChoNhom(classIds, { title, body = '', category = 'Khác', createdBy = null, chongLap = true, hash = '', nguoiNhan = [] } = {}) {
  const ra = [];
  try {
    const ds = [...new Set((classIds || []).filter(Boolean))];
    if (!ds.length || !title) return ra;
    const rieng = Array.isArray(nguoiNhan) ? nguoiNhan.filter(Boolean) : [];
    if (rieng.length && ds.length !== 1) return ra;
    if (rieng.length) chongLap = false;
    const lienKet = /^#\//.test(String(hash || '')) ? String(hash) : '';
    // "Cùng ngày" là ngày VIỆT NAM, so bằng khoảng UTC của ngày đó (lib/ngay.js).
    const [tuUtc, denUtc] = ngay.khoangUtcCuaNgay(ngay.homNay());
    for (const classId of ds) {
      if (chongLap) {
        // Tin đã THU HỒI không tính là "đã gửi hôm nay": văn phòng rút một tin
        // sai rồi sửa nguồn (thực đơn, lịch) thì tin mới phải đi được.
        const co = db.first('notifications',
          `SELECT id FROM notifications WHERE audience = ? AND title = ? AND createdAt >= ? AND createdAt < ?
             AND ${st.dieuKienConHien('notifications', 'id')}`,
          [classId, String(title).trim(), tuUtc, denUtc]);
        if (co) continue;
      }
      const rec = {
        id: db.nextId('nt'),
        title: String(title).trim().slice(0, 120),
        body: String(body || '').trim().slice(0, 1000),
        category,
        audience: classId,
        createdBy,
        createdAt: new Date().toISOString(),
        pinned: false,
      };
      db.insert('notifications', rec);
      ghiKemTin(rec.id, rieng, lienKet);
      // Chuông trong app đã ghi xong; nay về tới điện thoại nữa (việc 16).
      dayTin(rec, hash);
      ra.push(rec.id);
    }
  } catch (_) { /* việc phụ */ }
  return ra;
}

module.exports = {
  audienceFilter, boLocThongBao, TRANG_DAU, canSee, nhomPhongChat, taoMoTaPhamVi, guiChoNhom, nguoiNhanCua, dayTin,
  locNguoiNhan, duocNhan, beNhanRieng, ghiNguoiNhan, kiemNguoiNhan,
};
