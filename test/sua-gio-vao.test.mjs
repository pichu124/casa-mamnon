// Cô sửa được GIỜ CON TỚI LỚP của hôm nay (Đ254).
//
// Chạy bằng:  node test/sua-gio-vao.test.mjs
//
// VÌ SAO CÓ ĐƯỜNG NÀY. Giờ vào do máy chủ tự đóng = lúc cô chấm. Sáng cô quên
// điểm danh, 17:00 mới chấm bù "Có mặt" thì sổ ghi bé tới lớp lúc 17:00, trong
// khi bé đã về từ 16:45. Từ Đ253 máy chủ không nhận giờ ra sớm hơn giờ vào,
// nên cô KHÔNG CÒN CÁCH NÀO ghi đúng giờ về — và gia đình đọc thấy "Vào lớp
// 17:00" cho một đứa trẻ đã ở lớp cả ngày. Chủ dự án duyệt 13/11: thêm chỗ
// cho cô sửa giờ vào.
//
// LUẬT của `POST /api/attendance/gio-vao`:
//
//   (a) bé đang ghi có mặt hôm nay → cô nhóm đó (và quản trị) sửa được giờ
//       vào; sửa xong thì ghi được giờ ra mà trước đó bị từ chối.
//   (b) giờ vào mới MUỘN HƠN giờ ra đã có → từ chối, sổ không đổi.
//   (c) giờ vào mới CHƯA TỚI (muộn hơn "bây giờ") → từ chối.
//   (d) bé chưa có dòng, hoặc đang ghi nghỉ → từ chối, không tự sinh dòng,
//       không đổi trạng thái (đây không phải lối vòng để chấm có mặt).
//   (e) ngày đã khoá → từ chối như mọi đường ghi sổ khác (Đ127).
//   (f) cô nhóm khác, phụ huynh, người chưa đăng nhập → không sửa được.
//   (g) mỗi lần sửa để lại một dòng nhật ký có giờ trước và giờ sau; gia đình
//       KHÔNG nhận thêm tin báo nào.
//
// GIỜ ĐƯỢC ĐẶT THẲNG VÀO BẢNG và các giờ gửi lên chọn theo "00:00" (không bao
// giờ ở tương lai) để bài cho cùng kết quả lúc 7 giờ sáng và 11 giờ đêm.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, taoQuanTri, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('sua-gio-vao');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng G', 'g_qt');
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4805), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const co = (await login('giaovien', '123456')).cookie;
const NGAY = HOM_NAY();

function csdl(viec) {
  const c = new Database(CSDL);
  try { return viec(c); } finally { c.close(); }
}
function datDong(studentId, dong, ngayGhi = NGAY) {
  csdl((c) => {
    c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run(studentId, ngayGhi);
    if (dong) {
      c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 't1')`)
        .run(`att_thu_${studentId}_${ngayGhi}`, studentId, ngayGhi, dong.status,
          dong.checkIn ?? null, dong.checkOut ?? null, dong.note ?? '');
    }
  });
}
const dongCua = (studentId, ngayGhi = NGAY) => csdl(c =>
  c.prepare('SELECT status, checkIn, checkOut, note, markedBy FROM attendance WHERE studentId = ? AND date = ?').get(studentId, ngayGhi));
const dauVet = (studentId) => csdl(c => ({
  dong: c.prepare('SELECT status, checkIn, checkOut, note, markedBy FROM attendance WHERE studentId = ? AND date = ?').get(studentId, NGAY),
  nhatKy: c.prepare("SELECT COUNT(*) n FROM audit_log WHERE action = 'sua-gio-vao' AND target = ?").get(studentId).n,
  tinBao: c.prepare('SELECT COUNT(*) n FROM thongbao_be WHERE studentId = ?').get(studentId).n,
}));
const nhuNhau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const suaVao = (than, cookie = co) => req('POST', '/api/attendance/gio-vao', { cookie, body: { date: NGAY, ...than } });
const raVe = (than) => req('POST', '/api/attendance/ra-ve', { cookie: co, body: { date: NGAY, ...than } });
const loi = (r) => String(r.data?.error || '');
const khongLoChuKyThuat = (cau) => !/checkIn|checkOut|gio\b|null|undefined|NaN/.test(cau);

// ===========================================================================
console.log('\n[a] CÔ CHẤM BÙ CUỐI NGÀY: sửa giờ vào rồi ghi được giờ về thật');
{
  // Dòng do máy đóng lúc "17:00" (đặt thẳng 23:59 để chắc chắn muộn hơn giờ về).
  datDong('s1', { status: 'present', checkIn: '23:59', note: 'Bà đưa tới' });
  let r = await raVe({ studentId: 's1', gio: '00:30' });
  check('đối chứng — trước khi sửa, giờ về thật bị từ chối (400)', r.status === 400, `${r.status} ${loi(r)}`);
  check('…và câu từ chối chỉ cho cô chỗ sửa giờ tới lớp',
    /sửa giờ/i.test(loi(r)) && loi(r).includes('⋯'), loi(r));

  const truoc = dauVet('s1');
  r = await suaVao({ studentId: 's1', gio: '00:00' });
  check('sửa giờ vào thành 00:00 → 200', r.status === 200, `${r.status} ${loi(r)}`);
  check('câu trả lời có đúng hình dạng { ok, date, gio, record }',
    r.data && r.data.ok === true && r.data.date === NGAY && r.data.gio === '00:00'
    && r.data.record && r.data.record.checkIn === '00:00'
    && nhuNhau(Object.keys(r.data).sort(), ['date', 'gio', 'ok', 'record']), r.data);
  const sau = dauVet('s1');
  check('sổ mang giờ vào mới', sau.dong.checkIn === '00:00', sau.dong);
  check('trạng thái, giờ ra, ghi chú, người chấm KHÔNG đổi',
    sau.dong.status === 'present' && sau.dong.checkOut === null
    && sau.dong.note === 'Bà đưa tới' && sau.dong.markedBy === 't1', sau.dong);
  check('(g) có thêm ĐÚNG MỘT dòng nhật ký', sau.nhatKy === truoc.nhatKy + 1, { truoc: truoc.nhatKy, sau: sau.nhatKy });
  const nk = csdl(c => c.prepare("SELECT userId, detail FROM audit_log WHERE action = 'sua-gio-vao' AND target = 's1' ORDER BY rowid DESC LIMIT 1").get());
  const ct = (() => { try { return JSON.parse(nk.detail) || {}; } catch { return {}; } })();
  check('(g) nhật ký ghi ai sửa, giờ trước và giờ sau',
    !!nk && !!nk.userId && ct.truoc === '23:59' && ct.sau === '00:00' && ct.date === NGAY, nk);
  check('(g) gia đình KHÔNG nhận thêm tin báo nào', sau.tinBao === truoc.tinBao, { truoc: truoc.tinBao, sau: sau.tinBao });

  r = await raVe({ studentId: 's1', gio: '00:30' });
  check('SAU KHI SỬA: giờ về thật 00:30 ghi được', r.status === 200 && dongCua('s1').checkOut === '00:30', `${r.status} ${loi(r)}`);

  // Bé "tới muộn" đời cũ chưa có giờ vào: cô ghi được.
  datDong('s5', { status: 'late', checkIn: null });
  r = await suaVao({ studentId: 's5', gio: '00:00' });
  check('bé có mặt nhưng chưa có giờ vào: ghi được giờ vào', r.status === 200 && dongCua('s5').checkIn === '00:00', `${r.status} ${loi(r)}`);
  check('…trạng thái "tới muộn" ở nguyên', dongCua('s5').status === 'late', dongCua('s5'));

  // Quản trị cũng sửa được.
  const d0 = await login('g_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const qt = (await login('g_qt', 'quantri2026')).cookie;
  datDong('s1', { status: 'present', checkIn: '23:59' });
  r = await suaVao({ studentId: 's1', gio: '00:00' }, qt);
  check('quản trị sửa được giờ vào', r.status === 200 && dongCua('s1').checkIn === '00:00', `${r.status} ${loi(r)}`);
}

// ===========================================================================
console.log('\n[b] GIỜ VÀO MỚI MUỘN HƠN GIỜ RA ĐÃ CÓ → TỪ CHỐI');
{
  // "Bây giờ" có thể là bất cứ giờ nào, nên đặt giờ ra 00:00 và gửi giờ vào
  // 00:01: luật (b) phải chặn trước cả khi (c) kịp xét.
  datDong('s1', { status: 'present', checkIn: '00:00', checkOut: '00:00' });
  const truoc = dauVet('s1');
  let r = await suaVao({ studentId: 's1', gio: '00:01' });
  const bayGio = ngay.bayGio();
  if (bayGio === '00:00') {
    check('(đúng phút 00:00: 00:01 bị từ chối vì chưa tới hoặc vì muộn hơn giờ ra)', r.status === 400, r.status);
  } else {
    check('giờ vào 00:01 cho bé đã về lúc 00:00 → 400', r.status === 400, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
    check('câu từ chối nêu rõ CẢ HAI giờ', loi(r).includes('00:01') && loi(r).includes('00:00'), loi(r));
    check('…bằng tiếng của trường', /giờ ra về/i.test(loi(r)) && /muộn hơn/.test(loi(r)) && khongLoChuKyThuat(loi(r)), loi(r));
  }
  check('SỔ KHÔNG ĐỔI, không nhật ký', nhuNhau(dauVet('s1'), truoc), { truoc, sau: dauVet('s1') });

  r = await suaVao({ studentId: 's1', gio: '00:00' });
  check('giờ vào BẰNG giờ ra → nhận', r.status === 200, `${r.status} ${loi(r)}`);
}

// ===========================================================================
console.log('\n[c] GIỜ VÀO CHƯA TỚI → TỪ CHỐI');
{
  const bayGio = ngay.bayGio();
  datDong('s1', { status: 'present', checkIn: '00:00' });
  const truoc = dauVet('s1');
  if (bayGio < '23:59') {
    const r = await suaVao({ studentId: 's1', gio: '23:59' });
    check('giờ vào 23:59 khi chưa tới 23:59 → 400', r.status === 400, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
    check('câu từ chối nêu giờ cô gõ và nói là chưa tới', loi(r).includes('23:59') && /chưa tới/.test(loi(r)) && khongLoChuKyThuat(loi(r)), loi(r));
    check('SỔ KHÔNG ĐỔI', nhuNhau(dauVet('s1'), truoc), { truoc, sau: dauVet('s1') });
  } else {
    // Đúng phút 23:59 thì 23:59 là "bây giờ", hợp lệ.
    const r = await suaVao({ studentId: 's1', gio: '23:59' });
    check('(đúng phút 23:59: giờ vào 23:59 là bây giờ, nhận)', r.status === 200, r.status);
  }

  // Giờ gõ hỏng.
  for (const gio of ['', '7h30', '25:00', '07:60', '7:5', null, 730]) {
    datDong('s1', { status: 'present', checkIn: '00:00' });
    const r = await suaVao({ studentId: 's1', gio });
    check(`giờ hỏng ${JSON.stringify(gio)} → 400, sổ không đổi`,
      r.status === 400 && dongCua('s1').checkIn === '00:00' && khongLoChuKyThuat(loi(r)), `${r.status} ${loi(r)}`);
  }
}

// ===========================================================================
console.log('\n[d] BÉ CHƯA CÓ DÒNG / ĐANG GHI NGHỈ → TỪ CHỐI, không phải lối vòng để chấm có mặt');
{
  datDong('s4', null);
  let r = await suaVao({ studentId: 's4', gio: '00:00' });
  check('bé chưa có dòng điểm danh → 400', r.status === 400, `${r.status} ${loi(r)}`);
  check('…không tự sinh dòng', dongCua('s4') === undefined, dongCua('s4'));

  for (const status of ['absent_excused', 'absent_unexcused']) {
    datDong('s3', { status, checkIn: null });
    r = await suaVao({ studentId: 's3', gio: '00:00' });
    check(`bé đang ghi ${status} → 400`, r.status === 400 && khongLoChuKyThuat(loi(r)), `${r.status} ${loi(r)}`);
    check('…trạng thái nghỉ ở nguyên, không có giờ vào',
      dongCua('s3').status === status && dongCua('s3').checkIn === null, dongCua('s3'));
  }

  r = await suaVao({ gio: '00:00' });
  check('thiếu mã của bé → 400', r.status === 400, r.status);
}

// ===========================================================================
console.log('\n[e] NGÀY ĐÃ KHOÁ → TỪ CHỐI');
{
  const homQua = ngay.ngayCua(Date.now() - 24 * 3600 * 1000);
  datDong('s1', { status: 'present', checkIn: '08:00' }, homQua);
  let r = await req('POST', '/api/attendance/gio-vao', { cookie: co, body: { studentId: 's1', date: homQua, gio: '00:00' } });
  check('sửa giờ vào của hôm qua → 400, câu nói ngày đã khoá', r.status === 400 && /đã khoá/.test(loi(r)), `${r.status} ${loi(r)}`);
  check('…dòng hôm qua còn nguyên', dongCua('s1', homQua).checkIn === '08:00', dongCua('s1', homQua));
  r = await req('POST', '/api/attendance/gio-vao', { cookie: co, body: { studentId: 's1', date: 'hom-nay', gio: '00:00' } });
  check('ngày gõ hỏng → 400', r.status === 400, r.status);
}

// ===========================================================================
console.log('\n[f] AI ĐƯỢC SỬA');
{
  datDong('s1', { status: 'present', checkIn: '00:05' });
  const truoc = dauVet('s1');
  const ph = (await login('phuhuynh', '123456')).cookie;
  let r = await suaVao({ studentId: 's1', gio: '00:00' }, ph);
  check('phụ huynh → 403', r.status === 403, r.status);
  r = await req('POST', '/api/attendance/gio-vao', { body: { studentId: 's1', date: NGAY, gio: '00:00' } });
  check('chưa đăng nhập → 401', r.status === 401, r.status);

  // Cô của nhóm khác: `giaovien2` phụ trách nhóm c2, bé s1 học nhóm c1.
  const coKhac = (await login('giaovien2', '123456')).cookie;
  const doiChung = await req('POST', '/api/attendance/mark', { cookie: coKhac, body: { studentId: 's1', date: NGAY, status: 'present' } });
  check('đối chứng — cô nhóm khác không chấm được điểm danh cho s1', doiChung.status === 403, doiChung.status);
  r = await suaVao({ studentId: 's1', gio: '00:00' }, coKhac);
  check('cô nhóm khác → 403', r.status === 403, `${r.status} ${loi(r)}`);
  check('sau mọi lượt bị từ chối: sổ của s1 không đổi', nhuNhau(dauVet('s1'), truoc), { truoc, sau: dauVet('s1') });
}

sv.dung();
tongKet();
