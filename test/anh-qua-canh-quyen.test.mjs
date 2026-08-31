// Bài canh: ẢNH CỦA BÉ CHỈ RA QUA ĐƯỜNG CÓ CANH QUYỀN — KHÔNG PHỤC VỤ TĨNH.
//
// Chạy bằng:  npm run test:anh-canh-quyen
//
// VÌ SAO CÓ BÀI NÀY
//
// Luật này đã được viết rõ trong chú thích ở bốn phân hệ —
// `modules/dontra/routes.js` ("ĐI QUA CANH QUYỀN, KHÔNG PHỤC VỤ TĨNH"),
// `modules/cambridge/routes.js`, `modules/thuchup/routes.js`,
// `modules/hanhtrinh/routes.js` — nhưng **không bài canh nào thi hành nó**.
//
// Và đó không phải chuyện lý thuyết: lỗi Đ95 lọt qua khoảng 94 đợt vá đúng vì
// chỗ hở này. Màn Điểm danh trỏ thẻ ảnh vào `/uploads/<tên tệp>`, mà máy chủ
// không hề gắn đường tĩnh nào tên đó — mọi yêu cầu ảnh rơi vào lớp đỡ của
// trang đơn và nhận về `index.html`. Ô ảnh vỡ ở cả hai màn suốt hai ngày, có
// 37 bài canh cho đúng tính năng ấy, và không bài nào đỏ.
//
// BA PHÉP KIỂM, VÀ VÌ SAO ĐÚNG BA CÁI NÀY
//
//   [1] KHÔNG `express.static` NÀO ĐƯỢC TRỎ VÀO THƯ MỤC DỮ LIỆU.
//       Đây là "cách vá nhanh" mà bất kỳ ai gặp ô ảnh vỡ cũng nghĩ ra trong ba
//       giây. Thư mục `DATA_DIR/uploads` dùng CHUNG cho ảnh album, ảnh
//       Cambridge, ảnh người được đón, ảnh quan sát Hành trình, ảnh Ghi nhanh
//       và ảnh điểm danh. Mở tĩnh một dòng là đi vòng qua `locAnhChoNguoiXem`,
//       `canAccessStudent` và luật ảnh nhóm cùng một lúc — mà tên tệp không
//       phải bí mật, nó nằm sẵn trong gói JSON mọi gia đình đã nhận.
//
//   [2] MỌI `src="/..."` TRÊN MÀN HÌNH PHẢI TRỎ TỚI MỘT ĐƯỜNG `/api/...` CÓ THẬT.
//       Bắt đúng hình dạng của lỗi Đ95: màn hình trỏ vào một đường không ai
//       phục vụ. Hai vế — phải là `/api/`, và đường ấy phải thật sự được đăng
//       ký ở đâu đó trong `routes/` hay `modules/*/routes.js`.
//
//   [3] MỌI `res.sendFile` PHẢI CÓ CANH QUYỀN TRONG CÙNG THÂN ĐƯỜNG DẪN.
//       Vế còn lại: có đường `/api/` rồi nhưng quên hỏi quyền thì cũng hỏng y
//       như phục vụ tĩnh, chỉ khó thấy hơn.
//
// BÀI NÀY BẮT ĐƯỢC GÌ, VÀ KHÔNG BẮT ĐƯỢC GÌ
//
// Bắt được: một màn hình mới trỏ ảnh vào đường tĩnh hoặc vào đường không tồn
// tại; một dòng `express.static` mở thư mục ảnh; một đường trả tệp mà quên hỏi
// quyền. Cả ba đều là lỗi "viết vội" và cả ba đều làm lộ ảnh mặt trẻ.
//
// KHÔNG bắt được: quyền SAI (hỏi `canAccessClass` ở chỗ đáng lẽ phải hỏi
// `canAccessStudent`) — bài này chỉ hỏi "có hỏi quyền không", không hỏi "hỏi
// đúng câu chưa". Phần đó vẫn thuộc về các bài kiểm thử theo tình huống, nơi
// có một gia đình thật đi thử đúng đường của nhà khác.
import { taoBoDem, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

// Tên các hàm canh quyền gốc. Giống `test/quyen-du-lieu-be.test.mjs`, và cùng
// lý do: một đường có thể gọi qua một lớp bọc trong cùng tệp, nên phải lan.
const GOC_CANH = [
  'canAccessStudent', 'canAccessClass', 'requireRole',
  'locAnhChoNguoiXem', 'xemDuocAlbum', 'anhHienVoiGiaDinh', 'anhHienVoiTruyenThong',
  'studentIdsOf', 'nhomDangThaoTac', 'lopCuCuaPhuHuynh',
];

function docTep(p) {
  return fs.readFileSync(path.join(GOC, p), 'utf8');
}

function liet(thuMuc, duoi = '.js') {
  const goc = path.join(GOC, thuMuc);
  if (!fs.existsSync(goc)) return [];
  const ds = [];
  (function di(d) {
    for (const t of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, t.name);
      if (t.isDirectory()) di(p);
      else if (t.name.endsWith(duoi)) ds.push(path.relative(GOC, p));
    }
  })(goc);
  return ds.sort();
}

const TEP_MAY_CHU = ['server.js', ...liet('routes'),
  ...fs.readdirSync(path.join(GOC, 'modules'), { withFileTypes: true })
    .filter(t => t.isDirectory() && fs.existsSync(path.join(GOC, 'modules', t.name, 'routes.js')))
    .map(t => `modules/${t.name}/routes.js`)];

const TEP_MAN_HINH = [...liet('public/js'),
  ...fs.readdirSync(path.join(GOC, 'modules'), { withFileTypes: true })
    .filter(t => t.isDirectory() && fs.existsSync(path.join(GOC, 'modules', t.name, 'view.js')))
    .map(t => `modules/${t.name}/view.js`)];

// ---------------------------------------------------------------- [1] tĩnh

// Trả về danh sách dòng `express.static(...)` trỏ vào thư mục DỮ LIỆU.
// Tách hẳn ra để phép thử ngược gọi lại được trên mã bịa.
function tinhTroVaoKhoDuLieu(ma) {
  const xau = [];
  const re = /express\.static\s*\(([^;]*?)\)\s*[,)]/g;
  let m;
  while ((m = re.exec(ma))) {
    const doi = m[1];
    // `__dirname/public` và `modules.MODULES_DIR` là hai chỗ tĩnh HỢP LỆ: cả
    // hai đều nằm trong kho mã, không phải kho ảnh. Kho ảnh thì luôn đi ra từ
    // `DATA_DIR` hoặc có chữ `uploads`.
    if (/DATA_DIR|['"`]uploads['"`]|uploads['"`]\s*\)|UPLOAD_DIR/.test(doi)) xau.push(doi.replace(/\s+/g, ' ').trim());
  }
  return xau;
}

console.log('\n[1] KHÔNG express.static nào trỏ vào thư mục ảnh');
{
  const xau = [];
  let soStatic = 0;
  for (const tep of TEP_MAY_CHU) {
    const ma = docTep(tep);
    soStatic += (ma.match(/express\.static\s*\(/g) || []).length;
    for (const d of tinhTroVaoKhoDuLieu(ma)) xau.push(`${tep}  →  express.static(${d})`);
  }
  check('không dòng express.static nào trỏ vào kho ảnh', xau.length === 0, xau.join(' | '));

  // ĐỐI CHỨNG: bộ quét phải THẬT SỰ nhìn thấy các dòng static đang có. Không có
  // dòng này thì phép kiểm trên vẫn xanh kể cả khi biểu thức tìm sai hoàn toàn.
  check('đối chứng — bộ quét có nhìn thấy các dòng express.static hợp lệ đang có',
    soStatic >= 2, `${soStatic} dòng`);

  // PHÉP THỬ NGƯỢC: đúng cách-vá-sai mà chú thích Đ95 cảnh báo.
  const bia = `app.use('/uploads', express.static(path.join(db.DATA_DIR, 'uploads')));`;
  check('PHÉP THỬ NGƯỢC — bắt được dòng mở tĩnh thư mục ảnh',
    tinhTroVaoKhoDuLieu(bia).length === 1, JSON.stringify(tinhTroVaoKhoDuLieu(bia)));
  const lanh = `app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));`;
  check('và KHÔNG bắt nhầm dòng phục vụ thư mục public',
    tinhTroVaoKhoDuLieu(lanh).length === 0, JSON.stringify(tinhTroVaoKhoDuLieu(lanh)));
}

// ------------------------------------------------------------- [2] src="/..."

// Mọi đường dẫn API được đăng ký ở máy chủ, dạng chuỗi nguyên văn.
function duongDaDangKy() {
  const ds = new Set();
  for (const tep of TEP_MAY_CHU) {
    const re = /app\.(?:get|post|put|delete|patch|use)\s*\(\s*(['"`])(\/[^'"`]*)\1/g;
    let m;
    while ((m = re.exec(docTep(tep)))) ds.add(m[2]);
  }
  return [...ds];
}

// Lấy phần chữ CỐ ĐỊNH ở đầu mỗi `src="/..."` (dừng ở ${ đầu tiên).
function srcTrenManHinh(ma) {
  const out = [];
  const re = /src\s*=\s*(?:\\?["'])(\/[^"'`$\\]*)/g;
  let m;
  while ((m = re.exec(ma))) out.push(m[1]);
  return out;
}

// Đường `/api/attendance/anh/` khớp với đăng ký `/api/attendance/anh/:file`.
function khopDuongDangKy(src, dsDuong) {
  const sach = src.replace(/\/+$/, '');
  return dsDuong.some((d) => {
    const dSach = d.replace(/\/+$/, '');
    if (dSach === sach) return true;
    // Đăng ký có tham số: so từng đoạn, đoạn `:x` khớp mọi thứ.
    const a = sach.split('/').filter(Boolean);
    const b = dSach.split('/').filter(Boolean);
    if (b.length < a.length) return false;
    return a.every((x, i) => b[i] === x || b[i].startsWith(':'));
  });
}

console.log('\n[2] Mọi src="/..." trỏ tới một đường /api có thật');
{
  const dsDuong = duongDaDangKy();
  const tinh = [];   // trỏ ra ngoài /api — đúng hình dạng lỗi Đ95
  const maDuong = []; // trỏ vào /api nhưng không đường nào nhận
  let tong = 0;

  for (const tep of TEP_MAN_HINH) {
    for (const s of srcTrenManHinh(docTep(tep))) {
      tong++;
      if (!s.startsWith('/api/')) { tinh.push(`${tep}  →  src="${s}"`); continue; }
      if (!khopDuongDangKy(s, dsDuong)) maDuong.push(`${tep}  →  src="${s}"`);
    }
  }

  check('không thẻ ảnh nào trỏ ra ngoài /api (đường tĩnh)', tinh.length === 0, tinh.join(' | '));
  check('mọi thẻ ảnh trỏ tới một đường /api ĐÃ ĐƯỢC ĐĂNG KÝ', maDuong.length === 0, maDuong.join(' | '));

  // ĐỐI CHỨNG: có thật sự tìm thấy thẻ ảnh nào không. Đổi cách viết giao diện
  // mà bộ quét không theo kịp thì hai phép kiểm trên xanh vì quét được 0 chỗ.
  check('đối chứng — bộ quét tìm thấy các thẻ ảnh đang có trên màn hình',
    tong >= 8, `${tong} chỗ`);
  check('đối chứng — bộ quét đọc được danh sách đường dẫn của máy chủ',
    dsDuong.length >= 50, `${dsDuong.length} đường`);

  // PHÉP THỬ NGƯỢC — cả hai vế.
  check('PHÉP THỬ NGƯỢC — bắt được thẻ ảnh trỏ vào /uploads (đúng lỗi Đ95)',
    srcTrenManHinh('<img src="/uploads/${UI.esc(a.file)}">').filter(s => !s.startsWith('/api/')).length === 1,
    JSON.stringify(srcTrenManHinh('<img src="/uploads/${x}">')));
  check('PHÉP THỬ NGƯỢC — bắt được thẻ ảnh trỏ vào đường /api không tồn tại',
    !khopDuongDangKy('/api/khong-co-duong-nay/', dsDuong), 'lẽ ra phải không khớp');
  check('và KHÔNG bắt nhầm đường /api có tham số đang dùng thật',
    khopDuongDangKy('/api/attendance/anh/', dsDuong), 'lẽ ra phải khớp /api/attendance/anh/:file');
}

// ------------------------------------------------------------ [3] sendFile

// Cắt tệp thành { tên hàm nội bộ → thân }, để lan tên hàm canh — cùng cách
// `test/quyen-du-lieu-be.test.mjs` làm, và cùng lý do: `routes/albums.js` gọi
// `xemDuocAlbum(...)` chứ không gọi thẳng `canAccessClass`.
function hamNoiBo(ma) {
  const out = {};
  const re = /(?:^|\n)\s*(?:function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\()/g;
  const moc = [];
  let m;
  while ((m = re.exec(ma))) moc.push({ ten: m[1] || m[2], i: m.index });
  const mocDuong = [];
  const reD = /app\.(?:get|post|put|delete|patch)\s*\(/g;
  let d;
  while ((d = reD.exec(ma))) mocDuong.push(d.index);
  for (let k = 0; k < moc.length; k++) {
    const sau = k + 1 < moc.length ? moc[k + 1].i : ma.length;
    const gan = mocDuong.find(i => i > moc[k].i);
    out[moc[k].ten] = ma.slice(moc[k].i, gan === undefined ? sau : Math.min(sau, gan));
  }
  return out;
}

function boCanhCuaTep(ma) {
  const noiBo = hamNoiBo(ma);
  const canh = new Set(GOC_CANH);
  let doi = true;
  while (doi) {
    doi = false;
    for (const [ten, than] of Object.entries(noiBo)) {
      if (canh.has(ten)) continue;
      for (const c of canh) if (than.includes(c)) { canh.add(ten); doi = true; break; }
    }
  }
  return canh;
}

function khoiDuongDan(ma) {
  const re = /app\.(get|post|put|delete|patch)\s*\(\s*(['"`])(\/[^'"`]+)\2/g;
  const moc = [];
  let m;
  while ((m = re.exec(ma))) moc.push({ i: m.index, method: m[1].toUpperCase(), duong: m[3] });
  return moc.map((x, k) => ({ ...x, than: ma.slice(x.i, k + 1 < moc.length ? moc[k + 1].i : ma.length) }));
}

// LỚP ĐỠ CỦA TRANG ĐƠN LÀ NGOẠI LỆ HỢP LỆ — và chỉ đúng nó.
//
// `server.js` trả `public/index.html` cho mọi đường không phải `/api/`. Tệp ấy
// nằm trong kho mã, ai cũng tải được, không có gì của một đứa trẻ trong đó.
// Ngoại lệ khoanh theo NỘI DUNG lệnh gọi (trả đúng index.html của thư mục
// public), không khoanh theo tên tệp — khoanh theo tên tệp thì ngày mai thêm
// một `sendFile` khác vào `server.js` là lọt luôn.
function laLopDoTrangDon(goi) {
  return /['"`]public['"`]/.test(goi) && /index\.html/.test(goi);
}

// Trả về { tong, quen[] } — tách ra để phép thử ngược gọi lại trên mã bịa.
function quetSendFile(danhSach, doc) {
  let tong = 0;
  const quen = [];
  for (const tep of danhSach) {
    const ma = doc(tep);
    if (!ma.includes('sendFile')) continue;
    const canh = boCanhCuaTep(ma);
    const khoi = khoiDuongDan(ma);
    const reS = /res\.sendFile\s*\(([^;]*)\)/g;
    let m;
    while ((m = reS.exec(ma))) {
      if (laLopDoTrangDon(m[1])) continue;
      tong++;
      const k = [...khoi].reverse().find(x => x.i < m.index);
      const than = k ? k.than : ma;
      let co = false;
      for (const c of canh) if (than.includes(c)) { co = true; break; }
      if (!co) quen.push(`${tep}  ${k ? `${k.method} ${k.duong}` : '(ngoài mọi đường dẫn)'}`);
    }
  }
  return { tong, quen };
}

console.log('\n[3] Mọi res.sendFile trả tệp đều có canh quyền trong cùng thân');
{
  const { tong, quen } = quetSendFile(TEP_MAY_CHU, docTep);
  check('không đường trả tệp nào quên hỏi quyền', quen.length === 0, quen.join(' | '));

  // ĐỐI CHỨNG: con số trên chỉ có nghĩa khi bộ quét thật sự tìm được các đường
  // trả ảnh đang có (Điểm danh, Album, Ghi nhanh, Đón trả, Cambridge, Hành trình).
  check('đối chứng — bộ quét tìm thấy đủ các đường trả ảnh đang có',
    tong >= 6, `${tong} đường`);

  // PHÉP THỬ NGƯỢC: một đường trả tệp mà không hỏi quyền một lần nào.
  const biaXau = `
    app.get('/api/thu/anh/:file', (req, res) => {
      const duong = uploads.pathOf(String(req.params.file || ''));
      res.sendFile(duong);
    });`;
  const rXau = quetSendFile(['bia'], () => biaXau);
  check('PHÉP THỬ NGƯỢC — bắt được đường trả tệp không hỏi quyền',
    rXau.quen.length === 1, JSON.stringify(rXau));

  const biaTot = `
    app.get('/api/thu/anh/:file', (req, res) => {
      if (!db.canAccessStudent(req.user, chu.studentId)) return res.status(403).json({ error: 'x' });
      res.sendFile(uploads.pathOf(String(req.params.file || '')));
    });`;
  check('và KHÔNG bắt nhầm đường có hỏi quyền',
    quetSendFile(['bia'], () => biaTot).quen.length === 0, '');

  // Và lớp đỡ trang đơn vẫn được miễn — nhưng chỉ đúng nó.
  check('lớp đỡ trang đơn được miễn đúng nghĩa',
    laLopDoTrangDon("path.join(__dirname, 'public', 'index.html')")
    && !laLopDoTrangDon("uploads.pathOf(file)"), 'ngoại lệ khoanh sai');
}

tongKet();
