// Đăng nhập / đăng xuất / thông tin phiên hiện tại / đổi mật khẩu.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const password = require('../lib/password');
const {
  createSession, destroySession, destroyUserSessions,
  sessionCookie, clearCookie, requireAuth,
} = require('../lib/auth');

// ---------------------------------------------------------------------------
// Chống dò mật khẩu — HAI bộ đếm, cố ý khác nhau
//
// Bộ thứ nhất đếm theo ĐỊA CHỈ và khóa cứng 15 phút. Một mình nó là chưa đủ:
// địa chỉ mà máy chủ nhìn thấy có thể do chính người gõ mật khẩu tự khai qua
// header X-Forwarded-For, nên đổi giá trị đó mỗi lần thử là bộ đếm về không.
// Vì vậy ở đây KHÔNG đọc thẳng header nữa mà dùng req.ip — giá trị do Express
// tính, có tính tới cấu hình 'trust proxy'. Khi đặt máy chủ tại trường mà không
// có lớp proxy phía trước, phải đặt TRUST_PROXY=0 thì req.ip mới đáng tin.
//
// Bộ thứ hai đếm theo TÊN ĐĂNG NHẬP và CHẬM DẦN chứ không khóa. Đây mới là thứ
// bịt được lỗ trên, vì kẻ dò đổi địa chỉ kiểu gì cũng vẫn phải nhắm vào một tên
// đăng nhập. Cố ý không khóa cứng theo tên: tên đăng nhập của phụ huynh sinh từ
// số điện thoại nên người ngoài đoán được, khóa cứng là mở ra một cách phá mới —
// nhập sai vài lần để khóa phụ huynh khác khỏi app.
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000; // khóa 15 phút
const NGUONG_CHAM = 3;          // sai quá số lần này thì bắt đầu trả lời chậm dần
const CHAM_TOI_DA_MS = 8000;
const TRAN_SO_MUC = 5000;       // trần số mục mỗi bộ đếm, để bộ nhớ không phình

// Những khoá của khối `settings.school` được phép đi ra cho người đăng nhập
// (Đ165). Xem chú thích dài ở chỗ dùng, trong gói `/api/auth/me`.
//
// `coSo` không nằm đây vì nó không thuộc khối — nó do chính chỗ ấy ghép vào.
const KHOA_TRUONG_CHO_PHEP = [
  'name', 'address', 'phone', 'email', 'currentYear', 'years', 'emailKeToan',
];

const attempts = new Map(); // địa chỉ -> { count, firstAt, lockedUntil }
const theoTen = new Map();  // tên đăng nhập -> { count, firstAt }

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Ghi vào bộ đếm nhưng không để nó phình vô hạn: chạm trần thì bỏ bớt các mục cũ
// nhất. Mất vài mục cũ chỉ làm việc chặn lỏng đi một chút, còn để Map phình tự do
// thì máy chủ 1GB RAM hết bộ nhớ — đằng nào cũng hỏng, chọn cái hỏng nhẹ hơn.
function datVaoBo(bo, khoa, rec) {
  if (!bo.has(khoa) && bo.size >= TRAN_SO_MUC) {
    const canBo = Math.ceil(TRAN_SO_MUC / 10);
    const cu = [...bo.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt).slice(0, canBo);
    for (const [k] of cu) bo.delete(k);
  }
  bo.set(khoa, rec);
}

function khoaTen(username) {
  return String(username || '').trim().toLowerCase();
}

function lockRemaining(ip) {
  const rec = attempts.get(ip);
  if (!rec || !rec.lockedUntil) return 0;
  const left = rec.lockedUntil - Date.now();
  if (left <= 0) { attempts.delete(ip); return 0; }
  return left;
}

// Số mili giây phải chờ trước khi trả lời, tính theo số lần sai của TÊN ĐĂNG NHẬP.
// Tăng gấp đôi mỗi lần: 0,5s → 1s → 2s → 4s → 8s rồi dừng ở đó. Đủ để hạ tốc độ
// dò từ khoảng 19 lần/giây xuống dưới 1 lần/8 giây, mà người gõ nhầm mật khẩu
// thật thì hầu như không thấy phiền.
function choChamTheoTen(username) {
  const rec = theoTen.get(khoaTen(username));
  if (!rec) return 0;
  if (Date.now() - rec.firstAt > LOCK_MS) return 0;
  if (rec.count <= NGUONG_CHAM) return 0;
  return Math.min(250 * 2 ** (rec.count - NGUONG_CHAM), CHAM_TOI_DA_MS);
}

function noteFailure(ip, username) {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, firstAt: now, lockedUntil: 0 };
  // Quá 15 phút kể từ lần sai đầu tiên thì đếm lại từ đầu.
  if (now - rec.firstAt > LOCK_MS) { rec.count = 0; rec.firstAt = now; }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockedUntil = now + LOCK_MS;
  datVaoBo(attempts, ip, rec);

  const ten = khoaTen(username);
  if (ten) {
    const r2 = theoTen.get(ten) || { count: 0, firstAt: now };
    if (now - r2.firstAt > LOCK_MS) { r2.count = 0; r2.firstAt = now; }
    r2.count += 1;
    datVaoBo(theoTen, ten, r2);
  }
}

function clearFailures(ip, username) {
  attempts.delete(ip);
  const ten = khoaTen(username);
  if (ten) theoTen.delete(ten);
}

const nghi = (ms) => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

// Băm giả dùng khi không tìm thấy tài khoản. Không có nó, tài khoản không tồn
// tại trả lời trong ~1ms còn tài khoản có thật mất ~60ms — chênh lệch đó để lộ
// tên đăng nhập nào có thật, đúng thứ mà câu báo lỗi chung chung đang cố giấu.
const BAM_GIA = password.hash('bam-gia-de-can-bang-thoi-gian-tra-loi');

// Dọn bản ghi cũ để Map không phình vô hạn.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) {
    if (now - rec.firstAt > LOCK_MS && (!rec.lockedUntil || rec.lockedUntil < now)) attempts.delete(ip);
  }
  for (const [ten, rec] of theoTen) {
    if (now - rec.firstAt > LOCK_MS) theoTen.delete(ten);
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

// ---- Chuẩn hóa dữ liệu trả về ----

function publicUser(u) {
  if (!u) return null;
  const { passwordHash: _h, ...rest } = u;
  return rest;
}

// CHỨC VỤ KHÔNG ĐƯỢC MỞ HỒ SƠ BÉ THÌ ĐƯỜNG NÀY CŨNG KHÔNG ĐƯỢC ĐƯA RA.
//
// `/api/auth` mở cho MỌI chức vụ — cắt nó là app trắng màn hình ngay sau khi
// đăng nhập, nên tầng chức vụ tự miễn trừ đường này (lib/modules.js). Lời khai
// đi kèm chỗ miễn trừ ấy là "hai đường đầu nói về chính người đang đăng nhập".
// Với `mePayload` thì lời khai đó SAI: nó trải `...s` — tức trọn một dòng của
// bảng `students`, gồm địa chỉ nhà, nhóm máu và tiền sử bệnh của trẻ.
//
// Đo thật bằng tài khoản Kế toán: `/api/students` trả 403 đúng như thiết kế,
// còn `/api/auth/me` trả về đủ 11 bé kèm địa chỉ, nhóm máu, dị ứng. Mà chính
// `lib/db.js` mô tả vai Kế toán là "KHÔNG cần và KHÔNG mở được hồ sơ bé".
//
// Nên: chức vụ nào có khai danh sách api mà trong đó KHÔNG có `/api/students`
// thì danh sách bé bị cắt xuống đúng những trường màn hình cần để dựng ô chọn
// bé — mã, tên, ảnh đại diện, nhóm. Cấp 1 và Quản lý cơ sở (api = null, tức
// toàn quyền) cùng Văn phòng cơ sở (có `/api/students` trong danh sách) không
// đổi một chữ nào.
const TRUONG_TOI_THIEU = ['id', 'name', 'avatar', 'classId', 'className'];

function catChoChucVuKhongMoHoSo(s) {
  const ra = {};
  for (const k of TRUONG_TOI_THIEU) ra[k] = s[k];
  return ra;
}

function duocDocHoSoBe(user) {
  const api = db.apiChoPhep(user);
  return api === null || api.includes('/api/students');
}

// Gói dữ liệu trả về sau đăng nhập: người dùng + học sinh liên quan + lớp + trường.
function mePayload(user) {
  const day = duocDocHoSoBe(user);

  // MỘT NHÓM HỎI MỘT LẦN, KHÔNG PHẢI MỘT LẦN CHO MỖI BÉ.
  //
  // Đây là đường chạy MỖI LẦN mở app, cho MỌI người: `public/js/app.js` gọi
  // `/api/auth/me` ngay trong `App.init()`. Bản cũ hỏi lại thông tin nhóm cho
  // TỪNG bé — hai câu mỗi bé, mà hiệu trưởng và văn phòng thì `db.studentsOf`
  // trả về toàn bộ bé đang học của cả trường. Trường lên 600 bé là chừng
  // 1.200 câu mỗi lượt mở app, trong đó gần hết chỉ là hỏi đi hỏi lại đúng
  // hai chục câu trả lời (mỗi nhóm một).
  //
  // better-sqlite3 chạy ĐỒNG BỘ, nên chừng ấy câu chặn thẳng vòng lặp sự kiện
  // đúng lúc 7 giờ sáng, khi cả trường cùng mở app một lượt. Hôm nay không
  // thấy gì vì dữ liệu mẫu chỉ 11 bé; nó hiện ra đúng lúc trường đã dùng thật
  // và đông lên.
  //
  // BẢNG NHỚ NÀY CỐ Ý NẰM TRONG THÂN HÀM, sống đúng một lượt gọi. Nâng nó ra
  // ngoài thành bộ nhớ đệm dùng chung cho cả tiến trình là văn phòng đổi cô
  // phụ trách xong mà mọi màn hình vẫn nói tên cô cũ cho tới khi khởi động lại
  // máy chủ — và vì `mePayload` cũng là chỗ giao diện lấy `classIds` của cô,
  // một bảng nhớ cũ ở đây là QUYỀN cũ ở đây.
  const nhoNhom = new Map();
  function nhomCua(classId) {
    // Khoá là chuỗi rỗng cho bé chưa xếp nhóm, để `Map` không phải nhận
    // `undefined` làm khoá — bé chưa xếp nhóm vẫn ra `className: ''` như cũ.
    const khoa = classId || '';
    if (!nhoNhom.has(khoa)) {
      nhoNhom.set(khoa, {
        cls: classId ? db.findClass(classId) : null,
        // Gói này đi tới tài khoản đang đăng nhập, nên với GIA ĐÌNH thì không
        // kèm số điện thoại riêng của cô (Đ161) — trường nói rõ gia đình gọi
        // hotline văn phòng. Bảng nhớ sống đúng một lượt gọi nên vai của người
        // hỏi cố định trong suốt đời nó.
        co: nl.tomTat(classId, { soDienThoai: user.role !== 'parent' }),
      });
    }
    return nhoNhom.get(khoa);
  }

  const students = db.studentsOf(user).map(s => {
    const { cls, co } = nhomCua(s.classId);
    const gop = {
      ...s,
      className: cls ? cls.name : '',
      ...co,
      teacherId: co.teachers[0] ? co.teachers[0].id : null,
    };
    return day ? gop : catChoChucVuKhongMoHoSo(gop);
  });
  // Nhóm lớp của cô đi kèm ngay từ lúc đăng nhập, để giao diện không phải đoán
  // qua `user.classId` — cột đó chỉ chứa nổi MỘT nhóm, còn cô mầm non có thể
  // phụ trách nhiều nhóm.
  const nhom = user.role === 'teacher' ? nl.nhomCuaCo(user.id) : [];
  return {
    user: {
      ...publicUser(user), nhomCuaCo: nhom, classIds: nhom.map(c => c.id),
      // Cơ sở mà tài khoản quản trị bị khoá vào (null = cả trường). Màn hình
      // dùng để ô "Gửi cho nhóm" chỉ liệt kê nhóm của cơ sở đó — máy chủ vẫn
      // là người chốt (canAccessClass), đây chỉ để không mời bấm vào thứ sẽ 403.
      coSo: user.role === 'admin' ? (db.phamViCoSo(user) || null) : null,
      // Đ124: trang chủ của văn phòng chỉ mở đường "xem từng bé" khi chức vụ
      // được mở hồ sơ bé — Nhân sự, Kế toán, Marketing thì không.
      chucVu: user.role === 'admin' ? db.chucVu(user) : null,
      moHoSoBe: day,
    },
    students,
    // Kèm cơ sở của từng nhóm (quan hệ ở bảng class_campus) — CHỈ THÊM trường,
    // để ô "Gửi cho nhóm" của văn phòng cơ sở lọc được nhóm của cơ sở mình.
    classes: (() => {
      const coSoCua = new Map(db.all('class_campus', 'SELECT classId, campusId FROM class_campus')
        .map(r => [r.classId, r.campusId]));
      return db.classes().map(c => ({ ...c, campusId: coSoCua.get(c.id) || null }));
    })(),
    // Đ124: kèm danh sách cơ sở để giao diện gọi được tên cơ sở (ô chọn bé theo
    // cấp, nhãn "Nhóm X · Cơ sở Y" trên thông báo). Trường chưa có cơ sở thì
    // mảng rỗng, mọi màn hình vẫn vẽ như trước.
    // KHỐI THÔNG TIN TRƯỜNG — DANH SÁCH KHOÁ CHO PHÉP, KHÔNG TRẢI CẢ KHỐI (Đ165).
    //
    // `settings.school` là một khối JSON tự do: bất cứ ai cũng thêm được một
    // khoá vào đó bằng `db.setSchool({ ...t, khoaMoi: ... })`, và đã có ba chỗ
    // trong app làm đúng như vậy (chuyển năm học, email kế toán, khôi phục bản
    // sao lưu). Bản trước trải TRỌN khối ấy ra (`{ ...truong, coSo }`) cho MỌI
    // tài khoản đăng nhập — cô, gia đình, bảo vệ cổng, mọi chức vụ.
    //
    // Hôm nay trong khối không có gì bí mật, nên đây KHÔNG phải một chỗ rò
    // đang chảy. Nó là một cánh cửa mở sẵn: ngày ai đó cất vào đấy một khoá
    // nhạy cảm — một địa chỉ nội bộ, một khoá ký, một ghi chú của ban giám
    // hiệu — thì khoá ấy đi thẳng tới điện thoại của vài trăm gia đình ngay
    // lần đăng nhập kế tiếp, và KHÔNG một bộ canh nào báo, vì không dòng mã
    // nào thay đổi.
    //
    // Nay chỉ đúng những khoá có tên dưới đây mới đi ra. Thêm khoá mới vào
    // khối là việc bình thường; muốn nó tới được màn hình thì phải thêm tên
    // vào đây — tức phải nghĩ một lần về việc ai sẽ đọc được nó. Quên theo
    // hướng đóng lại.
    //
    // Danh sách này giữ ĐÚNG những gì đang đi ra hôm nay, không bớt một khoá:
    // hành vi không đổi một chút nào, chỉ khác ở chỗ ngày mai.
    school: (() => {
      const truong = db.school();
      if (!truong) return truong;
      const coSo = db.campuses().map(c => ({ id: c.id, name: c.name }));
      const ra = { coSo };
      for (const k of KHOA_TRUONG_CHO_PHEP) {
        if (truong[k] !== undefined) ra[k] = truong[k];
      }
      return ra;
    })(),
  };
}

module.exports = (app) => {
  app.post('/api/auth/login', async (req, res) => {
    const ip = clientIp(req);
    const { username, password: plain } = req.body || {};

    const locked = lockRemaining(ip);
    if (locked) {
      const minutes = Math.ceil(locked / 60000);
      return res.status(429).json({
        error: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      });
    }

    // Tên đăng nhập này vừa sai nhiều lần thì trả lời chậm lại. Chờ TRƯỚC khi
    // kiểm mật khẩu, để người dò không đo được gì qua thời gian phản hồi.
    await nghi(choChamTheoTen(username));

    const user = db.findUserByUsername(username);

    // So khớp mật khẩu đã băm. Câu báo lỗi cố ý không nói rõ sai tên hay sai
    // mật khẩu, để không giúp người lạ dò ra tài khoản nào có thật. Không tìm
    // thấy tài khoản thì vẫn băm một lần với chuỗi giả, cho thời gian trả lời
    // giống hệt trường hợp có tài khoản.
    const ok = user && user.active
      ? password.verify(String(plain || ''), user.passwordHash)
      : (password.verify(String(plain || ''), BAM_GIA), false);
    if (!ok) {
      noteFailure(ip, username);
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    clearFailures(ip, username);
    const token = createSession(user.id);
    db.audit(user.id, 'login', null, { ip });
    res.setHeader('Set-Cookie', sessionCookie(req, token));
    res.json(mePayload(user));
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken) destroySession(req.sessionToken);
    res.setHeader('Set-Cookie', clearCookie(req));
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    res.json(mePayload(req.user));
  });

  // Đổi mật khẩu khi đang dùng mật khẩu tạm do giáo viên cấp.
  // Không hỏi mật khẩu cũ vì người dùng vừa nhập nó để vào được đến đây.
  app.post('/api/auth/set-new-password', requireAuth, (req, res) => {
    if (!req.user.mustChangePassword) {
      return res.status(400).json({ error: 'Tài khoản không ở trạng thái cần đổi mật khẩu' });
    }
    const { newPassword } = req.body || {};
    const weak = password.checkStrength(newPassword);
    if (weak) return res.status(400).json({ error: weak });
    if (password.verify(String(newPassword), req.user.passwordHash)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu tạm vừa được cấp' });
    }

    db.update('users', req.user.id, {
      passwordHash: password.hash(String(newPassword)),
      mustChangePassword: false,
    });
    db.audit(req.user.id, 'set-new-password', req.user.id, null);
    destroyUserSessions(req.user.id, req.sessionToken);
    res.json({ ok: true, message: 'Đã đặt mật khẩu mới. Lần sau bạn đăng nhập bằng mật khẩu này nhé.' });
  });

  // Đổi mật khẩu. Sau khi đổi, mọi thiết bị khác bị đăng xuất.
  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!password.verify(String(currentPassword || ''), req.user.passwordHash)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    const weak = password.checkStrength(newPassword);
    if (weak) return res.status(400).json({ error: weak });
    if (String(newPassword) === String(currentPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
    }

    db.update('users', req.user.id, {
      passwordHash: password.hash(String(newPassword)),
      mustChangePassword: false,
    });
    db.audit(req.user.id, 'change-password', req.user.id, null);
    const kicked = destroyUserSessions(req.user.id, req.sessionToken);
    res.json({
      ok: true,
      message: kicked
        ? `Đã đổi mật khẩu. ${kicked} thiết bị khác đã được đăng xuất.`
        : 'Đã đổi mật khẩu thành công.',
    });
  });
};

module.exports.mePayload = mePayload;
module.exports.publicUser = publicUser;
