// Giờ tới lớp do cô SỬA TAY thì máy chủ nói cho màn của gia đình biết (Đ255).
//
// Chạy bằng:  node test/gio-vao-da-sua.test.mjs
//
// VÌ SAO CÓ CỜ NÀY. Từ Đ254 cô sửa được giờ con tới lớp. Cô chụp ảnh tới lớp
// bù lúc 17:00 rồi sửa giờ thành 07:45 thì màn Điểm danh của gia đình ghi
// "Giờ đến lớp 07:45", mà ngay dưới tấm ảnh vẫn còn "Cô chụp lúc 17:00" — hai
// giờ khác nhau cho cùng một buổi sáng. Chủ dự án duyệt 13/11: giờ đang ghi là
// giờ cô sửa tay thì không hiện giờ chụp của ảnh tới lớp nữa. Màn hình cần
// một cờ để biết điều ấy; bài này canh cái cờ. Phần chữ trên màn do
// `test/gio-vao-da-sua-giao-dien.test.mjs` canh.
//
// LUẬT của cờ `gioVaoDaSua` trên từng tấm ảnh tới lớp ở `GET /api/attendance/anh`:
//
//   (a) cô chưa sửa giờ → cờ tắt.
//   (b) cô sửa giờ → cờ bật, cho ĐÚNG bé ấy, ĐÚNG ngày ấy.
//   (c) giờ đang ghi không còn là giờ cô sửa (cô chấm nghỉ rồi chấm có mặt
//       lại, máy đóng giờ mới) → cờ tắt. Cô sửa lần nữa → bật lại.
//   (d) lượt sửa bị từ chối không bật cờ.
//   (e) ảnh ra về không mang cờ; các câu trả lời khác giữ nguyên hình dạng;
//       câu trả lời của chính đường sửa giờ không đổi.
//   (f) nhà khác, cô nhóm khác, người chưa đăng nhập không đọc được gì thêm.
//
// GIỜ ĐƯỢC ĐẶT THẲNG VÀO BẢNG và giờ gửi lên chọn theo "00:00" (không bao giờ
// ở tương lai) để bài cho cùng kết quả ở mọi giờ chạy.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('gio-vao-da-sua');
sinhDuLieu(DIR);
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4807), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();
const HOM_QUA = ngay.ngayCua(Date.now() - 24 * 3600 * 1000);

function csdl(viec) {
  const c = new Database(CSDL);
  try { return viec(c); } finally { c.close(); }
}
// Dòng điểm danh và hai tấm ảnh của một bé trong một ngày, đặt thẳng vào bảng.
function datNgay(studentId, ngayGhi, { checkIn, gioChup, coAnhVe = false }) {
  csdl((c) => {
    for (const bang of ['attendance', 'attendance_photo', 'attendance_anh_ve']) {
      c.prepare(`DELETE FROM ${bang} WHERE studentId = ? AND date = ?`).run(studentId, ngayGhi);
    }
    c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
               VALUES (?, ?, ?, 'present', ?, NULL, '', 't1')`)
      .run(`att_thu_${studentId}_${ngayGhi}`, studentId, ngayGhi, checkIn);
    c.prepare('INSERT INTO attendance_photo (studentId, date, file, taoLuc, byUserId) VALUES (?, ?, ?, ?, ?)')
      .run(studentId, ngayGhi, `toi_${studentId}_${ngayGhi}.jpg`, gioChup, 't1');
    if (coAnhVe) {
      c.prepare('INSERT INTO attendance_anh_ve (studentId, date, file, taoLuc, byUserId) VALUES (?, ?, ?, ?, ?)')
        .run(studentId, ngayGhi, `ve_${studentId}_${ngayGhi}.jpg`, '23:59', 't1');
    }
  });
}
const gioDangGhi = (studentId) => csdl(c =>
  c.prepare('SELECT checkIn FROM attendance WHERE studentId = ? AND date = ?').get(studentId, NGAY)?.checkIn ?? null);
const nhuNhau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const khoa = (x) => Object.keys(x || {}).sort();
const loi = (r) => String(r.data?.error || '');

const co = (await login('giaovien', '123456')).cookie;       // cô nhóm c1
const coKhac = (await login('giaovien2', '123456')).cookie;  // cô nhóm c2
const ph = (await login('phuhuynh', '123456')).cookie;       // nhà của s1
const nhaKhac = (await login('phuhuynh2', '123456')).cookie; // nhà của s3

const khoAnh = (studentId, cookie, ngayXem = NGAY) =>
  req('GET', `/api/attendance/anh?studentId=${studentId}&month=${ngayXem.slice(0, 7)}`, { cookie });
// Tấm ảnh tới lớp của một bé trong một ngày, như gia đình (hoặc cô) đọc được.
const anhToi = async (studentId, cookie, ngayXem = NGAY) =>
  ((await khoAnh(studentId, cookie, ngayXem)).data?.anh || []).find(a => a.date === ngayXem);
const suaVao = (than, cookie = co) => req('POST', '/api/attendance/gio-vao', { cookie, body: { date: NGAY, ...than } });
const cham = (studentId, status) => req('POST', '/api/attendance/mark', { cookie: co, body: { studentId, date: NGAY, status } });

// s1 (nhà `phuhuynh`): hôm nay cô chụp bù lúc 23:59 nên máy đóng giờ vào
// 23:59, có cả ảnh ra về; hôm qua có ảnh, không ai sửa giờ. s3 (nhà
// `phuhuynh2`) và s5: hôm nay có ảnh, không ai sửa giờ.
datNgay('s1', NGAY, { checkIn: '23:59', gioChup: '23:59', coAnhVe: true });
datNgay('s1', HOM_QUA, { checkIn: '07:40', gioChup: '07:40' });
datNgay('s3', NGAY, { checkIn: '00:20', gioChup: '00:20' });
datNgay('s5', NGAY, { checkIn: '00:10', gioChup: '00:10' });

// Hình dạng các câu trả lời TRƯỚC khi có lượt sửa nào, để so lại ở mục [e].
const soTruoc = await req('GET', `/api/attendance?studentId=s1&month=${NGAY.slice(0, 7)}`, { cookie: ph });
const nhomTruoc = await req('GET', `/api/attendance/class?date=${NGAY}&classId=c1`, { cookie: co });
const dongNhom = (r, id) => (r.data?.students || []).find(x => x.student.id === id);

// ===========================================================================
console.log('\n[a] CÔ CHƯA SỬA GIỜ → cờ tắt');
{
  const r = await khoAnh('s1', ph);
  const a = (r.data?.anh || []).find(x => x.date === NGAY);
  check('gia đình đọc được tấm ảnh tới lớp hôm nay của con', r.status === 200 && !!a && a.taoLuc === '23:59', r.data);
  check('tấm ảnh mang cờ `gioVaoDaSua` là false (đúng kiểu boolean)', !!a && a.gioVaoDaSua === false, a);
  check('tấm ảnh chỉ THÊM đúng một trường: date, file, taoLuc + gioVaoDaSua',
    nhuNhau(khoa(a), ['date', 'file', 'gioVaoDaSua', 'taoLuc']), khoa(a));
  check('lớp ngoài của câu trả lời không đổi: anh, anhVe, ghiChuVe, month, studentId',
    nhuNhau(khoa(r.data), ['anh', 'anhVe', 'ghiChuVe', 'month', 'studentId']), khoa(r.data));
}

// ===========================================================================
console.log('\n[b] CÔ SỬA GIỜ → cờ bật, đúng bé, đúng ngày');
{
  const r = await suaVao({ studentId: 's1', gio: '00:00' });
  check('cô sửa giờ tới lớp của s1 thành 00:00 → 200', r.status === 200 && gioDangGhi('s1') === '00:00', `${r.status} ${loi(r)}`);
  check('(e) câu trả lời của đường sửa giờ KHÔNG đổi hình dạng: { ok, date, gio, record }',
    nhuNhau(khoa(r.data), ['date', 'gio', 'ok', 'record']), khoa(r.data));

  const a = await anhToi('s1', ph);
  check('gia đình của s1: tấm ảnh hôm nay mang cờ true', !!a && a.gioVaoDaSua === true, a);
  check('…giờ chụp vẫn đi kèm y như cũ (app đời cũ vẫn đọc được)', !!a && a.taoLuc === '23:59', a);
  check('cô của nhóm đọc cùng đường ấy cũng thấy cờ true', (await anhToi('s1', co))?.gioVaoDaSua === true);

  const homQua = await anhToi('s1', ph, HOM_QUA);
  check('KHÔNG lan sang ngày khác: ảnh hôm qua của s1 vẫn cờ false', !!homQua && homQua.gioVaoDaSua === false, homQua);
  const beKhac = await anhToi('s3', nhaKhac);
  check('KHÔNG lan sang bé khác: ảnh hôm nay của s3 vẫn cờ false', !!beKhac && beKhac.gioVaoDaSua === false, beKhac);
  const beCungNhom = await anhToi('s5', co);
  check('…và của s5 cùng nhóm cũng vậy', !!beCungNhom && beCungNhom.gioVaoDaSua === false, beCungNhom);

  const dong = csdl(c => c.prepare('SELECT * FROM attendance_gio_vao_sua WHERE studentId = ? AND date = ?').all('s1', NGAY));
  check('lượt sửa để lại MỘT dòng: giờ trước 23:59, giờ sau 00:00, ai sửa, sửa lúc nào',
    dong.length === 1 && dong[0].gioTruoc === '23:59' && dong[0].gioSau === '00:00'
    && dong[0].nguoiSua === 't1' && !!dong[0].suaLuc, dong);

  // Sửa lần hai: vẫn một dòng, mang giờ của lượt sau cùng.
  await suaVao({ studentId: 's1', gio: '00:00' });
  const lan2 = csdl(c => c.prepare('SELECT * FROM attendance_gio_vao_sua WHERE studentId = ? AND date = ?').all('s1', NGAY));
  check('sửa lần hai: vẫn MỘT dòng cho bé ấy ngày ấy', lan2.length === 1 && lan2[0].gioSau === '00:00', lan2);
  check('…cờ vẫn bật', (await anhToi('s1', ph))?.gioVaoDaSua === true);
}

// ===========================================================================
console.log('\n[c] GIỜ ĐANG GHI KHÔNG CÒN LÀ GIỜ CÔ SỬA → cờ tắt');
{
  let r = await cham('s1', 'absent_excused');
  check('cô chấm s1 nghỉ → sổ hết giờ vào', r.status === 200 && gioDangGhi('s1') === null, `${r.status} ${gioDangGhi('s1')}`);
  check('bé đang ghi nghỉ: cờ tắt', (await anhToi('s1', ph))?.gioVaoDaSua === false, await anhToi('s1', ph));

  r = await cham('s1', 'present');
  const gioMay = gioDangGhi('s1');
  check('cô chấm có mặt lại → máy đóng giờ vào mới', r.status === 200 && !!gioMay, `${r.status} ${gioMay}`);
  if (gioMay === '00:00') {
    // Đúng phút 00:00 thì giờ máy đóng trùng giờ cô đã sửa — không phân biệt được.
    check('(đúng phút 00:00: giờ máy đóng trùng giờ cô sửa, cờ còn bật)', (await anhToi('s1', ph))?.gioVaoDaSua === true);
  } else {
    check(`giờ đang ghi (${gioMay}) là giờ MÁY đóng → cờ tắt`, (await anhToi('s1', ph))?.gioVaoDaSua === false, await anhToi('s1', ph));
  }

  r = await suaVao({ studentId: 's1', gio: '00:00' });
  check('cô sửa lần nữa thành 00:00 → cờ bật lại',
    r.status === 200 && (await anhToi('s1', ph))?.gioVaoDaSua === true, `${r.status} ${loi(r)}`);
  const dong = csdl(c => c.prepare('SELECT gioTruoc, gioSau FROM attendance_gio_vao_sua WHERE studentId = ? AND date = ?').all('s1', NGAY));
  check('…dòng ghi lại giờ trước là giờ máy vừa đóng',
    dong.length === 1 && dong[0].gioTruoc === gioMay && dong[0].gioSau === '00:00', dong);
}

// ===========================================================================
console.log('\n[d] LƯỢT SỬA BỊ TỪ CHỐI KHÔNG BẬT CỜ');
{
  const soDong = () => csdl(c => c.prepare('SELECT COUNT(*) n FROM attendance_gio_vao_sua WHERE studentId = ?').get('s5').n);
  let r = await suaVao({ studentId: 's5', gio: '7h30' });
  check('giờ gõ hỏng → 400', r.status === 400, r.status);
  if (ngay.bayGio() < '23:59') {
    r = await suaVao({ studentId: 's5', gio: '23:59' });
    check('giờ chưa tới → 400', r.status === 400, `${r.status} ${loi(r)}`);
  }
  r = await suaVao({ studentId: 's5', gio: '00:00' }, ph);
  check('phụ huynh gọi đường sửa giờ → 403', r.status === 403, r.status);
  r = await suaVao({ studentId: 's5', gio: '00:00' }, coKhac);
  check('cô nhóm khác gọi đường sửa giờ → 403', r.status === 403, r.status);
  check('sau mọi lượt bị từ chối: sổ của s5 còn giờ cũ, không dòng sửa nào', gioDangGhi('s5') === '00:10' && soDong() === 0,
    { gio: gioDangGhi('s5'), dong: soDong() });
  check('…và cờ của s5 vẫn tắt', (await anhToi('s5', co))?.gioVaoDaSua === false, await anhToi('s5', co));
}

// ===========================================================================
console.log('\n[e] ẢNH RA VỀ VÀ CÁC CÂU TRẢ LỜI KHÁC GIỮ NGUYÊN HÌNH DẠNG');
{
  const r = await khoAnh('s1', ph);
  const ve = (r.data?.anhVe || []).find(x => x.date === NGAY);
  check('đối chứng — s1 đang có cờ bật và có ảnh ra về hôm nay',
    (r.data?.anh || []).find(x => x.date === NGAY)?.gioVaoDaSua === true && !!ve, r.data);
  check('ảnh ra về KHÔNG mang cờ, vẫn đủ date, file, taoLuc',
    nhuNhau(khoa(ve), ['date', 'file', 'taoLuc']) && ve.taoLuc === '23:59', ve);

  const soSau = await req('GET', `/api/attendance?studentId=s1&month=${NGAY.slice(0, 7)}`, { cookie: ph });
  const dongTruoc = (soTruoc.data || []).find(x => x.date === NGAY);
  const dongSau = (soSau.data || []).find(x => x.date === NGAY);
  check('sổ điểm danh của gia đình: dòng hôm nay giữ nguyên bộ khoá',
    !!dongTruoc && !!dongSau && nhuNhau(khoa(dongSau), khoa(dongTruoc)), { truoc: khoa(dongTruoc), sau: khoa(dongSau) });
  check('…và mang giờ cô đã sửa', !!dongSau && dongSau.checkIn === '00:00', dongSau);

  const nhomSau = await req('GET', `/api/attendance/class?date=${NGAY}&classId=c1`, { cookie: co });
  const t = dongNhom(nhomTruoc, 's1');
  const s = dongNhom(nhomSau, 's1');
  check('sổ của cô: lớp ngoài và dòng của s1 giữ nguyên bộ khoá',
    !!t && !!s && nhuNhau(khoa(nhomSau.data), khoa(nhomTruoc.data)) && nhuNhau(khoa(s), khoa(t)),
    { truoc: khoa(t), sau: khoa(s) });
  check('…ảnh tới lớp trong sổ của cô vẫn chỉ có file và taoLuc',
    !!s && nhuNhau(khoa(s.anhDenLop), ['file', 'taoLuc']), s && s.anhDenLop);
}

// ===========================================================================
console.log('\n[f] AI ĐỌC ĐƯỢC CỜ: chỉ người vốn đọc được ảnh của bé');
{
  let r = await khoAnh('s1', nhaKhac);
  check('nhà khác hỏi ảnh của s1 → 403', r.status === 403, r.status);
  check('…câu từ chối không kèm ảnh, không kèm cờ',
    !JSON.stringify(r.data || {}).includes('gioVaoDaSua') && !(r.data || {}).anh, r.data);
  r = await khoAnh('s1', coKhac);
  check('cô nhóm khác hỏi ảnh của s1 → 403, không kèm cờ',
    r.status === 403 && !JSON.stringify(r.data || {}).includes('gioVaoDaSua'), `${r.status}`);
  r = await khoAnh('s1', null);
  check('chưa đăng nhập → 401', r.status === 401, r.status);

  r = await khoAnh('s3', nhaKhac);
  check('nhà khác chỉ đọc được ảnh con mình (s3), cờ của con mình vẫn tắt',
    r.status === 200 && (r.data.anh || []).length > 0
    && (r.data.anh || []).every(a => a.gioVaoDaSua === false), r.data);
  check('…và không tấm nào trong đó là của s1',
    !(r.data.anh || []).some(a => String(a.file).includes('_s1_')) && r.data.studentId === 's3', r.data);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
