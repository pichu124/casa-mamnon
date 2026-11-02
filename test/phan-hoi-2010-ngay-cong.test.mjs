// Bài canh NGÀY CÔNG TÍNH TỪ GIỜ Ở CỔNG và GIẢI TRÌNH (K1-2).
//
// Chạy bằng:  node test/phan-hoi-2010-ngay-cong.test.mjs
//
// Chủ trường chốt: 8 tiếng tính từ lần vào đầu tới lần ra cuối, không trừ giờ
// trưa; Nhân sự và ban giám hiệu duyệt giải trình; TẮT cho tới khi Nhân sự bật
// trong app; ngày đã qua KHÔNG BAO GIỜ tính lại.
//
// Cách làm phía máy chủ: công TÍNH LÚC ĐỌC, không ghi vào `nhansu_cham_cong`.
// Từ ngày quy tắc áp dụng, cổng thôi chép sang bảng công, nên mọi dòng trong
// bảng công là dòng ghi tay và dòng ghi tay luôn thắng.
//
// Bài này dựng quy tắc bắt đầu từ MƯỜI NGÀY TRƯỚC bằng cách ghi thẳng vào bảng
// (API không cho chọn ngày đã qua — đó chính là một điều bài này canh), rồi
// ghi giờ cổng của những ngày đã qua thẳng vào `staff_checkin`.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ngay-cong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu', 'diemdanh']);
const mk = {
  ht: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  bv: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  ql1: taoQuanTri(DIR, 'Quản lý CS1', 'quanly1'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
khoaVaoCoSo(DIR, 'quanly1', 'cs1'); datChucVu(DIR, 'quanly1', 'quanly-coso');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7281), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const HT = await vao('hieutruong', mk.ht);
const BV = await vao('baove1', mk.bv);
const QL1 = await vao('quanly1', mk.ql1);
const NS = await vao('nhansu1', mk.ns);
const GV = (await login('giaovien', '123456')).cookie;    // t1
const GV2 = (await login('giaovien2', '123456')).cookie;  // t2
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const T = HOM_NAY();
const D = (k) => new Date(Date.parse(`${T}T00:00:00Z`) - k * 86400000).toISOString().slice(0, 10);
const MAI = D(-1);
const laNgayThuong = (d) => { const t = new Date(`${d}T00:00:00Z`).getUTCDay(); return t >= 1 && t <= 5; };
// Kết nối GHI riêng của bài test, có chờ khoá — máy chủ đang chạy song song.
function csdl(fn) {
  const c = new Database(path.join(DIR, 'school.db'), { timeout: 10000 });
  try { return fn(c); } finally { c.close(); }
}
const idCua = (u) => csdl(c => (c.prepare('SELECT id FROM users WHERE username = ?').get(u) || {}).id);
const dongTay = (userId, d) => csdl(c => c.prepare('SELECT * FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?').get(userId, d));
async function nguoiTrongThang(cookie, userId, thang) {
  const r = await req('GET', `/api/nhansu/cham-cong?thang=${thang}`, { cookie });
  return (r.data?.danhSach || []).find(x => x.userId === userId) || null;
}
async function ngayCua(userId, d) {
  const p = await nguoiTrongThang(NS, userId, d.slice(0, 7));
  return (p?.ngay || []).find(x => x.ngay === d) || null;
}
const NS_ID = idCua('nhansu1');

// ===========================================================================
console.log('\n[1] Quy tắc TẮT: cổng chép sang bảng công y như trước');
{
  const q = await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS });
  check('mặc định quy tắc tính công đang TẮT', q.status === 200 && q.data?.dangBat === false, q.data);
  const a = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't2', anh: PNG } });
  check('chụp giờ vào của t2 ở cổng', a.status === 201, a.data);
  const r = dongTay('t2', T);
  check('cổng tạo dòng "đi làm" trong bảng công như trước',
    r && r.loai === 'di-lam' && r.ghiChu === 'Chụp ảnh ở cổng' && r.gioVao === a.data?.gioVao, r);
  const d = await ngayCua('t2', T);
  check('bảng tháng: loai vẫn là "di-lam", nguồn là cổng (cũ), đã ghi',
    d && d.loai === 'di-lam' && d.nguon === 'cong-cu' && d.trangThai === 'da-ghi' && d.cong === 1, d);
  const go = await req('POST', '/api/attendance/nhan-vien/go', { cookie: BV, body: { userId: 't2' } });
  check('gỡ lần chụp thì dòng công do cổng tạo cũng được gỡ', go.status === 200 && !dongTay('t2', T), go.data);
}

// ===========================================================================
console.log('\n[2] Bật / tắt chỉ từ NGÀY MAI trở đi; chỉ Nhân sự và BGH');
{
  const homNay = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, apDungTu: T } });
  check('bật từ HÔM NAY → 400', homNay.status === 400, homNay.data);
  const homQua = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, apDungTu: D(1) } });
  check('bật từ ngày đã qua → 400', homQua.status === 400, homQua.data);
  for (const [ten, c] of [['cô', GV], ['quản lý cơ sở', QL1], ['bảo vệ', BV]]) {
    const r = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: c, body: { bat: true, apDungTu: MAI } });
    check(`${ten} KHÔNG bật được quy tắc (403)`, r.status === 403, r.status);
  }
  const sai = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, apDungTu: MAI, phutDuCong: 5 } });
  check('số phút đủ công vô lý → 400', sai.status === 400, sai.data);
  const bat = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, apDungTu: MAI } });
  check('bật từ ngày mai → 200, hôm nay vẫn chưa áp dụng',
    bat.status === 200 && bat.data?.dangBat === false && bat.data?.sapToi?.apDungTu === MAI, bat.data);
  const tatHomNay = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: false, tatTu: T } });
  check('tắt từ hôm nay → 400', tatHomNay.status === 400, tatHomNay.data);
  const tat = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: false, tatTu: MAI } });
  check('tắt từ ngày mai → 200, không còn đợt sắp tới', tat.status === 200 && !tat.data?.sapToi, tat.data);
  const nk = csdl(c => c.prepare("SELECT action FROM audit_log WHERE action LIKE 'nhansu-quy-tac-cong-%'").all().map(x => x.action));
  check('nhật ký ghi lần bật và lần tắt', nk.includes('nhansu-quy-tac-cong-bat') && nk.includes('nhansu-quy-tac-cong-tat'), nk);
  const lichSu = (await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS })).data?.lichSu || [];
  check('không xoá dòng nào — đợt vừa tắt vẫn còn trong lịch sử', lichSu.length === 1 && lichSu[0].tatTu === MAI, lichSu);
}

// ===========================================================================
// Dựng: quy tắc áp dụng từ D(10); giờ cổng của những ngày đã qua; một dòng
// do cổng chép từ TRƯỚC ngày áp dụng.
const NGAY_CHUA_CO = [D(7), D(8), D(9)].find(laNgayThuong);
csdl((c) => {
  c.prepare(`INSERT INTO nhansu_quy_tac_cong (id, apDungTu, tatTu, phutDuCong, ca1Tu, ca1Den, ca2Tu, ca2Den, phutDuDi, nguoiBat, batLuc)
    VALUES ('qtc_test', ?, NULL, 480, '07:00', '14:00', '12:00', '18:00', 0, ?, ?)`).run(D(10), NS_ID, new Date().toISOString());
  const cong = c.prepare(`INSERT INTO staff_checkin (id, userId, ngay, gioVao, gioRa, campusId, capNhatLuc)
    VALUES (?, ?, ?, ?, ?, 'cs1', ?)`);
  const luc = new Date().toISOString();
  cong.run('cc_2', 't1', D(2), '07:00', '15:30', luc);   // đủ công
  cong.run('cc_3', 't1', D(3), '07:00', '14:00', luc);   // trọn ca sáng → nửa ngày
  cong.run('cc_4', 't1', D(4), '08:00', '11:00', luc);   // chưa đủ giờ
  cong.run('cc_5', 't1', D(5), '07:30', '', luc);        // thiếu giờ ra
  cong.run('cc_6', 't1', D(6), '08:00', '09:00', luc);   // sẽ có dòng ghi tay đè
  cong.run('cc_12', 't1', D(12), '07:30', '', luc);      // TRƯỚC ngày áp dụng, đã chép sang bảng công
  cong.run('cc_13', 't1', D(13), '07:30', '', luc);      // TRƯỚC ngày áp dụng, không có dòng công
  cong.run('cc_ns4', NS_ID, D(4), '07:30', '', luc);     // của chính người Nhân sự
  c.prepare(`INSERT INTO nhansu_cham_cong (userId, ngay, loai, gioVao, gioRa, ghiChu, nguoiGhi, capNhatLuc)
    VALUES ('t1', ?, 'di-lam', '07:30', '', 'Chụp ảnh ở cổng', 'x', ?)`).run(D(12), luc);
});

// ===========================================================================
console.log('\n[3] Quy tắc BẬT: cổng KHÔNG ghi vào bảng công nữa');
{
  const q = await req('GET', '/api/nhansu/quy-tac-cong', { cookie: NS });
  check('quy tắc đang áp dụng hôm nay', q.data?.dangBat === true && q.data?.hienTai?.apDungTu === D(10), q.data);
  const a = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
  check('chụp giờ vào của t1 ở cổng vẫn chạy', a.status === 201 && a.data?.phan === 'vao', a.data);
  check('KHÔNG có dòng nào trong bảng công cho t1 hôm nay', !dongTay('t1', T), dongTay('t1', T));
  const d = await ngayCua('t1', T);
  check('bảng tháng: hôm nay "đang làm", tính từ giờ cổng, loai để trống',
    d && d.trangThai === 'dang-lam' && d.nguon === 'tinh' && d.loai === '' && d.cong === 0 && d.gioVao === a.data?.gioVao, d);
}

// ===========================================================================
console.log('\n[4] Công tính lúc đọc từ giờ cổng của những ngày đã qua');
{
  const bang = [
    [D(2), { trangThai: 'du-cong', cong: 1, loaiTinh: 'di-lam', lyDo: '' }],
    [D(3), { trangThai: 'nua-ngay', cong: 0.5, loaiTinh: 'nua-ngay', lyDo: '' }],
    [D(4), { trangThai: 'can-giai-trinh', cong: 0, loaiTinh: '', lyDo: 'chua-du-gio' }],
    [D(5), { trangThai: 'can-giai-trinh', cong: 0, loaiTinh: '', lyDo: 'thieu-gio-ra' }],
  ];
  for (const [n, mong] of bang) {
    const d = await ngayCua('t1', n);
    check(`${n}: ${mong.trangThai}`, d && d.nguon === 'tinh' && d.loai === ''
      && Object.entries(mong).every(([k, v]) => d[k] === v), d);
  }
  const truoc = await ngayCua('t1', D(12));
  check('ngày TRƯỚC ngày áp dụng giữ nguyên dòng cũ, không tính lại',
    truoc && truoc.loai === 'di-lam' && truoc.gioVao === '07:30' && truoc.gioRa === ''
      && truoc.trangThai === 'da-ghi' && truoc.nguon === 'cong-cu' && truoc.cong === 1, truoc);
  check('ngày TRƯỚC ngày áp dụng không có dòng công thì vẫn không có gì', !(await ngayCua('t1', D(13))));
  const chua = await ngayCua('t1', NGAY_CHUA_CO);
  check('ngày thường đã qua không có gì → "chưa có công", 0 công',
    chua && chua.trangThai === 'chua-co-cong' && chua.cong === 0 && chua.loai === '', chua);

  for (const thang of [...new Set([D(2), D(5), NGAY_CHUA_CO].map(n => n.slice(0, 7)))]) {
    const p = await nguoiTrongThang(NS, 't1', thang);
    const ds = p?.ngay || [];
    const tong = ds.reduce((s, x) => s + x.cong, 0);
    check(`${thang}: soCong cộng cả ngày tính từ giờ cổng`, p && p.soCong === tong, { soCong: p?.soCong, tong });
    check(`${thang}: soNgayDiLam / soNuaNgay theo loại đã tính`,
      p && p.soNgayDiLam === ds.filter(x => x.loaiTinh === 'di-lam').length
        && p.soNuaNgay === ds.filter(x => x.loaiTinh === 'nua-ngay').length, p);
    check(`${thang}: soCanGiaiTrinh KHÔNG đếm ngày "chưa có công"`,
      p && p.soCanGiaiTrinh === ds.filter(x => x.trangThai === 'can-giai-trinh').length, p?.soCanGiaiTrinh);
  }
  const pT = await nguoiTrongThang(NS, 't1', T.slice(0, 7));
  check('soDangLam đếm hôm nay', pT && pT.soDangLam === 1, pT?.soDangLam);
}

// ===========================================================================
console.log('\n[5] Dòng ghi tay luôn thắng; xoá dòng thì công tính quay lại');
{
  const tay = await req('PUT', `/api/nhansu/cham-cong/t1/${D(6)}`, { cookie: NS, body: { loai: 'nghi-phep' } });
  check('Nhân sự ghi tay "nghỉ phép"', tay.status === 200, tay.data);
  const d = await ngayCua('t1', D(6));
  check('bảng tháng theo dòng ghi tay', d && d.loai === 'nghi-phep' && d.nguon === 'tay' && d.trangThai === 'da-ghi' && d.cong === 0, d);
  const xoa = await req('PUT', `/api/nhansu/cham-cong/t1/${D(6)}`, { cookie: NS, body: { loai: '' } });
  const d2 = await ngayCua('t1', D(6));
  check('xoá dòng ghi tay → công tính từ giờ cổng quay lại',
    xoa.data?.daXoa === true && d2 && d2.trangThai === 'can-giai-trinh' && d2.nguon === 'tinh', d2);
}

// ===========================================================================
console.log('\n[6] Cô gửi giải trình');
let gt4;
let gtChua;
{
  const gui = await req('POST', '/api/nhansu/cham-cong/toi', {
    cookie: GV, body: { ngay: D(4), loaiDeNghi: 'di-lam', gioVaoDeNghi: '07:00', gioRaDeNghi: '16:00', lyDo: 'Đi tập huấn ở phòng giáo dục buổi chiều' },
  });
  check('gửi giải trình cho ngày cần giải trình → 201', gui.status === 201 && gui.data?.giaiTrinh?.trangThai === 'cho-duyet', gui.data);
  gt4 = gui.data?.giaiTrinh?.id;
  const trung = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: D(4), loaiDeNghi: 'di-lam', lyDo: 'Gửi thêm lần nữa' } });
  check('đang có một giải trình chờ duyệt → 409', trung.status === 409, trung.data);
  const du = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: D(2), loaiDeNghi: 'di-lam', lyDo: 'Ngày này đủ rồi' } });
  check('ngày đã đủ công → 400', du.status === 400, du.data);
  const ngan = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: D(5), loaiDeNghi: 'di-lam', lyDo: 'ok' } });
  check('lý do dưới 5 ký tự → 400', ngan.status === 400, ngan.data);
  const truoc = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: D(13), loaiDeNghi: 'di-lam', lyDo: 'Ngày trước quy tắc' } });
  check('ngày trước ngày áp dụng → 400', truoc.status === 400, truoc.data);
  const maiGui = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: MAI, loaiDeNghi: 'di-lam', lyDo: 'Ngày mai đi họp' } });
  check('ngày mai → 400', maiGui.status === 400, maiGui.data);
  await req('PUT', `/api/nhansu/cham-cong/t1/${D(6)}`, { cookie: NS, body: { loai: 'nghi-phep' } });
  const coTay = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: D(6), loaiDeNghi: 'di-lam', lyDo: 'Đã có dòng ghi tay' } });
  check('ngày đã có dòng ghi tay → 400', coTay.status === 400, coTay.data);

  const chua = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: NGAY_CHUA_CO, loaiDeNghi: 'nua-ngay', lyDo: 'Quên chụp ảnh ở cổng cả ngày' } });
  check('gửi được cho ngày "chưa có công"', chua.status === 201, chua.data);
  gtChua = chua.data?.giaiTrinh?.id;

  const toi = await req('GET', `/api/nhansu/cham-cong/toi?thang=${D(4).slice(0, 7)}`, { cookie: GV });
  check('"của tôi" có danh sách giải trình của mình',
    (toi.data?.giaiTrinh || []).some(g => g.id === gt4 && g.trangThai === 'cho-duyet'), toi.data?.giaiTrinh);
  const ngay4 = (toi.data?.cuaToi?.ngay || []).find(x => x.ngay === D(4));
  check('"của tôi" có trạng thái từng ngày kèm giải trình',
    ngay4 && ngay4.trangThai === 'can-giai-trinh' && ngay4.giaiTrinh?.id === gt4, ngay4);

  const khac = await req('GET', `/api/nhansu/cham-cong/toi?thang=${D(4).slice(0, 7)}`, { cookie: GV2 });
  check('cô khác KHÔNG thấy giải trình của t1',
    khac.status === 200 && !(khac.data?.giaiTrinh || []).some(g => g.id === gt4) && !JSON.stringify(khac.data).includes('tập huấn'), khac.data?.giaiTrinh);
  const rutKhac = await req('DELETE', `/api/nhansu/cham-cong/toi?id=${gt4}`, { cookie: GV2 });
  check('cô khác KHÔNG rút được giải trình của t1 (404)', rutKhac.status === 404, rutKhac.status);
  const dsKhac = await req('GET', '/api/nhansu/giai-trinh', { cookie: GV2 });
  check('cô KHÔNG mở được danh sách giải trình của cả trường (403)', dsKhac.status === 403, dsKhac.status);

  const rut = await req('DELETE', `/api/nhansu/cham-cong/toi?id=${gtChua}`, { cookie: GV });
  const gChua = csdl(c => c.prepare('SELECT trangThai FROM nhansu_giai_trinh WHERE id = ?').get(gtChua));
  check('cô rút giải trình của mình → "da-rut", dòng vẫn còn', rut.status === 200 && gChua?.trangThai === 'da-rut', { rut: rut.data, gChua });
  const rutLai = await req('DELETE', `/api/nhansu/cham-cong/toi?id=${gtChua}`, { cookie: GV });
  check('rút lần hai → 400', rutLai.status === 400, rutLai.data);
  const guiLai = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: NGAY_CHUA_CO, loaiDeNghi: 'di-lam', lyDo: 'Gửi lại cho đúng loại' } });
  check('rút rồi gửi lại được', guiLai.status === 201, guiLai.data);
}

// ===========================================================================
console.log('\n[7] Duyệt và từ chối');
{
  const ds = await req('GET', `/api/nhansu/giai-trinh?thang=${D(4).slice(0, 7)}&trangThai=cho-duyet`, { cookie: NS });
  check('Nhân sự thấy giải trình chờ duyệt, kèm họ tên',
    ds.status === 200 && (ds.data?.danhSach || []).some(g => g.id === gt4 && g.hoTen), ds.data);
  const p = await nguoiTrongThang(NS, 't1', D(4).slice(0, 7));
  check('bảng tháng đếm soChoDuyet', p && p.soChoDuyet >= 1, p?.soChoDuyet);

  const ql = await req('PUT', `/api/nhansu/giai-trinh/${gt4}`, { cookie: QL1, body: { duyet: true } });
  check('quản lý cơ sở KHÔNG duyệt được (403)', ql.status === 403, ql.status);
  const gv = await req('PUT', `/api/nhansu/giai-trinh/${gt4}`, { cookie: GV2, body: { duyet: true } });
  check('cô KHÔNG duyệt được (403)', gv.status === 403, gv.status);

  const ok = await req('PUT', `/api/nhansu/giai-trinh/${gt4}`, {
    cookie: NS, body: { duyet: true, loai: 'di-lam', gioVao: '07:00', gioRa: '16:00', ghiChu: 'Có giấy mời tập huấn' },
  });
  check('Nhân sự duyệt → 200', ok.status === 200, ok.data);
  const r = dongTay('t1', D(4));
  check('duyệt ghi một dòng công: loại và giờ người duyệt chọn, ghi chú "Giải trình đã duyệt…"',
    r && r.loai === 'di-lam' && r.gioVao === '07:00' && r.gioRa === '16:00' && /^Giải trình đã duyệt/.test(r.ghiChu) && r.nguoiGhi === NS_ID, r);
  const g = csdl(c => c.prepare('SELECT * FROM nhansu_giai_trinh WHERE id = ?').get(gt4));
  check('giải trình chuyển "da-duyet", ghi người duyệt', g?.trangThai === 'da-duyet' && g?.nguoiDuyet === NS_ID && g?.loaiDuyet === 'di-lam', g);
  const d = await ngayCua('t1', D(4));
  check('bảng tháng: nguồn "giai-trinh", 1 công', d && d.nguon === 'giai-trinh' && d.cong === 1 && d.loai === 'di-lam', d);
  const lai = await req('PUT', `/api/nhansu/giai-trinh/${gt4}`, { cookie: NS, body: { duyet: true } });
  check('duyệt lại giải trình đã xử lý → 400', lai.status === 400, lai.data);

  const gui5 = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: GV, body: { ngay: D(5), loaiDeNghi: 'di-lam', lyDo: 'Máy ở cổng hỏng lúc về' } });
  const gt5 = gui5.data?.giaiTrinh?.id;
  const khongLyDo = await req('PUT', `/api/nhansu/giai-trinh/${gt5}`, { cookie: NS, body: { duyet: false } });
  check('từ chối mà không ghi lý do → 400', khongLyDo.status === 400, khongLyDo.data);
  const tuChoi = await req('PUT', `/api/nhansu/giai-trinh/${gt5}`, { cookie: NS, body: { duyet: false, ghiChu: 'Camera vẫn ghi cô về lúc 11 giờ' } });
  const g5 = csdl(c => c.prepare('SELECT * FROM nhansu_giai_trinh WHERE id = ?').get(gt5));
  check('từ chối có lý do → "tu-choi", KHÔNG ghi dòng công',
    tuChoi.status === 200 && g5?.trangThai === 'tu-choi' && !!g5?.ghiChuDuyet && !dongTay('t1', D(5)), { g5, tc: tuChoi.data });

  const guiNs = await req('POST', '/api/nhansu/cham-cong/toi', { cookie: NS, body: { ngay: D(4), loaiDeNghi: 'di-lam', lyDo: 'Quên chụp lúc về' } });
  check('người Nhân sự cũng gửi được giải trình của chính mình', guiNs.status === 201, guiNs.data);
  const tuDuyet = await req('PUT', `/api/nhansu/giai-trinh/${guiNs.data?.giaiTrinh?.id}`, { cookie: NS, body: { duyet: true } });
  check('KHÔNG tự duyệt giải trình của chính mình (403)', tuDuyet.status === 403, tuDuyet.status);
  const htDuyet = await req('PUT', `/api/nhansu/giai-trinh/${guiNs.data?.giaiTrinh?.id}`, { cookie: HT, body: { duyet: true } });
  check('ban giám hiệu duyệt được giải trình của Nhân sự', htDuyet.status === 200 && !!dongTay(NS_ID, D(4)), htDuyet.data);

  const nk = csdl(c => c.prepare("SELECT DISTINCT action FROM audit_log WHERE action LIKE 'nhansu-giai-trinh-%'").all().map(x => x.action));
  check('nhật ký ghi gửi, rút, duyệt, từ chối',
    ['nhansu-giai-trinh-gui', 'nhansu-giai-trinh-rut', 'nhansu-giai-trinh-duyet', 'nhansu-giai-trinh-tu-choi'].every(a => nk.includes(a)), nk);
}

// ===========================================================================
console.log('\n[8] "Cả trường đi làm hôm nay" bỏ qua người đã có giờ cổng');
{
  const r = await req('POST', '/api/nhansu/cham-cong/ca-truong', { cookie: NS, body: { ngay: T, loai: 'di-lam' } });
  check('chấm cả trường → 200, báo số người có giờ cổng', r.status === 200 && r.data?.soCoGioCong >= 1, r.data);
  check('t1 (đã chụp ở cổng) KHÔNG bị ghi dòng tay', !dongTay('t1', T), dongTay('t1', T));
  check('t2 (chưa chụp) được ghi "đi làm"', dongTay('t2', T)?.loai === 'di-lam', dongTay('t2', T));
}

// ===========================================================================
console.log('\n[9] Tệp CSV thêm hai cột ở cuối, giữ nguyên tám cột cũ');
{
  const res = await fetch(`${sv.BASE}/api/nhansu/cham-cong.csv?thang=${D(5).slice(0, 7)}`, { headers: { Cookie: NS } });
  const chu = (await res.text()).replace(/^﻿/, '');
  const dau = chu.split(/\r?\n/)[0];
  check('tiêu đề: 8 cột cũ đúng thứ tự rồi "Cần giải trình", "Giải trình chờ duyệt"',
    dau === 'Họ và tên,Vai trò,Số công,Ngày đi làm,Nửa ngày,Nghỉ phép,Nghỉ không phép,Nghỉ lễ,Cần giải trình,Giải trình chờ duyệt', dau);
}

// ===========================================================================
console.log('\n[10] Đổi loại ngày công mà không gửi giờ thì giờ được giữ');
{
  await req('PUT', `/api/nhansu/cham-cong/t2/${D(20)}`, {
    cookie: NS, body: { loai: 'di-lam', gioVao: '07:10', gioRa: '16:20', ghiChu: 'Trực sớm' },
  });
  const doi = await req('PUT', `/api/nhansu/cham-cong/t2/${D(20)}`, { cookie: NS, body: { loai: 'nua-ngay' } });
  const r = dongTay('t2', D(20));
  check('chỉ gửi {loai} → giờ vào, giờ ra, ghi chú giữ nguyên',
    doi.status === 200 && r && r.loai === 'nua-ngay' && r.gioVao === '07:10' && r.gioRa === '16:20' && r.ghiChu === 'Trực sớm', r);
  const xoaGio = await req('PUT', `/api/nhansu/cham-cong/t2/${D(20)}`, { cookie: NS, body: { loai: 'nua-ngay', gioRa: '' } });
  const r2 = dongTay('t2', D(20));
  check('gửi gioRa rỗng thì xoá đúng ô đó', xoaGio.status === 200 && r2.gioRa === '' && r2.gioVao === '07:10', r2);
}

// ===========================================================================
console.log('\n[11] Đổi tham số: đóng đợt cũ, mở đợt mới từ ngày mai');
{
  const hom = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, apDungTu: T, phutDuCong: 450 } });
  check('đổi tham số từ hôm nay → 400', hom.status === 400, hom.data);
  const doi = await req('PUT', '/api/nhansu/quy-tac-cong', { cookie: NS, body: { bat: true, phutDuCong: 600 } });
  const ls = doi.data?.lichSu || [];
  const cu = ls.find(q => q.id === 'qtc_test');
  const moi = ls.find(q => q.apDungTu === MAI && !q.tatTu);
  check('đợt cũ đóng từ ngày mai, đợt mới mở từ ngày mai với tham số mới',
    doi.status === 200 && cu?.tatTu === MAI && moi?.phutDuCong === 600 && moi?.ca1Tu === '07:00', ls);
  check('hôm nay vẫn theo đợt cũ', doi.data?.hienTai?.id === 'qtc_test', doi.data?.hienTai);
  const d = await ngayCua('t1', D(2));
  check('ngày đã qua KHÔNG tính lại theo tham số mới (07:00–15:30 vẫn đủ công)', d && d.trangThai === 'du-cong', d);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
