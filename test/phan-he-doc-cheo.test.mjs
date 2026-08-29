// Bài canh: PHÂN HỆ ĐỌC BẢNG CỦA PHÂN HỆ KHÁC THÌ PHẢI HỎI CÔNG TẮC TRƯỚC.
//
// Chạy bằng:  npm run test:doc-cheo
//
// VÌ SAO CÓ BÀI NÀY — BA LẦN CÙNG MỘT CHỖ
//
// Tắt một phân hệ thì máy chủ chặn ĐƯỜNG DẪN API của nó. Nhưng khi một phân hệ
// khác đọc THẲNG bảng của nó thì đường đi ấy không qua HTTP, nên không có gì để
// chặn. Hậu quả nhìn từ ngoài rất khó lần ra: trên màn Quản trị thì phân hệ kia
// đang tắt hẳn, mà dữ liệu của nó vẫn chảy ra ở một màn khác.
//
//   • Y1  — Nhật ký ngày đọc bảng `menus` mà không hỏi Thực đơn.
//   • N24 — Hành trình đọc bảng ghi nhanh mà không hỏi Ghi nhanh.
//   • Đ46 — Báo ăn đọc `attendance`, `leave_requests`, `leave_refund` mà không
//           hỏi Điểm danh và Xin phép. Nhà trường tắt Điểm danh xong, màn báo
//           ăn vẫn trừ suất theo một quyển sổ không còn ai cập nhật, và BẾP NẤU
//           THIẾU.
//
// Ba lần đều là cùng một bước bị quên, và cả ba lần đều do người đọc mã phát
// hiện chứ không phải do máy. Bài này biến bước đó thành thứ máy canh được.
//
// CÁCH ĐO
//
// Với mỗi `modules/<mã>/routes.js`: rút ra mọi tên bảng nó đụng tới, ánh xạ tên
// bảng về phân hệ sở hữu, rồi đòi — với mỗi phân hệ KHÁC mà nó đọc — phải có
// `dangBat('<mã đó>')` trong cùng tệp.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const require = createRequire(import.meta.url);
const mods = require(path.join(GOC, 'lib', 'modules.js'));

// -- Bảng của PHẦN LÕI thuộc về phân hệ nào ---------------------------------
//
// Phần lõi không khai tên bảng ở đâu cả (chỉ khai `api`), nên chỗ này buộc phải
// viết tay. Bù lại, mục [1] canh cho mọi mã ở đây đều là mã có thật: đổi tên
// một phân hệ lõi là bài đỏ ngay chứ không im lặng bỏ qua.
//
// CHỈ LIỆT KÊ BẢNG CỦA PHÂN HỆ TẮT ĐƯỢC. Bảng `students`, `classes`, `users`…
// thuộc phần luôn có mặt, không có công tắc nào để hỏi.
const BANG_LOI = {
  attendance: 'diemdanh',
  leave_requests: 'xinphep',
  leave_refund: 'xinphep',
  menus: 'thucdon',
  timetable: 'tkb',
};

const thuMucPhanHe = fs.readdirSync(path.join(GOC, 'modules'), { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(t => fs.existsSync(path.join(GOC, 'modules', t, 'routes.js')));

// Mã của mọi phân hệ cắm thêm, đọc từ đĩa chứ không viết tay.
const MA_PHAN_HE = thuMucPhanHe.map((t) => {
  try { return JSON.parse(fs.readFileSync(path.join(GOC, 'modules', t, 'module.json'), 'utf8')).key || t; }
  catch (_) { return t; }
});

// Tên bảng → phân hệ sở hữu. Bảng của phân hệ cắm thêm suy ra được từ tiền tố,
// nên phần này KHÔNG phải viết tay và tự lớn theo số phân hệ.
function chuCuaBang(ten) {
  if (BANG_LOI[ten]) return BANG_LOI[ten];
  for (const ma of MA_PHAN_HE) {
    if (ten === ma || ten.startsWith(`${ma}_`)) return ma;
  }
  return null;
}

// Mọi tên bảng một tệp đụng tới. Hai đường: tham số đầu của db.all/first/…,
// và tên đứng sau FROM/JOIN/INTO/UPDATE trong chuỗi SQL.
function bangTrongTep(ma) {
  const ra = new Set();
  for (const m of ma.matchAll(/\bdb\.(?:all|first|insert|update|del|delete|upsert|count)\(\s*'([a-z0-9_]+)'/gi)) {
    ra.add(m[1]);
  }
  for (const m of ma.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z][a-z0-9_]*)/gi)) {
    ra.add(m[1].toLowerCase());
  }
  return ra;
}

// ===========================================================================
console.log('\n[1] Bảng ánh xạ phải nói về những phân hệ CÓ THẬT');
{
  const tatCa = new Set((mods.tatCa ? mods.tatCa() : []).map(m => m.key));
  check('đọc được danh sách phân hệ từ lib/modules.js', tatCa.size > 5, tatCa.size);
  const la = Object.values(BANG_LOI).filter(k => !tatCa.has(k));
  check('mọi mã trong bảng ánh xạ đều là phân hệ có thật', la.length === 0, la);
  check('tìm thấy đủ phân hệ cắm thêm để soi', MA_PHAN_HE.length >= 8, MA_PHAN_HE);
}

// ===========================================================================
console.log('\n[2] ĐỌC BẢNG CỦA PHÂN HỆ KHÁC THÌ PHẢI HỎI CÔNG TẮC');
let soCapDaSoi = 0;
{
  for (const thuMuc of thuMucPhanHe) {
    const tep = path.join(GOC, 'modules', thuMuc, 'routes.js');
    const ma = fs.readFileSync(tep, 'utf8');
    const toi = (() => {
      try { return JSON.parse(fs.readFileSync(path.join(GOC, 'modules', thuMuc, 'module.json'), 'utf8')).key || thuMuc; }
      catch (_) { return thuMuc; }
    })();

    const chuKhac = new Set();
    for (const bang of bangTrongTep(ma)) {
      const chu = chuCuaBang(bang);
      if (chu && chu !== toi) chuKhac.add(chu);
    }
    if (!chuKhac.size) continue;

    for (const chu of [...chuKhac].sort()) {
      soCapDaSoi += 1;
      const hoi = new RegExp(`dangBat\\(\\s*['"]${chu}['"]`).test(ma);
      check(`${toi} đọc bảng của ${chu} → phải gọi dangBat('${chu}')`, hoi,
        `Thêm \`if (!modules.dangBat('${chu}')) …\` trước câu truy vấn trong `
        + `modules/${thuMuc}/routes.js. Xem modules/README.md, mục "Đọc bảng của `
        + `phân hệ KHÁC thì phải hỏi công tắc trước".`);
    }
  }

  // KHÔNG DỰNG ĐƯỢC TÌNH HUỐNG THÌ TÍNH LÀ ĐỎ.
  //
  // Không cặp nào để soi nghĩa là bộ rút tên bảng đã hỏng — và khi đó mục này
  // sẽ xanh vĩnh viễn mà không kiểm gì cả.
  check('CÓ THẬT những cặp đọc chéo để soi, không phải bài chạy trong khoảng không',
    soCapDaSoi >= 3, soCapDaSoi);
}

// ===========================================================================
console.log('\n[3] PHÉP THỬ NGƯỢC — bộ rút tên bảng có bắt được thật không');
{
  const thu = (ma) => [...bangTrongTep(ma)];
  check('bắt được tham số đầu của db.all',
    thu("db.all('leave_requests', 'SELECT 1')").includes('leave_requests'));
  check('bắt được tên sau FROM trong chuỗi SQL',
    thu('`SELECT * FROM attendance WHERE date = ?`').includes('attendance'));
  check('bắt được tên sau JOIN',
    thu('`FROM leave_requests l JOIN leave_refund r ON r.leaveId = l.id`').includes('leave_refund'));
  check('KHÔNG bắt nhầm chữ thường trong câu văn',
    !thu('// đọc thẳng bảng của phân hệ khác thì phải hỏi').includes('bảng'));

  check('ánh xạ đúng bảng lõi về phân hệ chủ', chuCuaBang('menus') === 'thucdon');
  check('ánh xạ đúng bảng của phân hệ cắm thêm theo tiền tố',
    chuCuaBang('thuchup_ghinhan') === 'thuchup');
  check('bảng luôn có mặt thì KHÔNG có chủ nào để hỏi', chuCuaBang('students') === null);

  // Dựng một tệp giả đọc chéo mà quên hỏi — bộ canh phải nhìn ra.
  const giaThieu = "module.exports = (app, { db }) => { db.all('attendance', 'SELECT 1'); };";
  const giaDu = "module.exports = (app, { db, modules }) => {"
    + " if (!modules.dangBat('diemdanh')) return; db.all('attendance', 'SELECT 1'); };";
  const doc = (src) => [...bangTrongTep(src)].map(chuCuaBang).filter(c => c && c !== 'gia');
  check('bản GIẢ thiếu chốt: nhìn ra nó đọc bảng của diemdanh', doc(giaThieu).includes('diemdanh'));
  check('và nhìn ra nó KHÔNG hỏi công tắc', !/dangBat\(\s*'diemdanh'/.test(giaThieu));
  check('bản GIẢ đủ chốt thì hỏi đúng công tắc', /dangBat\(\s*'diemdanh'/.test(giaDu));
}

// ===========================================================================
console.log('\n[4] modules/README.md phải DẠY đúng bước đó');
{
  // Bộ canh bắt được lỗi, nhưng người viết phân hệ mới đọc README trước. Hai
  // thứ phải đi cùng nhau, nếu không thì lần sau vẫn quên rồi mới bị bắt.
  const rm = fs.readFileSync(path.join(GOC, 'modules', 'README.md'), 'utf8');
  check('ví dụ routes.js nhận đủ { db, modules }',
    /module\.exports = \(app, \{ db, modules \}\)/.test(rm));
  check('README có mục dạy hỏi công tắc trước khi đọc chéo',
    /dangBat\(/.test(rm) && /không qua HTTP/i.test(rm));
  check('và nói rõ đường API mới mặc định bị từ chối với Cấp 2',
    /danh sách cho phép/i.test(rm) && /CHUC_VU|chức vụ/.test(rm));
  check('quy trình thêm phân hệ nhắc bước viết tệp kiểm thử riêng',
    /test\/<mã>\.test\.mjs/.test(rm));
}

tongKet();
