// Bài canh THỰC ĐƠN BẰNG TỆP EXCEL MẪU (Đ226).
//
// Chạy bằng:  npm run test:thuc-don-excel
//
// VÌ SAO CÓ PHẦN NÀY
//
// Góp ý của trường 06/10 (mục 3): *"phần dán thực đơn từ bảng Excel/Word chưa
// đúng ý định. Hãy tạo 1 form mẫu bằng Excel theo đúng cấu trúc bạn cần, sau
// đó mình sẽ up lên và bạn sẽ tự điền vào từng ngày"*.
//
// BỐN ĐIỀU CỐ Ý:
//
//   • TỆP THẬT, KHÔNG PHẢI TỆP TỰ SINH. `test/mau/thuc-don-libreoffice.xlsx` do
//     openpyxl dựng rồi LibreOffice LƯU LẠI — có bảng chữ dùng chung, ô ngày là
//     số sê-ri, đúng như tệp Excel thật trường sẽ nạp. Bộ đọc chỉ đọc được tệp
//     do chính nó ghi thì chưa đo được gì.
//   • XEM TRƯỚC KHÔNG GHI GÌ. Chỉ `luu: true` mới ghi.
//   • NGÀY ĐỂ TRỐNG TRONG TỆP KHÔNG BỊ ĐỤNG TỚI. Nạp một tệp thiếu vài ngày mà
//     xoá mất thực đơn đang có của những ngày ấy là hỏng im lặng.
//   • NĂM BỮA CỦA MẪU KHỚP KHUNG NĂM BỮA CỦA MÀN SOẠN — Nhật ký ngày đọc thực đơn
//     theo đúng mã `type` ấy.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo,
} from './_chung.mjs';

const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('thuc-don-excel');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS = taoQuanTri(DIR, 'Quản lý CS1', 'quanly1');
khoaVaoCoSo(DIR, 'quanly1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4794), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vao('hieutruong', mkQT);
const QL = await vao('quanly1', mkCS);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const taiVe = async (duong, cookie) => {
  const r = await fetch(sv.BASE + duong, { headers: { Cookie: cookie } });
  return { status: r.status, kieu: r.headers.get('content-type') || '', ten: r.headers.get('content-disposition') || '', buf: Buffer.from(await r.arrayBuffer()) };
};
const dataUrl = (buf) => `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buf.toString('base64')}`;
const TEP_THAT = fs.readFileSync(path.join(GOC, 'test', 'mau', 'thuc-don-libreoffice.xlsx'));

// ===========================================================================
console.log('\n[1] Năm bữa của tệp mẫu khớp khung năm bữa của màn soạn');
{
  const rt = fs.readFileSync(path.join(GOC, 'routes', 'menu.js'), 'utf8');
  const vw = fs.readFileSync(path.join(GOC, 'public', 'js', 'views', 'menu.js'), 'utf8');
  const lay = (chu, dau) => {
    const i = chu.indexOf(dau);
    const doan = chu.slice(i, i + 900);   // năm dòng đầu sau tên hằng
    return [...doan.matchAll(/type: '([^']+)', label: '([^']+)', time: '([^']+)'/g)].slice(0, 5).map(m => m.slice(1).join('|'));
  };
  const mau = lay(rt, 'const BUA_MAU = [');
  const man = lay(vw, 'BUA_MAC_DINH: [');
  check('đọc được năm bữa ở cả hai chỗ', mau.length === 5 && man.length === 5, { mau, man });
  check('năm bữa giống hệt nhau (mã, tên, giờ)', JSON.stringify(mau) === JSON.stringify(man), { mau, man });
}

// ===========================================================================
console.log('\n[2] Tải tệp mẫu một tháng');
{
  const r = await taiVe('/api/menu/mau-excel?thang=2027-03', QT);
  check('ban giám hiệu tải được (200)', r.status === 200, r.status);
  check('đúng kiểu tệp Excel', /spreadsheetml/.test(r.kieu), r.kieu);
  check('tên tệp có tháng', /Thuc-don-mau-2027-03\.xlsx/.test(r.ten), r.ten);
  const bang = xlsx.doc(r.buf);
  const td = bang.find(b => b.ten === 'Thực đơn');
  check('có trang "Thực đơn" và trang "Hướng dẫn"', !!td && bang.some(b => b.ten === 'Hướng dẫn'), bang.map(b => b.ten));
  check('hàng tiêu đề: Ngày | Thứ | năm bữa',
    JSON.stringify(td.hang[0]) === JSON.stringify(['Ngày', 'Thứ', 'Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Sữa Vinamilk']), td.hang[0]);
  // Tháng 3/2027: 31 ngày, 23 ngày từ thứ Hai tới thứ Sáu.
  check('mỗi ngày học một hàng — tháng 3/2027 có 23 ngày học', td.hang.length - 1 === 23, td.hang.length - 1);
  check('hàng đầu là thứ Hai 01/03/2027', td.hang[1][0] === '01/03/2027' && td.hang[1][1] === 'Thứ Hai', td.hang[1]);
  check('không có thứ Bảy, Chủ nhật', !td.hang.some(h => /Thứ Bảy|Chủ nhật/.test(h[1] || '')));

  for (const [ten, c] of [['cô', GV], ['gia đình', PH]]) {
    const x = await taiVe('/api/menu/mau-excel?thang=2027-03', c);
    check(`${ten} không tải được tệp mẫu`, [401, 403].includes(x.status), x.status);
  }
  const ql = await taiVe('/api/menu/mau-excel?thang=2027-03&campusId=cs2', QL);
  check('quản lý cơ sở 1 KHÔNG tải mẫu bếp cơ sở 2', ql.status === 403, ql.status);
}

// ===========================================================================
console.log('\n[3] Nạp tệp thật (LibreOffice lưu): xem trước, KHÔNG ghi gì');
{
  const xem = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_THAT) } });
  check('xem trước 200', xem.status === 200, xem.data);
  const ds = xem.data?.ngay || [];
  check('đúng hai ngày có món: 01/03 và 02/03', JSON.stringify(ds.map(n => n.date)) === JSON.stringify(['2027-03-01', '2027-03-02']), ds.map(n => n.date));
  const t2 = ds[0] || {};
  const bua = (n, type) => ((n.bua || []).find(b => b.type === type) || {}).items || [];
  check('ô ngày dạng SỐ SÊ-RI của Excel đọc đúng ngày', t2.date === '2027-03-01');
  check('ô xuống dòng tách thành hai món', JSON.stringify(bua(t2, 'breakfast')) === JSON.stringify(['Phở gà', 'Sữa đậu nành']), bua(t2, 'breakfast'));
  check('dấu chấm phẩy tách món', JSON.stringify(bua(t2, 'lunch')) === JSON.stringify(['Cơm', 'Canh rau ngót', 'Cá kho']), bua(t2, 'lunch'));
  check('bữa để trống không sinh dòng', !(t2.bua || []).some(b => b.type === 'snack_sang'));
  check('ô ngày dạng CHỮ "02/03/2027" cũng đọc được', JSON.stringify(bua(ds[1] || {}, 'snack')) === JSON.stringify(['Bánh flan']));
  const cb = (xem.data?.canhBao || []).join(' | ');
  check('báo cột lạ "Ghi chú" bị bỏ qua', /Ghi chú/.test(cb), cb);
  check('báo thứ Bảy không phải ngày học', /Thứ Bảy 06\/03/.test(cb), cb);
  check('báo hàng có món mà thiếu ngày', /thiếu ngày/.test(cb), cb);
  check('báo ngày trùng — lấy hàng đầu', /01\/03 có hai hàng/.test(cb), cb);
  check('báo ngày không có thật (30/02)', /30\/02\/2027/.test(cb), cb);
  const truoc = (await req('GET', '/api/menu?week=0', { cookie: QT })).data;
  const chuaGhi = await req('GET', '/api/menu/2027-03-01', { cookie: QT }).catch(() => null);
  check('xem trước KHÔNG ghi gì — ngày 01/03/2027 vẫn chưa có thực đơn', !chuaGhi || chuaGhi.status !== 200 || !(chuaGhi.data?.meals || []).length,
    chuaGhi && chuaGhi.status);
  check('(đối chứng) đọc thực đơn tuần này vẫn chạy', !!truoc);
}

// ===========================================================================
console.log('\n[4] Lưu: ngày có món thì thay, ngày trống trong tệp thì giữ nguyên');
{
  // Dựng sẵn thực đơn cho 03/03 (tệp để trống ngày này) và 02/03 (tệp có món).
  const dung = await req('PUT', '/api/menu/tuan', {
    cookie: QT,
    body: { ngay: [
      { date: '2027-03-02', meals: [{ type: 'lunch', label: 'Bữa trưa riêng', time: '11:00', items: ['Món cũ ngày 2'] }, { type: 'snack', label: 'Xế', time: '15:00', items: ['Bánh cũ'] }] },
      { date: '2027-03-03', meals: [{ type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Món cũ ngày 3'] }] },
    ] },
  });
  check('(đối chứng) dựng được thực đơn có sẵn', dung.status === 200, dung.data);
  const xem = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_THAT) } });
  check('xem trước báo 02/03 sẽ THAY bản đang có', (xem.data?.ngay || []).find(n => n.date === '2027-03-02')?.daCo === true);
  const luu = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_THAT), luu: true } });
  check('lưu 200, đúng hai ngày', luu.status === 200 && luu.data?.daLuu === 2, luu.data);

  const tuan = (await req('GET', '/api/menu?week=0', { cookie: QT })).data;
  void tuan;
  const doc = async (date) => {
    const r = await req('GET', `/api/menu?from=${date}`, { cookie: PH });
    return ((r.data?.menus) || []).find(m => m.date === date) || null;
  };
  // Đọc thẳng qua bảng của đường ghi tuần để không phụ thuộc cách hỏi theo tuần.
  const Database = (await import('better-sqlite3')).default;
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const mot = (date) => {
    const r = conn.prepare('SELECT meals FROM menus WHERE date = ?').get(date);
    return r ? JSON.parse(r.meals) : null;
  };
  const n1 = mot('2027-03-01'); const n2 = mot('2027-03-02'); const n3 = mot('2027-03-03');
  check('01/03 (ngày mới) đã có món từ tệp', JSON.stringify((n1 || []).find(b => b.type === 'lunch')?.items) === JSON.stringify(['Cơm', 'Canh rau ngót', 'Cá kho']), n1);
  check('02/03 (có sẵn) bị THAY bằng món trong tệp — món cũ không còn', !!n2 && !JSON.stringify(n2).includes('Món cũ ngày 2') && JSON.stringify(n2).includes('Bánh flan'), n2);
  check('02/03: bữa có sẵn giữ TÊN và GIỜ bếp đặt riêng', (n2 || []).find(b => b.type === 'snack')?.label === 'Xế' && (n2 || []).find(b => b.type === 'snack')?.time === '15:00', n2);
  check('03/03 TRỐNG trong tệp → GIỮ NGUYÊN thực đơn đang có', JSON.stringify(n3).includes('Món cũ ngày 3'), n3);
  check('thứ Bảy 06/03 KHÔNG được ghi', mot('2027-03-06') === null);
  conn.close();
  void doc;
}

// ===========================================================================
console.log('\n[5] Tệp hỏng, sai mẫu, sai quyền — từ chối nói rõ, không ghi gì');
{
  const rac = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(Buffer.from('không phải excel')) } });
  check('tệp không phải Excel → 400 nói rõ', rac.status === 400 && /Excel/.test(rac.data?.error || ''), rac.data);
  const khongCotNgay = xlsx.ghi([{ ten: 'A', hang: [['Thứ', 'Bữa sáng'], ['Thứ Hai', 'Phở']] }]);
  const sai = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(khongCotNgay) } });
  check('thiếu cột Ngày → 400 chỉ đường tải mẫu', sai.status === 400 && /tệp mẫu/.test(sai.data?.error || ''), sai.data);
  const co = await req('POST', '/api/menu/nap-excel', { cookie: GV, body: { tep: dataUrl(TEP_THAT), luu: true } });
  check('cô nạp thì bị chặn', [401, 403].includes(co.status), co.status);
  const ql = await req('POST', '/api/menu/nap-excel', { cookie: QL, body: { tep: dataUrl(TEP_THAT), campusId: 'cs2', luu: true } });
  check('quản lý cơ sở 1 nạp cho bếp cơ sở 2 → 403', ql.status === 403, ql.status);
  const qlMinh = await req('POST', '/api/menu/nap-excel', { cookie: QL, body: { tep: dataUrl(TEP_THAT), luu: true } });
  check('quản lý cơ sở 1 nạp cho bếp mình → ghi vào bếp cơ sở 1', qlMinh.status === 200 && qlMinh.data?.campusId === 'cs1', qlMinh.data);

  // Tệp mẫu do chính app phát ra, điền thêm món, nạp lại được ngay.
  const mau = xlsx.doc((await taiVe('/api/menu/mau-excel?thang=2027-04', QT)).buf);
  const hang = mau.find(b => b.ten === 'Thực đơn').hang;
  hang[1][4] = 'Cơm gà; Rau luộc';
  const tro = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(xlsx.ghi([{ ten: 'Thực đơn', dongTieuDe: true, hang }])) } });
  check('tệp mẫu của app điền thêm rồi nạp lại: đọc đúng ngày đầu tháng 4', tro.status === 200 && tro.data?.ngay?.[0]?.date === '2027-04-01', tro.data);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Thực đơn bằng tệp Excel mẫu');
