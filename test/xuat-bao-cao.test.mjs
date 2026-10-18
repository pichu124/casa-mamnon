// Bài canh phân hệ XUẤT BÁO CÁO (Đ239c — góp ý 16/10, mục 2 và 3).
//
// Chạy bằng:  node test/xuat-bao-cao.test.mjs
//
// Tệp Excel là thứ ĐI RA KHỎI APP: nằm trong thư mục Tải về, gửi qua Zalo, chép
// vào USB. Nên bài này soi ba chiều cùng lúc:
//
//   1. ĐÚNG DỮ LIỆU — mỗi phần ra .xlsx thật, đọc lại được, đúng cột, đúng số.
//   2. KHÔNG NỚI QUYỀN — phần nào cũng chỉ mở với người VỐN đã mở được màn gốc
//      của dữ liệu ấy; tài khoản một cơ sở không xuất được cơ sở khác.
//   3. KHÔNG LÀM HỎNG GÌ — phân hệ nguồn tắt thì đúng phần ấy báo tắt, phần khác
//      vẫn chạy; tắt Xuất báo cáo thì API 404 và dữ liệu nguồn không đổi.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem,
  taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('xuat-bao-cao');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['xuatbaocao', 'tienan', 'nhansu', 'baocaohoctap', 'kehoachbe']);

const mk = {
  ht: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  ql1: taoQuanTri(DIR, 'Quản lý CS1', 'qlcs1'),
  ql2: taoQuanTri(DIR, 'Quản lý CS2', 'qlcs2'),
  vp: taoQuanTri(DIR, 'Văn phòng CS1', 'vpcs1'),
  kt: taoQuanTri(DIR, 'Chị Kế Toán', 'ketoan1'),
  ns: taoQuanTri(DIR, 'Chị Nhân Sự', 'nhansu1'),
  mkt: taoQuanTri(DIR, 'Chị Marketing', 'marketing1'),
};
khoaVaoCoSo(DIR, 'qlcs1', 'cs1'); datChucVu(DIR, 'qlcs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'qlcs2', 'cs2'); datChucVu(DIR, 'qlcs2', 'quanly-coso');
khoaVaoCoSo(DIR, 'vpcs1', 'cs1'); datChucVu(DIR, 'vpcs1', 'vanphong-coso');
datChucVu(DIR, 'ketoan1', 'ketoan');
datChucVu(DIR, 'nhansu1', 'nhansu');
datChucVu(DIR, 'marketing1', 'marketing');

// ---------------------------------------------------------------------------
// MỘT THÁNG ĐÃ QUA, KHÔNG CÓ DỮ LIỆU MẪU NÀO — để mọi con số đếm được bằng tay.
// Dữ liệu mẫu điểm danh 20 ngày học gần nhất; lùi 100 ngày là chắc chắn trống.
// ---------------------------------------------------------------------------
const lui = (n) => new Date(Date.parse(`${HOM_NAY()}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const THANG_CU = lui(100).slice(0, 7);
const THANG_NAY = HOM_NAY().slice(0, 7);
const NGAY_THUONG = [];
for (let d = 1; d <= 31; d++) {
  const t = Date.parse(`${THANG_CU}-${String(d).padStart(2, '0')}T00:00:00Z`);
  const ng = new Date(t);
  if (Number.isNaN(t) || ng.toISOString().slice(0, 7) !== THANG_CU) break;
  if (ng.getUTCDay() >= 1 && ng.getUTCDay() <= 5) NGAY_THUONG.push(ng.toISOString().slice(0, 10));
}
const [D0, D1, D2, D3, D4, D5] = NGAY_THUONG;
const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const dmy = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const TEN_CONG_THUC = '=HYPERLINK("http://x","Bấm")';

{
  const c = new Database(path.join(DIR, 'school.db'));
  const be = c.prepare(`INSERT INTO students (id, code, name, dob, gender, classId, active, leftAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  // sx1 được nhận vào app giữa tháng (ngày D2): ngày trước đó không phải
  // "chưa điểm danh". Bé An thì đã có từ lâu (dữ liệu mẫu ghi ngày tạo là hôm nay).
  be.run('sx1', '+84MN', TEN_CONG_THUC, '2021-05-05', 'Nam', 'c1', 1, null, D2);
  c.prepare("UPDATE students SET createdAt = ? WHERE id = 's1'").run(lui(400));
  be.run('sx2', 'MNCS2', 'Bé Cơ Sở Hai', '2021-06-06', 'Nữ', 'c3', 1, null, D0);
  be.run('sx3', 'MNNGHI', 'Bé Đã Nghỉ', '2021-07-07', 'Nam', 'c1', 0, D0, D0);
  const dd = c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
    VALUES (?, ?, ?, ?, ?, ?, '', 't1')`);
  dd.run('xb1', 's1', D0, 'present', '07:20', '16:30');
  dd.run('xb2', 's1', D1, 'late', '08:40', '16:30');
  dd.run('xb3', 's1', D2, 'absent_excused', null, null);
  dd.run('xb4', 's1', D3, 'absent_unexcused', null, null);
  dd.run('xb5', 'sx1', D0, 'present', '07:25', null);
  dd.run('xb6', 'sx2', D0, 'present', '07:30', '16:00');
  // Ba bé nhóm c1 đã thôi đi học (mục [13]): bảo lưu từ D3 sau ba ngày đi học,
  // nghỉ hẳn từ D2 sau một ngày đi học, và một bé nghỉ từ trước tháng cũ.
  be.run('sx4', 'MNBL', 'Bé Bảo Lưu', '2021-08-08', 'Nữ', 'c1', 0, D3, lui(400));
  be.run('sx5', 'MNNGT', 'Bé Nghỉ Giữa Tháng', '2021-09-09', 'Nam', 'c1', 0, D2, lui(400));
  be.run('sx6', 'MNNTL', 'Bé Nghỉ Từ Lâu', '2021-10-10', 'Nữ', 'c1', 0, lui(140), lui(400));
  c.prepare(`INSERT INTO hoc_sinh_bao_luu (studentId, tuNgay, duKienQuayLai, lyDo, nguoiGhi, ghiLuc)
    VALUES ('sx4', ?, '', '', NULL, ?)`).run(D3, D3);
  dd.run('xb7', 'sx4', D0, 'present', '07:30', '16:30');
  dd.run('xb8', 'sx4', D1, 'present', '07:30', '16:30');
  dd.run('xb9', 'sx4', D2, 'present', '07:30', '16:30');
  dd.run('xb10', 'sx5', D0, 'present', '07:40', '16:20');
  dd.run('xb11', 'sx6', lui(141), 'present', '07:40', '16:20');
  c.prepare(`INSERT INTO lich_nghi_truong (id, ten, tuNgay, denNgay, loai, campusId, hoanTienAn, ghiChu, taoLuc)
    VALUES ('lnx1', 'Nghỉ thử', ?, ?, 'khac', '', 'co', '', ?)`).run(D5, D5, D0);
  const cc = c.prepare(`INSERT INTO staff_checkin (id, userId, ngay, gioVao, gioRa, anhVao, anhRa, campusId, capNhatLuc)
    VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)`);
  cc.run('ccx1', 't1', D0, '07:05', '16:40', 'cong-thu-1.jpg', 'cs1', D0);
  cc.run('ccx2', 't1', D1, '07:10', '', '', 'cs1', D1);
  cc.run('ccx3', 't2', D0, '07:00', '17:00', '', 'cs1', D0);
  const ql2 = c.prepare('SELECT id FROM users WHERE username = ?').get('qlcs2').id;
  cc.run('ccx4', ql2, D0, '07:15', '16:00', '', 'cs2', D0);
  c.close();
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4887), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const HT = await vao('hieutruong', mk.ht);
const QL1 = await vao('qlcs1', mk.ql1);
const QL2 = await vao('qlcs2', mk.ql2);
const VP = await vao('vpcs1', mk.vp);
const KT = await vao('ketoan1', mk.kt);
const NS = await vao('nhansu1', mk.ns);
const MKT = await vao('marketing1', mk.mkt);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;
const conn = () => new Database(path.join(DIR, 'school.db'), { readonly: true });
const idCua = (u) => { const c = conn(); const r = c.prepare('SELECT id FROM users WHERE username = ?').get(u); c.close(); return r && r.id; };

// Mọi tệp đã tải về, để mục [10] soi chung một lượt.
const MOI_TEP = [];
async function tai(duong, cookie) {
  const r = await fetch(sv.BASE + duong, { headers: { Cookie: cookie } });
  const kieu = r.headers.get('content-type') || '';
  const ten = r.headers.get('content-disposition') || '';
  const buf = Buffer.from(await r.arrayBuffer());
  let bang = null;
  let json = null;
  if (r.status === 200 && /spreadsheetml/.test(kieu)) {
    bang = xlsx.doc(buf);
    MOI_TEP.push({ duong, bang });
  } else {
    try { json = JSON.parse(buf.toString('utf8')); } catch { json = null; }
  }
  return { status: r.status, kieu, ten, bang, json, buf };
}
const trang = (t, i = 0) => ((t.bang || [])[i] || { hang: [] });
const dongCo = (t, chu, i = 0) => trang(t, i).hang.filter(h => (h || []).some(o => String(o ?? '').includes(chu)));
const chuCaTep = (t) => (t.bang || []).map(b => b.hang.map(h => (h || []).join('\t')).join('\n')).join('\n');
const API = '/api/xuatbaocao';

// ===========================================================================
console.log('\n[1] Phân hệ có mặt, khai đúng: chỉ nhà trường, bật sẵn');
{
  const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/xuatbaocao/module.json'), 'utf8'));
  check('key "xuatbaocao", tên "Xuất báo cáo"', mj.key === 'xuatbaocao' && mj.name === 'Xuất báo cáo', mj);
  check('chỉ vai nhà trường', JSON.stringify(mj.roles) === '["admin"]', mj.roles);
  check('vùng API đúng một đường', JSON.stringify(mj.api) === '["/api/xuatbaocao"]', mj.api);
  check('bật sẵn', mj.defaultEnabled === true, mj.defaultEnabled);
  const ds = (await req('GET', '/api/modules', { cookie: HT })).data || [];
  check('ban giám hiệu thấy ô Xuất báo cáo', ds.some(m => m.key === 'xuatbaocao'), ds.map(m => m.key));
  const dsCo = (await req('GET', '/api/modules', { cookie: GV })).data || [];
  check('cô KHÔNG thấy ô', !dsCo.some(m => m.key === 'xuatbaocao'));
  const dsPh = (await req('GET', '/api/modules', { cookie: PH })).data || [];
  check('gia đình KHÔNG thấy ô', !dsPh.some(m => m.key === 'xuatbaocao'));
  const dsKt = (await req('GET', '/api/modules', { cookie: KT })).data || [];
  check('kế toán thấy ô (để tải đối chiếu tiền ăn)', dsKt.some(m => m.key === 'xuatbaocao'), dsKt.map(m => m.key));
  const dsMkt = (await req('GET', '/api/modules', { cookie: MKT })).data || [];
  check('marketing KHÔNG thấy ô — không phần nào là việc của họ', !dsMkt.some(m => m.key === 'xuatbaocao'));
}

// ===========================================================================
console.log('\n[2] Cô, gia đình, marketing: mọi đường đều 403');
{
  const duong = [
    `${API}/pham-vi`,
    `${API}/diemdanh-be?pham=truong&thang=${THANG_CU}&kieu=gio`,
    `${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=gio`,
    `${API}/baocao-hoctap?pham=truong&loai=thang&thang=${THANG_NAY}`,
    `${API}/kehoach-be?pham=truong&thang=${THANG_NAY}`,
    `${API}/ho-so-be?pham=truong`,
  ];
  for (const [ai, ck] of [['cô', GV], ['gia đình', PH], ['marketing', MKT]]) {
    const ma = [];
    for (const d of duong) ma.push((await tai(d, ck)).status);
    check(`${ai}: mọi đường 403`, ma.every(s => s === 403), ma);
  }
  const loi = await tai(`${API}/diemdanh-be?pham=truong&thang=${THANG_CU}&kieu=gio`, GV);
  check('lời từ chối bằng tiếng Việt', loi.json && /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệ]/i.test(loi.json.error || ''), loi.json);
}

// ===========================================================================
console.log('\n[3] /pham-vi: mỗi người thấy đúng phần của mình');
{
  const ht = (await req('GET', `${API}/pham-vi`, { cookie: HT })).data || {};
  const p = ht.phan || {};
  check('ban giám hiệu: cả sáu phần đều mở',
    ['diemDanhBe', 'diemDanhCo', 'tienAn', 'baoCaoHocTap', 'keHoachBe', 'hoSoBe'].every(k => p[k] && p[k].duoc), p);
  check('ban giám hiệu chọn được cả trường', ht.caTruong === true, ht.caTruong);
  check('ba cơ sở', (ht.coSo || []).length === 3, ht.coSo);
  check('danh sách bé có bé cơ sở 2', (ht.be || []).some(b => b.id === 'sx2'));

  const ql = (await req('GET', `${API}/pham-vi`, { cookie: QL1 })).data || {};
  check('quản lý cơ sở 1: KHÔNG chọn được cả trường', ql.caTruong === false, ql.caTruong);
  check('chỉ thấy cơ sở của mình', (ql.coSo || []).map(c => c.id).join() === 'cs1', ql.coSo);
  check('nhóm chỉ của cơ sở 1', (ql.nhom || []).length > 0 && !(ql.nhom || []).some(n => n.id === 'c3'), ql.nhom);
  check('bé không có bé cơ sở 2', !(ql.be || []).some(b => b.id === 'sx2'));
  check('người không có người cơ sở 2', !(ql.nguoi || []).some(n => n.id === idCua('qlcs2')), (ql.nguoi || []).length);

  const kt = (await req('GET', `${API}/pham-vi`, { cookie: KT })).data || {};
  const pk = kt.phan || {};
  check('kế toán: chỉ phần tiền ăn mở',
    pk.tienAn && pk.tienAn.duoc && !['diemDanhBe', 'diemDanhCo', 'baoCaoHocTap', 'keHoachBe', 'hoSoBe'].some(k => pk[k] && pk[k].duoc), pk);
  check('kế toán KHÔNG nhận danh sách bé', !(kt.be || []).length, (kt.be || []).length);
  check('kế toán KHÔNG nhận danh sách người', !(kt.nguoi || []).length, (kt.nguoi || []).length);

  const ns = (await req('GET', `${API}/pham-vi`, { cookie: NS })).data || {};
  const pn = ns.phan || {};
  check('nhân sự: chỉ phần điểm danh cô và nhân viên',
    pn.diemDanhCo && pn.diemDanhCo.duoc && !['diemDanhBe', 'tienAn', 'baoCaoHocTap', 'keHoachBe', 'hoSoBe'].some(k => pn[k] && pn[k].duoc), pn);
  check('nhân sự KHÔNG nhận danh sách bé', !(ns.be || []).length, (ns.be || []).length);

  const vp = (await req('GET', `${API}/pham-vi`, { cookie: VP })).data || {};
  const pv = vp.phan || {};
  check('văn phòng cơ sở: điểm danh bé, điểm danh cô, tiền ăn, hồ sơ bé',
    ['diemDanhBe', 'diemDanhCo', 'tienAn', 'hoSoBe'].every(k => pv[k] && pv[k].duoc), pv);
  check('văn phòng KHÔNG có báo cáo học tập, kế hoạch của bé (API gốc chặn văn phòng)',
    !(pv.baoCaoHocTap && pv.baoCaoHocTap.duoc) && !(pv.keHoachBe && pv.keHoachBe.duoc), pv);
}

// ===========================================================================
console.log('\n[4] Điểm danh bé — giờ vào ra, và có mặt / nghỉ phép / nghỉ không phép');
{
  const g = await tai(`${API}/diemdanh-be?pham=truong&thang=${THANG_CU}&kieu=gio`, HT);
  check('tải được tệp Excel thật', g.status === 200 && /spreadsheetml/.test(g.kieu), [g.status, g.kieu, g.json]);
  check('trình duyệt nhận là tệp tải về, tên có tháng', /attachment/.test(g.ten) && /\.xlsx/.test(g.ten) && g.ten.includes(THANG_CU), g.ten);
  check('đúng cột', JSON.stringify(trang(g).hang[0])
    === JSON.stringify(['Ngày', 'Mã bé', 'Họ và tên', 'Nhóm lớp', 'Trạng thái', 'Giờ vào', 'Giờ ra', 'Ghi chú']), trang(g).hang[0]);
  const an = dongCo(g, 'Nguyễn Bảo An');
  check('bé An đủ bốn ngày', an.length === 4, an);
  check('trạng thái bằng chữ, giờ vào giờ ra đúng',
    an.some(h => h[0] === dmy(D0) && h[4] === 'Có mặt' && h[5] === '07:20' && h[6] === '16:30')
    && an.some(h => h[0] === dmy(D1) && h[4] === 'Đến muộn' && h[5] === '08:40')
    && an.some(h => h[4] === 'Nghỉ có phép') && an.some(h => h[4] === 'Nghỉ không phép'), an);
  check('cả trường có cả bé cơ sở 2', dongCo(g, 'Bé Cơ Sở Hai').length === 1);
  const ngayCot = trang(g).hang.slice(1).map(h => h[0]);
  const ngayIso = ngayCot.map(s => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`);
  check('sắp theo ngày', ngayIso.every((x, i) => i === 0 || ngayIso[i - 1] <= x), ngayCot);

  const t = await tai(`${API}/diemdanh-be?pham=nhom&classId=c1&thang=${THANG_CU}&kieu=trangthai`, HT);
  check('kiểu có mặt / nghỉ: tải được', t.status === 200 && t.bang && t.bang.length >= 2, [t.status, t.json]);
  check('trang tổng hợp đúng cột', JSON.stringify(trang(t).hang[0]) === JSON.stringify(
    ['Mã bé', 'Họ và tên', 'Nhóm lớp', 'Có mặt', 'Đến muộn', 'Nghỉ có phép', 'Nghỉ không phép', 'Chưa điểm danh', 'Ghi chú']), trang(t).hang[0]);
  const a = dongCo(t, 'Nguyễn Bảo An')[0] || [];
  check('đếm đúng từng trạng thái của bé An', a[3] === '1' && a[4] === '1' && a[5] === '1' && a[6] === '1', a);
  check('"chưa điểm danh" đếm ngày thường, trừ ngày trường nghỉ',
    a[7] === String(NGAY_THUONG.length - 4 - 1), { thay: a[7], phaiLa: NGAY_THUONG.length - 5 });
  const x1 = dongCo(t, '+84MN')[0] || [];
  check('bé nhận vào giữa tháng: không đếm ngày trước khi bé có trong sổ',
    x1[3] === '1' && x1[7] === String(NGAY_THUONG.filter(ng => ng >= D2).length - 1), { thay: x1, phaiLa: NGAY_THUONG.filter(ng => ng >= D2).length - 1 });
  check('một nhóm thì KHÔNG có bé nhóm khác', !dongCo(t, 'Nguyễn Bảo Nam').length && !dongCo(t, 'Bé Cơ Sở Hai').length);
  const tenBe = trang(t).hang.slice(1).filter(h => h && /^\d+$/.test(String(h[3] ?? '')))
    .map(h => String(h[1]).replace(/^'/, ''));
  check('sắp theo TÊN, không theo con số', JSON.stringify(tenBe)
    === JSON.stringify([...tenBe].sort((x, y) => String(x).localeCompare(String(y), 'vi'))), tenBe);
  const luoi = trang(t, 1);
  const tieuDe = luoi.hang[0] || [];
  check('lưới ngày có cột từng ngày', tieuDe.includes(dm(D0)) && tieuDe.includes(dm(D3)), tieuDe);
  const anL = (luoi.hang.find(h => h && h[1] === 'Nguyễn Bảo An')) || [];
  const o = (ng) => anL[tieuDe.indexOf(dm(ng))];
  check('ký hiệu C / M / P / K đúng ngày', o(D0) === 'C' && o(D1) === 'M' && o(D2) === 'P' && o(D3) === 'K', [o(D0), o(D1), o(D2), o(D3)]);
  check('ngày trường nghỉ ghi TN, không bỏ trống như chưa điểm danh', o(D5) === 'TN', o(D5));
  check('có dòng chú giải ký hiệu', dongCo(t, 'C = Có mặt', 1).length === 1, luoi.hang.slice(-2));

  const motBe = await tai(`${API}/diemdanh-be?pham=be&studentId=s1&thang=${THANG_CU}&kieu=gio`, HT);
  check('một bé: chỉ dòng của bé đó', trang(motBe).hang.length === 5 && dongCo(motBe, 'Nguyễn Bảo An').length === 4, trang(motBe).hang.length);

  const khoang = await tai(`${API}/diemdanh-be?pham=be&studentId=s1&tu=${D1}&den=${D2}&kieu=gio`, HT);
  check('khoảng ngày tự chọn: đúng hai ngày', dongCo(khoang, 'Nguyễn Bảo An').length === 2, trang(khoang).hang);
  const sai = await tai(`${API}/diemdanh-be?pham=be&studentId=s1&tu=${D2}&den=${D1}&kieu=gio`, HT);
  check('khoảng ngược chiều → 400', sai.status === 400, sai.status);

  // Tài khoản MỘT cơ sở.
  for (const [ten2, q] of [['cả trường', 'pham=truong'], ['cơ sở khác', 'pham=coso&campusId=cs2'],
    ['nhóm cơ sở khác', 'pham=nhom&classId=c3'], ['bé cơ sở khác', 'pham=be&studentId=sx2']]) {
    const r = await tai(`${API}/diemdanh-be?${q}&thang=${THANG_CU}&kieu=gio`, QL1);
    check(`quản lý cơ sở 1 xin ${ten2} → 403`, r.status === 403, r.status);
  }
  const cs1 = await tai(`${API}/diemdanh-be?pham=coso&campusId=cs1&thang=${THANG_CU}&kieu=gio`, QL1);
  check('quản lý cơ sở 1 xuất cơ sở mình được', cs1.status === 200, cs1.status);
  check('và KHÔNG có dòng nào của cơ sở 2', !/Bé Cơ Sở Hai/.test(chuCaTep(cs1)) && /Nguyễn Bảo An/.test(chuCaTep(cs1)));
  const cs2 = await tai(`${API}/diemdanh-be?pham=coso&campusId=cs2&thang=${THANG_CU}&kieu=gio`, QL2);
  check('quản lý cơ sở 2 chỉ thấy bé cơ sở 2', /Bé Cơ Sở Hai/.test(chuCaTep(cs2)) && !/Nguyễn Bảo An/.test(chuCaTep(cs2)));
  check('kế toán → 403', (await tai(`${API}/diemdanh-be?pham=truong&thang=${THANG_CU}&kieu=gio`, KT)).status === 403);
  check('văn phòng cơ sở → 200', (await tai(`${API}/diemdanh-be?pham=coso&campusId=cs1&thang=${THANG_CU}&kieu=trangthai`, VP)).status === 200);
}

// ===========================================================================
console.log('\n[5] Điểm danh cô và nhân viên');
{
  // Nhân sự chấm tay hai ngày: một ngày nghỉ phép, một ngày đi làm có giờ mà
  // ở cổng không ai chụp.
  const n1 = await req('PUT', `/api/nhansu/cham-cong/t1/${D2}`, { cookie: HT, body: { loai: 'nghi-phep' } });
  const n2 = await req('PUT', `/api/nhansu/cham-cong/t1/${D4}`, { cookie: HT, body: { loai: 'di-lam', gioVao: '07:30', gioRa: '17:00' } });
  check('dựng được bảng công của Nhân sự', n1.status === 200 && n2.status === 200, [n1.data, n2.data]);

  const g = await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=gio`, HT);
  check('tải được', g.status === 200 && !!g.bang, [g.status, g.json]);
  check('đúng cột', JSON.stringify(trang(g).hang[0])
    === JSON.stringify(['Ngày', 'Họ và tên', 'Vai / chức vụ', 'Giờ vào', 'Giờ ra']), trang(g).hang[0]);
  const mai = dongCo(g, 'Nguyễn Thị Mai Anh');
  check('giờ ở cổng của cô Mai Anh', mai.some(h => h[0] === dmy(D0) && h[3] === '07:05' && h[4] === '16:40'), mai);
  check('ngày cổng không chụp thì lấy giờ Nhân sự đã ghi', mai.some(h => h[0] === dmy(D4) && h[3] === '07:30' && h[4] === '17:00'), mai);
  check('vai của cô ghi là Cô', mai.every(h => h[2] === 'Cô'), mai.map(h => h[2]));
  check('cả trường có người cơ sở 2', dongCo(g, 'Quản lý CS2').length === 1);
  check('KHÔNG xuất ảnh — không cột ảnh, không tên tệp ảnh',
    !trang(g).hang[0].some(c => /ảnh/i.test(c)) && !/cong-thu-1\.jpg/.test(chuCaTep(g)));

  const t = await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=trangthai`, HT);
  check('kiểu trạng thái: cột của bảng công', JSON.stringify(trang(t).hang[0]) === JSON.stringify(
    ['Họ và tên', 'Vai / chức vụ', 'Đi làm', 'Nửa ngày', 'Nghỉ phép', 'Nghỉ không phép', 'Nghỉ lễ']), trang(t).hang[0]);
  const mt = dongCo(t, 'Nguyễn Thị Mai Anh')[0] || [];
  check('cô Mai Anh: một ngày nghỉ phép', mt[4] === '1', mt);

  // Quản lý cơ sở chụp công ở cổng nhưng KHÔNG phải Nhân sự.
  const q = await tai(`${API}/diemdanh-co?pham=coso&campusId=cs1&thang=${THANG_CU}&kieu=gio`, QL1);
  check('quản lý cơ sở 1 tải được giờ ở cổng', q.status === 200, [q.status, q.json]);
  check('KHÔNG có người cơ sở 2', !dongCo(q, 'Quản lý CS2').length);
  check('KHÔNG lấy giờ từ bảng công của Nhân sự (không phải việc của họ)',
    !dongCo(q, dmy(D4)).length, dongCo(q, dmy(D4)));
  const qt = await tai(`${API}/diemdanh-co?pham=coso&campusId=cs1&thang=${THANG_CU}&kieu=trangthai`, QL1);
  check('kiểu trạng thái của người không phải Nhân sự: chỉ "có chấm công vào"',
    (trang(qt).hang[0] || []).some(c => /chấm công vào/i.test(c)) && !(trang(qt).hang[0] || []).includes('Nghỉ phép'), trang(qt).hang[0]);
  check('và tệp nói rõ vì sao', /Nhân sự/.test(chuCaTep(qt)), chuCaTep(qt).slice(-200));
  const sang2 = await tai(`${API}/diemdanh-co?pham=nguoi&userId=${idCua('qlcs2')}&thang=${THANG_CU}&kieu=gio`, QL1);
  check('quản lý cơ sở 1 xin một người cơ sở 2 → từ chối', sang2.status === 403 || sang2.status === 404, sang2.status);
  check('quản lý cơ sở 1 xin cả trường → 403', (await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=gio`, QL1)).status === 403);

  const nhom = await tai(`${API}/diemdanh-co?pham=nhom&classId=c1&thang=${THANG_CU}&kieu=gio`, HT);
  check('một nhóm: chỉ cô của nhóm đó', dongCo(nhom, 'Nguyễn Thị Mai Anh').length > 0 && !dongCo(nhom, 'Trần Thu Hương').length, trang(nhom).hang);

  const ns = await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=trangthai`, NS);
  check('Nhân sự tải được bảng nghỉ phép', ns.status === 200 && (trang(ns).hang[0] || []).includes('Nghỉ phép'), [ns.status, ns.json]);
  check('văn phòng cơ sở (người chụp ở cổng) tải được giờ vào ra', (await tai(`${API}/diemdanh-co?pham=coso&campusId=cs1&thang=${THANG_CU}&kieu=gio`, VP)).status === 200);
  check('kế toán → 403', (await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=gio`, KT)).status === 403);

  // Nhân sự TẮT: phần trạng thái còn "có chấm công vào" và nói rõ vì sao.
  await req('PUT', '/api/admin/modules/nhansu', { cookie: HT, body: { enabled: false } });
  const tat = await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=trangthai`, HT);
  check('Nhân sự tắt: vẫn tải được', tat.status === 200, tat.status);
  check('chỉ còn "có chấm công vào", và tệp nói Nhân sự đang tắt',
    !(trang(tat).hang[0] || []).includes('Nghỉ phép') && /Nhân sự.*tắt|tắt.*Nhân sự/.test(chuCaTep(tat)), trang(tat).hang);
  const gTat = await tai(`${API}/diemdanh-co?pham=truong&thang=${THANG_CU}&kieu=gio`, HT);
  check('và không còn lấy giờ từ bảng công của Nhân sự', !dongCo(gTat, dmy(D4)).length);
  await req('PUT', '/api/admin/modules/nhansu', { cookie: HT, body: { enabled: true } });
}

// ===========================================================================
console.log('\n[6] Đối chiếu tiền ăn — Excel thật, nằm trong phân hệ Tiền ăn');
{
  const x = await tai(`/api/tienan/thang.xlsx?thang=${THANG_CU}`, HT);
  check('tải được .xlsx', x.status === 200 && /spreadsheetml/.test(x.kieu) && /\.xlsx/.test(x.ten), [x.status, x.kieu, x.ten]);
  const csv = await (await fetch(`${sv.BASE}/api/tienan/thang.csv?thang=${THANG_CU}`, { headers: { Cookie: HT } })).text();
  const cotCsv = csv.replace(/^﻿/, '').split('\r\n')[0].split(',');
  check('đúng các cột của bảng đối chiếu đang có', JSON.stringify(trang(x).hang[0]) === JSON.stringify(cotCsv), [trang(x).hang[0], cotCsv]);
  const bang = (await req('GET', `/api/tienan/thang?thang=${THANG_CU}`, { cookie: HT })).data;
  check('mỗi bé một dòng', trang(x).hang.length === bang.danhSach.length + 1, [trang(x).hang.length, bang.danhSach.length]);
  const c1 = await tai(`/api/tienan/thang.xlsx?thang=${THANG_CU}&classId=c1`, HT);
  check('lọc một nhóm: chỉ bé nhóm đó', trang(c1).hang.length > 1 && trang(c1).hang.slice(1).every(h => h[2] === 'Chồi 2'), trang(c1).hang.map(h => h[2]));
  check('quản lý cơ sở 1 xin nhóm cơ sở 2 → 403', (await tai(`/api/tienan/thang.xlsx?thang=${THANG_CU}&classId=c3`, QL1)).status === 403);
  check('kế toán tải được', (await tai(`/api/tienan/thang.xlsx?thang=${THANG_CU}`, KT)).status === 200);
  check('cô → 403', (await tai(`/api/tienan/thang.xlsx?thang=${THANG_CU}`, GV)).status === 403);
  check('gia đình → 403', (await tai(`/api/tienan/thang.xlsx?thang=${THANG_CU}`, PH)).status === 403);
  const csvR = await fetch(`${sv.BASE}/api/tienan/thang.csv?thang=${THANG_CU}`, { headers: { Cookie: HT } });
  check('tệp CSV cũ vẫn chạy y như trước', csvR.status === 200 && /text\/csv/.test(csvR.headers.get('content-type')));
  const nk = (await req('GET', '/api/admin/audit', { cookie: HT })).data || [];
  check('mỗi lần xuất Excel đều ghi nhật ký như tệp CSV', nk.filter(r => r.action === 'tienan-xuat').length >= 4, nk.slice(0, 5));

  const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/tienan/module.json'), 'utf8'));
  check('ô Tiền ăn gộp vào màn Điểm danh với nhà trường',
    mj.gopVao && mj.gopVao.view === 'attendance' && JSON.stringify(mj.gopVao.vai) === '["admin"]', mj.gopVao);
  check('tên phân hệ là "Tiền ăn", mã giữ nguyên', mj.name === 'Tiền ăn' && mj.key === 'tienan', [mj.name, mj.key]);
  check('gia đình vẫn giữ ô Tiền ăn', (mj.roles || []).includes('parent'));
  const dsHt = (await req('GET', '/api/modules', { cookie: HT })).data || [];
  check('máy chủ truyền cờ gộp xuống trang chủ', (dsHt.find(m => m.key === 'tienan') || {}).gopVao?.view === 'attendance');
  const view = fs.readFileSync(path.join(GOC, 'modules/tienan/view.js'), 'utf8');
  check('nút "Xuất ra Excel" trỏ sang tệp .xlsx', /thang\.xlsx/.test(view) && !/thang\.csv/.test(view));
  const pv = (await req('GET', `${API}/pham-vi`, { cookie: KT })).data || {};
  check('màn Xuất báo cáo biết đường tải của phần tiền ăn', /\/api\/tienan\/thang\.xlsx/.test(JSON.stringify(pv.phan?.tienAn || {})), pv.phan?.tienAn);
}

// ===========================================================================
console.log('\n[7] Báo cáo tháng và báo cáo 6 tháng');
{
  const mau = (await req('GET', '/api/baocaohoctap/mau', { cookie: HT })).data?.mau || [];
  const mThang = mau.find(m => m.loai === 'thang' && /3–6/.test(m.ten));
  const mHk = mau.find(m => m.loai === 'hocky');
  const tuNgay = `${THANG_NAY}-01`;
  const denNgay = new Date(Date.UTC(Number(THANG_NAY.slice(0, 4)), Number(THANG_NAY.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: HT, body: { studentId: 's1', mauId: mThang?.id, tuNgay, denNgay } });
  const ban = mo.data?.ban;
  const dongChu = (ban?.dong || []).find(d => d.kieu === 'chu');
  const sua = await req('PUT', `/api/baocaohoctap/ban/${ban?.id}`, {
    cookie: HT, body: { o: [{ dongId: dongChu?.id, chu: '=1+1 con xếp tháp' }], tongHop: 'Con thích tưới cây', oNhaChoiGi: 'Cùng con tưới cây' },
  });
  check('dựng được một bản báo cáo tháng', (mo.status === 201 || mo.status === 200) && sua.status === 200, [mo.status, sua.status, sua.data]);

  const t = await tai(`${API}/baocao-hoctap?pham=nhom&classId=c1&loai=thang&thang=${THANG_NAY}`, HT);
  check('tải được', t.status === 200 && !!t.bang, [t.status, t.json]);
  check('đúng cột', JSON.stringify(trang(t).hang[0]) === JSON.stringify(
    ['Mã bé', 'Họ và tên', 'Nhóm lớp', 'Kỳ báo cáo', 'Mẫu', 'Phần', 'Mục', 'Nội dung', 'Tình trạng bản', 'Ghi chú']), trang(t).hang[0]);
  const an = dongCo(t, 'Nguyễn Bảo An');
  check('mỗi mục của mẫu một dòng', an.length >= (ban?.dong || []).length, [an.length, (ban?.dong || []).length]);
  check('nội dung cô viết có mặt (đã khoá công thức)', an.some(h => h[7] === "'=1+1 con xếp tháp"), an.map(h => h[7]));
  check('kèm phần nhắn gia đình', an.some(h => h[7] === 'Cùng con tưới cây'));
  check('tình trạng bản bằng chữ: Nháp', an.every(h => h[8] === 'Nháp'), an.map(h => h[8]));
  check('bé chưa có bản thì nói rõ, không bỏ sót bé', dongCo(t, 'Phạm Gia Hân').some(h => /Chưa có bản/.test(h[8] || '')), dongCo(t, 'Phạm Gia Hân'));

  check('dữ liệu mẫu có mẫu báo cáo 6 tháng', !!mHk, mau.map(m => m.loai));
  {
    const mHkDu = (await req('GET', `/api/baocaohoctap/mau/${mHk?.id}`, { cookie: HT })).data;
    const dongMuc = (mHkDu?.dong || []).find(d => d.kieu === 'muc');
    const hk = await req('POST', '/api/baocaohoctap/ban', { cookie: HT, body: { studentId: 's1', mauId: mHk?.id, tuNgay: lui(150), denNgay: HOM_NAY() } });
    const suaHk = await req('PUT', `/api/baocaohoctap/ban/${hk.data?.ban?.id}`, {
      cookie: HT, body: { o: [{ dongId: dongMuc?.id, muc: 'dang-hinh-thanh' }] },
    });
    check('dựng được một bản 6 tháng có ô mức', !!dongMuc && suaHk.status === 200, [hk.status, suaHk.status]);
    const h = await tai(`${API}/baocao-hoctap?pham=be&studentId=s1&loai=hocky&tu=${lui(150)}&den=${HOM_NAY()}`, HT);
    check('báo cáo 6 tháng: ô mức ra đúng chữ quy ước', dongCo(h, 'Đang hình thành (W)').length === 1, trang(h).hang.slice(0, 3));
    check('và không lẫn bản tháng', !dongCo(h, 'Cùng con tưới cây').length);
  }

  check('văn phòng cơ sở → 403 (API gốc chặn văn phòng)',
    (await tai(`${API}/baocao-hoctap?pham=coso&campusId=cs1&loai=thang&thang=${THANG_NAY}`, VP)).status === 403);
  check('kế toán → 403', (await tai(`${API}/baocao-hoctap?pham=truong&loai=thang&thang=${THANG_NAY}`, KT)).status === 403);
  check('loại báo cáo lạ → 400', (await tai(`${API}/baocao-hoctap?pham=truong&loai=xyz&thang=${THANG_NAY}`, HT)).status === 400);
  check('quản lý cơ sở 1 xin nhóm cơ sở 2 → 403',
    (await tai(`${API}/baocao-hoctap?pham=nhom&classId=c3&loai=thang&thang=${THANG_NAY}`, QL1)).status === 403);

  await req('PUT', '/api/admin/modules/baocaohoctap', { cookie: HT, body: { enabled: false } });
  const tat = await tai(`${API}/baocao-hoctap?pham=truong&loai=thang&thang=${THANG_NAY}`, HT);
  check('Báo cáo học tập TẮT → phần này báo tắt', tat.status === 404 && /tắt/.test(tat.json?.error || ''), [tat.status, tat.json]);
  const pv = (await req('GET', `${API}/pham-vi`, { cookie: HT })).data || {};
  check('và /pham-vi nói phần ấy đang tắt', pv.phan?.baoCaoHocTap?.duoc === false && pv.phan?.baoCaoHocTap?.lyDo === 'tat', pv.phan?.baoCaoHocTap);
  check('phần khác vẫn chạy', (await tai(`${API}/diemdanh-be?pham=truong&thang=${THANG_CU}&kieu=gio`, HT)).status === 200);
  await req('PUT', '/api/admin/modules/baocaohoctap', { cookie: HT, body: { enabled: true } });
}

// ===========================================================================
console.log('\n[8] Kế hoạch của bé');
{
  const t = await tai(`${API}/kehoach-be?pham=nhom&classId=c1&thang=${THANG_NAY}`, HT);
  check('tải được', t.status === 200 && !!t.bang, [t.status, t.json]);
  check('đúng cột', JSON.stringify(trang(t).hang[0]) === JSON.stringify(
    ['Mã bé', 'Họ và tên', 'Nhóm lớp', 'Tháng', 'Chương trình', 'Lĩnh vực', 'Bài', 'Dạy mới / Ôn tập',
      'Nhìn lại cuối tháng', 'Tiếp tục tháng sau', 'Tình trạng kế hoạch', 'Ghi chú']), trang(t).hang[0]);
  const an = dongCo(t, 'Nguyễn Bảo An');
  const toan = an.find(h => h[5] === 'Toán') || [];
  check('mục theo lĩnh vực của bé An', /Đếm và ghép số lượng/.test(toan[6] || ''), toan);
  check('nhìn lại bằng chữ quy ước', toan[8] === 'W', toan[8]);
  check('chương trình suy từ lĩnh vực', toan[4] === 'Montessori', toan[4]);
  check('tình trạng kế hoạch bằng chữ', toan[10] === 'Đã duyệt', toan[10]);
  check('có trang chú giải chữ quy ước', (t.bang || []).some(b => b.hang.some(h => h && h[0] === 'W' && /Đang hình thành/.test(h[1] || ''))),
    (t.bang || []).map(b => b.ten));
  const khoang = await tai(`${API}/kehoach-be?pham=be&studentId=s1&tu=${THANG_CU}&den=${THANG_NAY}`, HT);
  check('khoảng nhiều tháng: tải được', khoang.status === 200 && dongCo(khoang, 'Nguyễn Bảo An').length >= an.length, khoang.status);
  check('văn phòng cơ sở → 403', (await tai(`${API}/kehoach-be?pham=coso&campusId=cs1&thang=${THANG_NAY}`, VP)).status === 403);
  check('nhân sự → 403', (await tai(`${API}/kehoach-be?pham=truong&thang=${THANG_NAY}`, NS)).status === 403);
  await req('PUT', '/api/admin/modules/kehoachbe', { cookie: HT, body: { enabled: false } });
  const tat = await tai(`${API}/kehoach-be?pham=truong&thang=${THANG_NAY}`, HT);
  check('Kế hoạch của bé TẮT → 404 báo tắt', tat.status === 404, tat.status);
  check('hồ sơ bé vẫn chạy', (await tai(`${API}/ho-so-be?pham=truong`, HT)).status === 200);
  await req('PUT', '/api/admin/modules/kehoachbe', { cookie: HT, body: { enabled: true } });
}

// ===========================================================================
console.log('\n[9] Hồ sơ bé');
{
  const t = await tai(`${API}/ho-so-be?pham=truong`, HT);
  const csv = await (await fetch(`${sv.BASE}/api/admin/students/xuat.csv`, { headers: { Cookie: HT } })).text();
  const dongCsv = csv.replace(/^﻿/, '').trim().split('\r\n');
  check('cùng bộ cột với tệp danh sách bé đang có', JSON.stringify(trang(t).hang[0]) === JSON.stringify(dongCsv[0].split(',')),
    [trang(t).hang[0], dongCsv[0]]);
  check('cùng số bé', trang(t).hang.length === dongCsv.length, [trang(t).hang.length, dongCsv.length]);
  check('mặc định KHÔNG kèm bé đã nghỉ', !dongCo(t, 'Bé Đã Nghỉ').length);
  const nghi = await tai(`${API}/ho-so-be?pham=nhom&classId=c1&keCaNghi=1`, HT);
  check('chọn "kèm bé đã nghỉ" thì có', dongCo(nghi, 'Bé Đã Nghỉ').length === 1 && dongCo(nghi, 'Bé Đã Nghỉ')[0].includes('Đã nghỉ'));
  const motBe = await tai(`${API}/ho-so-be?pham=be&studentId=s1`, HT);
  check('một bé: đúng một dòng', trang(motBe).hang.length === 2 && dongCo(motBe, 'Nguyễn Bảo An').length === 1, trang(motBe).hang.length);
  const cs1 = await tai(`${API}/ho-so-be?pham=coso&campusId=cs1&keCaNghi=1`, QL1);
  check('quản lý cơ sở 1: không có bé cơ sở 2', cs1.status === 200 && !/Bé Cơ Sở Hai/.test(chuCaTep(cs1)), cs1.status);
  check('quản lý cơ sở 1 xin bé cơ sở 2 → 403', (await tai(`${API}/ho-so-be?pham=be&studentId=sx2`, QL1)).status === 403);
  check('văn phòng cơ sở → 200', (await tai(`${API}/ho-so-be?pham=coso&campusId=cs1`, VP)).status === 200);
  check('kế toán → 403', (await tai(`${API}/ho-so-be?pham=truong`, KT)).status === 403);
  check('nhân sự → 403', (await tai(`${API}/ho-so-be?pham=truong`, NS)).status === 403);
  const nk = (await req('GET', '/api/admin/audit', { cookie: HT })).data || [];
  check('mỗi lần xuất hồ sơ đều ghi nhật ký "Xuất danh sách bé"',
    nk.some(r => r.action === 'students-export' && /xuatbaocao/.test(r.detail || '')), nk.slice(0, 3));
  check('và các phần khác cũng ghi nhật ký',
    ['xuatbaocao-diemdanh-be', 'xuatbaocao-diemdanh-co', 'xuatbaocao-baocao-hoctap', 'xuatbaocao-kehoach-be']
      .every(a => nk.some(r => r.action === a)), [...new Set(nk.map(r => r.action))]);
}

// ===========================================================================
console.log('\n[10] Mọi tệp: khoá công thức, không phần trăm');
{
  check('đã soi đủ nhiều tệp', MOI_TEP.length >= 20, MOI_TEP.length);
  const o = MOI_TEP.flatMap(t => t.bang.flatMap(b => b.hang.flatMap(h => (h || []).filter(x => x !== undefined && x !== null))));
  check('KHÔNG ô nào bắt đầu bằng = + - @ mà chưa khoá', !o.some(x => /^[=+\-@]/.test(String(x))), o.filter(x => /^[=+\-@]/.test(String(x))).slice(0, 5));
  check('tên bé gõ như công thức thì ra chữ, có dấu nháy', o.includes(`'${TEN_CONG_THUC}`), null);
  check('KHÔNG có ký tự phần trăm trong tệp nào', !o.some(x => String(x).includes('%')), o.filter(x => String(x).includes('%')).slice(0, 3));
}

// ===========================================================================
console.log('\n[11] Tắt Xuất báo cáo: API 404, dữ liệu nguồn không đổi');
{
  const dem = () => {
    const c = conn();
    const r = {
      dd: c.prepare('SELECT COUNT(*) n FROM attendance').get().n,
      cc: c.prepare('SELECT COUNT(*) n FROM staff_checkin').get().n,
      be: c.prepare('SELECT COUNT(*) n FROM students').get().n,
    };
    c.close();
    return r;
  };
  const truoc = dem();
  const tat = await req('PUT', '/api/admin/modules/xuatbaocao', { cookie: HT, body: { enabled: false } });
  check('tắt được', tat.status === 200, tat.status);
  check('/pham-vi → 404', (await req('GET', `${API}/pham-vi`, { cookie: HT })).status === 404);
  check('xuất điểm danh → 404', (await tai(`${API}/diemdanh-be?pham=truong&thang=${THANG_CU}&kieu=gio`, HT)).status === 404);
  check('dữ liệu nguồn không đổi', JSON.stringify(dem()) === JSON.stringify(truoc), [truoc, dem()]);
  check('màn Điểm danh vẫn chạy', (await req('GET', `/api/attendance/class?date=${D0}`, { cookie: HT })).status === 200);
  await req('PUT', '/api/admin/modules/xuatbaocao', { cookie: HT, body: { enabled: true } });
  check('bật lại là chạy', (await req('GET', `${API}/pham-vi`, { cookie: HT })).status === 200);
}

// ===========================================================================
console.log('\n[12] Bản chép có người canh — không trôi khỏi bản gốc');
{
  const doc = (t) => fs.readFileSync(path.join(GOC, t), 'utf8');
  const xb = doc('modules/xuatbaocao/routes.js');
  const mang = (s, ten) => ((s.match(new RegExp(`const ${ten} = \\[([^\\]]*)\\]`)) || [])[1] || '').match(/'[^']+'/g) || [];
  check('chức vụ chụp công ở cổng khớp routes/attendance.js',
    mang(xb, 'CHUC_VU_CHUP_CONG').length > 0
    && JSON.stringify(mang(xb, 'CHUC_VU_CHUP_CONG')) === JSON.stringify(mang(doc('routes/attendance.js'), 'CHUC_VU_CHUP_CONG')),
    mang(xb, 'CHUC_VU_CHUP_CONG'));
  check('chức vụ Nhân sự khớp modules/nhansu',
    mang(xb, 'CHUC_VU_NHAN_SU').length > 0
    && JSON.stringify(mang(xb, 'CHUC_VU_NHAN_SU')) === JSON.stringify(mang(doc('modules/nhansu/routes.js'), 'CHUC_VU_DUOC')),
    mang(xb, 'CHUC_VU_NHAN_SU'));
  const banDo = (s) => {
    const khoi = (s.match(/const CHUONG_TRINH_CUA_GOC = \{([\s\S]*?)\};/) || [])[1] || '';
    return Object.fromEntries([...khoi.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(m => [m[1], m[2]]));
  };
  const ke = doc('modules/kehoachbe/routes.js');
  check('bản đồ góc → chương trình khớp Kế hoạch của bé',
    Object.keys(banDo(xb)).length > 0 && JSON.stringify(banDo(xb)) === JSON.stringify(banDo(ke)), banDo(xb));
  const goc = (s) => [...((s.match(/const GOC_LINH_VUC = \[([\s\S]*?)\n\];/) || [])[1] || '').matchAll(/\['([^']+)', '([^']+)'\]/g)].map(m => `${m[1]}=${m[2]}`);
  check('tên lĩnh vực khớp Kế hoạch của bé', goc(xb).length >= 7 && JSON.stringify(goc(xb)) === JSON.stringify(goc(ke)), [goc(xb), goc(ke)]);
  const chu = (s) => (s.match(/const CHU_QUY_UOC = (\{[^}]*\})/) || [])[1] || '';
  check('chữ quy ước khớp Kế hoạch của bé', chu(xb) !== '' && chu(xb) === chu(ke), [chu(xb), chu(ke)]);
  const tuoi = (s) => (s.match(/function tuoiCuaBe\(dob\) \{[\s\S]*?\n\}/) || [])[0] || '';
  check('cách tính tuổi khớp tệp danh sách bé', tuoi(xb) !== '' && tuoi(xb) === tuoi(doc('routes/admin.js')));
}

// ===========================================================================
// Văn phòng bấm "Nghỉ học bảo lưu" (hay "Cho nghỉ") giữa tháng thì những ngày bé
// ĐÃ đi học vẫn phải nằm trong tệp — không thì đối chiếu cuối tháng thiếu dòng.
// Bé nghỉ từ trước khoảng thì không vào tệp; tài khoản cơ sở khác không thấy bé.
console.log('\n[13] Bé nghỉ / bảo lưu GIỮA KỲ vẫn có trong tệp');
{
  const ghiChuCot = (t, i = 0) => (trang(t, i).hang[0] || []).indexOf('Ghi chú');
  for (const [ai, duong, ck] of [
    ['một nhóm', 'pham=nhom&classId=c1', HT], ['một cơ sở', 'pham=coso&campusId=cs1', QL1], ['cả trường', 'pham=truong', HT]]) {
    const g = await tai(`${API}/diemdanh-be?${duong}&thang=${THANG_CU}&kieu=gio`, ck);
    const bl = dongCo(g, 'Bé Bảo Lưu');
    const gc = ghiChuCot(g);
    check(`${ai}, giờ vào ra: bé bảo lưu từ D3 còn đủ ba ngày đã đi học`,
      g.status === 200 && bl.length === 3 && [D0, D1, D2].every(ng => bl.some(h => h[0] === dmy(ng))), [g.status, bl]);
    check(`${ai}, giờ vào ra: dòng của bé ghi "Bảo lưu từ ${dmy(D3)}"`,
      gc > 0 && bl.every(h => h[gc] === `Bảo lưu từ ${dmy(D3)}`), bl.map(h => h[gc]));
    check(`${ai}, giờ vào ra: bé nghỉ giữa tháng còn ngày đã đi học, ghi "Nghỉ từ ${dmy(D2)}"`,
      dongCo(g, 'Bé Nghỉ Giữa Tháng').length === 1 && dongCo(g, 'Bé Nghỉ Giữa Tháng')[0][gc] === `Nghỉ từ ${dmy(D2)}`,
      dongCo(g, 'Bé Nghỉ Giữa Tháng'));
    check(`${ai}, giờ vào ra: bé đang học không mang ghi chú`, dongCo(g, 'Nguyễn Bảo An').every(h => !h[gc]));
    check(`${ai}: bé nghỉ TRƯỚC tháng thì không có trong tệp`, !/Bé Nghỉ Từ Lâu/.test(chuCaTep(g)));

    const t = await tai(`${API}/diemdanh-be?${duong}&thang=${THANG_CU}&kieu=trangthai`, ck);
    const tc = ghiChuCot(t);
    const a = dongCo(t, 'Bé Bảo Lưu')[0] || [];
    check(`${ai}, tổng hợp: bé bảo lưu 3 ngày có mặt, "Chưa điểm danh" không đếm từ ngày bảo lưu`,
      a[3] === '3' && a[7] === '0' && a[tc] === `Bảo lưu từ ${dmy(D3)}`, a);
    const n = dongCo(t, 'Bé Nghỉ Giữa Tháng')[0] || [];
    check(`${ai}, tổng hợp: bé nghỉ từ D2 chỉ còn D1 là chưa điểm danh`,
      n[3] === '1' && n[7] === '1' && n[tc] === `Nghỉ từ ${dmy(D2)}`, n);
    check(`${ai}, tổng hợp: bé nghỉ TRƯỚC tháng không có dòng`, !/Bé Nghỉ Từ Lâu/.test(chuCaTep(t)));
  }
  {
    const t = await tai(`${API}/diemdanh-be?pham=nhom&classId=c1&thang=${THANG_CU}&kieu=trangthai`, HT);
    const luoi = trang(t, 1);
    const tieuDe = luoi.hang[0] || [];
    const dong = (ten) => luoi.hang.find(h => h && h[1] === ten) || [];
    const o = (ten, ng) => dong(ten)[tieuDe.indexOf(dm(ng))];
    check('lưới: ngày bé đã đi học vẫn C, từ ngày bảo lưu ghi BL (cả ngày trường nghỉ)',
      ['C', 'C', 'C', 'BL', 'BL', 'BL'].every((x, i) => o('Bé Bảo Lưu', [D0, D1, D2, D3, D4, D5][i]) === x),
      [D0, D1, D2, D3, D4, D5].map(ng => o('Bé Bảo Lưu', ng)));
    check('lưới: bé nghỉ hẳn từ D2 ghi ĐN, ngày D1 vẫn để trống (chưa điểm danh)',
      o('Bé Nghỉ Giữa Tháng', D0) === 'C' && !o('Bé Nghỉ Giữa Tháng', D1) && o('Bé Nghỉ Giữa Tháng', D2) === 'ĐN',
      [D0, D1, D2].map(ng => o('Bé Nghỉ Giữa Tháng', ng)));
    check('lưới: bé đang học không bị ghi BL / ĐN', !dong('Nguyễn Bảo An').some(x => x === 'BL' || x === 'ĐN'));
    check('lưới: có cột Ghi chú', dong('Bé Bảo Lưu')[tieuDe.indexOf('Ghi chú')] === `Bảo lưu từ ${dmy(D3)}`, tieuDe.slice(-2));
    check('chú giải nói BL và ĐN', dongCo(t, 'BL = ', 1).length === 1 && dongCo(t, 'ĐN = ', 1).length === 1, luoi.hang.slice(-1));
  }
  {
    const cs2 = await tai(`${API}/diemdanh-be?pham=coso&campusId=cs2&thang=${THANG_CU}&kieu=gio`, QL2);
    check('quản lý cơ sở 2: tệp cơ sở mình KHÔNG có bé đã nghỉ của cơ sở 1',
      cs2.status === 200 && !/Bé Bảo Lưu|Bé Nghỉ Giữa Tháng|Bé Đã Nghỉ/.test(chuCaTep(cs2)), cs2.status);
    for (const id of ['sx4', 'sx5']) {
      const r = await tai(`${API}/diemdanh-be?pham=be&studentId=${id}&thang=${THANG_CU}&kieu=gio`, QL2);
      check(`quản lý cơ sở 2 xin riêng bé đã nghỉ ${id} của cơ sở 1 → 403`, r.status === 403, r.status);
    }
    check('quản lý cơ sở 2 xin nhóm c1 → 403',
      (await tai(`${API}/diemdanh-be?pham=nhom&classId=c1&thang=${THANG_CU}&kieu=gio`, QL2)).status === 403);
  }
  {
    // Kế hoạch tính theo tháng: khoảng bắt đầu SAU ngày bé nghỉ nhưng cùng tháng
    // thì bé vẫn có dòng của tháng ấy.
    const ke = await tai(`${API}/kehoach-be?pham=nhom&classId=c1&tu=${D4}&den=${THANG_NAY}`, HT);
    const n = dongCo(ke, 'Bé Nghỉ Giữa Tháng');
    check('kế hoạch: bé nghỉ trong tháng đầu khoảng vẫn có dòng, kèm ghi chú',
      ke.status === 200 && n.length === 1 && n[0][(trang(ke).hang[0] || []).indexOf('Ghi chú')] === `Nghỉ từ ${dmy(D2)}`, [ke.status, n]);
    check('kế hoạch: bé nghỉ trước khoảng thì không có dòng', !/Bé Nghỉ Từ Lâu/.test(chuCaTep(ke)));
    const bc = await tai(`${API}/baocao-hoctap?pham=nhom&classId=c1&loai=thang&thang=${THANG_NAY}`, HT);
    check('báo cáo tháng này: bé đã nghỉ từ tháng cũ không có dòng',
      bc.status === 200 && !/Bé Nghỉ Giữa Tháng|Bé Bảo Lưu|Bé Nghỉ Từ Lâu/.test(chuCaTep(bc)), bc.status);
  }

  // Đúng đường của văn phòng: bé An (đã có điểm danh, báo cáo tháng, kế hoạch
  // tháng này) được bấm "Nghỉ học bảo lưu" hôm nay.
  const homNay = HOM_NAY();
  const gioAn = async (q, ck) => dongCo(await tai(`${API}/diemdanh-be?${q}&thang=${THANG_NAY}&kieu=gio`, ck), 'Nguyễn Bảo An');
  const truoc = await gioAn('pham=nhom&classId=c1', HT);
  const bl = await req('POST', '/api/admin/students/s1/bao-luu', { cookie: HT, body: { lyDo: 'về quê' } });
  check('văn phòng bấm "Nghỉ học bảo lưu" cho bé An', bl.status === 200, [bl.status, bl.data]);
  check('tháng này bé An đã có điểm danh trước khi bảo lưu', truoc.length > 0, truoc.length);
  for (const [ai, q, ck] of [['một nhóm', 'pham=nhom&classId=c1', HT], ['một cơ sở', 'pham=coso&campusId=cs1', QL1],
    ['cả trường', 'pham=truong', HT]]) {
    const sau = await gioAn(q, ck);
    check(`${ai}: sau bảo lưu vẫn đủ ${truoc.length} dòng điểm danh tháng này của bé An`,
      sau.length === truoc.length && sau.every(h => h[7] === `Bảo lưu từ ${dmy(homNay)}`), [sau.length, sau[0]]);
  }
  const t = await tai(`${API}/diemdanh-be?pham=nhom&classId=c1&thang=${THANG_NAY}&kieu=trangthai`, HT);
  check('tổng hợp tháng này còn dòng bé An, ghi chú bảo lưu',
    (dongCo(t, 'Nguyễn Bảo An')[0] || [])[8] === `Bảo lưu từ ${dmy(homNay)}`, dongCo(t, 'Nguyễn Bảo An')[0]);
  check('quản lý cơ sở 2 vẫn không thấy bé An',
    !/Nguyễn Bảo An/.test(chuCaTep(await tai(`${API}/diemdanh-be?pham=coso&campusId=cs2&thang=${THANG_NAY}&kieu=gio`, QL2))));

  const bc = await tai(`${API}/baocao-hoctap?pham=nhom&classId=c1&loai=thang&thang=${THANG_NAY}`, HT);
  const bcAn = dongCo(bc, 'Nguyễn Bảo An');
  check('báo cáo tháng của bé đã bảo lưu giữa kỳ vẫn xuất được',
    bc.status === 200 && bcAn.some(h => h[7] === 'Cùng con tưới cây'), [bc.status, bcAn.length]);
  check('và mang ghi chú bảo lưu', bcAn.every(h => h[ghiChuCot(bc)] === `Bảo lưu từ ${dmy(homNay)}`), bcAn.map(h => h[9]));
  check('báo cáo tháng cả trường cũng còn bé An',
    dongCo(await tai(`${API}/baocao-hoctap?pham=truong&loai=thang&thang=${THANG_NAY}`, HT), 'Cùng con tưới cây').length === 1);

  const ke = await tai(`${API}/kehoach-be?pham=nhom&classId=c1&thang=${THANG_NAY}`, HT);
  const keAn = dongCo(ke, 'Nguyễn Bảo An');
  check('kế hoạch tháng này của bé đã bảo lưu vẫn xuất được',
    ke.status === 200 && keAn.some(h => h[5] === 'Toán' && /Đếm và ghép số lượng/.test(h[6] || '')), [ke.status, keAn.length]);
  check('và mang ghi chú bảo lưu', keAn.every(h => h[ghiChuCot(ke)] === `Bảo lưu từ ${dmy(homNay)}`), keAn.map(h => h[11]));
  check('kế hoạch cơ sở 1 (quản lý cơ sở 1) còn bé An',
    dongCo(await tai(`${API}/kehoach-be?pham=coso&campusId=cs1&thang=${THANG_NAY}`, QL1), 'Nguyễn Bảo An').length === keAn.length);
  check('hồ sơ bé mặc định vẫn KHÔNG kèm bé đã nghỉ (giữ lựa chọn "kèm bé đã nghỉ")',
    !dongCo(await tai(`${API}/ho-so-be?pham=nhom&classId=c1`, HT), 'Nguyễn Bảo An').length
    && dongCo(await tai(`${API}/ho-so-be?pham=nhom&classId=c1&keCaNghi=1`, HT), 'Nguyễn Bảo An').length === 1);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
