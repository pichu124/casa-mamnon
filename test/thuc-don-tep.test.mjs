// Bài canh TỆP THỰC ĐƠN CẢ TUẦN (Đ160 — TD-04).
//
// Chạy bằng:  npm run test:thuc-don-tep
//
// NHÀ TRƯỜNG XIN GÌ
//
// 07/09: *"cho văn phòng nhập thực đơn cả tuần bằng cách tải tệp lên, hoặc
// điền/dán theo mẫu bảng tuần (hàng = bữa, cột = thứ) để chép nhanh từ tệp sẵn
// có"*. Đ132 làm vế thứ hai (ô dán bảng từ Excel). Đây là vế thứ nhất.
//
// ĐIỀU CỐ Ý, VÀ LÀ CHỖ DỄ LÀM SAI NHẤT CỦA MỤC NÀY: tệp là BẢN ĐÍNH KÈM, KHÔNG
// thay chỗ bảng thực đơn đã gõ. App không đọc được chữ trong một tệp PDF hay
// một tấm ảnh chụp bảng thực đơn — nên nếu để tệp thay chỗ thì màn từng ngày
// của gia đình, phần Nhật ký "hôm nay con ăn gì" và bảng đối chiếu Tiền ăn
// đều mất dữ liệu cùng lúc. Mục [5] canh đúng điều đó.
//
// Và Excel thì KHÔNG nhận, cũng cố ý: đã có đường tốt hơn hẳn (ô dán bảng),
// đường ấy đưa nội dung vào đúng bảng thực đơn nên gia đình đọc được theo
// từng ngày. Nhận .xlsx rồi treo nguyên lên là đổi một đường tốt lấy một
// đường tệ hơn. Câu từ chối phải chỉ sang đường đúng — mục [2].
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('thuc-don-tep');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng TD', 'td_qt');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2 TD', 'td_cs2');
khoaVaoCoSo(DIR, 'td_cs2', 'cs2');
datChucVu(DIR, 'td_cs2', 'quanly-coso');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4764), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Một tệp PDF nhỏ nhất còn hợp lệ theo bộ nhận dạng của lib/uploads.js: nó chỉ
// đọc bốn byte đầu "%PDF".
const PDF = `data:application/pdf;base64,${Buffer.from('%PDF-1.4\nthực đơn tuần\n%%EOF\n').toString('base64')}`;
// PNG 1×1 thật.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// Một tệp ZIP không có thư mục "word/" — đúng hình dạng của .xlsx.
const XLSX = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${
  Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('xl/workbook.xml'.padEnd(40, ' '))]).toString('base64')}`;

const lechThuHai = (s) => {
  const t = new Date(Date.parse(`${s}T00:00:00Z`)).getUTCDay();
  return t === 0 ? 6 : t - 1;
};
const congNgay = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const THU_HAI = congNgay(HOM_NAY(), -lechThuHai(HOM_NAY()));

const xemTuan = async (cookie, q = '') => (await req('GET', `/api/menu${q}`, { cookie })).data;

try {
  const QT = await vao('td_qt', mkQT);
  const CS2 = await vao('td_cs2', mkCS2);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Văn phòng treo được tệp cho cả tuần');
  {
    const truoc = await xemTuan(QT);
    check('màn thực đơn mang theo danh sách tệp và cờ ai treo được',
      Array.isArray(truoc.tep) && truoc.taiTepDuoc === true, { tep: truoc.tep, tai: truoc.taiTepDuoc });
    check('tuần này chưa có tệp nào', truoc.tep.length === 0, truoc.tep);

    const r = await req('POST', '/api/menu/tep', { cookie: QT, body: {
      tuNgay: THU_HAI, ten: 'Thực đơn tuần 37.pdf', dataUrl: PDF } });
    check('treo được tệp PDF', r.status === 201, `${r.status} ${JSON.stringify(r.data).slice(0, 140)}`);
    check('và trả lại danh sách tệp của tuần', (r.data.tep || []).length === 1, r.data.tep);
    check('giữ đúng tên người tải lên nhìn thấy',
      r.data.tep[0].tenGoc === 'Thực đơn tuần 37.pdf', r.data.tep[0]);

    const anh = await req('POST', '/api/menu/tep', { cookie: QT, body: {
      tuNgay: THU_HAI, ten: 'Ảnh chụp bảng bếp.png', dataUrl: PNG } });
    check('treo được cả ẢNH CHỤP bảng thực đơn — thứ nhanh nhất với điện thoại',
      anh.status === 201 && (anh.data.tep || []).some(t => t.loai === 'anh'), anh.data);

    // GỬI GIỮA TUẦN THÌ VẪN VỀ ĐÚNG THỨ HAI. Một bản giao diện cũ (hoặc lời
    // gọi tay) gửi ngày thứ Tư mà máy chủ nhận nguyên thì tệp nằm ở một "tuần"
    // không màn nào hỏi tới — tải lên xong rồi biến mất.
    const giua = await req('POST', '/api/menu/tep', { cookie: QT, body: {
      tuNgay: congNgay(THU_HAI, 2), ten: 'Gửi giữa tuần.pdf', dataUrl: PDF } });
    check('gửi mốc giữa tuần thì máy chủ đưa về đúng thứ Hai',
      giua.status === 201 && (giua.data.tep || []).some(t => t.tenGoc === 'Gửi giữa tuần.pdf'), giua.data);

    const day = await req('POST', '/api/menu/tep', { cookie: QT, body: {
      tuNgay: THU_HAI, ten: 'Tệp thứ tư.pdf', dataUrl: PDF } });
    check('quá ba tệp một tuần thì từ chối và nói cách xử',
      day.status === 400 && /tối đa 3 tệp/.test(day.data?.error || ''), day.data);
  }

  // =========================================================================
  console.log('\n[2] Excel KHÔNG nhận — và câu từ chối chỉ sang đường đúng');
  {
    const r = await req('POST', '/api/menu/tep', { cookie: CS2, body: {
      tuNgay: THU_HAI, ten: 'Thuc don.xlsx', dataUrl: XLSX } });
    check('tệp Excel bị từ chối', r.status === 400, r.status);
    check('và câu từ chối chỉ sang ô "Dán bảng từ Excel"',
      /Dán bảng từ Excel/.test(r.data?.error || ''), r.data?.error);
    check('nói rõ vì sao đường kia tốt hơn: gia đình đọc được theo từng ngày',
      /từng ngày/.test(r.data?.error || ''), r.data?.error);

    const rac = await req('POST', '/api/menu/tep', { cookie: CS2, body: {
      tuNgay: THU_HAI, ten: 'rac.txt', dataUrl: 'data:text/plain;base64,eGluIGNoYW8=' } });
    check('tệp lạ cũng bị từ chối', rac.status === 400, rac.status);
    const trong = await req('POST', '/api/menu/tep', { cookie: CS2, body: { tuNgay: THU_HAI } });
    check('không chọn tệp thì báo rõ', trong.status === 400 && /Chưa chọn tệp/.test(trong.data?.error || ''), trong.data);
  }

  // =========================================================================
  console.log('\n[3] Ai treo được, ai đọc được');
  {
    const co = await req('POST', '/api/menu/tep', { cookie: GV, body: {
      tuNgay: THU_HAI, ten: 'Cô thử.pdf', dataUrl: PDF } });
    check('CÔ không treo được — thực đơn là việc của văn phòng và nhà bếp', co.status === 403, co.status);
    const ph = await req('POST', '/api/menu/tep', { cookie: PH, body: {
      tuNgay: THU_HAI, ten: 'Nhà thử.pdf', dataUrl: PDF } });
    check('gia đình càng không', ph.status === 403, ph.status);

    const cuaCo = await xemTuan(GV);
    check('nhưng CÔ ĐỌC được tệp của tuần', (cuaCo.tep || []).length >= 1, cuaCo.tep);
    check('và màn của cô KHÔNG mời tải tệp', cuaCo.taiTepDuoc === false, cuaCo.taiTepDuoc);
    const cuaNha = await xemTuan(PH);
    check('gia đình cũng đọc được — thực đơn vốn là thứ để gia đình xem',
      (cuaNha.tep || []).length >= 1, cuaNha.tep);

    const id = cuaNha.tep[0].id;
    const tai = await fetch(`${sv.BASE}/api/menu/tep/${encodeURIComponent(id)}`, { headers: { Cookie: PH } });
    check('gia đình mở được tệp', tai.status === 200, tai.status);
    check('và máy chủ trả đúng loại nội dung',
      /pdf|image/.test(tai.headers.get('content-type') || ''), tai.headers.get('content-type'));

    const chuaDangNhap = await fetch(`${sv.BASE}/api/menu/tep/${encodeURIComponent(id)}`);
    check('người chưa đăng nhập KHÔNG mở được', chuaDangNhap.status === 401 || chuaDangNhap.status === 403,
      chuaDangNhap.status);

    // KHÔNG LỘ TÊN TỆP TRONG KHO: tên ấy là chìa để đoán tên tệp khác cùng kho.
    check('danh sách KHÔNG mang tên tệp thật trong kho uploads',
      !JSON.stringify(cuaNha.tep).includes('.png') || !(cuaNha.tep || []).some(t => t.file),
      JSON.stringify(cuaNha.tep).slice(0, 200));
    check('và không có trường `file` nào', (cuaNha.tep || []).every(t => t.file === undefined), cuaNha.tep);
  }

  // =========================================================================
  console.log('\n[4] Tệp đi theo CƠ SỞ, đúng luật của chính bảng thực đơn');
  {
    const r = await req('POST', '/api/menu/tep', { cookie: CS2, body: {
      tuNgay: THU_HAI, ten: 'Bếp cơ sở 2.pdf', dataUrl: PDF } });
    check('quản lý cơ sở 2 treo được tệp của bếp mình', r.status === 201, r.data);
    check('và tệp ấy đánh dấu là riêng của cơ sở',
      (r.data.tep || []).some(t => t.tenGoc === 'Bếp cơ sở 2.pdf' && t.rieng === true), r.data.tep);

    const cs2 = await xemTuan(CS2);
    const tenCs2 = (cs2.tep || []).map(t => t.tenGoc);
    check('cơ sở 2 thấy CẢ tệp của mình lẫn tệp dùng chung cả trường',
      tenCs2.includes('Bếp cơ sở 2.pdf') && tenCs2.includes('Thực đơn tuần 37.pdf'), tenCs2);

    // Gia đình cơ sở 1 KHÔNG được thấy tệp riêng của cơ sở 2.
    const nha = await xemTuan(PH);
    check('gia đình cơ sở 1 KHÔNG thấy tệp riêng của cơ sở 2',
      !(nha.tep || []).some(t => t.tenGoc === 'Bếp cơ sở 2.pdf'), (nha.tep || []).map(t => t.tenGoc));

    const idCs2 = (cs2.tep || []).find(t => t.tenGoc === 'Bếp cơ sở 2.pdf').id;
    const trom = await fetch(`${sv.BASE}/api/menu/tep/${encodeURIComponent(idCs2)}`, { headers: { Cookie: PH } });
    check('và biết mã tệp cũng KHÔNG tải được — chốt chặn ở đường trả byte',
      trom.status === 403, trom.status);

    // Cấp 3 không xoá được tệp của cả trường.
    const idChung = (cs2.tep || []).find(t => t.tenGoc === 'Thực đơn tuần 37.pdf').id;
    const xoaChung = await req('DELETE', `/api/menu/tep/${encodeURIComponent(idChung)}`, { cookie: CS2 });
    check('quản lý cơ sở KHÔNG gỡ được tệp treo cho cả trường', xoaChung.status === 403, xoaChung.status);
    const xoaMinh = await req('DELETE', `/api/menu/tep/${encodeURIComponent(idCs2)}`, { cookie: CS2 });
    check('nhưng gỡ được tệp của chính bếp mình', xoaMinh.status === 200, xoaMinh.data);
    check('và tệp dùng chung vẫn còn nguyên',
      (xoaMinh.data.tep || []).some(t => t.tenGoc === 'Thực đơn tuần 37.pdf'), xoaMinh.data.tep);
  }

  // =========================================================================
  console.log('\n[5] KÈM THÊM, KHÔNG THAY THẾ — bảng thực đơn đã gõ còn nguyên');
  {
    // Gõ thực đơn cho thứ Hai, rồi treo tệp, rồi kiểm cả hai còn nguyên.
    const luu = await req('PUT', `/api/menu/${THU_HAI}`, { cookie: QT, body: {
      meals: [{ type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Cá kho', 'Canh bí'] }] } });
    check('văn phòng gõ được thực đơn thứ Hai', luu.status === 200, `${luu.status} ${JSON.stringify(luu.data).slice(0, 120)}`);

    const sau = await xemTuan(PH);
    const thuHai = (sau.menus || []).find(m => m.date === THU_HAI);
    check('gia đình vẫn đọc được thực đơn TỪNG NGÀY',
      !!thuHai && JSON.stringify(thuHai.meals).includes('Cá kho'), thuHai);
    check('và tệp đính kèm nằm cạnh, không thay chỗ', (sau.tep || []).length >= 1, (sau.tep || []).length);

    // Gỡ hết tệp thì bảng thực đơn KHÔNG suy suyển.
    const conLai = (await xemTuan(QT)).tep || [];
    for (const t of conLai) await req('DELETE', `/api/menu/tep/${encodeURIComponent(t.id)}`, { cookie: QT });
    const cuoi = await xemTuan(PH);
    check('gỡ hết tệp thì thực đơn đã gõ VẪN CÒN',
      (cuoi.menus || []).some(m => m.date === THU_HAI && JSON.stringify(m.meals).includes('Cá kho')),
      cuoi.menus);
    check('và danh sách tệp về rỗng', (cuoi.tep || []).length === 0, cuoi.tep);

    // Dòng dữ liệu cũng phải sạch — không để lại bản ghi mồ côi.
    const conn = new Database(CSDL);
    const soDong = conn.prepare('SELECT COUNT(*) AS n FROM menu_tep').get().n;
    conn.close();
    check('bảng menu_tep không còn dòng mồ côi nào', soDong === 0, soDong);
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Tệp thực đơn cả tuần (Đ160)');
