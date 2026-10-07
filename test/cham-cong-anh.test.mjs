// Bài canh CHẤM CÔNG CÔ VÀ NHÂN VIÊN BẰNG ẢNH Ở CỔNG, và GỌI XÁC NHẬN (Đ227).
//
// Chạy bằng:  npm run test:cham-cong-anh
//
// VÌ SAO CÓ PHẦN NÀY
//
// Góp ý của trường 06/10 (mục 2): mục "Giáo viên" đứng đầu màn điểm danh —
// bấm vào ra danh sách cô và nhân viên của cơ sở, chụp ảnh lần đầu là giờ
// vào, lần hai là giờ ra. Chủ dự án chốt: chụp ảnh như với bé. Và "cần gọi
// xác nhận" thì bấm vào bé là gọi được phụ huynh.
//
// HAI CHỖ DỄ RÒ, nên bài này đo nhiều về QUYỀN hơn về tính năng:
//
//   • ẢNH KHUÔN MẶT NGƯỜI LỚN là loại dữ liệu mới. Người BẤM CHỤP (bảo vệ,
//     văn phòng cơ sở) không được mở lại ảnh; chỉ Nhân sự, Ban giám hiệu, quản
//     lý đúng cơ sở và chính người ấy mở được.
//   • SỐ ĐIỆN THOẠI GIA ĐÌNH không được đi theo bảng rà soát, vì bảng ấy mở cho
//     cả tài khoản bảo vệ ở cổng (Đ156). Nút Gọi hỏi đường hồ sơ bé — đường đó
//     đã chặn bảo vệ.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cham-cong-anh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu', 'diemdanh']);
const mk = {
  ht: taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong'),
  bv: taoQuanTri(DIR, 'Bảo vệ CS1', 'baove1'),
  vp: taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1'),
  ql1: taoQuanTri(DIR, 'Quản lý CS1', 'quanly1'),
  ql2: taoQuanTri(DIR, 'Quản lý CS2', 'quanly2'),
  ns: taoQuanTri(DIR, 'Nhân sự', 'nhansu1'),
};
khoaVaoCoSo(DIR, 'baove1', 'cs1'); datChucVu(DIR, 'baove1', 'baove');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1'); datChucVu(DIR, 'vanphong1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'quanly1', 'cs1'); datChucVu(DIR, 'quanly1', 'quanly-coso');
khoaVaoCoSo(DIR, 'quanly2', 'cs2'); datChucVu(DIR, 'quanly2', 'quanly-coso');
datChucVu(DIR, 'nhansu1', 'nhansu');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4795), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const HT = await vao('hieutruong', mk.ht);
const BV = await vao('baove1', mk.bv);
const VP = await vao('vanphong1', mk.vp);
const QL1 = await vao('quanly1', mk.ql1);
const QL2 = await vao('quanly2', mk.ql2);
const NS = await vao('nhansu1', mk.ns);
const GV = (await login('giaovien', '123456')).cookie;    // t1, nhóm Chồi 2 (cơ sở 1)
const GV2 = (await login('giaovien2', '123456')).cookie;  // t2, nhóm Lá 1 (cơ sở 1)
const PH = (await login('phuhuynh', '123456')).cookie;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const conn = () => new Database(path.join(DIR, 'school.db'), { readonly: true });
const idCua = (u) => { const c = conn(); const r = c.prepare('SELECT id FROM users WHERE username = ?').get(u); c.close(); return r && r.id; };

// ===========================================================================
console.log('\n[1] Danh sách cắt theo CƠ SỞ; ai được chấm');
{
  const bv = await req('GET', '/api/attendance/nhan-vien', { cookie: BV });
  check('bảo vệ cổng mở được danh sách', bv.status === 200, bv.status);
  const ten = (r) => (r.data?.danhSach || []).map(x => x.userId);
  check('có cô của nhóm ở cơ sở 1 (t1, t2, t4)', ['t1', 't2', 't4'].every(id => ten(bv).includes(id)), ten(bv));
  check('có nhân viên gắn vào cơ sở 1', ten(bv).includes(idCua('vanphong1')), ten(bv));
  check('KHÔNG có người của cơ sở 2', !ten(bv).includes(idCua('quanly2')), ten(bv));
  check('không có phụ huynh', !ten(bv).some(id => /^p\d/.test(id)));
  const truong = await req('GET', '/api/attendance/nhan-vien', { cookie: HT });
  check('ban giám hiệu thấy cả trường (có người cơ sở 2)', ten(truong).includes(idCua('quanly2')), ten(truong).length);
  const goi = JSON.stringify(bv.data);
  check('danh sách KHÔNG mang số điện thoại, email, CCCD', !/phone|email|cccd|soCccd/i.test(goi), goi.slice(0, 200));
  for (const [t, c] of [['cô', GV], ['gia đình', PH]]) {
    const r = await req('GET', '/api/attendance/nhan-vien', { cookie: c });
    check(`${t} không mở được danh sách chấm công`, [401, 403].includes(r.status), r.status);
  }
}

// ===========================================================================
console.log('\n[2] Ảnh lần một = giờ vào, lần hai = giờ ra, lần ba bị từ chối');
let fileVao, fileRa;
{
  const a = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
  check('lần một: 201, ghi GIỜ VÀO', a.status === 201 && a.data?.phan === 'vao' && /^\d{2}:\d{2}$/.test(a.data?.gioVao || ''), a.data);
  const b = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
  check('lần hai: ghi GIỜ RA, giờ vào giữ nguyên', b.status === 201 && b.data?.phan === 'ra' && b.data?.gioVao === a.data?.gioVao && !!b.data?.gioRa, b.data);
  const c = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't1', anh: PNG } });
  check('lần ba: 400, nói rõ đã đủ và chỉ đường sang Nhân sự', c.status === 400 && /Nhân sự/.test(c.data?.error || ''), c.data);
  const ds = (await req('GET', '/api/attendance/nhan-vien', { cookie: BV })).data?.danhSach || [];
  const t1 = ds.find(x => x.userId === 't1') || {};
  check('danh sách hiện giờ vào và giờ ra dưới tên', !!t1.gioVao && !!t1.gioRa, t1);
  const cc = conn();
  const r = cc.prepare("SELECT * FROM staff_checkin WHERE userId = 't1'").get();
  cc.close();
  fileVao = r && r.anhVao; fileRa = r && r.anhRa;
  check('ảnh vào và ảnh ra được lưu, ghi cơ sở của cô', !!fileVao && !!fileRa && r.campusId === 'cs1', r);
  const ngoai = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: idCua('quanly2'), anh: PNG } });
  check('bảo vệ cơ sở 1 KHÔNG chấm được người cơ sở 2 (404)', ngoai.status === 404, ngoai.status);
  const thieuAnh = await req('POST', '/api/attendance/nhan-vien/anh', { cookie: BV, body: { userId: 't2' } });
  check('thiếu ảnh → 400', thieuAnh.status === 400, thieuAnh.status);
}

// ===========================================================================
console.log('\n[3] Ai mở được ẢNH KHUÔN MẶT người lớn');
{
  const xem = async (c) => (await fetch(`${sv.BASE}/api/nhansu/anh-cham-cong/${fileVao}`, { headers: { Cookie: c } })).status;
  check('bảo vệ — người chụp — KHÔNG mở lại được', [403, 404].includes(await xem(BV)), await xem(BV));
  check('văn phòng cơ sở KHÔNG mở được', [403, 404].includes(await xem(VP)), await xem(VP));
  check('Nhân sự mở được', (await xem(NS)) === 200, await xem(NS));
  check('Ban giám hiệu mở được', (await xem(HT)) === 200, await xem(HT));
  // Đúng luật hồ sơ nhân sự Đ152: chức vụ Quản lý cơ sở không nằm trong
  // danh sách được đọc dữ liệu nhân sự — ảnh khuôn mặt người lớn cũng vậy.
  check('quản lý cơ sở (chức vụ) KHÔNG mở được — dữ liệu nhân sự chỉ Nhân sự và BGH', [403, 404].includes(await xem(QL1)), await xem(QL1));
  check('quản lý cơ sở khác cũng không', [403, 404].includes(await xem(QL2)), await xem(QL2));
  check('cô KHÔNG mở được qua đường của cả trường', [403, 404].includes(await xem(GV)), await xem(GV));
  const toi = async (c) => (await fetch(`${sv.BASE}/api/nhansu/anh-cham-cong/${fileVao}/toi`, { headers: { Cookie: c } })).status;
  check('chính cô ấy mở được ảnh của mình qua đường /toi', (await toi(GV)) === 200, await toi(GV));
  check('cô khác không mở được qua /toi', [403, 404].includes(await toi(GV2)), await toi(GV2));
  check('Nhân sự mở ảnh của người khác qua /toi cũng không được', [403, 404].includes(await toi(NS)), await toi(NS));
  check('gia đình không mở được', [401, 403, 404].includes(await xem(PH)), await xem(PH));
  const la = await fetch(`${sv.BASE}/api/nhansu/anh-cham-cong/khong-co.jpg`, { headers: { Cookie: NS } });
  check('tên tệp không ai nhận → 404', la.status === 404, la.status);
  // Ảnh này KHÔNG mở được qua đường ảnh điểm danh của bé.
  const quaBe = await fetch(`${sv.BASE}/api/attendance/anh/${fileVao}`, { headers: { Cookie: HT } });
  check('đường ảnh của BÉ không trả ảnh chấm công (404)', quaBe.status === 404, quaBe.status);
}

// ===========================================================================
console.log('\n[4] Giờ vào/ra chép sang bảng công của Nhân sự (phân hệ đang bật)');
{
  const cc = conn();
  const r = cc.prepare("SELECT * FROM nhansu_cham_cong WHERE userId = 't1'").get();
  cc.close();
  check('có dòng công "đi làm" với đủ giờ vào và giờ ra', !!r && r.loai === 'di-lam' && !!r.gioVao && !!r.gioRa, r);
}

// ===========================================================================
console.log('\n[5] Gỡ lần chụp cuối: gỡ giờ ra trước, rồi mới tới giờ vào');
{
  const g1 = await req('POST', '/api/attendance/nhan-vien/go', { cookie: BV, body: { userId: 't1' } });
  check('lần gỡ đầu gỡ GIỜ RA', g1.status === 200 && g1.data?.daGo === 'ra', g1.data);
  const g2 = await req('POST', '/api/attendance/nhan-vien/go', { cookie: BV, body: { userId: 't1' } });
  check('lần gỡ hai gỡ GIỜ VÀO', g2.status === 200 && g2.data?.daGo === 'vao', g2.data);
  const g3 = await req('POST', '/api/attendance/nhan-vien/go', { cookie: BV, body: { userId: 't1' } });
  check('hết gì để gỡ → 400', g3.status === 400, g3.status);
  const xem = await fetch(`${sv.BASE}/api/nhansu/anh-cham-cong/${fileVao}`, { headers: { Cookie: NS } });
  check('gỡ rồi thì ảnh không còn mở được (404)', xem.status === 404, xem.status);
}

// ===========================================================================
console.log('\n[6] Gọi xác nhận: số điện thoại KHÔNG đi theo bảng rà soát');
{
  const rs = await req('GET', '/api/attendance/ra-soat', { cookie: BV });
  check('bảo vệ mở được bảng rà soát', rs.status === 200, rs.status);
  check('bảng rà soát KHÔNG chứa số điện thoại hay email', !/phone|email|dienThoai/i.test(JSON.stringify(rs.data || {})));
  const hs = await req('GET', '/api/students/s1', { cookie: BV });
  check('bảo vệ KHÔNG mở được hồ sơ bé (nút Gọi nhận câu nhờ văn phòng)', [401, 403].includes(hs.status), hs.status);
  const vp = await req('GET', '/api/students/s1', { cookie: VP });
  check('văn phòng cơ sở mở được hồ sơ bé — có số để gọi', vp.status === 200 && (vp.data?.parents || []).some(p => p.phone), vp.status);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Chấm công bằng ảnh và gọi xác nhận');
