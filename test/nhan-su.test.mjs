// Bài canh HỒ SƠ NHÂN SỰ & CHẤM CÔNG (Đ152).
//
// Chạy bằng:  npm run test:nhan-su
//
// VÌ SAO CÓ PHẦN NÀY
//
// Nhà trường 10/09: *"làm luôn cùng đợt này đi bạn. để mình có thể test luôn 1
// thể về phần chấm công giáo viên, nhân viên"*.
//
// ĐÂY LÀ MIỀN DỮ LIỆU CÁ NHÂN ĐẦU TIÊN CỦA NGƯỜI LỚN TRONG CẢ KHO MÃ.
//
// Tới nay mọi bài canh phân quyền ở đây đều xoay quanh một câu hỏi: ai đọc được
// dữ liệu của một đứa trẻ. Bảng hồ sơ nhân sự thì khác hẳn — số định danh, mã
// số thuế, số bảo hiểm, hoàn cảnh gia đình, số tài khoản ngân hàng. Rò một hồ
// sơ như vậy sang một đồng nghiệp là chuyện không lấy lại được, và nó khác
// chuyện rò dữ liệu của trẻ ở chỗ: người bị lộ ngày mai vẫn phải tới làm việc
// cạnh người vừa đọc trộm.
//
// BỐN ĐIỀU CANH, và mục [2] là mục quan trọng nhất của cả bài:
//
//   1. CHỈ NHÂN SỰ VÀ BAN GIÁM HIỆU — không phải mọi tài khoản quản trị. Mục
//      [2] đi qua TỪNG chức vụ một: Quản lý cơ sở, Văn phòng cơ sở, Kế toán,
//      Marketing đều phải bị chặn, dù bốn tài khoản đó đều là `role: admin`.
//   2. ĐƯỜNG DẪN KHÔNG ĐƯỢC NẰM DƯỚI `/api/admin`. Tiền tố đó đã mở sẵn cho
//      Văn phòng cơ sở, và chú thích ở lib/db.js nói thẳng rằng mọi đường thêm
//      sau này tự động lọt. Mục [2b] đọc thẳng mã nguồn để canh điều đó.
//   3. NGƯỜI TRONG HỒ SƠ ĐỌC ĐƯỢC HỒ SƠ CỦA CHÍNH MÌNH, và chỉ của mình —
//      mục [5]. Giữ dữ liệu về một người mà chính họ không xem được là chỗ
//      hỏng lòng tin nhanh nhất.
//   4. PHỤ HUYNH KHÔNG CÓ PHẦN NÀO Ở ĐÂY — mục [1].
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, tatPhanHe, datChucVu, khoaVaoCoSo, GOC, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhan-su');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhansu']);
const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkNS = taoQuanTri(DIR, 'Chị Nhân Sự', 'nhansu');
const mkQL = taoQuanTri(DIR, 'Quản lý CS1', 'quanly1');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1');
const mkKT = taoQuanTri(DIR, 'Kế toán', 'ketoan');
const mkMK = taoQuanTri(DIR, 'Marketing', 'marketing');
datChucVu(DIR, 'hieutruong', 'hieu-truong');
datChucVu(DIR, 'nhansu', 'nhansu');
datChucVu(DIR, 'quanly1', 'quanly-coso');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');
datChucVu(DIR, 'ketoan', 'ketoan');
datChucVu(DIR, 'marketing', 'marketing');
khoaVaoCoSo(DIR, 'quanly1', 'cs1');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4650), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const BGH = await vao('hieutruong', mkBGH);
const NS = await vao('nhansu', mkNS);
const QL = await vao('quanly1', mkQL);
const VP = await vao('vanphong1', mkVP);
const KT = await vao('ketoan', mkKT);
const MK = await vao('marketing', mkMK);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const ma = async (cookie, duong) => (await req('GET', duong, { cookie })).status;

// ===========================================================================
console.log('\n[1] Ban giám hiệu và Nhân sự mở được; CÔ và GIA ĐÌNH thì không');
{
  const bgh = await req('GET', '/api/nhansu/ho-so', { cookie: BGH });
  check('ban giám hiệu mở được danh sách nhân sự', bgh.status === 200, bgh.status);
  check('danh sách có đủ người của trường (cô + quản trị), KHÔNG có phụ huynh',
    (bgh.data.danhSach || []).length >= 4
      && (bgh.data.danhSach || []).every(x => x.vai === 'teacher' || x.vai === 'admin'),
    (bgh.data.danhSach || []).map(x => x.vai));
  check('Nhân sự cũng mở được', (await ma(NS, '/api/nhansu/ho-so')) === 200);

  check('CÔ KHÔNG mở được danh sách nhân sự', (await ma(GV, '/api/nhansu/ho-so')) === 403);
  const coThu = await req('GET', '/api/nhansu/ho-so', { cookie: GV });
  check('và câu từ chối chỉ cô sang phần "Của tôi", không cụt lủn',
    /Của tôi|của mình/i.test(coThu.data?.error || ''), coThu.data?.error);
  check('GIA ĐÌNH KHÔNG mở được', (await ma(PH, '/api/nhansu/ho-so')) === 403);
  check('gia đình cũng không mở được hồ sơ của chính mình ở đây',
    (await ma(PH, '/api/nhansu/ho-so/toi')) === 403);
}

// ===========================================================================
console.log('\n[2] TỪNG CHỨC VỤ QUẢN TRỊ MỘT — bốn chức vụ phải bị chặn');
{
  for (const [ten, ck] of [['Quản lý cơ sở', QL], ['Văn phòng cơ sở', VP],
    ['Kế toán', KT], ['Marketing', MK]]) {
    check(`${ten} KHÔNG đọc được danh sách nhân sự`,
      (await ma(ck, '/api/nhansu/ho-so')) === 403, await ma(ck, '/api/nhansu/ho-so'));
    check(`${ten} KHÔNG đọc được một hồ sơ cụ thể`,
      (await ma(ck, '/api/nhansu/ho-so/t1')) === 403);
    check(`${ten} KHÔNG đọc được bảng chấm công`,
      (await ma(ck, '/api/nhansu/cham-cong')) === 403);
    const ghi = await req('PUT', '/api/nhansu/ho-so/t1', { cookie: ck, body: { cccd: '001' } });
    check(`${ten} KHÔNG ghi được hồ sơ`, ghi.status === 403, ghi.status);
    const cham = await req('PUT', `/api/nhansu/cham-cong/t1/${HOM_NAY()}`, { cookie: ck, body: { loai: 'di-lam' } });
    check(`${ten} KHÔNG chấm công được`, cham.status === 403, cham.status);
  }
}

// ===========================================================================
console.log('\n[2b] ĐƯỜNG DẪN KHÔNG ĐƯỢC NẰM DƯỚI /api/admin — đọc thẳng mã nguồn');
{
  const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/nhansu/module.json'), 'utf8'));
  check('vùng api của phân hệ là /api/nhansu',
    (mj.api || []).length === 1 && mj.api[0] === '/api/nhansu', mj.api);
  check('KHÔNG vùng nào nằm dưới /api/admin — tiền tố đó đã mở sẵn cho Văn phòng cơ sở',
    (mj.api || []).every(a => !a.startsWith('/api/admin')), mj.api);

  const r = fs.readFileSync(path.join(GOC, 'modules/nhansu/routes.js'), 'utf8');
  const duong = [...r.matchAll(/app\.(?:get|post|put|delete)\(\s*'([^']+)'/g)].map(m => m[1]);
  check('mọi đường của phân hệ đều bắt đầu bằng /api/nhansu',
    duong.length >= 6 && duong.every(d => d.startsWith('/api/nhansu')), duong);
  check('mọi đường đều đi qua requireRole', duong.length === (r.match(/requireRole\(/g) || []).length, {
    duong: duong.length, requireRole: (r.match(/requireRole\(/g) || []).length,
  });
  // Mọi đường CỦA CẢ TRƯỜNG đều phải gọi `chiNhanSu`. Hai đường "/toi" thì
  // không — chúng cố ý mở cho chính chủ.
  const soChiNhanSu = (r.match(/if \(chiNhanSu\(req, res\)\) return;/g) || []).length;
  check('mọi đường của cả trường đều gọi chiNhanSu ở dòng đầu',
    soChiNhanSu === duong.filter(d => !d.endsWith('/toi')).length,
    { chiNhanSu: soChiNhanSu, duongCuaTruong: duong.filter(d => !d.endsWith('/toi')).length });
}

// ===========================================================================
console.log('\n[3] Ghi và đọc một hồ sơ');
{
  const ghi = await req('PUT', '/api/nhansu/ho-so/t1', {
    cookie: NS,
    body: {
      chucDanh: 'Cô phụ trách chính', ngayVaoLam: '2024-08-01',
      cccd: '079123456789', mst: '8123456789', soBhxh: 'BH0012345',
      dienThoai: '0909111222', trinhDo: 'Cao đẳng Sư phạm Mầm non',
      nganHang: 'Vietcombank', soTaiKhoan: '0071000123456',
      tenVoChong: 'Trần Văn B', soCon: 2,
      khanCapTen: 'Trần Văn B', khanCapDienThoai: '0909333444',
    },
  });
  check('Nhân sự ghi được hồ sơ', ghi.status === 200, ghi.data);
  const doc = await req('GET', '/api/nhansu/ho-so/t1', { cookie: NS });
  check('đọc lại đúng những gì vừa ghi',
    doc.data?.hoSo?.cccd === '079123456789' && doc.data?.hoSo?.soCon === 2, doc.data?.hoSo);
  check('và kèm họ tên để màn hình khỏi tra lại', !!doc.data?.hoTen, doc.data?.hoTen);

  const ngayLa = await req('PUT', '/api/nhansu/ho-so/t1', { cookie: NS, body: { ngaySinh: '20/02/1990' } });
  check('ngày sai dạng thì từ chối', ngayLa.status === 400, ngayLa.data);
  const nguoc = await req('PUT', '/api/nhansu/ho-so/t1', {
    cookie: NS, body: { ngayVaoLam: '2024-08-01', ngayNghiViec: '2023-01-01' },
  });
  check('ngày nghỉ việc trước ngày vào làm thì từ chối', nguoc.status === 400, nguoc.data);
  const la = await req('GET', '/api/nhansu/ho-so/khong-co-ai', { cookie: NS });
  check('mã lạ thì 404, không nổ', la.status === 404, la.status);
  const laPH = await req('GET', '/api/nhansu/ho-so/p1', { cookie: NS });
  check('KHÔNG lập được hồ sơ nhân sự cho một PHỤ HUYNH', laPH.status === 404, laPH.status);
}

// ===========================================================================
console.log('\n[4] DANH SÁCH không kèm ô nhạy cảm — chi tiết thì mới có');
{
  const ds = await req('GET', '/api/nhansu/ho-so', { cookie: NS });
  const chu = JSON.stringify(ds.data);
  for (const [ten, gt] of [['số định danh', '079123456789'], ['mã số thuế', '8123456789'],
    ['số bảo hiểm', 'BH0012345'], ['số tài khoản', '0071000123456'], ['tên vợ/chồng', 'Trần Văn B']]) {
    check(`DANH SÁCH không chứa ${ten}`, !chu.includes(gt), ten);
  }
  check('nhưng vẫn đủ thứ để làm việc: chức danh và ngày vào làm',
    chu.includes('Cô phụ trách chính') && chu.includes('2024-08-01'));
}

// ===========================================================================
console.log('\n[5] "CỦA TÔI" — mỗi người đọc được hồ sơ của chính mình, chỉ của mình');
{
  const co = await req('GET', '/api/nhansu/ho-so/toi', { cookie: GV });
  check('CÔ đọc được hồ sơ của chính mình', co.status === 200, co.status);
  check('và thấy đúng số định danh của mình', co.data?.hoSo?.cccd === '079123456789', co.data?.hoSo?.cccd);
  check('màn nói rõ ai sửa được, để cô biết hỏi ai khi thấy sai',
    co.data?.suaDuoc === false && /Nhân sự/i.test(co.data?.aiSua || ''), co.data?.aiSua);

  // Chốt chặn quan trọng nhất của mục này.
  const coKhac = await req('GET', '/api/nhansu/ho-so/t2', { cookie: GV });
  check('CÔ KHÔNG đọc được hồ sơ của ĐỒNG NGHIỆP', coKhac.status === 403, coKhac.status);
  const coSua = await req('PUT', '/api/nhansu/ho-so/t1', { cookie: GV, body: { cccd: 'x' } });
  check('và KHÔNG sửa được hồ sơ của chính mình — đây là bản của nhà trường giữ',
    coSua.status === 403, coSua.status);
  const kt = await req('GET', '/api/nhansu/ho-so/toi', { cookie: KT });
  check('Kế toán cũng đọc được hồ sơ của CHÍNH MÌNH, dù bị chặn phần cả trường',
    kt.status === 200, kt.status);
}

// ===========================================================================
console.log('\n[6] Chấm công: từng ngày, cả trường một lượt, và xoá được');
{
  const N = HOM_NAY();
  const r1 = await req('PUT', `/api/nhansu/cham-cong/t1/${N}`, {
    cookie: NS, body: { loai: 'di-lam', gioVao: '07:00', gioRa: '17:00' },
  });
  check('chấm được một ngày', r1.status === 200, r1.data);

  const gioLa = await req('PUT', `/api/nhansu/cham-cong/t1/${N}`, { cookie: NS, body: { loai: 'di-lam', gioVao: '25:99' } });
  check('giờ sai dạng thì từ chối', gioLa.status === 400, gioLa.data);
  const gioNguoc = await req('PUT', `/api/nhansu/cham-cong/t1/${N}`, {
    cookie: NS, body: { loai: 'di-lam', gioVao: '17:00', gioRa: '07:00' },
  });
  check('giờ ra trước giờ vào thì từ chối', gioNguoc.status === 400, gioNguoc.data);
  const loaiLa = await req('PUT', `/api/nhansu/cham-cong/t1/${N}`, { cookie: NS, body: { loai: 'nghi-choi' } });
  check('loại ngày công lạ thì từ chối', loaiLa.status === 400, loaiLa.data);

  const ct = await req('POST', '/api/nhansu/cham-cong/ca-truong', { cookie: NS, body: { ngay: N } });
  check('chấm cả trường một lượt được', ct.status === 200, ct.data);
  check('và KHÔNG đè lên người đã chấm tay', ct.data.soDaCoTruoc >= 1, ct.data);
  const lai = await req('PUT', `/api/nhansu/cham-cong/t1/${N}`, { cookie: NS, body: { loai: '' } });
  check('để trống loại thì XOÁ dòng công — người chấm nhầm có đường lui',
    lai.status === 200 && lai.data.daXoa === true, lai.data);

  await req('PUT', `/api/nhansu/cham-cong/t1/${N}`, { cookie: NS, body: { loai: 'nua-ngay' } });
  const bang = await req('GET', `/api/nhansu/cham-cong?thang=${N.slice(0, 7)}`, { cookie: NS });
  const t1 = (bang.data?.danhSach || []).find(x => x.userId === 't1');
  check('bảng tháng có dòng của cô ấy', !!t1, (bang.data?.danhSach || []).length);
  check('NỬA NGÀY tính 0.5 công — quy ước duy nhất app tự đặt', t1 && t1.soCong === 0.5, t1 && t1.soCong);
  check('và app KHÔNG tự tính lương — bảng chỉ có ngày công',
    t1 && t1.luong === undefined && t1.tienCong === undefined, Object.keys(t1 || {}));
}

// ===========================================================================
console.log('\n[7] Xuất bảng công ra tệp cho kế toán');
{
  const N = HOM_NAY();
  const r = await fetch(`${sv.BASE}/api/nhansu/cham-cong.csv?thang=${N.slice(0, 7)}`, { headers: { cookie: NS } });
  const chu = await r.text();
  check('Nhân sự tải được tệp bảng công', r.status === 200, r.status);
  check('tệp có cột Số công', /Số công/.test(chu), chu.slice(0, 120));
  check('và có tên người thật', /Cô|Văn phòng/.test(chu), chu.slice(0, 200));
  const rKT = await fetch(`${sv.BASE}/api/nhansu/cham-cong.csv?thang=${N.slice(0, 7)}`, { headers: { cookie: KT } });
  check('KẾ TOÁN KHÔNG tự tải được — Nhân sự gửi cho, không phải tự lấy', rKT.status === 403, rKT.status);
}

// ===========================================================================
console.log('\n[8] TẮT PHÂN HỆ thì dữ liệu ngưng chảy, nhưng KHÔNG mất');
{
  const conn = new Database(path.join(DIR, 'school.db'));
  const truoc = conn.prepare('SELECT COUNT(*) AS n FROM nhansu_ho_so').get().n;
  conn.close();
  check('đối chứng — trong kho đang có hồ sơ', truoc >= 1, truoc);

  tatPhanHe(DIR, ['nhansu']);
  const sv2 = await dungMayChu({ port: Number(process.env.TEST_PORT2 || 4651), dir: DIR });
  const req2 = taoReq(sv2.BASE);
  const login2 = taoLogin(req2);
  const ns2 = (await login2('nhansu', 'quantri2026')).cookie;
  const r = await req2('GET', '/api/nhansu/ho-so', { cookie: ns2 });
  check('tắt phân hệ thì API bị chặn ngay ở máy chủ', r.status === 404 || r.status === 403, r.status);
  const gv2 = (await login2('giaovien', '123456')).cookie;
  check('và app vẫn đăng nhập, các phần khác vẫn chạy',
    (await req2('GET', '/api/attendance/class', { cookie: gv2 })).status === 200);
  await sv2.dung();

  const conn2 = new Database(path.join(DIR, 'school.db'));
  const sau = conn2.prepare('SELECT COUNT(*) AS n FROM nhansu_ho_so').get().n;
  conn2.close();
  check('DỮ LIỆU GIỮ NGUYÊN — tắt là ngưng dùng, không phải xoá', sau === truoc, { truoc, sau });
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Hồ sơ nhân sự & chấm công');
