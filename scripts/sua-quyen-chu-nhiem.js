#!/usr/bin/env node
// Rà và dọn quan hệ "giáo viên chủ nhiệm ↔ lớp" bị ghi lệch.
//
//   DATA_DIR=/var/lib/casa-mamnon npm run sua-quyen-chu-nhiem          # chỉ xem, không sửa
//   DATA_DIR=/var/lib/casa-mamnon npm run sua-quyen-chu-nhiem -- --sua # sửa thật
//
// VÌ SAO CÓ SCRIPT NÀY
//
// Quan hệ chủ nhiệm được lưu ở hai chỗ: `classes.teacherId` và `users.classId`.
// Trước bản vá, các đường đổi chủ nhiệm chỉ ghi một chiều, nên có thể còn tồn
// đọng hai kiểu lệch:
//
//   1. Giáo viên còn gắn với một lớp mà lớp đó đã có chủ nhiệm khác — cô cũ vẫn
//      đọc và ghi được hồ sơ cả lớp cũ. Đây là kiểu nguy hiểm.
//   2. Lớp ghi tên một cô, nhưng cô không hề gắn với lớp — cô đăng nhập vào thấy
//      "Sĩ số 0" dù màn hình quản trị hiện đúng tên.
//
// Bản vá đã chặn không cho sinh thêm lệch mới. Script này dọn phần đã lỡ sinh ra.
// Mặc định CHỈ XEM; phải thêm --sua mới ghi. Nên chạy `npm run backup` trước khi
// thêm --sua.
//
// TỪ G0.4: QUYỀN ĐI THEO BẢNG `class_teachers`
//
// Quyền đọc hồ sơ trẻ KHÔNG còn đi theo `users.classId` nữa mà đi theo bảng
// `class_teachers` (xem `lib/db.js`, mục "Cô phụ trách nhóm lớp"). Hai cột cũ ở
// lại làm GƯƠNG, và phần chuyển đổi lúc khởi động dựng lại bảng mới từ chúng.
//
// Vì vậy script này rà bốn kiểu lệch:
//
//   Kiểu 1 + 2  hai cột đời cũ lệch nhau            (cái gương)
//   Kiểu 3      phân công có ở hai cột cũ nhưng thiếu trong `class_teachers`
//   Kiểu 4      nhóm đang mở mà không còn cô nào     (chỉ BÁO, không tự đoán)
//
// Kiểu 4 cố ý không tự sửa: chọn cô nào phụ trách nhóm nào là việc của nhà
// trường, máy đoán hộ là sai người mà không ai hay.
//
// MỘT ĐIỀU PHẢI BIẾT VỀ "CHỈ XEM"
//
// Chế độ mặc định KHÔNG hoàn toàn chỉ đọc, và không thể làm cho nó chỉ đọc.
// Nạp `lib/db.js` — việc mà mọi đường vào đều làm — là chạy
// `backfillClassTeachers()`, tức dựng lại `class_teachers` từ hai cột cũ. Nên
// kiểu 3 đã được vá NGAY LÚC script này khởi động, trước cả khi nó kịp nhìn.
//
// Vì thế script chụp lại bảng quyền bằng một kết nối riêng TRƯỚC khi nạp
// `lib/db.js`, để còn báo cho người vận hành biết vừa có gì được dựng lại. Máy
// chủ đang chạy nhìn thấy thay đổi đó ngay lập tức (chung một tệp SQLite), KHÔNG
// phải khởi động lại.
'use strict';

// Dòng đầu tiên: thiếu DATA_DIR trên máy chủ thật thì dừng ngay (Đ234b).
require('./canh-thu-muc-du-lieu')();

// Chụp bảng quyền TRƯỚC khi nạp lib/db.js — xem ghi chú "CHỈ XEM" ở trên. Mở
// bằng kết nối riêng, chỉ đọc, và hỏng thì bỏ qua: đây là phần để BÁO CÁO, không
// được phép làm script chết trước khi nó kịp dọn.
const path = require('path');
const truocKhiNap = (() => {
  try {
    const Database = require('better-sqlite3');
    const thuMuc = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.join(__dirname, '..', 'data');
    const con = new Database(path.join(thuMuc, 'school.db'), { readonly: true, fileMustExist: true });
    const ds = con.prepare('SELECT classId, teacherId FROM class_teachers').all();
    con.close();
    return new Set(ds.map(r => `${r.classId}|${r.teacherId}`));
  } catch (_) { return null; }
})();

const db = require('../lib/db');

const SUA = process.argv.includes('--sua');

const giaoVien = db.all('users', `SELECT id, name, title, classId FROM users WHERE role = 'teacher'`);
// PHẢI SELECT cả `active`: phía dưới có phép lọc `c.active !== false` — thiếu
// cột này thì active là undefined, phép lọc luôn đúng, và mọi nhóm ĐÃ ĐÓNG của
// các năm học cũ đều bị báo nhầm là "nhóm đang mở thiếu cô".
const lopHoc = db.all('classes', 'SELECT id, name, teacherId, active FROM classes');
const lopTheoId = new Map(lopHoc.map(c => [c.id, c]));
const tenGv = (id) => {
  const t = giaoVien.find(g => g.id === id);
  return t ? `${t.title} ${t.name}` : id;
};

// Kiểu 1: giáo viên gắn với lớp mà lớp đó không nhận cô làm chủ nhiệm.
const thuaQuyen = giaoVien.filter(t => {
  if (!t.classId) return false;
  const c = lopTheoId.get(t.classId);
  return !c || c.teacherId !== t.id;
});

// Kiểu 2: lớp ghi tên một cô nhưng cô không gắn với lớp đó.
const thieuGan = lopHoc.filter(c => {
  if (!c.teacherId) return false;
  const t = giaoVien.find(g => g.id === c.teacherId);
  return !t || t.classId !== c.id;
});

// Kiểu 3: hai cột cũ có ghi phân công, nhưng bảng quyền `class_teachers` chưa có.
// Đây mới là kiểu làm cô mất nhóm THẬT SỰ sau G0.4.
const capTuCotCu = [];
for (const c of lopHoc) {
  if (c.teacherId && giaoVien.some(g => g.id === c.teacherId)) capTuCotCu.push([c.id, c.teacherId]);
}
for (const t of giaoVien) {
  if (t.classId && lopTheoId.has(t.classId)) capTuCotCu.push([t.classId, t.id]);
}
// So với bản chụp TRƯỚC khi nạp: đây là những phân công vừa được dựng lại, chứ
// không phải những phân công còn thiếu — lúc này chúng đã có đủ rồi.
const vuaDungLai = truocKhiNap === null ? [] : capTuCotCu
  .filter(([cid, tid], i, ds) => ds.findIndex(x => x[0] === cid && x[1] === tid) === i)
  .filter(([cid, tid]) => !truocKhiNap.has(`${cid}|${tid}`));

// Kiểu 4: nhóm đang mở mà không còn cô nào phụ trách. Chỉ báo, không tự sửa.
const nhomTrong = lopHoc.filter(c => c.active !== false && !db.teachersOfClass(c.id).length);

console.log(`\nRÀ PHÂN CÔNG CÔ PHỤ TRÁCH NHÓM — ${db.DATA_DIR}`);
console.log(`${giaoVien.length} cô, ${lopHoc.length} nhóm lớp\n`);

if (!thuaQuyen.length && !thieuGan.length && !vuaDungLai.length && !nhomTrong.length) {
  console.log('  ✓ Không có chỗ nào lệch. Không cần làm gì.\n');
  db.close();
  process.exit(0);
}

if (thuaQuyen.length) {
  console.log(`  ✗ ${thuaQuyen.length} cô đang GIỮ THỪA QUYỀN với nhóm không còn là của cô:`);
  for (const t of thuaQuyen) {
    const c = lopTheoId.get(t.classId);
    const chuMoi = c && c.teacherId ? tenGv(c.teacherId) : '(nhóm chưa có cô phụ trách)';
    console.log(`      ${t.title} ${t.name} — còn gắn với ${c ? c.name : t.classId}, `
      + `mà nhóm đó nay là của ${chuMoi}`);
  }
  console.log('      → Sẽ gỡ gắn kết của các cô này Ở CẢ HAI NƠI: hai cột đời cũ VÀ bảng');
  console.log('        quyền `class_teachers`. Gỡ mỗi cột cũ là chưa thu hồi được gì —');
  console.log('        từ G0.4 quyền đọc hồ sơ trẻ đi theo bảng quyền.');
  console.log('        (Không đụng tới tài khoản hay dữ liệu của nhóm.)\n');
}

if (thieuGan.length) {
  console.log(`  ✗ ${thieuGan.length} nhóm ghi tên cô nhưng cô KHÔNG nhận được nhóm:`);
  for (const c of thieuGan) {
    console.log(`      ${c.name} — ghi là của ${tenGv(c.teacherId)}, nhưng cô đăng nhập vào thấy "Sĩ số 0"`);
  }
  console.log('      → Sẽ gắn cô vào đúng nhóm mà màn hình quản trị đang hiện.\n');
}

if (vuaDungLai.length) {
  console.log(`  ✓ ${vuaDungLai.length} phân công vừa được DỰNG LẠI trong bảng quyền:`);
  for (const [cid, tid] of vuaDungLai) {
    const c = lopTheoId.get(cid);
    console.log(`      ${tenGv(tid)} — ${c ? c.name : cid}: trước đó màn hình quản trị hiện đúng, `
      + 'nhưng cô đăng nhập vào thấy nhóm trống');
  }
  console.log('      → Đã có hiệu lực NGAY, máy chủ đang chạy không cần khởi động lại.\n');
}

if (nhomTrong.length) {
  console.log(`  ⚠ ${nhomTrong.length} nhóm đang mở mà KHÔNG còn cô nào phụ trách:`);
  for (const c of nhomTrong) console.log(`      ${c.name}`);
  console.log('      → KHÔNG tự sửa: chọn cô nào cho nhóm nào là việc của nhà trường.');
  console.log('        Vào Quản trị → Tổng quan, bấm Sửa ở dòng nhóm đó.\n');
}

if (!SUA) {
  console.log(vuaDungLai.length
    ? 'Đang ở chế độ CHỈ XEM. Phần bảng quyền ở trên ĐÃ được dựng lại (xem ghi chú'
      + '\n"CHỈ XEM" đầu tệp); hai cột đời cũ thì chưa đụng tới.'
    : 'Đang ở chế độ CHỈ XEM, chưa đụng vào hai cột đời cũ.');
  console.log('Muốn dọn nốt: chạy `npm run backup` trước, rồi thêm -- --sua vào cuối lệnh.\n');
  db.close();
  process.exit(1);
}

db.tx(() => {
  for (const t of thuaQuyen) {
    // THU HỒI THẬT, không chỉ dọn cái gương.
    //
    // Trước G0.4 quyền nằm ở `users.classId`, nên xoá cột đó là thu hồi xong.
    // Từ G0.4 quyền nằm ở `class_teachers`, và phần chuyển đổi lúc khởi động đã
    // kịp dựng dòng đó lên từ chính cái gương lệch này. Chỉ xoá cột cũ thì cô
    // vẫn đọc được hồ sơ trẻ của nhóm không còn là của cô — đúng cái lỗ hổng mà
    // script này sinh ra để đóng.
    //
    // Vì sao dám tự gỡ ở đây, trong khi kiểu 4 thì không dám tự gán: một cô được
    // xếp làm cô PHỤ có chủ ý thì `users.classId` của cô KHÔNG trỏ vào nhóm đó
    // (xem `mirrorLegacyHomeroom` trong lib/db.js). Cặp "users.classId trỏ vào
    // nhóm mà cô không phải cô chính" vì vậy là dấu vết của cái gương lệch, chứ
    // không phải một phân công có chủ ý. Và với quyền thì gỡ nhầm còn sửa lại
    // được, để sót thì không ai biết.
    const nhomCu = t.classId;
    db.update('users', t.id, { classId: null });
    if (nhomCu && db.isTeacherOfClass(t.id, nhomCu)) db.removeClassTeacher(nhomCu, t.id);
  }
  for (const c of thieuGan) {
    // Gỡ những cô khác đang gắn nhầm vào lớp này trước, rồi mới gắn đúng cô.
    for (const t of giaoVien) {
      if (t.classId === c.id && t.id !== c.teacherId) db.update('users', t.id, { classId: null });
    }
    if (giaoVien.some(g => g.id === c.teacherId)) db.update('users', c.teacherId, { classId: c.id });
  }
});

// Vừa dọn xong hai cột cũ, nên chạy lại phần chuyển đổi để bảng quyền bám theo
// cái gương VỪA dọn. Đúng hàm mà máy chủ chạy lúc khởi động — không có hai bản
// logic chạy lệch nhau.
db.backfillClassTeachers();

db.audit(null, 'sua-quyen-chu-nhiem', null, {
  goQuyen: thuaQuyen.length, ganLai: thieuGan.length, dungLaiBangQuyen: vuaDungLai.length,
});
console.log(`Đã sửa: thu hồi ${thuaQuyen.length} quyền thừa (cả hai nơi), gắn lại `
  + `${thieuGan.length} nhóm, dựng lại ${vuaDungLai.length} phân công trong bảng quyền.`);
console.log('Các cô bị gỡ nay không còn nhóm — hãy vào Quản trị phân công lại nếu cần.');
console.log('KHÔNG cần khởi động lại máy chủ: quyền có hiệu lực ngay.\n');
db.close();
