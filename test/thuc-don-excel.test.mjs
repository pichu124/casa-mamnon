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
//
// Từ [6]: MẪU THEO TUẦN (góp ý 16/10, mục 1). `test/mau/thuc-don-tuan-truong.xlsx`
// dựng lại đúng ảnh mẫu của trường (cột A "Bữa sáng\n8h"… gộp dọc, "Bữa chiều",
// ô trống giữa bữa trưa, tiêu đề chỉ có "Thứ Hai…"), cũng openpyxl dựng rồi
// LibreOffice lưu lại.
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
  // Góp ý 16/10, mục 1: giờ theo ảnh mẫu của trường; "Sữa Vinamilk" → "Bữa sữa chiều" (cách gọi ở mục 7).
  check('tên và giờ theo ảnh mẫu của trường (16/10)', JSON.stringify(mau) === JSON.stringify([
    'breakfast|Bữa sáng|08:00', 'snack_sang|Bữa phụ sáng|09:30', 'lunch|Bữa trưa|11:20',
    'snack|Bữa phụ chiều|14:00', 'milk|Bữa sữa chiều|15:30']), mau);
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
    JSON.stringify(td.hang[0]) === JSON.stringify(['Ngày', 'Thứ', 'Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Bữa sữa chiều']), td.hang[0]);
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

// ===========================================================================
// THỰC ĐƠN THEO TUẦN (góp ý 16/10, mục 1): *"Để upload theo tuần k cần để theo
// tháng"*; *"Bữa sáng để luôn 3 dòng riêng biệt"*. Khuôn của trường: cột A là
// bữa kèm giờ (ô gộp dọc), cột B → F là Thứ Hai → Thứ Sáu, mỗi ô một món.
// ===========================================================================
const Database = (await import('better-sqlite3')).default;
const congN = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const dongDau = (o) => String(o ?? '').split('\n')[0];
const buaCua = (n, type) => ((n?.bua || []).find(b => b.type === type) || {});
// Nhóm hàng của trang "Thực đơn" theo tên bữa ở cột A (bỏ hàng tiêu đề và hàng Thứ).
const nhomBua = (td) => {
  const ra = [];
  for (const h of td.hang.slice(2)) {
    const ten = dongDau(h && h[0]);
    const cuoi = ra[ra.length - 1];
    if (cuoi && cuoi.ten === ten) cuoi.dong.push(h); else ra.push({ ten, dong: [h] });
  }
  return ra;
};
const TUAN_SAU = (await req('GET', '/api/menu?week=1', { cookie: QT })).data.from;
const TEP_TRUONG = fs.readFileSync(path.join(GOC, 'test', 'mau', 'thuc-don-tuan-truong.xlsx'));

console.log('\n[6] lib/xlsx ghi(): ô gộp bằng tham số tuỳ chọn `gop`, đọc lại bằng doc()');
{
  const hang = [['Bữa sáng', 'Phở'], [null, 'Bánh mì'], [null, 'Sữa'], ['Bữa trưa', 'Cơm']];
  const coGop = xlsx.doc(xlsx.ghi([{ ten: 'A', hang, gop: ['A1:A3'] }]))[0].hang;
  check('vùng gộp dọc A1:A3: đọc lại thấy tên bữa ở cả ba hàng, hàng sau không bị dính',
    coGop[1][0] === 'Bữa sáng' && coGop[2][0] === 'Bữa sáng' && coGop[3][0] === 'Bữa trưa', coGop);
  const khongGop = xlsx.doc(xlsx.ghi([{ ten: 'A', hang }]))[0].hang;
  check('không truyền `gop` thì như cũ: hàng 2, 3 trống ở cột A', khongGop[1][0] === undefined && khongGop[2][0] === undefined, khongGop);
  const sai = xlsx.doc(xlsx.ghi([{ ten: 'A', hang, gop: ['A1', 'A3:A1', 'zz', 'A0:A2', 'A1:A2', 'A2:A3'] }]))[0].hang;
  check('vùng viết sai, hay chồng lên vùng đã gộp, bị bỏ qua — tệp vẫn đọc được',
    sai[1][0] === 'Bữa sáng' && sai[2][0] === undefined && sai[3][0] === 'Bữa trưa', sai);
}

console.log('\n[7] Tải tệp mẫu THEO TUẦN — đúng khuôn bảng của trường');
{
  const macDinh = await taiVe('/api/menu/mau-excel', QT);
  check('không gửi tham số → mẫu của TUẦN SAU (tuần cần soạn)',
    macDinh.status === 200 && macDinh.ten.includes(`Thuc-don-tuan-${TUAN_SAU}.xlsx`), { s: macDinh.status, ten: macDinh.ten });
  const r = await taiVe(`/api/menu/mau-excel?tuan=${congN(TUAN_SAU, 2)}`, QT);
  check('200, đúng kiểu tệp Excel', r.status === 200 && /spreadsheetml/.test(r.kieu), r.status);
  check('gửi một ngày giữa tuần → quy về Thứ Hai (tên tệp có ngày Thứ Hai)', r.ten.includes(`Thuc-don-tuan-${TUAN_SAU}.xlsx`), r.ten);
  const bang = xlsx.doc(r.buf);
  const td = bang.find(b => b.ten === 'Thực đơn');
  check('có trang "Thực đơn" và trang "Hướng dẫn"', !!td && bang.some(b => b.ten === 'Hướng dẫn'), bang.map(b => b.ten));
  const t6 = congN(TUAN_SAU, 4);
  check('hàng 1: "THỰC ĐƠN TUẦN dd/mm – dd/mm/yyyy"',
    String(td.hang[0][0]).startsWith(`THỰC ĐƠN TUẦN ${dm(TUAN_SAU)}`) && String(td.hang[0][0]).includes(`– ${dm(t6)}/${t6.slice(0, 4)}`), td.hang[0]);
  check('hàng tiêu đề: cột A trống, rồi Thứ Hai → Thứ Sáu',
    !td.hang[1][0] && JSON.stringify(td.hang[1].slice(1).map(dongDau)) === JSON.stringify(['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu']), td.hang[1]);
  check('dưới chữ Thứ là ngày của đúng tuần đó', td.hang[1].slice(1).every((o, i) => String(o).endsWith(`\n${dm(congN(TUAN_SAU, i))}`)), td.hang[1]);
  const nhom = nhomBua(td);
  check('đủ năm bữa, đúng thứ tự', JSON.stringify(nhom.map(n => n.ten))
    === JSON.stringify(['Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Bữa sữa chiều']), nhom.map(n => n.ten));
  check('Bữa sáng đúng 3 dòng riêng', nhom[0]?.dong.length === 3, nhom[0]?.dong.length);
  check('số dòng mỗi bữa theo khuôn trường: 3 / 1 / 6 / 2 / 1', JSON.stringify(nhom.map(n => n.dong.length)) === '[3,1,6,2,1]', nhom.map(n => n.dong.length));
  check('cột A ghi tên bữa kèm giờ (Bữa trưa có giờ của hai lứa tuổi)',
    nhom[0]?.dong[0][0] === 'Bữa sáng\n8h00' && nhom[1]?.dong[0][0] === 'Bữa phụ sáng\n9h30'
    && /11h20/.test(nhom[2]?.dong[0][0]) && /11h40/.test(nhom[2]?.dong[0][0]), nhom.map(n => n.dong[0][0]));
  // Dữ liệu mẫu có thực đơn dùng chung cho tuần sau: mẫu điền sẵn, mỗi ô một món.
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const meals = JSON.parse(conn.prepare('SELECT meals FROM menus WHERE date = ?').get(TUAN_SAU)?.meals || '[]');
  conn.close();
  const trua = (meals.find(b => b.type === 'lunch') || {}).items || [];
  check('(đối chứng) tuần sau đang có bữa trưa Thứ Hai', trua.length >= 2, meals);
  check('món đang có của Thứ Hai điền sẵn vào cột Thứ Hai, mỗi ô một món',
    JSON.stringify(nhom[2].dong.map(h => h[1]).filter(Boolean)) === JSON.stringify(trua), nhom[2].dong.map(h => h[1]));

  for (const [ten, c] of [['cô', GV], ['gia đình', PH]]) {
    const x = await taiVe(`/api/menu/mau-excel?tuan=${TUAN_SAU}`, c);
    check(`${ten} không tải được mẫu tuần`, [401, 403].includes(x.status), x.status);
  }
  const ql = await taiVe(`/api/menu/mau-excel?tuan=${TUAN_SAU}&campusId=cs2`, QL);
  check('quản lý cơ sở 1 KHÔNG tải mẫu tuần của bếp cơ sở 2', ql.status === 403, ql.status);
  const qlMinh = await taiVe(`/api/menu/mau-excel?tuan=${TUAN_SAU}`, QL);
  check('quản lý cơ sở 1 tải mẫu bếp mình: tiêu đề có tên bếp',
    qlMinh.status === 200 && / — Bếp \S/.test(String(xlsx.doc(qlMinh.buf)[0].hang[0][0])), qlMinh.status === 200 && xlsx.doc(qlMinh.buf)[0].hang[0]);
  const sai = await taiVe('/api/menu/mau-excel?tuan=2027-02-30', QT);
  check('tuần không có thật → 400', sai.status === 400, sai.status);

  // Bữa có nhiều món hơn số dòng của khuôn: thêm dòng, không cắt món.
  const sang = ['Phở gà', 'Bánh mì', 'Trứng luộc', 'Sữa đậu nành', 'Chuối'];
  const dat = await req('PUT', '/api/menu/tuan', { cookie: QT, body: { ngay: [{ date: '2027-05-04', meals: [
    { type: 'breakfast', label: 'Bữa sáng', time: '08:00', items: sang },
    { type: 'lunch', label: 'Bữa trưa', time: '11:20', items: ['Cơm', 'Cá kho'] },
  ] }] } });
  check('(đối chứng) dựng được Thứ Ba 04/05/2027 có 5 món bữa sáng', dat.status === 200, dat.data);
  const nhieu = await taiVe('/api/menu/mau-excel?tuan=2027-05-07', QT);
  const nhom2 = nhomBua(xlsx.doc(nhieu.buf)[0]);
  check('tên tệp theo Thứ Hai 03/05/2027', nhieu.ten.includes('Thuc-don-tuan-2027-05-03.xlsx'), nhieu.ten);
  check('bữa sáng 5 món → nhóm Bữa sáng nới ra 5 dòng, đủ cả 5 món ở cột Thứ Ba',
    nhom2[0]?.dong.length === 5 && JSON.stringify(nhom2[0].dong.map(h => h[2])) === JSON.stringify(sang), nhom2[0]?.dong);
}

console.log('\n[8] Nạp bảng của trường (LibreOffice lưu, ô bữa gộp dọc, "Bữa chiều", ô trống giữa bữa trưa)');
{
  const xem = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_TRUONG), tuan: congN(TUAN_SAU, 3) } });
  check('xem trước 200', xem.status === 200, xem.data);
  const ds = xem.data?.ngay || [];
  check('5 ngày, đúng Thứ Hai → Thứ Sáu của tuần đã chọn',
    JSON.stringify(ds.map(n => n.date)) === JSON.stringify([0, 1, 2, 3, 4].map(i => congN(TUAN_SAU, i))), ds.map(n => n.date));
  check('trả về Thứ Hai của tuần đã đọc', xem.data?.tuan === TUAN_SAU, xem.data?.tuan);
  check('Thứ Hai: bữa sáng đủ 3 món, mỗi dòng một món (dấu phẩy trong tên món giữ nguyên)',
    JSON.stringify(buaCua(ds[0], 'breakfast').items) === JSON.stringify(['Bún cá rau cải xanh', 'Bánh pancake bơ đậu phộng', 'Sữa đậu gà, óc chó']),
    buaCua(ds[0], 'breakfast'));
  check('Bữa phụ sáng 1 món', JSON.stringify(buaCua(ds[0], 'snack_sang').items) === JSON.stringify(['Táo']), buaCua(ds[0], 'snack_sang'));
  check('Thứ Hai: bữa trưa đủ 6 món', buaCua(ds[0], 'lunch').items?.length === 6, buaCua(ds[0], 'lunch'));
  check('Thứ Ba: ô trống giữa bữa trưa bị bỏ, không sinh món rỗng',
    JSON.stringify(buaCua(ds[1], 'lunch').items) === JSON.stringify(['Cơm tám thơm', 'Cá basa sốt cà', 'Bí đỏ luộc', 'Canh rau ngót']), buaCua(ds[1], 'lunch'));
  check('"Bữa chiều" là Bữa phụ chiều (snack), 2 món',
    JSON.stringify(buaCua(ds[0], 'snack').items) === JSON.stringify(['Nui xào hải sản', 'Nước ép dưa hấu']) && buaCua(ds[0], 'snack').label === 'Bữa phụ chiều', buaCua(ds[0], 'snack'));
  check('giờ đọc từ cột A: 8h → 08:00, 9h30 → 09:30, "0-3: 11h20 / 3-6: 11h40" → 11:20, 14h00 → 14:00',
    buaCua(ds[0], 'breakfast').time === '08:00' && buaCua(ds[0], 'snack_sang').time === '09:30'
    && buaCua(ds[0], 'lunch').time === '11:20' && buaCua(ds[0], 'snack').time === '14:00', ds[0]?.bua?.map(b => `${b.type} ${b.time}`));
  check('tệp không có Bữa sữa chiều → không sinh bữa đó', !buaCua(ds[0], 'milk').type, ds[0]?.bua?.map(b => b.type));
  check('không có lời nhắc thừa với bảng đúng khuôn', (xem.data?.canhBao || []).length === 0, xem.data?.canhBao);

  const luu = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_TRUONG), tuan: TUAN_SAU, luu: true } });
  check('lưu: 200, ghi đủ 5 ngày', luu.status === 200 && luu.data?.daGhi === 5, luu.data);
  const tuan = (await req('GET', '/api/menu?week=1', { cookie: PH })).data;
  const ngayPH = (d) => (tuan?.menus || []).find(m => m.date === d) || {};
  const buaPH = (d, type) => (ngayPH(d).meals || []).find(b => b.type === type) || {};
  check('gia đình mở Thực đơn tuần sau: Thứ Hai có đúng 3 món bữa sáng',
    JSON.stringify(buaPH(TUAN_SAU, 'breakfast').items) === JSON.stringify(['Bún cá rau cải xanh', 'Bánh pancake bơ đậu phộng', 'Sữa đậu gà, óc chó']), buaPH(TUAN_SAU, 'breakfast'));
  check('Thứ Sáu: bữa trưa bỏ ô trống, bữa chiều đủ hai món',
    buaPH(congN(TUAN_SAU, 4), 'lunch').items?.length === 5 && JSON.stringify(buaPH(congN(TUAN_SAU, 4), 'snack').items) === JSON.stringify(['Bún gạo xào', 'Nước ép táo']),
    ngayPH(congN(TUAN_SAU, 4)).meals);
  check('món cũ của tuần đó đã được thay', !JSON.stringify(ngayPH(TUAN_SAU).meals || []).includes('Cơm trắng'), ngayPH(TUAN_SAU).meals);
  check('bữa đã có giữ tên và giờ bếp đặt riêng; bữa mới lấy giờ trong tệp',
    buaPH(TUAN_SAU, 'snack').label === 'Bữa xế' && buaPH(TUAN_SAU, 'snack').time === '14:30' && buaPH(TUAN_SAU, 'snack_sang').time === '09:30',
    ngayPH(TUAN_SAU).meals);

  const lai = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_TRUONG), tuan: TUAN_SAU, luu: true } });
  check('nạp lại đúng tệp đó: 5 ngày "không đổi", không ghi ngày nào', lai.status === 200 && lai.data?.khongDoi === 5 && lai.data?.daGhi === 0, lai.data);

  const ql = await req('POST', '/api/menu/nap-excel', { cookie: QL, body: { tep: dataUrl(TEP_TRUONG), tuan: TUAN_SAU, campusId: 'cs2', luu: true } });
  check('quản lý cơ sở 1 nạp tệp tuần cho bếp cơ sở 2 → 403', ql.status === 403, ql.status);
  const co = await req('POST', '/api/menu/nap-excel', { cookie: GV, body: { tep: dataUrl(TEP_TRUONG), tuan: TUAN_SAU } });
  check('cô nạp tệp tuần thì bị chặn', [401, 403].includes(co.status), co.status);
  const tuanSai = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_TRUONG), tuan: '19/10/2026' } });
  check('tuần gửi lên sai dạng → 400 nói rõ', tuanSai.status === 400 && /[Tt]uần/.test(tuanSai.data?.error || ''), tuanSai.data);
}

console.log('\n[9] Bảng KHÔNG gộp ô (tên bữa chỉ ở dòng đầu), ngày ghi dưới chữ Thứ, cột Thứ Bảy, dòng lạ');
{
  // Tuần sau nữa, ngày ghi "dd/mm" không có năm — đúng như mẫu của app ghi.
  const W = congN(TUAN_SAU, 7);
  const hang = [
    [`THỰC ĐƠN TUẦN ${dm(W)} – ${dm(congN(W, 4))}`],
    ['', ...[2, 3, 4, 5, 6, 7].map((t, i) => `Thứ ${t}\n${dm(congN(W, i))}`)],
    ['Bữa sáng 7h45', 'Cháo cá', 'Phở', '', '', 'Bún bò', 'Xôi'],
    ['', 'Bánh mì', '', '', '', '', ''],
    ['', 'Sữa bắp', '', '', '', '', ''],
    ['BỮA TRƯA', 'Cơm', 'Cơm', '', '', 'Cơm', ''],
    ['', 'Cá kho; Canh bí', '', '', '', 'Gà rim', ''],
    ['Bữa phụ chiều', 'Bánh flan', '', '', '', '', ''],
    ['Bữa sữa chiều\n15h30', 'Sữa tươi', '', '', '', '', ''],
    ['Tráng miệng', 'Dưa hấu', '', '', '', '', ''],
  ];
  const tep = dataUrl(xlsx.ghi([{ ten: 'Thực đơn', hang }]));
  const xem = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep } });
  check('không gửi tuần mà ô Thứ có ngày → suy ra tuần từ ngày đó', xem.status === 200 && xem.data?.tuan === W, xem.data);
  const ds = xem.data?.ngay || [];
  check('chỉ những ngày có món: Thứ Hai, Thứ Ba, Thứ Sáu (ngày trống không đụng tới)',
    JSON.stringify(ds.map(n => n.date)) === JSON.stringify([W, congN(W, 1), congN(W, 4)]), ds.map(n => n.date));
  check('tên bữa chỉ ở dòng đầu vẫn mang xuống các dòng dưới: bữa sáng Thứ Hai 3 món',
    JSON.stringify(buaCua(ds[0], 'breakfast').items) === JSON.stringify(['Cháo cá', 'Bánh mì', 'Sữa bắp']), buaCua(ds[0], 'breakfast'));
  check('"Bữa sáng 7h45" → giờ 07:45', buaCua(ds[0], 'breakfast').time === '07:45', buaCua(ds[0], 'breakfast'));
  check('chữ HOA "BỮA TRƯA" vẫn nhận; dấu chấm phẩy trong ô tách món như cũ',
    JSON.stringify(buaCua(ds[0], 'lunch').items) === JSON.stringify(['Cơm', 'Cá kho', 'Canh bí']), buaCua(ds[0], 'lunch'));
  check('không có giờ trong cột A → giờ mặc định của bữa', buaCua(ds[0], 'lunch').time === '11:20', buaCua(ds[0], 'lunch'));
  check('"Bữa phụ chiều" → snack; "Bữa sữa chiều" → milk (không nhầm sang phụ chiều)',
    buaCua(ds[0], 'snack').items?.[0] === 'Bánh flan' && buaCua(ds[0], 'milk').items?.[0] === 'Sữa tươi' && buaCua(ds[0], 'milk').time === '15:30', ds[0]?.bua);
  const cb = (xem.data?.canhBao || []).join(' | ');
  check('cột Thứ 7 bị bỏ, có lời nhắc', /Thứ 7/.test(cb) && !ds.some(n => n.date === congN(W, 5)), cb);
  check('dòng "Tráng miệng" không phải tên bữa → lời nhắc, bỏ qua', /Tráng miệng/.test(cb) && !JSON.stringify(ds).includes('Dưa hấu'), cb);

  const W2 = congN(W, 7);
  const lech = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep, tuan: congN(W2, 2) } });
  const dsLech = lech.data?.ngay || [];
  check('chọn tuần khác ngày ghi trong tệp → vẫn theo tuần ĐÃ CHỌN',
    JSON.stringify(dsLech.map(n => n.date)) === JSON.stringify([W2, congN(W2, 1), congN(W2, 4)]), dsLech.map(n => n.date));
  check('và có lời nhắc ngày trong tệp lệch với tuần đã chọn',
    (lech.data?.canhBao || []).some(c => c.includes(dm(W)) && c.includes(dm(W2))), lech.data?.canhBao);

  const khongNgay = dataUrl(xlsx.ghi([{ ten: 'A', hang: [['', 'T2', 'T3', 'T4', 'T5', 'T6'], ['Bữa trưa', 'Cơm', 'Bún', '', '', '']] }]));
  const thieu = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: khongNgay } });
  check('không chọn tuần, ô Thứ không có ngày → 400 bằng câu dễ hiểu', thieu.status === 400 && /tuần/.test(thieu.data?.error || ''), thieu.data);
  const du = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: khongNgay, tuan: '2027-05-10' } });
  check('cùng tệp đó (tiêu đề "T2…T6") có chọn tuần → đọc được',
    du.status === 200 && JSON.stringify((du.data?.ngay || []).map(n => n.date)) === JSON.stringify(['2027-05-10', '2027-05-11']), du.data);
}

console.log('\n[10] Mẫu tuần của app tải về rồi nạp lại; tệp khuôn THÁNG cũ vẫn nạp như trước');
{
  const mau = await taiVe('/api/menu/mau-excel?tuan=2027-05-03', QT);
  const y = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(mau.buf), tuan: '2027-05-03' } });
  const t3 = (y.data?.ngay || []).find(n => n.date === '2027-05-04');
  check('mẫu tải về nạp lại nguyên: ngày đang có được nhận ra là "không đổi"', y.status === 200 && t3?.khongDoi === true, y.data);
  const td = xlsx.doc(mau.buf)[0];
  const iTrua = td.hang.findIndex(h => dongDau(h && h[0]) === 'Bữa trưa');
  td.hang[iTrua][2] = 'Cơm gạo lứt';
  const sua = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(xlsx.ghi([{ ten: 'Thực đơn', hang: td.hang }])), tuan: '2027-05-03', luu: true } });
  const conn = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const meals = JSON.parse(conn.prepare('SELECT meals FROM menus WHERE date = ?').get('2027-05-04')?.meals || '[]');
  conn.close();
  check('sửa một ô rồi nạp: ghi đúng ngày đó, bữa sáng 5 món còn nguyên',
    sua.status === 200 && sua.data?.daGhi === 1
    && JSON.stringify((meals.find(b => b.type === 'lunch') || {}).items) === JSON.stringify(['Cơm gạo lứt', 'Cá kho'])
    && (meals.find(b => b.type === 'breakfast') || {}).items?.length === 5, { r: sua.data, meals });

  const thang = await req('POST', '/api/menu/nap-excel', { cookie: QT, body: { tep: dataUrl(TEP_THAT), tuan: '2027-05-03' } });
  check('tệp khuôn THÁNG cũ (màn hình nay luôn gửi kèm tuần) vẫn đọc theo cột Ngày như trước',
    thang.status === 200 && JSON.stringify((thang.data?.ngay || []).map(n => n.date)) === JSON.stringify(['2027-03-01', '2027-03-02']), thang.data);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Thực đơn bằng tệp Excel mẫu');
