// Bài canh MỘT DÒNG VÀO/RA + ẢNH TRẢ BÉ VÀO LÕI (Đ210 — việc 1, 2, 3).
//
// Chạy bằng:  npm run test:vao-ra
//
// BA VIỆC MỘT MÀN, VÀ MỘT TRONG BA LÀ MỘT ĐÁNH ĐỔI THẬT:
//
//   việc 1 — gộp hai tab Đón bé / Trả bé về MỘT dòng Vào/Ra.
//   việc 2 — chuyển ảnh trả bé vào phần LÕI (thứ nhà trường KHÔNG tắt được).
//   việc 3 — bỏ mục sổ trả bé riêng khỏi màn của cô.
//
// CỘT `checkOut` ĐÃ NẰM TRONG BẢNG TỪ NGÀY ĐẦU MÀ CHƯA MỘT ĐƯỜNG NÀO GHI VÀO
// NÓ. Ba màn hình dựng chữ "Ra về ${record.checkOut}" từ nó, nên suốt từ đó
// tới giờ chỗ ấy luôn rỗng — và không ai thấy gì sai, vì màn hình chỉ đơn
// giản không hiện dòng đó. Mục [1] là đường ghi còn thiếu ấy.
//
// VIỆC 2 GỠ MỘT LỚP BẢO VỆ, nên mục [4] canh đúng cái giá của nó: ảnh cũ do
// phân hệ ghi vẫn phải mở ra xem được (không dời một dòng dữ liệu nào), NHƯNG
// tắt phân hệ thì lõi cũng không được dọn ảnh cũ của nó ra màn hình — tắt một
// phân hệ phải chặn được cả dữ liệu, không chỉ giấu biểu tượng.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, GOC, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('vao-ra-mot-dong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['dontra']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng V', 'v_qt');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4826), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const qt = (await login('v_qt', mkQT)).cookie;
const co = (await login('giaovien', '123456')).cookie;
const coKhac = (await login('giaovien2', '123456')).cookie;
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);

function phuHuynhCua(studentId) {
  const c = new Database(CSDL);
  try {
    const r = c.prepare(`SELECT u.username FROM student_parents sp JOIN users u ON u.id = sp.parentId
                          WHERE sp.studentId = ? LIMIT 1`).get(studentId);
    return r ? r.username : null;
  } finally { c.close(); }
}
const ph = (await login(phuHuynhCua('s1'), '123456')).cookie;

// Một tấm PNG 1x1 hợp lệ.
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

console.log('\n[1] Đường GHI giờ ra về — thứ trước đợt này hoàn toàn không có');
{
  // ĐỐI CHỨNG TRƯỚC: cột có, và đang rỗng.
  let r = await req('POST', '/api/attendance/mark',
    { cookie: co, body: { studentId: 's1', date: NGAY, status: 'present' } });
  check('đối chứng — chấm được điểm danh cho bé', r.status === 200, r.data?.error);
  check('đối chứng — cột checkOut đang RỖNG, đúng như trước đợt này',
    r.data.checkOut === null || r.data.checkOut === undefined, r.data.checkOut);

  r = await req('POST', '/api/attendance/ra-ve',
    { cookie: co, body: { studentId: 's1', date: NGAY, gio: '16:45' } });
  check('GHI ĐƯỢC GIỜ RA VỀ', r.status === 200 && r.data.gio === '16:45', `${r.status} ${r.data?.error || ''}`);
  check('…và dòng điểm danh nay MANG giờ ấy', r.data.record && r.data.record.checkOut === '16:45',
    r.data?.record?.checkOut);

  // KHÔNG ĐỔI TRẠNG THÁI ĐIỂM DANH. Bấm nhầm nút ra về cho bé nghỉ thì dòng
  // "Nghỉ có phép" phải ở nguyên — giờ ra là một sự kiện trong ngày, không
  // phải phép ghi đè lên việc bé có đi học hay không.
  await req('POST', '/api/attendance/mark',
    { cookie: co, body: { studentId: 's3', date: NGAY, status: 'absent_excused' } });
  r = await req('POST', '/api/attendance/ra-ve', { cookie: co, body: { studentId: 's3', date: NGAY } });
  const s3 = await req('GET', `/api/attendance?studentId=s3&month=${THANG}`, { cookie: co });
  const dong3 = (s3.data || []).find(x => x.date === NGAY);
  check('ghi giờ ra KHÔNG đổi trạng thái điểm danh của bé',
    dong3 && dong3.status === 'absent_excused', dong3 && dong3.status);

  // Chưa có dòng điểm danh thì từ chối, kèm lối đi tiếp.
  //
  // DỰNG HẲN CẢNH ẤY, ĐỪNG GIẢ ĐỊNH. Dữ liệu mẫu có thể đã chấm sẵn cho bé
  // này hôm nay — bản đầu của bài chọn bừa một mã bé rồi nhận 200 và báo đỏ,
  // trong khi mã 200 là đúng: bé ấy CÓ dòng điểm danh.
  {
    const c = new Database(CSDL);
    c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run('s4', NGAY);
    const con = c.prepare('SELECT COUNT(*) n FROM attendance WHERE studentId = ? AND date = ?')
      .get('s4', NGAY).n;
    c.close();
    check('đối chứng — bé s4 THẬT SỰ chưa có dòng điểm danh hôm nay', con === 0, con);
  }
  r = await req('POST', '/api/attendance/ra-ve', { cookie: co, body: { studentId: 's4', date: NGAY } });
  check('bé chưa có dòng điểm danh → từ chối, không tự sinh dòng', r.status === 400, r.status);
  check('…và câu từ chối chỉ đúng việc phải làm trước', /chụp ảnh|chấm điểm danh/i.test(String(r.data?.error || '')),
    r.data?.error);

  // Cùng luật khoá ngày với chính dòng điểm danh ấy (Đ127).
  r = await req('POST', '/api/attendance/ra-ve', { cookie: co, body: { studentId: 's1', date: '2026-09-01' } });
  check('ngoài ngày thì không ghi được (Đ127)', r.status === 400, r.status);
}

console.log('\n[2] Ảnh lúc trả bé do LÕI ghi, và gia đình xem được');
let fileMoi = null;
{
  let r = await req('POST', '/api/attendance/ra-ve',
    { cookie: co, body: { studentId: 's1', date: NGAY, gio: '16:50', anh: ANH } });
  check('ghi được giờ ra kèm ảnh', r.status === 200 && r.data.anh && r.data.anh.file,
    `${r.status} ${r.data?.error || ''}`);
  fileMoi = r.data.anh && r.data.anh.file;

  const c = new Database(CSDL);
  const dong = c.prepare('SELECT * FROM attendance_anh_ve WHERE studentId = ? AND date = ?').get('s1', NGAY);
  c.close();
  check('ảnh ghi vào bảng của LÕI (attendance_anh_ve)', !!dong && dong.file === fileMoi, dong);

  // Gia đình đọc được, ở một KHOÁ RIÊNG chứ không trộn vào mảng ảnh tới lớp.
  const g = await req('GET', `/api/attendance/anh?studentId=s1&month=${THANG}`, { cookie: ph });
  check('gia đình nhận ảnh lúc về ở khoá riêng `anhVe`',
    g.status === 200 && Array.isArray(g.data.anhVe) && g.data.anhVe.some(x => x.file === fileMoi),
    JSON.stringify(g.data.anhVe || []).slice(0, 160));
  check('…và KHÔNG trộn vào mảng `anh` (ảnh tới lớp) — app đời cũ dựng chú thích theo mảng ấy',
    !(g.data.anh || []).some(x => x.file === fileMoi), JSON.stringify(g.data.anh || []).slice(0, 160));

  const b = await req('GET', `/api/attendance/anh/${fileMoi}`, { cookie: ph });
  check('gia đình mở được byte của tấm ảnh ấy', b.status === 200, b.status);
  const bk = await req('GET', `/api/attendance/anh/${fileMoi}`, { cookie: coKhac });
  check('cô nhóm khác KHÔNG mở được (403)', bk.status === 403, bk.status);
}

console.log('\n[3] Gỡ giờ ra về: mất giờ và mất ảnh, KHÔNG mất dòng điểm danh');
{
  let r = await req('POST', '/api/attendance/ra-ve/go', { cookie: co, body: { studentId: 's1', date: NGAY } });
  check('gỡ được', r.status === 200, r.data?.error);

  const s1 = await req('GET', `/api/attendance?studentId=s1&month=${THANG}`, { cookie: co });
  const d1 = (s1.data || []).find(x => x.date === NGAY);
  check('giờ ra đã mất', d1 && !d1.checkOut, d1 && d1.checkOut);
  check('NHƯNG dòng điểm danh còn nguyên và vẫn là "có mặt"',
    d1 && d1.status === 'present' && d1.checkIn, JSON.stringify(d1));

  const g = await req('GET', `/api/attendance/anh?studentId=s1&month=${THANG}`, { cookie: ph });
  check('gia đình không còn thấy ảnh đã gỡ', !(g.data.anhVe || []).some(x => x.file === fileMoi),
    JSON.stringify(g.data.anhVe || []));

  // DÒNG Ở LẠI LÀM VẾT, TỆP ẢNH THÌ KHÔNG.
  const c = new Database(CSDL);
  const dong = c.prepare('SELECT * FROM attendance_anh_ve WHERE studentId = ? AND date = ?').get('s1', NGAY);
  c.close();
  check('dòng ở lại làm vết, ô file rỗng', !!dong && dong.file === '', dong);
}

console.log('\n[4] KHÔNG DỜI DỮ LIỆU CŨ — và tắt phân hệ thì lõi cũng thôi đọc');
{
  // Dựng một tấm ảnh trả bé kiểu CŨ, do phân hệ ghi, thẳng vào bảng của nó.
  //
  // ĐẶT Ở MỘT NGÀY KHÁC với ngày mục [3] vừa GỠ ảnh. Mục [3] để lại một dòng
  // lõi với ô `file` rỗng — nghĩa là "cô đã gỡ ảnh của ngày ấy" — và đường đọc
  // hiểu đúng như vậy: dòng lõi rỗng thì ngày ấy KHÔNG còn ảnh nào, kể cả tấm
  // cũ của phân hệ. Đó là hành vi đúng (một ngày một tấm, cô gỡ là gỡ), nhưng
  // dựng hai thứ vào cùng một ngày thì bài này đo vào chỗ đã bị gỡ. Bản đầu
  // mắc đúng lỗi đó và báo đỏ với một mảng rỗng.
  const NGAY_CU = `${THANG}-02`;
  const c = new Database(CSDL);
  c.prepare(`INSERT OR REPLACE INTO dontra_anh_tra (studentId, ngay, file, taoLuc, byUserId)
             VALUES ('s1', ?, 'anh-cu-cua-phan-he.png', ?, 't1')`).run(NGAY_CU, new Date().toISOString());
  const conCu = c.prepare('SELECT COUNT(*) n FROM attendance_anh_ve WHERE studentId = ? AND date = ?')
    .get('s1', NGAY_CU).n;
  c.close();
  check('đối chứng — ngày ấy CHƯA có dòng nào của lõi, nên đo được đúng tấm cũ',
    conCu === 0, conCu);

  let g = await req('GET', `/api/attendance/anh?studentId=s1&month=${THANG}`, { cookie: ph });
  check('ẢNH CŨ DO PHÂN HỆ GHI VẪN HIỆN Ở MÀN LÕI — không dời một dòng nào',
    (g.data.anhVe || []).some(x => x.file === 'anh-cu-cua-phan-he.png'),
    JSON.stringify(g.data.anhVe || []));

  // TẮT PHÂN HỆ: lõi phải thôi đọc bảng của nó. Tắt một phân hệ mà dữ liệu của
  // nó vẫn chảy ra ở màn khác thì tắt chỉ còn là giấu biểu tượng (bài học Đ46).
  await req('PUT', '/api/admin/modules/dontra', { cookie: qt, body: { enabled: false } });
  g = await req('GET', `/api/attendance/anh?studentId=s1&month=${THANG}`, { cookie: ph });
  check('TẮT phân hệ → lõi thôi dọn ảnh cũ của nó ra màn hình',
    !(g.data.anhVe || []).some(x => x.file === 'anh-cu-cua-phan-he.png'),
    JSON.stringify(g.data.anhVe || []));
  check('…nhưng màn điểm danh của gia đình vẫn chạy bình thường', g.status === 200, g.status);

  // Và dữ liệu KHÔNG mất — bật lại là thấy đủ.
  await req('PUT', '/api/admin/modules/dontra', { cookie: qt, body: { enabled: true } });
  g = await req('GET', `/api/attendance/anh?studentId=s1&month=${THANG}`, { cookie: ph });
  check('BẬT LẠI → ảnh cũ còn nguyên, không mất gì', 
    (g.data.anhVe || []).some(x => x.file === 'anh-cu-cua-phan-he.png'),
    JSON.stringify(g.data.anhVe || []));
}

console.log('\n[5] Phạm vi: cô nhóm khác không ghi được giờ ra cho bé không phải nhóm mình');
{
  let r = await req('POST', '/api/attendance/ra-ve', { cookie: coKhac, body: { studentId: 's1', date: NGAY } });
  check('cô nhóm khác bị chặn (403)', r.status === 403, r.status);
  r = await req('POST', '/api/attendance/ra-ve/go', { cookie: coKhac, body: { studentId: 's1', date: NGAY } });
  check('…kể cả đường gỡ', r.status === 403, r.status);
  r = await req('POST', '/api/attendance/ra-ve', { cookie: ph, body: { studentId: 's1', date: NGAY } });
  check('gia đình KHÔNG tự ghi giờ con về được', r.status === 403, r.status);
}

console.log('\n[6] Sổ đón trả bé GIỮ NGUYÊN — bỏ khỏi màn không phải bỏ dữ liệu');
{
  // Việc 3 dễ bị đọc thành "xoá sổ trả bé". `dontra_ghi` là chứng từ trả lời
  // câu "hôm ấy ai đón bé" — thứ không được mất vì một màn hình gộp lại.
  const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/dontra/module.json'), 'utf8'));
  check('phân hệ Đón trả bé vẫn còn, vẫn có màn riêng', mj.hash === '#/dontra' && mj.view === 'dontra', mj.hash);
  check('và KHÔNG còn gấp vào màn Điểm danh (nếu còn, cô mất hẳn lối vào sổ)',
    !mj.gopVao, mj.gopVao);

  const sc = fs.readFileSync(path.join(GOC, 'modules/dontra/schema.sql'), 'utf8');
  check('bảng sổ trả bé `dontra_ghi` vẫn khai trong schema, không bị gỡ',
    /CREATE TABLE IF NOT EXISTS dontra_ghi/.test(sc), 'mất bảng sổ');
  check('bảng ảnh trả bé cũ `dontra_anh_tra` cũng còn nguyên',
    /CREATE TABLE IF NOT EXISTS dontra_anh_tra/.test(sc), 'mất bảng ảnh cũ');

  const rt = fs.readFileSync(path.join(GOC, 'modules/dontra/routes.js'), 'utf8');
  check('đường ghi sổ trả bé của phân hệ vẫn còn', /app\.post\('\/api\/dontra\/tra-bang-anh'/.test(rt),
    'mất đường ghi sổ');

  const v = fs.readFileSync(path.join(GOC, 'public/js/views/attendance.js'), 'utf8');
  check('màn Điểm danh KHÔNG còn vẽ tab Trả bé nữa', !/att-tra/.test(v), 'vẫn còn ô att-tra');
}

tongKet(sv);
