// Sổ đăng ký phân hệ.
//
// Mỗi phân hệ của ứng dụng được khai báo ở đây kèm đường dẫn API của nó. Nhà
// trường bật/tắt từng phân hệ trong trang quản trị: tắt là ẩn khỏi màn hình
// chính, chặn luôn đường dẫn giao diện VÀ chặn cả API — nếu chỉ giấu giao diện
// thì người biết đường vẫn gọi thẳng API lấy được dữ liệu.
//
// Muốn thêm phân hệ hoàn toàn mới mà không đụng vào mã của các phân hệ đang
// chạy: tạo một thư mục trong `modules/`, xem hướng dẫn ở `modules/README.md`.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

// ---------------------------------------------------------------------------
// Các phân hệ lõi, đi kèm sẵn với ứng dụng
// ---------------------------------------------------------------------------
const CORE = [
  {
    key: 'hocsinh', name: 'Học sinh', desc: 'Hồ sơ học sinh và danh sách lớp',
    hash: '#/student', view: 'student', icon: 'student',
    bg: 'linear-gradient(135deg,#5b6ceb,#3f4fd8)',
    api: ['/api/students'], roles: ['parent', 'teacher', 'admin'],
    required: true,   // là xương sống của ứng dụng, không cho tắt
  },
  {
    key: 'diemdanh', name: 'Điểm danh', desc: 'Điểm danh hằng ngày và lịch chuyên cần',
    hash: '#/attendance', view: 'attendance', icon: 'attendance',
    bg: 'linear-gradient(135deg,#38a1f7,#1f7ae0)',
    api: ['/api/attendance'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'xinphep', name: 'Xin phép', desc: 'Phụ huynh gửi đơn xin nghỉ, giáo viên duyệt',
    hash: '#/leave', view: 'leave', icon: 'leave',
    bg: 'linear-gradient(135deg,#f36f95,#e0476f)',
    api: ['/api/leave'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'thucdon', name: 'Thực đơn', desc: 'Thực đơn bán trú theo tuần',
    hash: '#/menu', view: 'menu', icon: 'menu',
    bg: 'linear-gradient(135deg,#f7a145,#ef7d1a)',
    api: ['/api/menu'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'tkb', name: 'Thời khóa biểu', desc: 'Thời khóa biểu từng lớp',
    hash: '#/timetable', view: 'timetable', icon: 'timetable',
    bg: 'linear-gradient(135deg,#a86ef5,#8a46e8)',
    api: ['/api/timetable'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'nhanxet', name: 'Nhận xét', desc: 'Nhận xét hằng ngày của giáo viên',
    hash: '#/remarks', view: 'remarks', icon: 'remark',
    bg: 'linear-gradient(135deg,#2ec9a5,#14a984)',
    api: ['/api/remarks'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'baocao', name: 'Báo cáo', desc: 'Kết quả học tập theo học kỳ',
    hash: '#/reports', view: 'reports', icon: 'report',
    bg: 'linear-gradient(135deg,#f0b429,#dd9505)',
    api: ['/api/reports'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'xebuyt', name: 'Xe buýt', desc: 'Tuyến xe đưa đón và hành trình',
    hash: '#/bus', view: 'bus', icon: 'bus',
    bg: 'linear-gradient(135deg,#3f8ef7,#2b6cd9)',
    api: ['/api/bus'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'nenep', name: 'Nề nếp', desc: 'Tuyên dương, nhắc nhở và điểm thi đua',
    hash: '#/conduct', view: 'conduct', icon: 'conduct',
    bg: 'linear-gradient(135deg,#f2635c,#dd3f38)',
    api: ['/api/conduct'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'khaosat', name: 'Khảo sát', desc: 'Lấy ý kiến phụ huynh',
    hash: '#/surveys', view: 'surveys', icon: 'survey',
    bg: 'linear-gradient(135deg,#f7c948,#eda810)',
    api: ['/api/surveys'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'yte', name: 'Y tế', desc: 'Hồ sơ sức khỏe, khám định kỳ, tiêm chủng',
    hash: '#/health', view: 'health', icon: 'health',
    bg: 'linear-gradient(135deg,#3ecf6e,#22aa4e)',
    api: ['/api/health'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'danthuoc', name: 'Dặn thuốc', desc: 'Phụ huynh dặn thuốc, giáo viên xác nhận',
    hash: '#/medicine', view: 'medicine', icon: 'medicine',
    bg: 'linear-gradient(135deg,#ec5f8c,#d63868)',
    api: ['/api/medicine'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'album', name: 'Album ảnh', desc: 'Ảnh hoạt động của lớp',
    hash: '#/albums', view: 'albums', icon: 'album',
    bg: 'linear-gradient(135deg,#b06ef0,#9146d8)',
    api: ['/api/albums'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'kehoach', name: 'Kế hoạch giáo dục', desc: 'Chủ đề và kế hoạch từng tháng',
    hash: '#/plans', view: 'plans', icon: 'plan',
    bg: 'linear-gradient(135deg,#2fbfae,#0f9d8d)',
    api: ['/api/plans'], roles: ['parent', 'teacher', 'admin'],
  },
  // Hai phân hệ dưới nằm ở thanh điều hướng chứ không ở lưới biểu tượng.
  {
    key: 'thongbao', name: 'Thông báo', desc: 'Thông báo của trường và lớp',
    hash: '#/notifications', view: 'notifications', icon: 'bell', nav: true,
    bg: 'linear-gradient(135deg,#4f7ef7,#3558d4)',
    api: ['/api/notifications'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'nhantin', name: 'Nhắn tin', desc: 'Trao đổi riêng giữa giáo viên và phụ huynh',
    hash: '#/messages', view: 'messages', icon: 'chat', nav: true,
    bg: 'linear-gradient(135deg,#2ec9a5,#14a984)',
    api: ['/api/messages'], roles: ['parent', 'teacher', 'admin'],
  },
];

// Những đường dẫn thuộc về hệ thống, không bao giờ bị chặn bởi việc tắt phân hệ.
const HE_THONG = ['/api/auth/', '/api/dashboard/', '/api/admin/', '/api/accounts/',
  '/api/schoolyear/', '/api/modules'];

// ---------------------------------------------------------------------------
// Phân hệ mở rộng: mỗi thư mục con trong modules/ là một phân hệ cắm thêm
// ---------------------------------------------------------------------------
let MO_RONG = [];

function napMoRong() {
  MO_RONG = [];
  if (!fs.existsSync(MODULES_DIR)) return MO_RONG;

  for (const ten of fs.readdirSync(MODULES_DIR).sort()) {
    const thuMuc = path.join(MODULES_DIR, ten);
    if (!fs.statSync(thuMuc).isDirectory()) continue;
    const metaFile = path.join(thuMuc, 'module.json');
    if (!fs.existsSync(metaFile)) continue;

    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      if (!meta.key || !meta.name) {
        console.warn(`Bỏ qua phân hệ "${ten}": module.json thiếu key hoặc name`);
        continue;
      }
      if (CORE.some(m => m.key === meta.key) || MO_RONG.some(m => m.key === meta.key)) {
        console.warn(`Bỏ qua phân hệ "${ten}": mã "${meta.key}" đã được dùng`);
        continue;
      }
      MO_RONG.push({
        ...meta,
        thuMuc,
        moRong: true,
        api: meta.api || [`/api/${meta.key}`],
        roles: meta.roles || ['parent', 'teacher', 'admin'],
        view: meta.view || meta.key,
        viewUrl: fs.existsSync(path.join(thuMuc, 'view.js')) ? `/modules/${ten}/view.js` : null,
        defaultEnabled: meta.defaultEnabled !== false,
      });
    } catch (err) {
      console.warn(`Bỏ qua phân hệ "${ten}": ${err.message}`);
    }
  }
  return MO_RONG;
}

// Tạo bảng riêng của phân hệ mở rộng (nếu có) rồi nạp các đường dẫn API của nó.
// Lỗi ở một phân hệ mở rộng không được làm sập cả ứng dụng — đây chính là điều
// bảo đảm "thêm cái mới không ảnh hưởng cái đang chạy".
function napApiMoRong(app) {
  const ketQua = [];
  for (const m of MO_RONG) {
    try {
      const schemaFile = path.join(m.thuMuc, 'schema.sql');
      if (fs.existsSync(schemaFile)) {
        db.sqlite.exec(fs.readFileSync(schemaFile, 'utf8'));
      }
      const routesFile = path.join(m.thuMuc, 'routes.js');
      if (fs.existsSync(routesFile)) {
        const fn = require(routesFile);
        if (typeof fn === 'function') fn(app, { db, modules: module.exports });
      }
      ketQua.push({ key: m.key, ok: true });
    } catch (err) {
      m.loi = err.message;
      console.error(`Phân hệ "${m.key}" không nạp được: ${err.message}`);
      console.error('  Các phân hệ khác vẫn chạy bình thường.');
      ketQua.push({ key: m.key, ok: false, error: err.message });
    }
  }
  return ketQua;
}

// ---------------------------------------------------------------------------
// Trạng thái bật/tắt
// ---------------------------------------------------------------------------

function tatCa() {
  return [...CORE, ...MO_RONG];
}

function timTheoKey(key) {
  return tatCa().find(m => m.key === key);
}

// Đọc trạng thái đã lưu; phân hệ chưa có bản ghi thì lấy mặc định.
function trangThai() {
  const rows = db.all('module_settings', 'SELECT * FROM module_settings');
  const luu = new Map(rows.map(r => [r.moduleKey, !!r.enabled]));
  const out = {};
  for (const m of tatCa()) {
    out[m.key] = m.required ? true
      : (luu.has(m.key) ? luu.get(m.key) : m.defaultEnabled !== false);
  }
  return out;
}

function dangBat(key) {
  const m = timTheoKey(key);
  if (!m) return false;
  if (m.required) return true;
  if (m.loi) return false;           // phân hệ lỗi thì coi như tắt
  return trangThai()[key] === true;
}

function datTrangThai(key, bat) {
  const m = timTheoKey(key);
  if (!m) throw new Error('Không tìm thấy phân hệ');
  if (m.required && !bat) throw new Error(`Phân hệ "${m.name}" là phần lõi, không thể tắt`);
  db.upsert('module_settings', {
    moduleKey: key,
    enabled: bat ? 1 : 0,
    updatedAt: new Date().toISOString(),
  }, ['moduleKey']);
  return true;
}

// Danh sách phân hệ mà một người dùng nhìn thấy, đã lọc theo vai trò và trạng thái.
function choNguoiDung(user) {
  const tt = trangThai();
  return tatCa()
    .filter(m => tt[m.key] && !m.loi && (!m.roles || m.roles.includes(user.role)))
    .map(m => ({
      key: m.key, name: m.name, hash: m.hash, view: m.view,
      icon: m.icon, emoji: m.emoji, bg: m.bg,
      nav: !!m.nav, moRong: !!m.moRong, viewUrl: m.viewUrl || null,
    }));
}

// Danh sách đầy đủ kèm trạng thái, dành cho trang quản trị.
function choQuanTri() {
  const tt = trangThai();
  return tatCa().map(m => ({
    key: m.key, name: m.name, desc: m.desc || '',
    icon: m.icon, emoji: m.emoji, bg: m.bg,
    enabled: tt[m.key], required: !!m.required,
    moRong: !!m.moRong, nav: !!m.nav,
    loi: m.loi || null,
    api: m.api,
  }));
}

// Middleware: chặn đường dẫn API của phân hệ đang tắt.
// Đây là chốt chặn thật sự — giấu biểu tượng ngoài giao diện là chưa đủ.
function chanApiDaTat(req, res, next) {
  const p = req.path;
  if (HE_THONG.some(x => p.startsWith(x))) return next();

  for (const m of tatCa()) {
    if (!(m.api || []).some(prefix => p === prefix || p.startsWith(prefix + '/'))) continue;
    if (m.required) return next();
    if (m.loi) {
      return res.status(503).json({ error: `Phân hệ "${m.name}" đang gặp sự cố, tạm thời không dùng được` });
    }
    if (!dangBat(m.key)) {
      return res.status(404).json({ error: `Phân hệ "${m.name}" đang được nhà trường tắt` });
    }
    return next();
  }
  next();
}

module.exports = {
  CORE, MODULES_DIR,
  napMoRong, napApiMoRong, tatCa, timTheoKey,
  trangThai, dangBat, datTrangThai,
  choNguoiDung, choQuanTri, chanApiDaTat,
  moRong: () => MO_RONG,
};
