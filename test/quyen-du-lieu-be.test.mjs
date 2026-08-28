// Bài canh: MỌI ĐƯỜNG API ĐỌC DỮ LIỆU CỦA BÉ PHẢI ĐI QUA MỘT HÀM CANH QUYỀN.
//
// Chạy bằng:  npm run test:quyen-du-lieu-be
//
// VÌ SAO CÓ BÀI NÀY
//
// `CLAUDE.md` quy định: *"Mọi đường dẫn mới đọc dữ liệu của bé phải gọi
// `db.canAccessStudent(req.user, studentId)` hoặc `db.canAccessClass(...)`"*.
//
// Trước bài này, quy định đó chỉ được máy canh cho ĐÚNG MỘT TỆP —
// `test/co-so-quan-tri.test.mjs` mục [7] đọc `routes/admin.js`. Còn 21 tệp
// khác trong `routes/` và 8 tệp `modules/*/routes.js` thì không ai soi. Mà app
// 2 gần như mỗi tuần thêm một phân hệ mới, và hai lỗ quyền đã tìm được
// (đường chống trùng mã của Ghi nhanh; ảnh Cambridge không qua luật ảnh nhóm)
// đều đúng loại này: tìm ra bằng mắt người, và tìm ra muộn.
//
// Dữ liệu ở đây là trẻ 12 tháng – 6 tuổi, ảnh khuôn mặt, hồ sơ sức khoẻ —
// nhóm nhạy cảm theo Nghị định 13/2023. Một đường quên canh là một nhà đọc
// được hồ sơ con nhà khác.
//
// CÁCH NÓ LÀM VIỆC
//
// Bài kiểm thử theo tình huống chỉ bắt được thứ ta nghĩ ra để thử. Bài này đọc
// thẳng mã nguồn, nên nó bắt được cả đường mới thêm ngày mai.
//
//   1. Gom mọi tệp `routes/*.js` và `modules/*/routes.js`.
//   2. Cắt từng tệp thành khối theo `app.get/post/put/delete/patch('/api/...')`.
//   3. Khối nào có nhắc `studentId` hoặc `classId` thì PHẢI nhắc tới một hàm canh.
//
// HAI KIỂU CANH ĐỀU ĐƯỢC TÍNH
//
//   (a) HỎI QUYỀN cho một mã do trình duyệt gửi lên — `db.canAccessStudent`,
//       `db.canAccessClass`.
//   (b) SUY PHẠM VI TỪ CHÍNH NGƯỜI DÙNG rồi chỉ đọc trong phạm vi đó —
//       `db.studentIdsOf(req.user)`, `lsl.lopCuCuaPhuHuynh(req.user)`,
//       `nl.nhomDangThaoTac(req.user, ...)`. Kiểu (b) còn chặt hơn kiểu (a):
//       không có mã nào của trình duyệt đi vào câu truy vấn cả.
//
// VÀ HÀM CANH GỌI QUA MỘT LỚP BỌC CŨNG ĐƯỢC TÍNH
//
// `routes/albums.js` không gọi thẳng `canAccessClass` trong thân đường dẫn; nó
// gọi `xemDuocAlbum(user, classId, ngay)`, và chính hàm đó mới gọi
// `canAccessClass`. Bắt đỏ chỗ đó là ép người viết bỏ lớp bọc — mà lớp bọc lại
// đang giữ đúng phần khó nhất (ảnh của nhóm đã đóng, ranh giới ngày của bé đã
// chuyển lớp). Nên bài này dò LAN theo tên hàm nội bộ trong cùng tệp cho tới
// khi không lan thêm được nữa.
// BÀI NÀY BẮT ĐƯỢC GÌ, VÀ KHÔNG BẮT ĐƯỢC GÌ
//
// Bắt được: một đường dẫn MỚI đọc dữ liệu của bé mà quên hẳn phần hỏi quyền —
// đúng loại lỗi mà một phân hệ viết vội hay mắc. Đã thử ngược trên mã thật: bỏ
// dòng `canAccessStudent` khỏi `GET /api/attendance` là mục [2] đỏ ngay.
//
// KHÔNG bắt được: một đường có NHIỀU nhánh mà chỉ MỘT nhánh mất chốt. Bộ canh
// hỏi ở mức "thân đường dẫn này có nhắc tới hàm canh nào không", nên nếu nhánh
// khác trong cùng đường vẫn còn gọi thì nó vẫn xanh. Ví dụ thật: bỏ chốt
// `canAccessStudent` khỏi `GET /api/hanhtrinh` không làm bài này đỏ, vì thân
// đường đó còn một chỗ gọi `canAccessClass` cho việc khác.
//
// Nói ra chỗ hở này thay vì để người sau tưởng bộ canh kín: phần đó vẫn phải
// dựa vào các bài kiểm thử theo tình huống trong `test/*.test.mjs` — nơi có
// tài khoản thật của nhà khác gọi vào và phải nhận 403.
//
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GOC, taoBoDem, thuMucTam } from './_chung.mjs';

const require = createRequire(import.meta.url);
process.env.DATA_DIR = thuMucTam('quyen-du-lieu-be');

const { check, tongKet } = taoBoDem();

// --- Danh sách hàm canh gốc -----------------------------------------------
// Mỗi tên ở đây phải là một HÀM CÓ THẬT, được kiểm ngay ở mục [4] bên dưới.
// Thêm tên vào danh sách này là nới lỏng bộ canh, nên phải nới có chủ ý.
const GOC_CANH = [
  // (a) hỏi quyền cho một mã cụ thể
  'canAccessStudent', 'canAccessClass', 'isTeacherOfClass', 'phamViCoSo',
  // (b) suy phạm vi từ chính người dùng
  'classIdsOf', 'studentsOf', 'studentIdsOf',
  'lopCuCuaPhuHuynh', 'xemDuocNoiDungLopCu',
  'nhomDangThaoTac', 'nhomCuaCo',
];

// --- Những đường CỐ Ý không canh, kèm lý do -------------------------------
// Danh sách này là chỗ GIẢI TRÌNH, không phải chỗ giấu đường mới cho khỏi
// phiền. Hiện đang RỖNG, và mục [3] canh cho nó đừng phình ra trong im lặng.
const MIEN = {};

// --- Bộ quét ---------------------------------------------------------------
function tepCoDuongDan() {
  const ds = [];
  for (const t of fs.readdirSync(path.join(GOC, 'routes')).sort()) {
    if (t.endsWith('.js')) ds.push(path.join('routes', t));
  }
  const goc = path.join(GOC, 'modules');
  if (fs.existsSync(goc)) {
    for (const ma of fs.readdirSync(goc).sort()) {
      const p = path.join('modules', ma, 'routes.js');
      if (fs.existsSync(path.join(GOC, p))) ds.push(p);
    }
  }
  return ds;
}

// Cắt tệp thành { tên hàm nội bộ → thân hàm }.
function hamNoiBo(ma) {
  const out = {};
  const re = /(?:^|\n)\s*(?:function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\()/g;
  const moc = [];
  let m;
  while ((m = re.exec(ma))) moc.push({ ten: m[1] || m[2], i: m.index });
  for (let k = 0; k < moc.length; k++) {
    out[moc[k].ten] = ma.slice(moc[k].i, k + 1 < moc.length ? moc[k + 1].i : ma.length);
  }
  return out;
}

// Lan từ danh sách gốc sang mọi hàm nội bộ gọi tới chúng, cho tới khi hết lan.
function boCanhCuaTep(ma) {
  const noiBo = hamNoiBo(ma);
  const canh = new Set(GOC_CANH);
  let doi = true;
  while (doi) {
    doi = false;
    for (const [ten, than] of Object.entries(noiBo)) {
      if (canh.has(ten)) continue;
      for (const c of canh) {
        if (than.includes(c)) { canh.add(ten); doi = true; break; }
      }
    }
  }
  return canh;
}

function khoiDuongDan(ma) {
  const re = /app\.(get|post|put|delete|patch)\((['"`])(\/api\/[^'"`]+)\2/g;
  const moc = [];
  let m;
  while ((m = re.exec(ma))) moc.push({ i: m.index, method: m[1].toUpperCase(), duong: m[3] });
  return moc.map((x, k) => ({
    ...x,
    than: ma.slice(x.i, k + 1 < moc.length ? moc[k + 1].i : ma.length),
  }));
}

// Trả về { tong, quen[] }. Tách hẳn ra để phép thử ngược gọi lại được trên mã bịa.
function quet(danhSach, docTep) {
  let tong = 0;
  const quen = [];
  for (const tep of danhSach) {
    const ma = docTep(tep);
    const canh = boCanhCuaTep(ma);
    for (const k of khoiDuongDan(ma)) {
      if (!/studentId|classId/.test(k.than)) continue;
      tong++;
      const ten = `${k.method} ${k.duong}`;
      if (MIEN[ten]) continue;
      let co = false;
      for (const c of canh) if (k.than.includes(c)) { co = true; break; }
      if (!co) quen.push(`${tep}  ${ten}`);
    }
  }
  return { tong, quen };
}

// ===========================================================================
console.log('\n[1] Bộ quét có thật sự nhìn thấy mã nguồn');
{
  const ds = tepCoDuongDan();
  check('tìm thấy đủ tệp có đường dẫn API', ds.length >= 25, ds.length);
  check('có cả tệp lõi lẫn tệp của phân hệ cắm thêm',
    ds.some(t => t.startsWith('routes/')) && ds.some(t => t.startsWith('modules/')),
    ds.filter(t => t.startsWith('modules/')).length);

  const doc = (t) => fs.readFileSync(path.join(GOC, t), 'utf8');
  const { tong } = quet(ds, doc);
  check('tìm thấy nhiều đường có đụng tới mã bé / mã nhóm', tong >= 80, tong);
}

// ===========================================================================
console.log('\n[2] KHÔNG ĐƯỜNG NÀO ĐỌC DỮ LIỆU CỦA BÉ MÀ QUÊN CANH QUYỀN');
{
  const ds = tepCoDuongDan();
  const doc = (t) => fs.readFileSync(path.join(GOC, t), 'utf8');
  const { quen } = quet(ds, doc);
  check('KHÔNG ĐƯỜNG NÀO QUÊN CANH QUYỀN', quen.length === 0,
    quen.length
      ? `${quen.join('\n     ')}\n\n  Đường đọc dữ liệu của bé phải gọi db.canAccessStudent / db.canAccessClass,\n` +
        '  hoặc chỉ đọc trong phạm vi suy ra từ chính req.user (db.studentIdsOf...).'
      : undefined);
}

// ===========================================================================
console.log('\n[3] Danh sách ngoại lệ không được phình ra trong im lặng');
{
  check('danh sách đường được miễn canh đang RỖNG', Object.keys(MIEN).length === 0,
    Object.keys(MIEN));

  // Nếu mai này có đường được miễn thật, nó phải kèm lý do viết ra thành chữ,
  // và phải là một đường CÓ THẬT — để danh sách không mục ruỗng theo thời gian.
  const ds = tepCoDuongDan();
  const doc = (t) => fs.readFileSync(path.join(GOC, t), 'utf8');
  const tenThat = new Set();
  for (const tep of ds) for (const k of khoiDuongDan(doc(tep))) tenThat.add(`${k.method} ${k.duong}`);
  check('mọi đường được miễn đều có lý do viết ra thành chữ',
    Object.values(MIEN).every(v => typeof v === 'string' && v.trim().length >= 20), MIEN);
  check('mọi đường được miễn đều còn tồn tại thật',
    Object.keys(MIEN).every(t => tenThat.has(t)),
    Object.keys(MIEN).filter(t => !tenThat.has(t)));
}

// ===========================================================================
console.log('\n[4] Mỗi tên trong danh sách hàm canh là một HÀM CÓ THẬT');
{
  // Một tên viết sai không làm bộ canh xanh oan được (thân đường dẫn phải chứa
  // đúng chuỗi đó mới qua). Nhưng một tên đã bị đổi hoặc bị bỏ thì để lại rác,
  // và người sau đọc danh sách sẽ tưởng nó đang canh thứ gì đó.
  const db = require(path.join(GOC, 'lib', 'db.js'));
  const lsl = require(path.join(GOC, 'lib', 'lich-su-lop.js'));
  const nl = require(path.join(GOC, 'lib', 'nhom-lop.js'));
  const co = (ten) => [db, lsl, nl].some(m => typeof m[ten] === 'function');
  const thieu = GOC_CANH.filter(t => !co(t));
  check('mọi hàm canh trong danh sách đều còn tồn tại', thieu.length === 0, thieu);

  check('danh sách hàm canh vẫn đúng 11 tên — thêm tên là NỚI LỎNG bộ canh',
    GOC_CANH.length === 11, GOC_CANH.length);

  // Một tên quá ngắn hoặc quá phổ thông (ví dụ 'req', 'db') sẽ khớp gần như mọi
  // thân hàm và làm bộ canh xanh hết. Chặn ngay ở đây.
  check('không tên nào ngắn tới mức khớp bừa', GOC_CANH.every(t => t.length >= 9),
    GOC_CANH.filter(t => t.length < 9));
}

// ===========================================================================
console.log('\n[5] PHÉP THỬ NGƯỢC — bộ canh này có bắt được thật không');
{
  // Chạy đúng hàm quét ở trên trên mã BỊA RA, không đụng tới kho mã thật.
  const MA = {
    'gia/quen-canh.js': `
      module.exports = (app, { db }) => {
        app.get('/api/gia/be', (req, res) => {
          const studentId = req.query.studentId;
          res.json(db.findStudent(studentId));
        });
      };`,
    'gia/co-canh-thang.js': `
      module.exports = (app, { db }) => {
        app.get('/api/gia/be2', (req, res) => {
          const studentId = req.query.studentId;
          if (!db.canAccessStudent(req.user, studentId)) return res.status(403).json({});
          res.json(db.findStudent(studentId));
        });
      };`,
    'gia/co-canh-qua-lop-boc.js': `
      module.exports = (app, { db }) => {
        function xemDuoc(user, classId) { return db.canAccessClass(user, classId); }
        app.get('/api/gia/nhom', (req, res) => {
          const classId = req.query.classId;
          if (!xemDuoc(req.user, classId)) return res.status(403).json({});
          res.json([]);
        });
      };`,
    'gia/khong-dung-toi-be.js': `
      module.exports = (app) => {
        app.get('/api/gia/gio', (req, res) => res.json({ gio: 1 }));
      };`,
  };
  const ds = Object.keys(MA);
  const { tong, quen } = quet(ds, (t) => MA[t]);

  check('BẮT ĐƯỢC đường quên canh', quen.length === 1 && quen[0].includes('quen-canh.js'), quen);
  check('KHÔNG bắt nhầm đường gọi thẳng db.canAccessStudent',
    !quen.some(x => x.includes('co-canh-thang')), quen);
  check('KHÔNG bắt nhầm đường canh QUA MỘT LỚP BỌC nội bộ',
    !quen.some(x => x.includes('qua-lop-boc')), quen);
  check('bỏ qua đường không đụng tới bé hay nhóm nào', tong === 3, tong);
}

tongKet();
