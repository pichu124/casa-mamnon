// Bài canh HAI CHỖ ĐỌC BẢNG CÔNG CÒN LẠI khi bật tính công theo giờ cổng (K1-3).
//
// Chạy bằng:  node test/phan-hoi-2010-ngay-cong-bao-cao.test.mjs
//
// Từ ngày quy tắc tính công áp dụng, cổng THÔI chép sang `nhansu_cham_cong`;
// công của những ngày ấy tính lúc đọc bằng lib/ngay-cong.js. Màn tổng quan
// một ngày (`/api/admin/mot-ngay`) và tệp Excel "Điểm danh cô" của Xuất báo cáo
// mà còn đọc thẳng bảng công thì từ hôm bật sẽ đếm thiếu mọi cô chỉ chụp ở cổng.
//
// Bài này canh hai chiều:
//   - ngày nằm trong đợt quy tắc: hai chỗ ấy đếm cả ngày tính từ giờ cổng;
//   - không có đợt quy tắc nào chạm khoảng đang xem: kết quả Y HỆT trước khi bật.
//
// Bật quy tắc bằng API (chỉ cho từ ngày mai), rồi dời ngày áp dụng về MƯỜI
// NGÀY TRƯỚC bằng cách ghi thẳng vào bảng — cùng cách bài
// phan-hoi-2010-ngay-cong làm, vì API cố ý không cho chọn ngày đã qua.
import path from 'node:path';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ngay-cong-bao-cao');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu', 'diemdanh', 'xuatbaocao']);
const mk = {
  ht: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  bv: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3897), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const HT = await vao('hieutruong', mk.ht);
const BV = await vao('baove1', mk.bv);
const NS = await vao('nhansu1', mk.ns);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const T = HOM_NAY();
const D = (k) => new Date(Date.parse(`${T}T00:00:00Z`) - k * 86400000).toISOString().slice(0, 10);
const MAI = D(-1);
function csdl(fn) {
  const c = new Database(path.join(DIR, 'school.db'), { timeout: 10000 });
  try { return fn(c); } finally { c.close(); }
}
const tenCua = (id) => csdl((c) => {
  const u = c.prepare('SELECT title, name FROM users WHERE id = ?').get(id);
  return `${u.title || ''} ${u.name}`.trim();
});
const TEN_T1 = tenCua('t1');
const TEN_T2 = tenCua('t2');

const motNgay = async (ngay) => (await req('GET', `/api/admin/mot-ngay?ngay=${ngay}`, { cookie: HT })).data?.co;
async function tai(duong) {
  const r = await fetch(sv.BASE + duong, { headers: { Cookie: HT } });
  const buf = Buffer.from(await r.arrayBuffer());
  const ok = r.status === 200 && /spreadsheetml/.test(r.headers.get('content-type') || '');
  return { status: r.status, bang: ok ? xlsx.doc(buf) : null };
}
const hangCua = (t, ten) => ((t.bang || [])[0]?.hang || []).find(h => h && h[0] === ten) || null;
const chuCaTep = (t) => JSON.stringify(t.bang);
const xuat = (tu, den, kieu = 'trangthai') => tai(`/api/xuatbaocao/diemdanh-co?pham=truong&tu=${tu}&den=${den}&kieu=${kieu}`);

// Dựng sạch: chỉ những dòng bài này tự ghi.
csdl((c) => {
  c.exec('DELETE FROM nhansu_cham_cong; DELETE FROM staff_checkin;');
  const cong = c.prepare(`INSERT INTO staff_checkin (id, userId, ngay, gioVao, gioRa, campusId, capNhatLuc)
    VALUES (?, ?, ?, ?, ?, 'cs1', ?)`);
  const luc = new Date().toISOString();
  cong.run('cc_2', 't1', D(2), '07:00', '15:30', luc);   // đủ công
  cong.run('cc_3', 't1', D(3), '07:00', '14:00', luc);   // trọn ca sáng → nửa ngày
  cong.run('cc_4', 't1', D(4), '08:00', '11:00', luc);   // chưa đủ giờ → cần giải trình
  cong.run('cc_12', 't1', D(12), '07:00', '16:00', luc); // TRƯỚC ngày áp dụng, không có dòng công
  const tay = c.prepare(`INSERT INTO nhansu_cham_cong (userId, ngay, loai, gioVao, gioRa, ghiChu, nguoiGhi, capNhatLuc)
    VALUES (?, ?, ?, '', '', '', 'x', ?)`);
  tay.run('t2', D(2), 'nghi-phep', luc);                 // ghi tay — thắng mọi thứ
  tay.run('t2', D(12), 'di-lam', luc);
});

// ===========================================================================
console.log('\n[1] Quy tắc chưa bật: chụp lại kết quả hôm nay để so về sau');
const TRUOC = {
  ngay2: await motNgay(D(2)),
  ngay12: await motNgay(D(12)),
  trangThai: await xuat(D(10), D(1)),
  trangThaiCu: await xuat(D(14), D(11)),
  gio: await xuat(D(10), D(1), 'gio'),
};
{
  check('tổng quan đọc được khối chấm công', TRUOC.ngay2 && typeof TRUOC.ngay2.tong === 'number', TRUOC.ngay2);
  check(`${D(2)}: chỉ t2 nghỉ phép có trong bảng công, t1 chụp ở cổng chưa được đếm (luật cũ)`,
    TRUOC.ngay2.diLam === 0 && TRUOC.ngay2.nghi === 1 && TRUOC.ngay2.chuaCham === TRUOC.ngay2.tong - 1, TRUOC.ngay2);
  check('tệp xuất tải được', TRUOC.trangThai.status === 200 && !!TRUOC.trangThai.bang, TRUOC.trangThai.status);
  check('tệp xuất: 7 cột cũ, không có cột "Cần giải trình"',
    JSON.stringify(TRUOC.trangThai.bang[0].hang[0])
      === JSON.stringify(['Họ và tên', 'Vai / chức vụ', 'Đi làm', 'Nửa ngày', 'Nghỉ phép', 'Nghỉ không phép', 'Nghỉ lễ']),
    TRUOC.trangThai.bang[0].hang[0]);
  const h1 = hangCua(TRUOC.trangThai, TEN_T1);
  check('t1: chưa có ngày đi làm nào trong bảng công', h1 && h1[2] === '0' && h1[3] === '0', h1);
}

// ===========================================================================
console.log('\n[2] Bật quy tắc bằng API, dời ngày áp dụng về mười ngày trước');
{
  const bat = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, apDungTu: MAI } });
  check('Nhân sự bật quy tắc từ ngày mai → 200', bat.status === 200 && bat.data?.sapToi?.apDungTu === MAI, bat.data);
  csdl(c => c.prepare('UPDATE nhansu_quy_tac_cong SET apDungTu = ? WHERE apDungTu = ?').run(D(10), MAI));
  const q = await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS });
  check('quy tắc đang áp dụng từ mười ngày trước', q.data?.dangBat === true && q.data?.hienTai?.apDungTu === D(10), q.data);
  const a = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
  check('cổng chụp giờ vào của t1 hôm nay', a.status === 201 && a.data?.phan === 'vao', a.data);
  const dong = csdl(c => c.prepare('SELECT * FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?').get('t1', T));
  check('và KHÔNG chép sang bảng công (đúng luật K1)', !dong, dong);
}

// ===========================================================================
console.log('\n[3] Tổng quan một ngày đếm cả ngày tính từ giờ cổng');
{
  const n2 = await motNgay(D(2));
  check(`${D(2)}: t1 (đủ công ở cổng) tính là đi làm, t2 vẫn nghỉ phép`,
    n2 && n2.diLam === 1 && n2.nghi === 1 && n2.chuaCham === TRUOC.ngay2.chuaCham - 1, n2);
  const n4 = await motNgay(D(4));
  check(`${D(4)}: có giờ vào ở cổng (dù cần giải trình) vẫn là có đi làm`, n4 && n4.diLam === 1, n4);
  const hn = await motNgay(T);
  check('hôm nay: t1 vừa chụp vào (đang làm) được đếm là đi làm', hn && hn.diLam === 1, hn);
  check('ngày TRƯỚC ngày áp dụng: y hệt lúc chưa bật',
    JSON.stringify(await motNgay(D(12))) === JSON.stringify(TRUOC.ngay12), [await motNgay(D(12)), TRUOC.ngay12]);
}

// ===========================================================================
console.log('\n[4] Tệp Excel "Điểm danh cô" đếm cả ngày tính từ giờ cổng');
{
  const t = await xuat(D(10), D(1));
  check('tải được', t.status === 200 && !!t.bang, t.status);
  check('7 cột cũ giữ nguyên thứ tự, thêm "Cần giải trình" ở cuối',
    JSON.stringify(t.bang[0].hang[0]) === JSON.stringify(
      ['Họ và tên', 'Vai / chức vụ', 'Đi làm', 'Nửa ngày', 'Nghỉ phép', 'Nghỉ không phép', 'Nghỉ lễ', 'Cần giải trình']),
    t.bang[0].hang[0]);
  const h1 = hangCua(t, TEN_T1);
  check('t1: 1 ngày đi làm, 1 nửa ngày, 1 ngày cần giải trình — đều từ giờ cổng',
    h1 && h1[2] === '1' && h1[3] === '1' && h1[4] === '0' && h1[7] === '1', h1);
  const h2 = hangCua(t, TEN_T2);
  check('t2: ghi tay nghỉ phép vẫn thắng', h2 && h2[2] === '0' && h2[4] === '1', h2);
  check('tệp ghi rõ từ ngày nào tính theo giờ cổng',
    chuCaTep(t).includes('giờ vào/ra ở cổng') && chuCaTep(t).includes(D(10).split('-').reverse().join('/')), chuCaTep(t).slice(-400));

  const cu = await xuat(D(14), D(11));
  check('khoảng nằm hẳn trước ngày áp dụng: tệp y hệt lúc chưa bật',
    chuCaTep(cu) === chuCaTep(TRUOC.trangThaiCu), [chuCaTep(cu).slice(0, 300), chuCaTep(TRUOC.trangThaiCu).slice(0, 300)]);
  const g = await xuat(D(10), D(1), 'gio');
  check('kiểu "giờ vào ra" không đổi (giờ vốn đọc từ cổng)', chuCaTep(g) === chuCaTep(TRUOC.gio), chuCaTep(g).slice(0, 300));
}

// ===========================================================================
console.log('\n[5] Không còn đợt quy tắc nào: mọi thứ y hệt lúc chưa bật');
{
  // Mô phỏng một trường chưa từng bật — đợt có tatTu = apDungTu là đợt rỗng.
  csdl(c => c.prepare('UPDATE nhansu_quy_tac_cong SET tatTu = apDungTu').run());
  const q = await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS });
  check('quy tắc không áp dụng hôm nay', q.data?.dangBat === false, q.data);
  check(`tổng quan ${D(2)} y hệt lúc chưa bật`,
    JSON.stringify(await motNgay(D(2))) === JSON.stringify(TRUOC.ngay2), [await motNgay(D(2)), TRUOC.ngay2]);
  check('tệp "Bảng công" y hệt lúc chưa bật',
    chuCaTep(await xuat(D(10), D(1))) === chuCaTep(TRUOC.trangThai), chuCaTep(await xuat(D(10), D(1))).slice(0, 300));
  check('tệp "Giờ vào ra" y hệt lúc chưa bật',
    chuCaTep(await xuat(D(10), D(1), 'gio')) === chuCaTep(TRUOC.gio));
}

// ===========================================================================
console.log('\n[6] Tính công hỏng thì tệp xuất vẫn ra, theo bảng công như trước');
{
  // Ngày tắt không đọc được làm phép tính khoảng của đợt ném lỗi.
  csdl(c => c.prepare("UPDATE nhansu_quy_tac_cong SET tatTu = 'hỏng'").run());
  const t = await xuat(D(10), D(1));
  check('vẫn tải được', t.status === 200 && !!t.bang, t.status);
  check('và y hệt tệp theo bảng công lúc chưa bật', chuCaTep(t) === chuCaTep(TRUOC.trangThai), chuCaTep(t).slice(0, 300));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
