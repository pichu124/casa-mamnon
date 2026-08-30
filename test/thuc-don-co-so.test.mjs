// Bài canh THỰC ĐƠN RIÊNG CỦA TỪNG CƠ SỞ.
//
// Chạy bằng:  npm run test:thuc-don-co-so
//
// Nhà trường chốt ngày 30/08 (điểm 1): "Ba cơ sở nấu riêng bếp, mỗi cơ sở có 1
// thực đơn riêng, thực đơn này sẽ được admin cơ sở up lên vào thứ 6 hàng tuần".
//
// CHỖ ĐÁNG CANH NHẤT LÀ CHỖ CHÚ THÍCH CŨ ĐÃ CẢNH BÁO
//
// Trước đợt này `routes/menu.js` chặn quản lý cơ sở, kèm một chú thích dài nói
// rõ vì sao: bảng `menus` có MỘT dòng mỗi ngày, nên hai người sửa thì người sau
// âm thầm ghi đè người trước. Mở đường ra mà không tách dữ liệu là dựng lại
// đúng cái hỏng ấy — và bản đầu của đợt này ĐÃ dựng lại nó thật: hàm phân
// quyền đọc `phamViCoSo(user).length === 1`, tưởng hàm đó trả về mảng, trong
// khi nó trả về một chuỗi mã cơ sở. `'cs2'.length` là 3 nên điều kiện không bao
// giờ đúng, mọi quản lý cơ sở rơi xuống nhánh Cấp 1, và món của cơ sở 2 hiện
// lên màn hình gia đình cơ sở 1.
//
// Mục [2] là bài canh sinh ra từ đúng lỗi đó, và nó kiểm CẢ HAI CHIỀU: cơ sở 2
// thấy món của mình, VÀ cơ sở 1 vẫn thấy đúng thứ cũ.
//
// MỘT ĐIỀU NỮA: DỮ LIỆU CŨ KHÔNG ĐƯỢC MẤT. Thực đơn đã nhập trước đợt này nằm
// trong `menus` và không có cơ sở nào cả. Mục [1] canh rằng nó vẫn hiện đúng
// cho mọi người — Nguyên tắc số 1.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('thuc-don-co-so');
sinhDuLieu(DIR);
const mkCap1 = taoQuanTri(DIR, 'Ban Giám Hiệu', 'td_cap1');
const mkCs2 = taoQuanTri(DIR, 'Quản lý Cơ sở 2', 'td_cs2');
khoaVaoCoSo(DIR, 'td_cs2', 'cs2');

const { BASE, dung } = await dungMayChu({ port: 4603, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

const BUA_CS2 = [{ type: 'lunch', label: 'Bữa trưa', items: ['Cá kho tộ — bếp cơ sở 2'] }];

try {
  const cap1 = await login('td_cap1', mkCap1);
  const cs2 = await login('td_cs2', mkCs2);
  const ph = await login('phuhuynh', '123456');
  const co = await login('giaovien', '123456');

  // =========================================================================
  console.log('\n[1] Thực đơn cũ (dùng chung) vẫn hiện đúng cho mọi người');
  {
    const g = await req('GET', '/api/menu', { cookie: ph.cookie });
    check('gia đình đọc được thực đơn tuần này', g.status === 200 && (g.data.menus || []).length === 5,
      `${g.status} — ${(g.data.menus || []).length} ngày`);
    check('mọi ngày đang là bản DÙNG CHUNG, chưa cơ sở nào soạn riêng',
      (g.data.menus || []).every(m => m.rieng === false),
      JSON.stringify((g.data.menus || []).map(m => m.rieng)));
    check('gia đình được neo sẵn vào cơ sở của con, không phải tự chọn',
      g.data.campusId === 'cs1' && !!g.data.tenCoSo, `${g.data.campusId} / ${g.data.tenCoSo}`);
    check('và KHÔNG thấy danh sách các cơ sở khác',
      (g.data.cacCoSo || []).length === 0, JSON.stringify(g.data.cacCoSo));

    const c = await req('GET', '/api/menu', { cookie: co.cookie });
    check('cô cũng được neo vào cơ sở của nhóm mình', c.data.campusId === 'cs1', c.data.campusId);

    globalThis.NGAY = (g.data.menus || [])[0].date;
    globalThis.BUA_CU = JSON.stringify((g.data.menus || [])[0].meals);
    check('đối chứng — ngày thử có sẵn thực đơn cũ để so',
      globalThis.BUA_CU.length > 20, globalThis.BUA_CU.slice(0, 80));
  }

  // =========================================================================
  console.log('\n[2] Cơ sở 2 soạn riêng — cơ sở 1 KHÔNG bị đổi theo');
  {
    const ghi = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: cs2.cookie, body: {
      meals: BUA_CS2 } });
    check('quản lý cơ sở soạn được thực đơn bếp mình',
      ghi.status === 200 && ghi.data.campusId === 'cs2' && ghi.data.rieng === true,
      `${ghi.status} ${JSON.stringify(ghi.data).slice(0, 140)}`);

    const x2 = await req('GET', '/api/menu', { cookie: cs2.cookie });
    const d2 = (x2.data.menus || []).find(m => m.date === globalThis.NGAY);
    check('cơ sở 2 mở lại thấy đúng món mình vừa soạn',
      !!d2 && d2.rieng === true && JSON.stringify(d2.meals).includes('bếp cơ sở 2'),
      JSON.stringify(d2));

    // ĐÂY LÀ PHÉP KIỂM QUAN TRỌNG NHẤT CỦA CẢ BÀI.
    const x1 = await req('GET', '/api/menu', { cookie: ph.cookie });
    const d1 = (x1.data.menus || []).find(m => m.date === globalThis.NGAY);
    check('GIA ĐÌNH CƠ SỞ 1 VẪN THẤY ĐÚNG THỰC ĐƠN CŨ, không thấy món bếp cơ sở 2',
      !!d1 && JSON.stringify(d1.meals) === globalThis.BUA_CU,
      `mong: ${globalThis.BUA_CU.slice(0, 90)}\n     thật: ${JSON.stringify(d1 && d1.meals).slice(0, 90)}`);
    check('và ngày đó với cơ sở 1 vẫn là bản dùng chung',
      !!d1 && d1.rieng === false, JSON.stringify(d1 && d1.rieng));
  }

  // =========================================================================
  console.log('\n[3] Không ai ghi được sang bếp cơ sở khác');
  {
    const lac = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: cs2.cookie, body: {
      campusId: 'cs1', meals: BUA_CS2 } });
    check('quản lý cơ sở 2 KHÔNG ghi được vào bếp cơ sở 1', lac.status === 403, `${lac.status}`);
    check('lời từ chối nói rõ vì sao, không cụt lủn',
      /cơ sở mình phụ trách/i.test((lac.data || {}).error || ''), (lac.data || {}).error);

    const coGhi = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: co.cookie, body: {
      meals: BUA_CS2 } });
    check('cô KHÔNG soạn được thực đơn — đó là việc của văn phòng', coGhi.status === 403, `${coGhi.status}`);

    const phGhi = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: ph.cookie, body: {
      meals: BUA_CS2 } });
    check('gia đình KHÔNG soạn được thực đơn', phGhi.status === 403, `${phGhi.status}`);

    const bia = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: cap1.cookie, body: {
      campusId: 'cs-khong-co-that', meals: BUA_CS2 } });
    check('mã cơ sở không tồn tại bị từ chối', bia.status === 403, `${bia.status}`);
  }

  // =========================================================================
  console.log('\n[4] Cấp 1 soạn hộ được cả ba bếp, và soạn được bản dùng chung');
  {
    const ds = await req('GET', '/api/menu', { cookie: cap1.cookie });
    check('Cấp 1 thấy danh sách cơ sở để chọn bếp',
      (ds.data.cacCoSo || []).length >= 2, JSON.stringify((ds.data.cacCoSo || []).map(c => c.id)));
    check('mặc định Cấp 1 xem bản dùng chung, không neo vào cơ sở nào',
      ds.data.campusId === null, ds.data.campusId);

    const ghi3 = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: cap1.cookie, body: {
      campusId: 'cs3', meals: [{ type: 'lunch', label: 'Bữa trưa', items: ['Thịt kho — bếp cơ sở 3'] }] } });
    check('Cấp 1 soạn được cho bếp cơ sở 3', ghi3.status === 200 && ghi3.data.campusId === 'cs3',
      `${ghi3.status} ${JSON.stringify(ghi3.data).slice(0, 100)}`);

    const x3 = await req('GET', '/api/menu?campusId=cs3', { cookie: cap1.cookie });
    const d3 = (x3.data.menus || []).find(m => m.date === globalThis.NGAY);
    check('mở lại bếp cơ sở 3 thấy đúng món vừa soạn',
      JSON.stringify(d3 && d3.meals).includes('bếp cơ sở 3'), JSON.stringify(d3 && d3.meals));

    const x2 = await req('GET', '/api/menu?campusId=cs2', { cookie: cap1.cookie });
    const d2 = (x2.data.menus || []).find(m => m.date === globalThis.NGAY);
    check('bếp cơ sở 2 KHÔNG bị món của cơ sở 3 đè lên',
      JSON.stringify(d2 && d2.meals).includes('bếp cơ sở 2'), JSON.stringify(d2 && d2.meals));

    // Sửa bản DÙNG CHUNG: chỉ cơ sở nào chưa soạn riêng mới đổi theo.
    const chung = await req('PUT', `/api/menu/${globalThis.NGAY}`, { cookie: cap1.cookie, body: {
      meals: [{ type: 'lunch', label: 'Bữa trưa', items: ['Canh chua — bản dùng chung'] }] } });
    check('Cấp 1 sửa được bản dùng chung', chung.status === 200 && chung.data.rieng === false,
      `${chung.status} ${JSON.stringify(chung.data).slice(0, 100)}`);

    const g1 = await req('GET', '/api/menu', { cookie: ph.cookie });
    const dd1 = (g1.data.menus || []).find(m => m.date === globalThis.NGAY);
    check('cơ sở 1 (chưa soạn riêng) đổi theo bản dùng chung',
      JSON.stringify(dd1 && dd1.meals).includes('bản dùng chung'), JSON.stringify(dd1 && dd1.meals));

    const g2 = await req('GET', '/api/menu?campusId=cs2', { cookie: cap1.cookie });
    const dd2 = (g2.data.menus || []).find(m => m.date === globalThis.NGAY);
    check('cơ sở 2 (đã soạn riêng) GIỮ NGUYÊN món của mình',
      JSON.stringify(dd2 && dd2.meals).includes('bếp cơ sở 2'), JSON.stringify(dd2 && dd2.meals));
  }

  // =========================================================================
  console.log('\n[5] Soạn cả tuần và chép tuần trước cũng theo đúng bếp');
  {
    const tuan = await req('GET', '/api/menu?week=1', { cookie: cs2.cookie });
    const ngayTuanSau = (tuan.data.menus || [])[0] ? tuan.data.menus[0].date : null;
    const ds = [0, 1, 2, 3, 4].map(i => {
      const d = new Date(Date.parse(`${tuan.data.from}T00:00:00Z`) + i * 86400000)
        .toISOString().slice(0, 10);
      return { date: d, meals: [{ type: 'lunch', label: 'Bữa trưa', items: [`Món ngày ${i + 1} — bếp cơ sở 2`] }] };
    });
    const luu = await req('PUT', '/api/menu/tuan', { cookie: cs2.cookie, body: { ngay: ds } });
    check('quản lý cơ sở lưu được cả tuần một lượt cho bếp mình',
      luu.status === 200 && luu.data.daLuu === 5 && luu.data.campusId === 'cs2',
      `${luu.status} ${JSON.stringify(luu.data)}`);

    const x2 = await req('GET', '/api/menu?week=1', { cookie: cs2.cookie });
    check('cả 5 ngày tuần sau của cơ sở 2 đều là bản RIÊNG',
      (x2.data.menus || []).filter(m => m.rieng).length === 5,
      JSON.stringify((x2.data.menus || []).map(m => m.rieng)));

    const x1 = await req('GET', '/api/menu?week=1', { cookie: ph.cookie });
    check('tuần sau của cơ sở 1 KHÔNG bị món cơ sở 2 tràn sang',
      !JSON.stringify(x1.data.menus || []).includes('bếp cơ sở 2'),
      JSON.stringify(x1.data.menus).slice(0, 160));

    const chep = await req('POST', '/api/menu/copy-week', { cookie: cs2.cookie, body: { week: 0 } });
    check('chép tuần trước chạy được cho bếp cơ sở 2',
      chep.status === 200 && chep.data.campusId === 'cs2', `${chep.status} ${JSON.stringify(chep.data)}`);
    if (ngayTuanSau) { /* giữ biến để đọc lại khi cần */ }
  }

  // =========================================================================
  console.log('\n[6] Bảng riêng, không ALTER TABLE, và dữ liệu cũ còn nguyên');
  {
    const sql = fs.readFileSync(path.join(GOC, 'lib/schema.sql'), 'utf8');
    const cauLenh = sql.split('\n').filter(d => !d.trim().startsWith('--')).join('\n');
    check('lược đồ lõi vẫn KHÔNG có câu ALTER TABLE nào',
      !/\bALTER\s+TABLE\b/i.test(cauLenh), (cauLenh.match(/.{0,50}ALTER TABLE.{0,50}/i) || [])[0]);
    check('bảng menu_campus là bảng PHỤ, `menus` không bị đụng',
      /CREATE TABLE IF NOT EXISTS menu_campus/.test(cauLenh)
      && /CREATE TABLE IF NOT EXISTS menus \(/.test(cauLenh)
      && /date  TEXT NOT NULL UNIQUE/.test(cauLenh),
      'menus đã bị sửa hoặc menu_campus chưa có');

    // Dữ liệu cũ: bản dùng chung vẫn đọc được nguyên vẹn qua đường cũ.
    const g = await req('GET', '/api/menu?week=-1', { cookie: ph.cookie });
    check('thực đơn tuần trước (dữ liệu cũ) vẫn đọc được bình thường',
      g.status === 200 && Array.isArray(g.data.menus), `${g.status}`);
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Thực đơn riêng của từng cơ sở');
