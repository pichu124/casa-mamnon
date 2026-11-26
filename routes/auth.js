// Đăng nhập / đăng xuất / thông tin phiên hiện tại / đổi mật khẩu.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const nhomCo = require('../lib/nhom-co');
const password = require('../lib/password');
const {
  createSession, destroySession, destroyUserSessions,
  sessionCookie, clearCookie, requireAuth,
} = require('../lib/auth');

// ---------------------------------------------------------------------------
// Chống dò mật khẩu — BA bộ đếm, mỗi bộ chặn một kiểu dò (Đ261b, lỗi O3)
//
// Địa chỉ là req.ip — giá trị Express tính có xét 'trust proxy', KHÔNG đọc
// thẳng header X-Forwarded-For (người dò tự khai được, đổi mỗi lần là bộ đếm
// về không). Máy chủ đặt tại trường mà không có proxy phía trước thì phải đặt
// TRUST_PROXY=0, req.ip mới đáng tin.
//
// 1. Theo CẶP (địa chỉ, tên đăng nhập): sai 5 lần là khoá đúng cặp đó 15 phút.
//    Trần chặt, và nó chỉ chạm tới người đang gõ sai.
// 2. Theo ĐỊA CHỈ: trần rộng (100 lần sai trong 15 phút), chặn một máy dò rải
//    đều trên nhiều tên. Bản trước khoá cả địa chỉ sau 8 lần sai với BẤT KỲ
//    tên nào — Wi-Fi của trường, buổi họp phát tài khoản là cả trăm gia đình
//    chung một địa chỉ, vài người gõ nhầm là người gõ đúng cũng bị chặn. Bản
//    trước cũng xoá bộ đếm khi có người đăng nhập đúng: kẻ dò có một tài khoản
//    thật cứ sai 7 lần lại vào tài khoản của mình một lần là dò mãi không khoá.
//    Nay đăng nhập đúng chỉ trả lại đúng lượt của chính nó.
// 3. Theo TÊN ĐĂNG NHẬP trên mọi địa chỉ: chậm dần từ lần sai thứ 4, và trần
//    30 lần sai trong 15 phút. Tên đăng nhập của gia đình là số điện thoại,
//    đoán được; kẻ dò đổi địa chỉ mỗi lần thì hai bộ trên không bao giờ chạm
//    trần. Chậm dần một mình không đủ: các lượt gửi song song cùng chờ một
//    lúc rồi cùng được thử.
//
// Trần theo tên là dao hai lưỡi: người ngoài sai 30 lần là khoá được một gia
// đình. Nên nơi đã từng đăng nhập ĐÚNG tài khoản ấy (cặp địa chỉ + tên trong
// `daVaoDung`) thì trần theo tên và trần theo địa chỉ không chặn — điện thoại
// ở nhà, Wi-Fi trường quen thuộc vẫn vào. Trần theo cặp thì không miễn cho ai.
//
// Lượt thử được ghi vào bộ đếm NGAY KHI tới, trước lúc chờ và lúc băm; đăng
// nhập đúng thì trả lại. Ghi sau khi băm xong thì 60 lượt gửi song song cùng
// lọt qua phép soát trần trước khi lượt nào kịp ghi.
//
// Mọi bộ đếm nằm trong bộ nhớ: khởi động lại máy chủ là về 0.
// ---------------------------------------------------------------------------
const LOCK_MS = 15 * 60 * 1000; // khoá 15 phút; cũng là cửa sổ đếm lần sai
const TRAN_CAP = 5;             // lần sai của một cặp (địa chỉ, tên đăng nhập)
const TRAN_DIA_CHI = 100;       // lần sai từ một địa chỉ, mọi tên cộng lại
const TRAN_TEN = 30;            // lần sai vào một tên, mọi địa chỉ cộng lại
const NHO_VAO_DUNG_MS = 30 * 24 * 60 * 60 * 1000; // nhớ nơi đã vào đúng 30 ngày
const NGUONG_CHAM = 3;          // sai quá số lần này thì bắt đầu trả lời chậm dần
const CHAM_TOI_DA_MS = 8000;
const TRAN_SO_MUC = 5000;       // trần số mục mỗi bộ đếm, để bộ nhớ không phình

// ĐỘ DÀI TỐI ĐA CỦA CHUỖI NGƯỜI DÙNG GÕ (Đ261j). Tên đăng nhập là khoá của bộ
// đếm, giữ trong bộ nhớ ít nhất 15 phút: không giới hạn thì vài chục lượt gửi
// tên cỡ chục MB là máy chủ 1 GB hết bộ nhớ. Tên thật của trường (số điện
// thoại, `ho.ten`) chỉ vài chục ký tự. Trần mật khẩu áp cả khi đặt mật khẩu
// mới, nên không tài khoản nào có mật khẩu dài hơn trần đăng nhập.
const TEN_TOI_DA = 100;
const MAT_KHAU_TOI_DA = 200;
const DAI_QUA = 'Tên đăng nhập hoặc mật khẩu dài quá. Vui lòng kiểm tra lại.';
const MAT_KHAU_DAI_QUA = `Mật khẩu dài quá — tối đa ${MAT_KHAU_TOI_DA} ký tự.`;
const daiQua = (x, tran) => String(x ?? '').length > tran;

// Những khoá của khối `settings.school` được phép đi ra cho người đăng nhập
// (Đ165). Xem chú thích dài ở chỗ dùng, trong gói `/api/auth/me`.
//
// `coSo` không nằm đây vì nó không thuộc khối — nó do chính chỗ ấy ghép vào.
const KHOA_TRUONG_CHO_PHEP = [
  'name', 'address', 'phone', 'email', 'currentYear', 'years', 'emailKeToan',
];

// Mỗi bộ: khoá -> { count, firstAt, lockedUntil }
const theoDiaChi = new Map();
const theoCap = new Map();
const theoTen = new Map();
const daVaoDung = new Map(); // cặp -> { firstAt: lần vào đúng gần nhất }

// Cắt ngắn vì địa chỉ cũng là khoá của bộ đếm: sau proxy, `req.ip` lấy từ
// X-Forwarded-For — chuỗi do người gửi khai, dài được tới cỡ 16 KB.
function clientIp(req) {
  return String(req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);
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
  return String(username || '').trim().toLowerCase().slice(0, TEN_TOI_DA);
}

const khoaCap = (ip, ten) => `${ip}\n${ten}`;

// Còn bao nhiêu mili-giây khoá; 0 là không khoá.
function conKhoa(bo, khoa) {
  const rec = bo.get(khoa);
  if (!rec || !rec.lockedUntil) return 0;
  const left = rec.lockedUntil - Date.now();
  if (left <= 0) { bo.delete(khoa); return 0; }
  return left;
}

// Cộng một lượt thử; chạm trần thì khoá 15 phút kể từ lúc này. Quá 15 phút kể
// từ lượt đầu mà chưa khoá thì đếm lại từ đầu.
function demThem(bo, khoa, tran) {
  const now = Date.now();
  const rec = bo.get(khoa) || { count: 0, firstAt: now, lockedUntil: 0 };
  if (!rec.lockedUntil && now - rec.firstAt > LOCK_MS) { rec.count = 0; rec.firstAt = now; }
  rec.count += 1;
  if (rec.count >= tran && !rec.lockedUntil) rec.lockedUntil = now + LOCK_MS;
  datVaoBo(bo, khoa, rec);
}

// Lượt vừa ghi hoá ra là đăng nhập đúng: trả lại đúng một lượt, không xoá lượt
// sai của ai. Khoá chỉ đặt khi bộ đếm chạm trần, nên trả lượt mà tụt dưới trần
// nghĩa là chính lượt đúng này đã đẩy bộ đếm chạm trần — gỡ khoá ấy.
function traLuot(bo, khoa, tran) {
  const rec = bo.get(khoa);
  if (!rec) return;
  rec.count = Math.max(0, rec.count - 1);
  if (rec.count < tran) rec.lockedUntil = 0;
}

function daTungVaoDung(ip, ten) {
  const rec = daVaoDung.get(khoaCap(ip, ten));
  return !!rec && Date.now() - rec.firstAt < NHO_VAO_DUNG_MS;
}

// Lượt đăng nhập này có bị chặn không. Trả về null, hoặc { ms, loi } để báo.
function biChan(ip, ten) {
  const capKhoa = conKhoa(theoCap, khoaCap(ip, ten));
  if (capKhoa) return { ms: capKhoa, loi: 'cap' };
  const quen = daTungVaoDung(ip, ten);
  const diaChiKhoa = conKhoa(theoDiaChi, ip);
  if (diaChiKhoa && !quen) return { ms: diaChiKhoa, loi: 'dia-chi' };
  const tenKhoa = ten ? conKhoa(theoTen, ten) : 0;
  if (tenKhoa && !quen) return { ms: tenKhoa, loi: 'ten' };
  return null;
}

function ghiLuotThu(ip, ten) {
  demThem(theoDiaChi, ip, TRAN_DIA_CHI);
  demThem(theoCap, khoaCap(ip, ten), TRAN_CAP);
  if (ten) demThem(theoTen, ten, TRAN_TEN);
}

// CẤP LẠI MẬT KHẨU GỠ KHOÁ CỦA TÊN ẤY (Đ261j). Câu báo khoá theo tên mời gia
// đình "nhờ cô phụ trách cấp lại mật khẩu" — cấp lại mà không gỡ thì gia đình
// vào bằng 4G (chưa từng vào đúng từ đó) vẫn bị chặn thêm tới 15 phút. Gỡ cả
// khoá theo cặp của tên ấy: mật khẩu cũ đã hết hiệu lực, lượt dò cũ vô nghĩa.
// Bộ đếm theo địa chỉ thì không đụng — nó không thuộc về tài khoản nào.
function goKhoaTheoTen(username) {
  const ten = khoaTen(username);
  if (!ten) return;
  theoTen.delete(ten);
  const duoi = `\n${ten}`;
  for (const k of [...theoCap.keys()]) if (k.endsWith(duoi)) theoCap.delete(k);
}

function daVaoDuoc(ip, ten) {
  traLuot(theoDiaChi, ip, TRAN_DIA_CHI);
  theoCap.delete(khoaCap(ip, ten));
  if (ten) theoTen.delete(ten);
  datVaoBo(daVaoDung, khoaCap(ip, ten), { firstAt: Date.now() });
}

// Số mili giây phải chờ trước khi trả lời, tính theo số lần sai TRƯỚC lượt này
// của TÊN ĐĂNG NHẬP. Tăng gấp đôi mỗi lần: 0,5s → 1s → 2s → 4s → 8s rồi dừng ở
// đó. Người gõ nhầm mật khẩu thật thì hầu như không thấy phiền.
function choChamTheoTen(ten) {
  const rec = theoTen.get(ten);
  if (!rec) return 0;
  const truoc = rec.count - 1; // lượt này đã được ghi
  if (truoc <= NGUONG_CHAM) return 0;
  return Math.min(250 * 2 ** (truoc - NGUONG_CHAM), CHAM_TOI_DA_MS);
}

const nghi = (ms) => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

// Băm giả dùng khi không tìm thấy tài khoản. Không có nó, tài khoản không tồn
// tại trả lời trong ~1ms còn tài khoản có thật mất ~60ms — chênh lệch đó để lộ
// tên đăng nhập nào có thật, đúng thứ mà câu báo lỗi chung chung đang cố giấu.
const BAM_GIA = password.hash('bam-gia-de-can-bang-thoi-gian-tra-loi');

// Dọn bản ghi cũ để Map không phình vô hạn.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const bo of [theoDiaChi, theoCap, theoTen]) {
    for (const [k, rec] of bo) {
      if (now - rec.firstAt > LOCK_MS && (!rec.lockedUntil || rec.lockedUntil < now)) bo.delete(k);
    }
  }
  for (const [k, rec] of daVaoDung) {
    if (now - rec.firstAt > NHO_VAO_DUNG_MS) daVaoDung.delete(k);
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

// Tab màn Quản trị mà tài khoản này thấy (L6). Nạp tệp NGAY LÚC GỌI, trong
// khối bắt lỗi: lib/tab-quan-tri.js hỏng hay bị gỡ thì trả null — màn hình vẽ
// đủ tab như cũ, và đăng nhập không phụ thuộc vào tính năng này.
// Tệp hỏng thì MỖI lần mở app đều rơi vào nhánh lỗi — ghi nhật ký một lần mỗi
// giờ cho mỗi câu lỗi, đủ để người trông máy thấy mà không làm đầy ổ đĩa.
const _daBaoTab = new Map();
function tabQuanTriAnToan(user) {
  if (user.role !== 'admin') return null;
  try {
    return require('../lib/tab-quan-tri').tabQuanTri(db, user);
  } catch (err) {
    const msg = String(err && err.message || err);
    const luc = Date.now();
    if (!_daBaoTab.has(msg) || luc - _daBaoTab.get(msg) > 60 * 60 * 1000) {
      _daBaoTab.set(msg, luc);
      if (_daBaoTab.size > 50) _daBaoTab.clear();
      console.error(`[auth] không tính được tab Quản trị: ${msg}`);
    }
    return null;
  }
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
  // Kèm nhóm cô (chủ nhiệm / nước ngoài / thể chất) của từng nhóm — CHỈ THÊM
  // trường — để trang chủ gọi đúng "Cô nước ngoài Chồi 2", không gọi mọi cô là
  // "Cô phụ trách" (R2-C1).
  const nhom = user.role === 'teacher'
    ? nl.nhomCuaCo(user.id).map((c) => {
      const ma = nhomCo.nhomCua(db, c.id, user.id);
      return { ...c, nhomCo: ma, tenNhomCo: nhomCo.TEN_NHOM[ma] || '' };
    })
    : [];
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
      tabQuanTri: tabQuanTriAnToan(user),
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
    // Từ chối TRƯỚC khi chạm bộ đếm và trước khi băm (Đ261j).
    if (daiQua(username, TEN_TOI_DA) || daiQua(plain, MAT_KHAU_TOI_DA)) {
      return res.status(400).json({ error: DAI_QUA });
    }
    const ten = khoaTen(username);

    const chan = biChan(ip, ten);
    if (chan) {
      const minutes = Math.ceil(chan.ms / 60000);
      return res.status(429).json({
        error: chan.loi === 'ten'
          ? `Tài khoản này vừa bị nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau ${minutes} phút, `
            + 'hoặc nhờ cô phụ trách cấp lại mật khẩu.'
          : `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      });
    }
    ghiLuotThu(ip, ten);

    // Tên đăng nhập này vừa sai nhiều lần thì trả lời chậm lại. Chờ TRƯỚC khi
    // kiểm mật khẩu, để người dò không đo được gì qua thời gian phản hồi.
    await nghi(choChamTheoTen(ten));

    const user = db.findUserByUsername(username);

    // So khớp mật khẩu đã băm. Câu báo lỗi cố ý không nói rõ sai tên hay sai
    // mật khẩu, để không giúp người lạ dò ra tài khoản nào có thật. Không tìm
    // thấy tài khoản thì vẫn băm một lần với chuỗi giả, cho thời gian trả lời
    // giống hệt trường hợp có tài khoản.
    // Băm ở luồng phụ (verifyAsync, Đ261b): ~45 ms mỗi lượt mà chạy đồng bộ
    // thì cả trường đứng chờ một người đăng nhập.
    const ok = user && user.active
      ? await password.verifyAsync(String(plain || ''), user.passwordHash)
      : (await password.verifyAsync(String(plain || ''), BAM_GIA), false);
    if (!ok) return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });

    daVaoDuoc(ip, ten);
    const token = createSession(user.id);
    db.audit(user.id, 'login', null, { ip });
    res.setHeader('Set-Cookie', sessionCookie(req, token));
    res.json(mePayload(user));
  });

  // ĐĂNG XUẤT TRÊN MÁY NÀO THÌ MÁY ĐÓ THÔI NHẬN THÔNG BÁO ĐẨY (Đ252).
  //
  // Đăng ký đẩy gắn với TÀI KHOẢN chứ không gắn với phiên, nên chỉ xoá phiên
  // thì máy đã đăng xuất — hay máy mượn — vẫn hiện tin về bé lên màn hình
  // khoá. App gửi kèm `endpoint` (địa chỉ đẩy của chính trình duyệt đó) và
  // máy chủ xoá đúng dòng ấy; các máy khác của cùng người không bị đụng.
  //
  // `endpoint` là TUỲ CHỌN: điện thoại còn chạy vỏ app đời trước không gửi gì,
  // và khi đó đăng xuất y như cũ. `huyDangKy` chỉ xoá dòng thuộc CHÍNH người
  // đang đăng xuất, nên gửi địa chỉ của người khác lên cũng không xoá được.
  //
  // Nạp `lib/day.js` ngay lúc gọi, trong khối bắt lỗi: đẩy là việc phụ, nó
  // hỏng thì đăng nhập và đăng xuất vẫn phải chạy.
  app.post('/api/auth/logout', (req, res) => {
    const endpoint = (req.body || {}).endpoint;
    if (req.user && typeof endpoint === 'string' && endpoint) {
      try { require('../lib/day').huyDangKy(req.user.id, endpoint); } catch (_) { /* vẫn đăng xuất */ }
    }
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
  app.post('/api/auth/set-new-password', requireAuth, async (req, res) => {
    if (!req.user.mustChangePassword) {
      return res.status(400).json({ error: 'Tài khoản không ở trạng thái cần đổi mật khẩu' });
    }
    const { newPassword } = req.body || {};
    if (daiQua(newPassword, MAT_KHAU_TOI_DA)) return res.status(400).json({ error: MAT_KHAU_DAI_QUA });
    const weak = password.checkStrength(newPassword);
    if (weak) return res.status(400).json({ error: weak });
    if (await password.verifyAsync(String(newPassword), req.user.passwordHash)) {
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
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (daiQua(currentPassword, MAT_KHAU_TOI_DA)) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    if (daiQua(newPassword, MAT_KHAU_TOI_DA)) return res.status(400).json({ error: MAT_KHAU_DAI_QUA });
    if (!(await password.verifyAsync(String(currentPassword || ''), req.user.passwordHash))) {
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
module.exports.goKhoaTheoTen = goKhoaTheoTen;
