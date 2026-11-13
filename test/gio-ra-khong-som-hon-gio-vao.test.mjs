// Trong một ngày, giờ ra về của bé không được sớm hơn giờ vào lớp (Đ253).
//
// Chạy bằng:  node test/gio-ra-khong-som-hon-gio-vao.test.mjs
//
// LỖI ĐÃ CÓ THẬT: bé có giờ vào 16:57, cô gõ nhầm giờ ra về 16:45, máy chủ
// nhận và báo "Đã ghi". Sổ khi đó nói bé VỀ TRƯỚC KHI TỚI — gia đình đọc được
// dòng ấy, kèm cả tin "Cô đã trao con lúc 16:45".
//
// LUẬT, ở MỌI đường ghi giờ vào hoặc giờ ra của sổ điểm danh:
//
//   (a) có giờ vào, giờ ra gửi lên SỚM HƠN → từ chối (400), câu nêu rõ hai
//       giờ; sổ, ảnh, ghi chú, nhật ký, tin báo gia đình đều KHÔNG được ghi.
//   (b) giờ ra BẰNG giờ vào → nhận.
//   (c) bé chưa có giờ vào → như cũ, nhận.
//   (d) không có đường nào cho cô gõ giờ vào. Nhưng máy chủ tự đóng giờ vào
//       (= lúc chấm) ở ba đường: chấm từng bé, chấm cả nhóm, chụp ảnh tới
//       lớp. Dòng ĐÃ có giờ ra sớm hơn "bây giờ" thì ba đường ấy vẫn ghi
//       trạng thái, nhưng KHÔNG đóng một giờ vào muộn hơn giờ ra.
//   (e) bé nghỉ → như cũ: ghi được giờ ra, trạng thái nghỉ ở nguyên.
//
// GIỜ ĐƯỢC ĐẶT THẲNG VÀO BẢNG, không lấy theo đồng hồ lúc chạy: bài này phải
// cho cùng kết quả lúc 7 giờ sáng và lúc 11 giờ đêm.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('gio-ra-khong-som-hon-gio-vao');
sinhDuLieu(DIR);
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4799), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const co = (await login('giaovien', '123456')).cookie;
const NGAY = HOM_NAY();

// Một tấm PNG 1x1 hợp lệ.
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function csdl(viec) {
  const c = new Database(CSDL);
  try { return viec(c); } finally { c.close(); }
}
// Dựng HẲN dòng điểm danh hôm nay của một bé, hoặc xoá nó (`null`).
function datDong(studentId, dong) {
  csdl((c) => {
    c.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run(studentId, NGAY);
    c.prepare('DELETE FROM attendance_anh_ve WHERE studentId = ? AND date = ?').run(studentId, NGAY);
    c.prepare('DELETE FROM attendance_ghi_chu_ve WHERE studentId = ? AND date = ?').run(studentId, NGAY);
    c.prepare('DELETE FROM attendance_photo WHERE studentId = ? AND date = ?').run(studentId, NGAY);
    if (dong) {
      c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
                 VALUES (?, ?, ?, ?, ?, ?, '', 't1')`)
        .run(`att_thu_${studentId}`, studentId, NGAY, dong.status, dong.checkIn ?? null, dong.checkOut ?? null);
    }
  });
}
const dongCua = (studentId) => csdl(c =>
  c.prepare('SELECT status, checkIn, checkOut FROM attendance WHERE studentId = ? AND date = ?').get(studentId, NGAY));
// Mọi dấu vết một lượt ghi giờ ra để lại, gom về một chỗ để so trước/sau.
const dauVet = (studentId) => csdl(c => ({
  dong: c.prepare('SELECT status, checkIn, checkOut FROM attendance WHERE studentId = ? AND date = ?').get(studentId, NGAY),
  anhVe: c.prepare('SELECT COUNT(*) n FROM attendance_anh_ve WHERE studentId = ? AND date = ?').get(studentId, NGAY).n,
  ghiChuVe: c.prepare('SELECT COUNT(*) n FROM attendance_ghi_chu_ve WHERE studentId = ? AND date = ?').get(studentId, NGAY).n,
  nhatKy: c.prepare("SELECT COUNT(*) n FROM audit_log WHERE action = 'ghi-gio-ra-ve' AND target = ?").get(studentId).n,
  tinBao: c.prepare('SELECT COUNT(*) n FROM thongbao_be WHERE studentId = ?').get(studentId).n,
  tepAnh: fs.existsSync(path.join(DIR, 'uploads')) ? fs.readdirSync(path.join(DIR, 'uploads')).length : 0,
}));
const nhuNhau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const raVe = (than) => req('POST', '/api/attendance/ra-ve', { cookie: co, body: { date: NGAY, ...than } });
const phut = (g) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(g || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
// Luật của cả bài, viết một lần: dòng nào có đủ hai giờ thì ra không trước vào.
const dungThuTu = (d) => !d || phut(d.checkIn) === null || phut(d.checkOut) === null || phut(d.checkOut) >= phut(d.checkIn);

// ===========================================================================
console.log('\n[a] GIỜ RA SỚM HƠN GIỜ VÀO → TỪ CHỐI, sổ không bị ghi');
{
  datDong('s1', { status: 'present', checkIn: '16:57' });
  const truoc = dauVet('s1');
  check('đối chứng — bé có giờ vào 16:57, chưa có giờ ra',
    truoc.dong && truoc.dong.checkIn === '16:57' && truoc.dong.checkOut === null, truoc.dong);

  let r = await raVe({ studentId: 's1', gio: '16:45' });
  check('giờ ra 16:45 cho bé vào lúc 16:57 → 400', r.status === 400, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  const cau = String(r.data?.error || '');
  check('câu từ chối nêu rõ CẢ HAI giờ', cau.includes('16:45') && cau.includes('16:57'), cau);
  check('…bằng tiếng của trường, không lộ chữ kỹ thuật',
    /giờ ra về/i.test(cau) && /sớm hơn/.test(cau) && !/checkIn|checkOut|gio\b|null|undefined/.test(cau), cau);
  check('SỔ KHÔNG BỊ GHI: mọi dấu vết y như trước', nhuNhau(dauVet('s1'), truoc), { truoc, sau: dauVet('s1') });

  // Kèm ảnh và ghi chú: bị từ chối thì ảnh không được lưu, gia đình không
  // được báo "Cô đã trao con lúc 16:45".
  r = await raVe({ studentId: 's1', gio: '16:45', anh: ANH, ghiChu: 'Bà đón' });
  check('kèm ảnh và ghi chú vẫn bị từ chối (400)', r.status === 400, r.status);
  check('KHÔNG lưu ảnh, KHÔNG ghi chú, KHÔNG nhật ký, KHÔNG báo gia đình',
    nhuNhau(dauVet('s1'), truoc), { truoc, sau: dauVet('s1') });

  // Sát nút: sớm hơn đúng một phút.
  r = await raVe({ studentId: 's1', gio: '16:56' });
  check('sớm hơn đúng một phút (16:56) cũng từ chối', r.status === 400, r.status);

  // Đã có giờ ra ĐÚNG rồi, gửi đè một giờ sai: giờ đúng phải còn nguyên.
  r = await raVe({ studentId: 's1', gio: '17:10' });
  check('đối chứng — giờ ra hợp lệ 17:10 ghi được', r.status === 200 && r.data.gio === '17:10', `${r.status} ${r.data?.error || ''}`);
  r = await raVe({ studentId: 's1', gio: '16:00' });
  check('gửi đè giờ sai 16:00 → 400', r.status === 400, r.status);
  check('…và giờ ra đúng 17:10 CÒN NGUYÊN', dongCua('s1').checkOut === '17:10', dongCua('s1'));
}

// ===========================================================================
console.log('\n[b] GIỜ RA BẰNG GIỜ VÀO → NHẬN; ca hợp lệ vẫn ghi như cũ');
{
  datDong('s1', { status: 'present', checkIn: '16:57' });
  let r = await raVe({ studentId: 's1', gio: '16:57' });
  check('giờ ra 16:57 = giờ vào 16:57 → 200', r.status === 200, `${r.status} ${r.data?.error || ''}`);
  check('sổ mang giờ ra 16:57', dongCua('s1').checkOut === '16:57', dongCua('s1'));

  r = await raVe({ studentId: 's1', gio: '16:58', anh: ANH, ghiChu: 'Bà đón' });
  check('muộn hơn một phút, kèm ảnh và ghi chú → 200', r.status === 200, `${r.status} ${r.data?.error || ''}`);
  check('câu trả lời thành công giữ nguyên hình dạng',
    r.data && r.data.ok === true && r.data.date === NGAY && r.data.gio === '16:58'
    && r.data.anh && typeof r.data.anh.file === 'string' && r.data.record && r.data.record.checkOut === '16:58'
    && r.data.ghiChuVe === 'Bà đón'
    && nhuNhau(Object.keys(r.data).sort(), ['anh', 'date', 'ghiChuVe', 'gio', 'ok', 'record']), r.data);
  const v = dauVet('s1');
  check('ảnh, ghi chú, nhật ký, tin báo gia đình đều được ghi',
    v.anhVe === 1 && v.ghiChuVe === 1 && v.nhatKy >= 2 && v.tinBao >= 1 && v.tepAnh >= 1, v);

  // Không gửi giờ: máy chủ lấy "bây giờ". Bé vừa được chấm có mặt (giờ vào
  // cũng là "bây giờ") thì giờ ra ngay sau đó phải ghi được — cô chấm bù rồi
  // trao bé luôn là chuyện có thật lúc chiều muộn.
  datDong('s5', null);
  const cham = await req('POST', '/api/attendance/mark', { cookie: co, body: { studentId: 's5', date: NGAY, status: 'present' } });
  check('đối chứng — chấm có mặt thì máy chủ đóng giờ vào', cham.status === 200 && /^\d{2}:\d{2}$/.test(String(cham.data.checkIn)), cham.data);
  r = await raVe({ studentId: 's5' });
  check('vừa chấm có mặt xong, ghi giờ ra không kèm giờ → 200', r.status === 200, `${r.status} ${r.data?.error || ''}`);
  check('…và dòng ấy đúng thứ tự vào trước ra sau', dungThuTu(dongCua('s5')) && !!dongCua('s5').checkOut, dongCua('s5'));
}

// ===========================================================================
console.log('\n[a/b] SO THEO GIỜ PHÚT, không so theo chữ: giờ cũ thiếu số 0, giờ có giây');
{
  // Dữ liệu nhập từ tệp có thể ghi "9:30". So chữ thì "10:00" < "9:30" — bé
  // về lúc 10 giờ bị từ chối oan; và "07:04" > "7:05" — giờ sai lại lọt.
  datDong('s1', { status: 'present', checkIn: '9:30' });
  let r = await raVe({ studentId: 's1', gio: '10:00' });
  check('giờ vào "9:30", giờ ra 10:00 → nhận (không từ chối oan)', r.status === 200, `${r.status} ${r.data?.error || ''}`);
  datDong('s1', { status: 'present', checkIn: '7:05' });
  r = await raVe({ studentId: 's1', gio: '07:04' });
  check('giờ vào "7:05", giờ ra 07:04 → từ chối', r.status === 400, r.status);
  check('…câu từ chối viết giờ vào đủ hai chữ số (07:05)', String(r.data?.error || '').includes('07:05'), r.data?.error);
  r = await raVe({ studentId: 's1', gio: '07:05' });
  check('giờ vào "7:05", giờ ra 07:05 → nhận', r.status === 200, r.status);

  datDong('s1', { status: 'present', checkIn: '16:57:40' });
  r = await raVe({ studentId: 's1', gio: '16:57' });
  check('giờ vào có giây "16:57:40", giờ ra 16:57 → nhận (cùng phút)', r.status === 200, `${r.status} ${r.data?.error || ''}`);
  r = await raVe({ studentId: 's1', gio: '16:56' });
  check('…còn 16:56 thì từ chối', r.status === 400, r.status);
}

// ===========================================================================
console.log('\n[c] BÉ CHƯA CÓ GIỜ VÀO → như cũ');
{
  datDong('s1', { status: 'late', checkIn: null });
  let r = await raVe({ studentId: 's1', gio: '06:00' });
  check('bé "tới muộn" chưa có giờ vào: giờ ra nào cũng nhận', r.status === 200 && r.data.gio === '06:00', `${r.status} ${r.data?.error || ''}`);
  check('…giờ vào vẫn trống, trạng thái vẫn "tới muộn"',
    dongCua('s1').checkIn === null && dongCua('s1').status === 'late' && dongCua('s1').checkOut === '06:00', dongCua('s1'));

  datDong('s4', null);
  r = await raVe({ studentId: 's4', gio: '16:45' });
  check('bé chưa có dòng điểm danh → vẫn từ chối bằng câu cũ',
    r.status === 400 && /chưa có dòng điểm danh/.test(String(r.data?.error || '')), `${r.status} ${r.data?.error || ''}`);
  check('…và không tự sinh dòng', dongCua('s4') === undefined, dongCua('s4'));
}

// ===========================================================================
console.log('\n[e] BÉ NGHỈ → như cũ');
{
  datDong('s3', { status: 'absent_excused', checkIn: null });
  const r = await raVe({ studentId: 's3', gio: '16:45' });
  check('bé nghỉ: bấm ra về vẫn ghi được giờ ra', r.status === 200 && r.data.record.checkOut === '16:45', `${r.status} ${r.data?.error || ''}`);
  check('…trạng thái nghỉ ở nguyên', dongCua('s3').status === 'absent_excused', dongCua('s3'));
}

// ===========================================================================
console.log('\n[d] MÁY CHỦ TỰ ĐÓNG GIỜ VÀO — không được đóng một giờ muộn hơn giờ ra đã có');
{
  // Giờ ra 00:00 thì "bây giờ" lúc nào cũng không sớm hơn nó. (Chạy đúng phút
  // 00:00 thì giờ vào = giờ ra, vẫn đúng thứ tự — phép kiểm vẫn đứng.)
  const bayGio = ngay.bayGio();

  // Chấm từng bé: bé "tới muộn" (chưa có giờ vào) đã về, cô sửa thành "có mặt".
  datDong('s1', { status: 'late', checkIn: null, checkOut: '00:00' });
  let r = await req('POST', '/api/attendance/mark', { cookie: co, body: { studentId: 's1', date: NGAY, status: 'present' } });
  check('chấm từng bé: sửa "tới muộn" → "có mặt" vẫn được', r.status === 200 && dongCua('s1').status === 'present', `${r.status} ${r.data?.error || ''}`);
  check('…giờ ra đã ghi CÒN NGUYÊN', dongCua('s1').checkOut === '00:00', dongCua('s1'));
  check('…và KHÔNG đóng giờ vào muộn hơn giờ ra', dungThuTu(dongCua('s1')), { ...dongCua('s1'), bayGio });

  // Chấm cả nhóm, ghi đè.
  datDong('s5', { status: 'late', checkIn: null, checkOut: '00:00' });
  r = await req('POST', '/api/attendance/mark-all', { cookie: co, body: { date: NGAY, status: 'present', ghiDe: true } });
  check('chấm cả nhóm (ghi đè) vẫn được', r.status === 200 && dongCua('s5').status === 'present', `${r.status} ${r.data?.error || ''}`);
  check('…giờ ra của bé đã về CÒN NGUYÊN', dongCua('s5').checkOut === '00:00', dongCua('s5'));
  check('…và KHÔNG đóng giờ vào muộn hơn giờ ra', dungThuTu(dongCua('s5')), { ...dongCua('s5'), bayGio });

  // Chụp ảnh tới lớp cho bé đang ghi nghỉ mà lỡ có giờ ra (bấm nhầm trước đó).
  datDong('s3', { status: 'absent_excused', checkIn: null, checkOut: '00:00' });
  r = await req('POST', '/api/attendance/anh', { cookie: co, body: { studentId: 's3', date: NGAY, anh: ANH } });
  check('chụp ảnh tới lớp: bé thành "có mặt" như cũ', r.status === 201 && dongCua('s3').status === 'present', `${r.status} ${r.data?.error || ''}`);
  check('…giờ ra đã ghi CÒN NGUYÊN (không tự xoá dữ liệu)', dongCua('s3').checkOut === '00:00', dongCua('s3'));
  check('…và KHÔNG đóng giờ vào muộn hơn giờ ra', dungThuTu(dongCua('s3')), { ...dongCua('s3'), bayGio });

  // CHIỀU NGƯỢC LẠI — không được chặn quá tay: giờ ra CHƯA tới (23:59) thì
  // giờ vào "bây giờ" vẫn đúng thứ tự, và vẫn phải được đóng như cũ.
  datDong('s1', { status: 'late', checkIn: null, checkOut: '23:59' });
  r = await req('POST', '/api/attendance/mark', { cookie: co, body: { studentId: 's1', date: NGAY, status: 'present' } });
  check('giờ ra muộn hơn "bây giờ": chấm có mặt vẫn đóng giờ vào như cũ',
    r.status === 200 && /^\d{2}:\d{2}$/.test(String(dongCua('s1').checkIn)) && dungThuTu(dongCua('s1')), dongCua('s1'));

  // Dòng chưa có giờ ra: ba đường vẫn đóng giờ vào như cũ.
  datDong('s1', null);
  r = await req('POST', '/api/attendance/mark', { cookie: co, body: { studentId: 's1', date: NGAY, status: 'present' } });
  check('chưa có giờ ra: chấm từng bé vẫn đóng giờ vào', /^\d{2}:\d{2}$/.test(String(dongCua('s1')?.checkIn)), dongCua('s1'));
  datDong('s3', { status: 'absent_excused', checkIn: null });
  r = await req('POST', '/api/attendance/anh', { cookie: co, body: { studentId: 's3', date: NGAY, anh: ANH } });
  check('chưa có giờ ra: chụp ảnh tới lớp vẫn đóng giờ vào', r.status === 201 && /^\d{2}:\d{2}$/.test(String(dongCua('s3')?.checkIn)), dongCua('s3'));
}

// ===========================================================================
console.log('\n[*] CẢ SỔ HÔM NAY: không còn dòng nào ra trước vào');
{
  const ca = csdl(c => c.prepare('SELECT studentId, checkIn, checkOut FROM attendance WHERE date = ?').all(NGAY));
  check('đối chứng — sổ hôm nay có dòng để soi', ca.length >= 3, ca.length);
  const sai = ca.filter(d => !dungThuTu(d));
  check('KHÔNG dòng nào có giờ ra sớm hơn giờ vào', sai.length === 0, sai);
}

sv.dung();
tongKet();
