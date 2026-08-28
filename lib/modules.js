// Sổ đăng ký phân hệ.
//
// Mỗi phân hệ của ứng dụng được khai báo ở đây kèm đường dẫn API của nó. Nhà
// trường bật/tắt từng phân hệ trong trang quản trị: tắt là ẩn khỏi màn hình
// chính, chặn luôn đường dẫn giao diện VÀ chặn cả API — nếu chỉ giấu giao diện
// thì người biết đường vẫn gọi thẳng API lấy được dữ liệu.
//
// Muốn thêm phân hệ hoàn toàn mới mà không đụng vào mã của các phân hệ đang
// chạy: tạo một thư mục trong `modules/`, xem hướng dẫn ở `modules/README.md`.
//
// ---------------------------------------------------------------------------
// VÌ SAO BỐN PHÂN HỆ NÀY TẮT SẴN
// ---------------------------------------------------------------------------
//
// Bốn phân hệ, hai lý do khác nhau, cùng một cách xử lý.
//
//   "Nề nếp" và "Báo cáo" — kế thừa nguyên vẹn từ app 1 (trường tiểu học) và
//   cả hai đi ngược QUY TẮC 4 của `CLAUDE.md` theo đúng cái cách mà quy tắc đó
//   cấm. Chi tiết từng màn hình và từng con số ghi ở `docs/TIEN-DO.md` phần N3
//   — cố ý KHÔNG chép lại vào đây, vì để mô tả cho đủ thì phải trích nguyên mấy
//   cụm từ mà chính `test/quy-tac-4.test.mjs` đang canh.
//
//   "Nhận xét" và "Xe buýt" — nhà trường không dùng. Nhận xét hàng ngày là cô
//   viết một đoạn ĐÁNH GIÁ bé mỗi ngày; chỗ của nó ở app 2 do "Ghi nhanh" thay,
//   mà Ghi nhanh làm việc khác hẳn: cô mô tả điều ĐÃ THẤY, không phán xét
//   (QUY TẮC 1). Xe buýt thì trường không có tuyến đưa đón.
//
// Nhà trường quyết tắt cả bốn.
//
// TẮT, KHÔNG XÓA — và đó là một khác biệt có chủ ý:
//
//   • Màn hình biến mất, đường dẫn giao diện bị chặn, API trả 404.
//   • DỮ LIỆU GIỮ NGUYÊN. Hai bảng của chúng không bị đụng tới một dòng nào.
//   • Nhà trường bật lại được bất cứ lúc nào ở Quản trị → Tính năng.
//
// Đây là bước 1 trong ba bước "bỏ một tính năng" của `CLAUDE.md`. Bước 2 (xóa
// hẳn mã, vẫn giữ bảng dữ liệu) để sau, khi đã sống vài hôm mà không ai nhớ tới
// chúng. Món nợ mà `test/quy-tac-4.test.mjs` đang đếm KHÔNG đổi vì tắt — bài
// canh đó soi MÃ NGUỒN, không soi trạng thái bật/tắt. Nó chỉ về 0 ở bước 2.
//
// GĐ 2 sẽ thay chỗ của hai phân hệ này bằng hành trình học tập theo triết lý
// CASA: cô kể lại điều đã quan sát được ở bé.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

// ---------------------------------------------------------------------------
// Các phân hệ lõi, đi kèm sẵn với ứng dụng
// ---------------------------------------------------------------------------
const CORE = [
  {
    key: 'hocsinh', name: 'Hồ sơ của bé', desc: 'Hồ sơ của bé và danh sách bé theo nhóm',
    hash: '#/student', view: 'student', icon: 'student',
    bg: 'linear-gradient(135deg,#5b6ceb,#3f4fd8)',
    api: ['/api/students'], roles: ['parent', 'teacher', 'admin'],
    required: true,   // là xương sống của ứng dụng, không cho tắt
  },
  {
    key: 'diemdanh', name: 'Điểm danh', desc: 'Điểm danh hằng ngày và lịch đi học của bé',
    hash: '#/attendance', view: 'attendance', icon: 'attendance',
    bg: 'linear-gradient(135deg,#38a1f7,#1f7ae0)',
    api: ['/api/attendance'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'xinphep', name: 'Xin phép', desc: 'Gia đình gửi đơn xin nghỉ, cô duyệt',
    hash: '#/leave', view: 'leave', icon: 'leave',
    bg: 'linear-gradient(135deg,#f36f95,#e0476f)',
    api: ['/api/leave'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'thucdon', name: 'Thực đơn', desc: 'Thực đơn bữa ăn ở trường theo tuần',
    hash: '#/menu', view: 'menu', icon: 'menu',
    bg: 'linear-gradient(135deg,#f7a145,#ef7d1a)',
    api: ['/api/menu'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'tkb', name: 'Lịch sinh hoạt', desc: 'Một ngày ở nhóm: đón bé, ăn, ngủ trưa, chơi, trả bé',
    hash: '#/timetable', view: 'timetable', icon: 'timetable',
    bg: 'linear-gradient(135deg,#a86ef5,#8a46e8)',
    api: ['/api/timetable'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'nhanxet', name: 'Nhận xét', desc: 'Nhận xét hằng ngày của cô',
    hash: '#/remarks', view: 'remarks', icon: 'remark',
    bg: 'linear-gradient(135deg,#2ec9a5,#14a984)',
    api: ['/api/remarks'], roles: ['parent', 'teacher', 'admin'],
    // TẮT SẴN — xem khối "VÌ SAO BỐN PHÂN HỆ NÀY TẮT SẴN" ở đầu tệp.
    defaultEnabled: false,
  },
  {
    key: 'baocao', name: 'Báo cáo', desc: 'Kết quả học tập theo học kỳ',
    hash: '#/reports', view: 'reports', icon: 'report',
    bg: 'linear-gradient(135deg,#f0b429,#dd9505)',
    api: ['/api/reports'], roles: ['parent', 'teacher', 'admin'],
    // TẮT SẴN — xem khối "VÌ SAO HAI PHÂN HỆ NÀY TẮT SẴN" ở đầu tệp.
    defaultEnabled: false,
  },
  {
    key: 'xebuyt', name: 'Xe buýt', desc: 'Tuyến xe đưa đón và hành trình',
    hash: '#/bus', view: 'bus', icon: 'bus',
    bg: 'linear-gradient(135deg,#3f8ef7,#2b6cd9)',
    api: ['/api/bus'], roles: ['parent', 'teacher', 'admin'],
    // TẮT SẴN — xem khối "VÌ SAO BỐN PHÂN HỆ NÀY TẮT SẴN" ở đầu tệp.
    defaultEnabled: false,
  },
  {
    key: 'nenep', name: 'Nề nếp', desc: 'Ghi nhận nề nếp hằng ngày',
    hash: '#/conduct', view: 'conduct', icon: 'conduct',
    bg: 'linear-gradient(135deg,#f2635c,#dd3f38)',
    api: ['/api/conduct'], roles: ['parent', 'teacher', 'admin'],
    // TẮT SẴN — xem khối "VÌ SAO HAI PHÂN HỆ NÀY TẮT SẴN" ở đầu tệp.
    defaultEnabled: false,
  },
  {
    key: 'khaosat', name: 'Khảo sát', desc: 'Lấy ý kiến phụ huynh',
    hash: '#/surveys', view: 'surveys', icon: 'survey',
    bg: 'linear-gradient(135deg,#f7c948,#eda810)',
    api: ['/api/surveys'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'yte', name: 'Sức khỏe', desc: 'Hồ sơ sức khỏe, cân đo định kỳ, tiêm chủng',
    hash: '#/health', view: 'health', icon: 'health',
    bg: 'linear-gradient(135deg,#3ecf6e,#22aa4e)',
    api: ['/api/health'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'danthuoc', name: 'Dặn thuốc', desc: 'Gia đình dặn thuốc, cô xác nhận',
    hash: '#/medicine', view: 'medicine', icon: 'medicine',
    bg: 'linear-gradient(135deg,#ec5f8c,#d63868)',
    api: ['/api/medicine'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'album', name: 'Album ảnh', desc: 'Ảnh hoạt động của nhóm',
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
  {
    key: 'hocsinhcu', name: 'Hồ sơ con đã ra trường',
    desc: 'Hồ sơ của con đã rời trường, tra cứu trong 12 tháng',
    hash: '#/hocsinh-cu', view: 'hocsinhcu', icon: 'student',
    bg: 'linear-gradient(135deg,#8a94a6,#5d6779)',
    api: ['/api/hocsinh-cu'], roles: ['parent'],
  },
  {
    key: 'namhoccu', name: 'Năm học trước',
    desc: 'Thông báo, kế hoạch, khảo sát, lịch sinh hoạt của nhóm con từng học',
    hash: '#/namhoccu', view: 'namhoccu', icon: 'plan',
    bg: 'linear-gradient(135deg,#7e8aa0,#4f5a6e)',
    api: ['/api/namhoccu'], roles: ['parent'],
  },
  // Hai phân hệ dưới nằm ở thanh điều hướng chứ không ở lưới biểu tượng.
  {
    key: 'thongbao', name: 'Thông báo', desc: 'Thông báo của trường và của nhóm',
    hash: '#/notifications', view: 'notifications', icon: 'bell', nav: true,
    bg: 'linear-gradient(135deg,#4f7ef7,#3558d4)',
    api: ['/api/notifications'], roles: ['parent', 'teacher', 'admin'],
  },
  {
    key: 'nhantin', name: 'Nhắn tin', desc: 'Trao đổi riêng giữa cô và gia đình',
    hash: '#/messages', view: 'messages', icon: 'chat', nav: true,
    bg: 'linear-gradient(135deg,#2ec9a5,#14a984)',
    api: ['/api/messages'], roles: ['parent', 'teacher', 'admin'],
  },
];

// Những đường dẫn thuộc về hệ thống, không bao giờ bị chặn bởi việc tắt phân hệ.
const HE_THONG = ['/api/auth/', '/api/dashboard/', '/api/admin/', '/api/accounts/',
  '/api/schoolyear/', '/api/modules'];

// ---------------------------------------------------------------------------
// Cô lập lỗi
//
// Một phân hệ hỏng — dù là phân hệ lõi hay phân hệ mới cắm thêm — chỉ được phép
// làm chính nó ngưng hoạt động. Đánh dấu lỗi ở đây sẽ khiến phân hệ đó biến khỏi
// màn hình người dùng, API của nó trả 503, còn trang quản trị nêu rõ lý do.
// ---------------------------------------------------------------------------
function danhDauLoi(key, thongDiep) {
  const m = timTheoKey(key);
  if (!m) return false;
  m.loi = thongDiep;
  return true;
}

// Tệp route tương ứng của một phân hệ lõi, suy ra từ đường dẫn API đầu tiên:
// '/api/attendance' → 'attendance.js'
function tepRoute(m) {
  const p = (m.api || [])[0] || '';
  const ten = p.replace(/^\/api\//, '').split('/')[0];
  return ten ? `${ten}.js` : null;
}

// Phân hệ lõi nào bị gỡ mất tệp xử lý thì đánh dấu luôn là chưa cài đặt, để nó
// không hiện ra một biểu tượng bấm vào chẳng có gì.
function kiemTraThieuCaiDat(routesDir) {
  for (const m of CORE) {
    const tep = tepRoute(m);
    if (tep && !fs.existsSync(path.join(routesDir, tep))) {
      m.loi = `chưa cài đặt (thiếu tệp routes/${tep})`;
      console.warn(`Phân hệ "${m.key}" thiếu tệp routes/${tep} — tạm ẩn khỏi ứng dụng.`);
    }
  }
}

// Đánh dấu lỗi cho phân hệ lõi dùng tệp route này. Dùng khi tệp đó nạp không được.
function danhDauLoiTheoTep(tenTep, thongDiep) {
  const trung = CORE.filter(m => tepRoute(m) === tenTep);
  trung.forEach(m => { m.loi = thongDiep; });
  return trung.map(m => m.key);
}

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
      const api = meta.api || [`/api/${meta.key}`];
      const dungCho = kiemTraDuongDan(api);
      if (dungCho) {
        console.warn(`Bỏ qua phân hệ "${ten}": ${dungCho}`);
        continue;
      }
      MO_RONG.push({
        ...meta,
        thuMuc,
        moRong: true,
        api,
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

// Đường dẫn API của phân hệ mới phải nằm gọn trong vùng riêng của nó, không được
// chồng lên vùng của phân hệ đang chạy. Trả về chuỗi lý do nếu không hợp lệ.
function kiemTraDuongDan(api) {
  if (!Array.isArray(api) || !api.length) return 'thiếu khai báo "api"';
  for (const p of api) {
    if (typeof p !== 'string' || !/^\/api\/[a-z0-9-]+$/i.test(p)) {
      return `đường dẫn "${p}" không hợp lệ, phải có dạng /api/<mã>`;
    }
    if (HE_THONG.some(x => p === x || p.startsWith(x) || x.startsWith(p + '/'))) {
      return `đường dẫn "${p}" thuộc về hệ thống`;
    }
    const dungCua = [...CORE, ...MO_RONG].find(m =>
      (m.api || []).some(q => q === p || p.startsWith(q + '/') || q.startsWith(p + '/')));
    if (dungCua) return `đường dẫn "${p}" đã thuộc về phân hệ "${dungCua.name}"`;
  }
  return null;
}

// Phân hệ mới chỉ được tạo bảng của riêng nó. Một câu lệnh DROP hay ALTER lọt vào
// đây là đủ để xóa sổ dữ liệu của phần đang chạy, nên chặn ngay từ đầu thay vì
// tin rằng người viết phân hệ luôn cẩn thận.
function kiemTraSchema(sql, key) {
  const ma = key.toLowerCase();
  const cuaMinh = (ten) => ten === ma || ten.startsWith(ma + '_');
  const sach = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  for (const cau of sach.split(';').map(s => s.trim()).filter(Boolean)) {
    const m = cau.match(/^CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|VIEW|TRIGGER)\s+IF\s+NOT\s+EXISTS\s+["'`]?([a-z0-9_]+)["'`]?/i);
    if (!m) {
      throw new Error(
        'schema.sql chỉ được dùng CREATE TABLE/INDEX/VIEW/TRIGGER IF NOT EXISTS. ' +
        `Câu lệnh bị từ chối: "${cau.split('\n')[0].slice(0, 60)}…"`);
    }
    const loai = m[1].toUpperCase();
    const ten = m[2].toLowerCase();

    if (loai === 'TABLE' || loai === 'VIEW') {
      if (!cuaMinh(ten)) {
        throw new Error(
          `bảng "${ten}" phải đặt tên bắt đầu bằng "${key}_" để không đụng dữ liệu của phân hệ khác`);
      }
      continue;
    }

    // Chỉ mục và trigger: điều quan trọng là nó gắn vào bảng NÀO. Gắn vào bảng
    // của phân hệ khác là đường để phá dữ liệu đang chạy.
    const bang = (cau.match(/\bON\s+["'`]?([a-z0-9_]+)["'`]?/i) || [])[1];
    if (!bang || !cuaMinh(bang.toLowerCase())) {
      throw new Error(
        `${loai === 'INDEX' ? 'chỉ mục' : 'trigger'} "${ten}" gắn vào bảng "${bang || '?'}" ` +
        `không thuộc phân hệ này — chỉ được gắn vào bảng bắt đầu bằng "${key}_"`);
    }
    if (!ten.includes(ma)) {
      throw new Error(
        `${loai === 'INDEX' ? 'chỉ mục' : 'trigger'} "${ten}" phải có "${key}" trong tên ` +
        'để không trùng tên với phân hệ khác');
    }
  }
}

// Bọc `app` lại trước khi giao cho phân hệ mới: nó chỉ đăng ký được đường dẫn
// trong vùng đã khai báo. Nhờ vậy một phân hệ viết sai không thể vô tình chiếm
// mất đường dẫn của phân hệ đang chạy.
function appHanChe(app, m) {
  const vung = m.api || [];
  const trongVung = (p) => typeof p === 'string' &&
    vung.some(x => p === x || p.startsWith(x + '/'));
  const boc = {};
  for (const cach of ['get', 'post', 'put', 'patch', 'delete', 'all', 'use']) {
    boc[cach] = (duongDan, ...rest) => {
      if (!trongVung(duongDan)) {
        throw new Error(
          `chỉ được đăng ký đường dẫn bắt đầu bằng ${vung.join(' hoặc ')}, ` +
          `nhưng phân hệ này đăng ký "${duongDan}"`);
      }
      return app[cach](duongDan, ...rest);
    };
  }
  return boc;
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
        const sql = fs.readFileSync(schemaFile, 'utf8');
        kiemTraSchema(sql, m.key);   // chặn trước khi chạy, không sửa sai sau khi đã mất dữ liệu
        db.sqlite.exec(sql);
      }
      const routesFile = path.join(m.thuMuc, 'routes.js');
      if (fs.existsSync(routesFile)) {
        const fn = require(routesFile);
        if (typeof fn === 'function') fn(appHanChe(app, m), { db, modules: module.exports });
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
  // Ô vuông của phân hệ nằm ngoài phần việc của chức vụ thì ẨN LUÔN. Chốt chặn
  // thật vẫn là `chanApiNgoaiChucVu` ở tầng API — chỗ này chỉ để người dùng
  // không bấm vào một ô rồi nhận câu từ chối.
  const cho = db.apiChoPhep(user);
  const trongPhanViec = (m) => !cho
    || (m.api || []).some(a => cho.some(x => a === x || a.startsWith(`${x}/`) || x.startsWith(`${a}/`)));
  return tatCa()
    .filter(m => tt[m.key] && !m.loi && (!m.roles || m.roles.includes(user.role)) && trongPhanViec(m))
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

// Middleware: chặn đường dẫn API nằm ngoài phần việc của một CHỨC VỤ.
//
// CHỐT CHẶN DUY NHẤT, ĐẶT ĐÚNG CHỖ MỌI LỜI GỌI ĐI QUA
//
// Tầng chức vụ (Cấp 2, và Cấp 3 tách đôi) có thể cài bằng cách rải điều kiện
// vào từng đường dẫn — và đó là cách sẽ hỏng. Kho mã này có hơn ba mươi đường
// API, thêm đường mới gần như mỗi tuần, và một điều kiện quên ở một đường là
// một lỗ mở lặng lẽ.
//
// Nên nó nằm ở đây: một middleware duy nhất, đặt ngay cạnh `chanApiDaTat` và
// TRƯỚC khi mọi route được nạp, nên không đường nào đi vòng qua được. Đường
// dẫn thêm sau này mặc định BỊ TỪ CHỐI với chức vụ có danh sách cho phép —
// quên thì quên theo hướng đóng lại, không phải mở ra.
//
// Không khai chức vụ thì `db.apiChoPhep` trả `null` và middleware này chỉ là
// một lần `next()` — trường đang chạy không đổi một chút nào.
// KHUNG XƯƠNG CỦA APP — LUÔN MỞ, VỚI MỌI CHỨC VỤ.
//
// Ba đường này là thứ app gọi TRƯỚC KHI biết người dùng làm việc gì:
// `/api/auth/me` để biết mình là ai, `/api/modules` để vẽ lưới ô vuông,
// `/api/dashboard/badges` để chấm số trên các ô. Chặn một trong ba là app trắng
// màn hình ngay sau khi đăng nhập — tức là vi phạm Nguyên tắc số 1 bằng đúng
// cái tầng sinh ra để siết quyền.
//
// Ba đường này cũng không mang dữ liệu của trẻ: hai đường đầu nói về chính
// người đang đăng nhập, đường thứ ba đếm trên phần việc mà họ vốn đã mở được.
const KHUNG_APP = ['/api/auth', '/api/modules', '/api/dashboard'];

function chanApiNgoaiChucVu(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  const cho = db.apiChoPhep(req.user);
  if (!cho) return next();

  const p = req.path;
  const trong = (ds) => ds.some(x => p === x || p.startsWith(`${x}/`));
  if (trong(KHUNG_APP) || trong(cho)) return next();

  const mo = db.moTaChucVu(db.chucVu(req.user)) || {};
  return res.status(403).json({
    error: `Tài khoản "${mo.ten || 'chức vụ này'}" không mở được phần này. `
      + `${mo.moTa || ''} Cần thêm quyền thì nhờ ban giám hiệu đổi chức vụ giúp.`,
  });
}

module.exports = {
  CORE, MODULES_DIR,
  napMoRong, napApiMoRong, tatCa, timTheoKey,
  trangThai, dangBat, datTrangThai, chanApiNgoaiChucVu,
  choNguoiDung, choQuanTri, chanApiDaTat,
  danhDauLoi, danhDauLoiTheoTep, kiemTraThieuCaiDat, tepRoute,
  kiemTraDuongDan, kiemTraSchema,
  moRong: () => MO_RONG,
};
