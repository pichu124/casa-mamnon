// Bài canh: ĐÃ GỠ MÃ PHÂN HỆ "ĐÓN TRẢ BÉ" — MÁY CŨ VẪN CHẠY, DỮ LIỆU CÒN NGUYÊN.
//
// Chạy bằng:  node test/da-go-don-tra.test.mjs
//
// VÌ SAO CÓ BÀI NÀY (Đ252, chủ dự án duyệt 12/11)
//
// Nhà trường ba lần bảo bỏ phần Đón trả bé (góp ý 07/09, 06/10, 16/10: "loại bỏ
// khỏi app… đã được lồng ghép trong phần điểm danh"). Phân hệ tắt sẵn từ Đ227;
// giờ ra về và ảnh ra về đã nằm ở sổ điểm danh lõi từ Đ210. Đ252 gỡ hẳn MÃ của
// phân hệ — `modules/dontra/` và mọi cầu nối trong phần lõi.
//
// GỠ MÃ KHÔNG PHẢI GỠ DỮ LIỆU (CLAUDE.md, "Bỏ một tính năng"). Máy đang chạy —
// máy thử của trường chẳng hạn — đã có sẵn bốn bảng `dontra_*` có dòng, có thể
// còn dòng "dontra bật" trong `module_settings`, và có tệp ảnh trong `uploads/`.
// Bài này dựng lại đúng cái máy ấy rồi hỏi hai câu:
//
//   1. Cập nhật mã xong, máy ấy còn khởi động, đăng nhập, điểm danh, mở trang
//      chủ và mở Quản trị → Tính năng được không?
//   2. Sau khi máy chủ chạy, khởi động lại, rồi sao lưu và khôi phục, từng dòng
//      của bốn bảng ấy và tệp ảnh có còn y nguyên không?
//
// Bốn câu CREATE bên dưới là ẢNH CHỤP `modules/dontra/schema.sql` tại lúc gỡ.
// Chép vào đây chứ không đọc từ tệp: tệp ấy không còn, và "máy cũ" là thứ đã
// có sẵn bảng từ trước, không phải thứ máy chủ mới dựng ra.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import {
  GOC, MAU, HOM_NAY, thuMucTam, donThuMucTam, sinhDuLieu, batPhanHe, taoQuanTri,
  dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const Database = require(path.join(GOC, 'node_modules', 'better-sqlite3'));
const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('da-go-don-tra');
const CSDL = path.join(DIR, 'school.db');
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);
// Một ngày khác hôm nay trong cùng tháng: hôm nay lõi sẽ ghi ảnh ra về của
// chính nó cho bé s1, mà ảnh lõi thì đè lên ảnh cũ cùng ngày — đo ở đó là đo
// vào chỗ không phân biệt được.
const NGAY_CU = `${THANG}-${NGAY.slice(8) === '02' ? '03' : '02'}`;

const BANG_MAY_CU = `
CREATE TABLE IF NOT EXISTS dontra_nguoi (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL,
  hoTen      TEXT NOT NULL,
  quanHe     TEXT NOT NULL DEFAULT '',
  dienThoai  TEXT NOT NULL DEFAULT '',
  anh        TEXT NOT NULL DEFAULT '',
  ghiChu     TEXT NOT NULL DEFAULT '',
  dangDung   INTEGER NOT NULL DEFAULT 1,
  nguoiTao   TEXT,
  taoLuc     TEXT,
  capNhatLuc TEXT
);
CREATE INDEX IF NOT EXISTS dontra_nguoi_theo_be ON dontra_nguoi(studentId);
CREATE INDEX IF NOT EXISTS dontra_nguoi_theo_anh ON dontra_nguoi(anh);
CREATE TABLE IF NOT EXISTS dontra_uyquyen (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  hoTen     TEXT NOT NULL,
  quanHe    TEXT NOT NULL DEFAULT '',
  dienThoai TEXT NOT NULL DEFAULT '',
  anh       TEXT NOT NULL DEFAULT '',
  tuNgay    TEXT NOT NULL,
  denNgay   TEXT NOT NULL,
  lyDo      TEXT NOT NULL DEFAULT '',
  huyLuc    TEXT,
  huyBoi    TEXT,
  nguoiTao  TEXT,
  taoLuc    TEXT
);
CREATE INDEX IF NOT EXISTS dontra_uyquyen_theo_be ON dontra_uyquyen(studentId, tuNgay);
CREATE INDEX IF NOT EXISTS dontra_uyquyen_theo_anh ON dontra_uyquyen(anh);
CREATE TABLE IF NOT EXISTS dontra_ghi (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL,
  ngay       TEXT NOT NULL,
  luc        TEXT NOT NULL DEFAULT '',
  nguoiDon   TEXT NOT NULL,
  nguonLoai  TEXT NOT NULL DEFAULT '',
  nguonId    TEXT NOT NULL DEFAULT '',
  ghiChu     TEXT NOT NULL DEFAULT '',
  coGhi      TEXT,
  capNhatLuc TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS dontra_mot_be_mot_ngay ON dontra_ghi(studentId, ngay);
CREATE INDEX IF NOT EXISTS dontra_ghi_theo_ngay ON dontra_ghi(ngay);
CREATE TABLE IF NOT EXISTS dontra_anh_tra (
  studentId TEXT NOT NULL,
  ngay      TEXT NOT NULL,
  file      TEXT NOT NULL,
  taoLuc    TEXT,
  byUserId  TEXT,
  PRIMARY KEY (studentId, ngay)
);
CREATE INDEX IF NOT EXISTS dontra_anh_tra_theo_file ON dontra_anh_tra(file);
`;
const BON_BANG = ['dontra_nguoi', 'dontra_uyquyen', 'dontra_ghi', 'dontra_anh_tra'];
const SO_DONG = { dontra_nguoi: 2, dontra_uyquyen: 1, dontra_ghi: 2, dontra_anh_tra: 2 };
const ANH_NGUOI_DON = '0d252b00000000000000000000000001.png';
const ANH_TRA_BE = '0d252b00000000000000000000000002.png';
const ANH_TRA_BE_HOM_NAY = '0d252b00000000000000000000000003.png';
const BYTE_ANH = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
const ANH_URL = `data:image/png;base64,${BYTE_ANH.toString('base64')}`;

// Toàn bộ nội dung bốn bảng, xếp cố định — so chuỗi này là so TỪNG Ô, không
// chỉ đếm dòng. Bảng không còn thì trả null chứ không ném: thiếu bảng là một
// kết quả cần báo đỏ kèm tên, không phải một lỗi làm chết bài.
function chupBonBang() {
  const c = new Database(CSDL, { readonly: true });
  try {
    const ra = {};
    for (const b of BON_BANG) {
      try { ra[b] = c.prepare(`SELECT * FROM ${b} ORDER BY 1, 2`).all(); } catch { ra[b] = null; }
    }
    return ra;
  } finally { c.close(); }
}
const soDong = (chup) => Object.fromEntries(BON_BANG.map(b => [b, chup[b] ? chup[b].length : null]));
const dongCaiDat = () => {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare("SELECT enabled FROM module_settings WHERE moduleKey = 'dontra'").get() || null; }
  finally { c.close(); }
};
const anhConNguyen = (ten) => {
  const p = path.join(DIR, 'uploads', ten);
  return fs.existsSync(p) && fs.readFileSync(p).equals(BYTE_ANH);
};

// ===========================================================================
console.log('\n[1] Dựng "máy cũ": bốn bảng dontra_* có dòng, dòng "dontra bật", ảnh trong uploads/');
sinhDuLieu(DIR);
{
  const c = new Database(CSDL);
  c.exec(BANG_MAY_CU);
  const luc = new Date().toISOString();
  const nguoi = c.prepare(`INSERT INTO dontra_nguoi
    (id, studentId, hoTen, quanHe, dienThoai, anh, ghiChu, dangDung, nguoiTao, taoLuc, capNhatLuc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 't1', ?, ?)`);
  nguoi.run('mc-ba', 's1', 'Bà ngoại máy cũ', 'Bà ngoại', '0900 000 001', ANH_NGUOI_DON, 'Đón thứ Ba', 1, luc, luc);
  nguoi.run('mc-chu', 's3', 'Chú máy cũ', 'Chú', '0900 000 002', '', '', 0, luc, luc);
  c.prepare(`INSERT INTO dontra_uyquyen
    (id, studentId, hoTen, quanHe, dienThoai, anh, tuNgay, denNgay, lyDo, nguoiTao, taoLuc)
    VALUES ('mc-uq', 's4', 'Bác hàng xóm máy cũ', 'Bác', '0900 000 003', '', ?, ?, 'Bố mẹ về muộn', 't1', ?)`)
    .run(NGAY, NGAY, luc);
  const ghi = c.prepare(`INSERT INTO dontra_ghi
    (id, studentId, ngay, luc, nguoiDon, nguonLoai, nguonId, ghiChu, coGhi, capNhatLuc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 't1', ?)`);
  ghi.run('mc-g1', 's1', NGAY, '16:35', 'Bà ngoại máy cũ (Bà ngoại)', 'nguoi', 'mc-ba', 'Đối chiếu ảnh', luc);
  ghi.run('mc-g2', 's3', '2026-09-08', '16:40', 'Mẹ', '', '', '', luc);
  const anhTra = c.prepare(`INSERT INTO dontra_anh_tra (studentId, ngay, file, taoLuc, byUserId)
    VALUES (?, ?, ?, ?, 't1')`);
  anhTra.run('s1', NGAY_CU, ANH_TRA_BE, luc);
  anhTra.run('s3', NGAY, ANH_TRA_BE_HOM_NAY, luc);
  c.close();
  fs.mkdirSync(path.join(DIR, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(DIR, 'uploads', ANH_NGUOI_DON), BYTE_ANH);
  fs.writeFileSync(path.join(DIR, 'uploads', ANH_TRA_BE), BYTE_ANH);
  fs.writeFileSync(path.join(DIR, 'uploads', ANH_TRA_BE_HOM_NAY), BYTE_ANH);
}
// Đúng cách máy cũ lưu công tắc: một dòng `enabled = 1` trong `module_settings`.
batPhanHe(DIR, ['dontra']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng Máy Cũ', 'mc_qt');

const BAN_DAU = chupBonBang();
const CHUOI_BAN_DAU = JSON.stringify(BAN_DAU);
check('đối chứng — bốn bảng dontra_* có đủ số dòng đã chèn',
  JSON.stringify(soDong(BAN_DAU)) === JSON.stringify(SO_DONG), soDong(BAN_DAU));
check('đối chứng — có dòng "dontra bật" trong module_settings', (dongCaiDat() || {}).enabled === 1, dongCaiDat());
const BA_ANH = [ANH_NGUOI_DON, ANH_TRA_BE, ANH_TRA_BE_HOM_NAY];
check('đối chứng — ba tệp ảnh nằm trong uploads/', BA_ANH.every(anhConNguyen));

// ===========================================================================
console.log('\n[2] Máy ấy khởi động và đăng nhập được');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7352), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
{
  const hz = await req('GET', '/healthz');
  check('/healthz trả 200', hz.status === 200, hz.status);
}
const co = (await login('giaovien', '123456')).cookie;
const ph = (await login('phuhuynh', '123456')).cookie;
const qt = (await login('mc_qt', mkQT)).cookie;
check('cô đăng nhập được', !!co);
check('gia đình đăng nhập được', !!ph);
check('quản trị đăng nhập được', !!qt);

// ===========================================================================
console.log('\n[3] Điểm danh (lõi) chạy bình thường, và không còn dọn dữ liệu của phân hệ đã gỡ ra màn hình');
{
  const lop = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: co });
  check(`sổ điểm danh của cô mở được, đủ ${MAU.soBeNhomChoi2} bé`,
    lop.status === 200 && (lop.data.students || []).length === MAU.soBeNhomChoi2,
    `${lop.status} ${(lop.data && lop.data.students || []).length}`);

  const cham = await req('POST', '/api/attendance/mark',
    { cookie: co, body: { studentId: 's1', date: NGAY, status: 'present' } });
  check('cô chấm được điểm danh', cham.status === 200, cham.data);
  // GIỜ RA 23:5x CHỨ KHÔNG PHẢI MỘT GIỜ CHIỀU CỐ ĐỊNH (Đ253). Ngày không có
  // dòng mẫu (thứ Bảy, Chủ nhật) thì giờ vào của bé là lúc bài này chạy, và
  // máy chủ nay từ chối giờ ra sớm hơn giờ vào — "16:45" làm bài này đỏ mỗi
  // lần chạy cuối tuần sau 16h45.
  const ve = await req('POST', '/api/attendance/ra-ve',
    { cookie: co, body: { studentId: 's1', date: NGAY, gio: '23:59', anh: ANH_URL } });
  const fileLoi = (ve.data && ve.data.anh && ve.data.anh.file) || '';
  check('"Ghi con đã về" kèm ảnh ra về (việc của LÕI) vẫn ghi được',
    ve.status === 200 && ve.data.gio === '23:59' && !!fileLoi, ve.data);

  const lop2 = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: co });
  const dongS1 = (lop2.data.students || []).find(x => x.student.id === 's1') || {};
  check('dòng của bé mang giờ ra về và ảnh ra về do lõi ghi',
    dongS1.record && dongS1.record.checkOut === '23:59' && dongS1.anhVeNha && dongS1.anhVeNha.file === fileLoi,
    { checkOut: dongS1.record && dongS1.record.checkOut, anhVeNha: dongS1.anhVeNha });
  const dongS3 = (lop2.data.students || []).find(x => x.student.id === 's3');
  check('sổ của cô KHÔNG còn dọn ảnh của phân hệ đã gỡ ra dòng bé, dù máy cũ còn dòng "bật"',
    !!dongS3 && dongS3.anhVeNha === null, dongS3 && dongS3.anhVeNha);

  const thang = await req('GET', `/api/attendance?studentId=s1&month=${THANG}`, { cookie: ph });
  check('gia đình mở được lịch điểm danh tháng của con', thang.status === 200 && Array.isArray(thang.data), thang.status);
  const kho = await req('GET', `/api/attendance/anh?studentId=s1&month=${THANG}`, { cookie: ph });
  check('gia đình thấy ảnh ra về do lõi ghi',
    kho.status === 200 && (kho.data.anhVe || []).some(x => x.file === fileLoi), kho.data && kho.data.anhVe);
  check('ảnh của phân hệ đã gỡ KHÔNG còn được dọn ra màn Điểm danh, dù máy cũ còn dòng "bật"',
    !(kho.data.anhVe || []).some(x => x.file === ANH_TRA_BE), kho.data && kho.data.anhVe);
  const byteLoi = await req('GET', `/api/attendance/anh/${fileLoi}`, { cookie: ph });
  check('gia đình tải được tấm ảnh ra về của lõi', byteLoi.status === 200, byteLoi.status);
  const byteCu = await req('GET', `/api/attendance/anh/${ANH_TRA_BE}`, { cookie: ph });
  check('đường ảnh của Điểm danh không còn phát tấm của phân hệ đã gỡ (404)', byteCu.status === 404, byteCu.status);
}

// ===========================================================================
console.log('\n[4] Trang chủ: số "Đã về" đếm từ sổ điểm danh lõi vẫn còn; vế của phân hệ đã gỡ thì hết');
{
  const hn = await req('GET', '/api/dashboard/hom-nay?classId=c1', { cookie: co });
  check('trang chủ của cô mở được', hn.status === 200 && hn.data.be.length === MAU.soBeNhomChoi2, hn.status);
  // Dữ liệu mẫu có thể đã ghi giờ ra về cho bé khác trong hôm nay, nên so với
  // chính sổ điểm danh chứ không đoán một con số.
  const c = new Database(CSDL, { readonly: true });
  const daVeThat = c.prepare(`SELECT COUNT(*) n FROM attendance a JOIN students s ON s.id = a.studentId
    WHERE a.date = ? AND s.classId = 'c1' AND s.active = 1 AND a.checkOut IS NOT NULL AND a.checkOut <> ''`).get(NGAY).n;
  c.close();
  check('số "Đã về" (daVe) đúng bằng số bé có giờ ra về trong sổ điểm danh',
    daVeThat >= 1 && hn.data.dem.daVe === daVeThat, { daVe: hn.data.dem.daVe, daVeThat });
  const beS1 = hn.data.be.find(b => b.id === 's1') || {};
  check('dòng của bé mang giờ ra về', beS1.gioRa === '23:59', beS1.gioRa);
  check('số đếm KHÔNG còn vế `daTra` của phân hệ đã gỡ', !('daTra' in hn.data.dem), hn.data.dem);
  check('từng bé KHÔNG còn trường `daTra`', hn.data.be.every(b => !('daTra' in b)), beS1);
  check('danh sách phân hệ của trang chủ KHÔNG còn khoá `dontra`', !('dontra' in hn.data.phanHe), hn.data.phanHe);

  const tq = await req('GET', '/api/dashboard/tong-quan', { cookie: qt });
  check('trang chủ của văn phòng mở được', tq.status === 200 && tq.data.tong.soBe === MAU.soBe, tq.status);
  check('tổng quan vẫn có số "Đã về" của lõi', tq.data.tong.daVe === Number(tq.data.tong.daVe) && tq.data.tong.daVe >= 1,
    tq.data.tong);
  const cacNhom = tq.data.coSo.flatMap(cs => cs.nhom);
  check('tổng quan KHÔNG còn `daTra` ở tổng, ở cơ sở hay ở nhóm',
    !('daTra' in tq.data.tong) && tq.data.coSo.every(cs => !('daTra' in cs.dem)) && cacNhom.every(n => !('daTra' in n)),
    tq.data.tong);
  check('…và KHÔNG còn khoá `dontra`', !('dontra' in tq.data.phanHe), tq.data.phanHe);

  const huyHieu = await req('GET', '/api/dashboard/badges', { cookie: ph });
  check('số huy hiệu của gia đình vẫn trả về', huyHieu.status === 200, huyHieu.status);
}

// ===========================================================================
console.log('\n[5] Quản trị → Tính năng: không dòng ma, không lỗi');
{
  const ds = await req('GET', '/api/admin/modules', { cookie: qt });
  check('danh sách tính năng mở được', ds.status === 200 && Array.isArray(ds.data) && ds.data.length > 10,
    `${ds.status} ${Array.isArray(ds.data) ? ds.data.length : ''}`);
  const dsQT = Array.isArray(ds.data) ? ds.data : [];
  check('không có dòng `dontra` nào dù bảng cài đặt còn dòng của nó',
    !dsQT.some(m => m.key === 'dontra' || /đón trả/i.test(m.name || '')), dsQT.map(m => m.key));
  check('mọi dòng đều có tên và không dòng nào báo sự cố',
    dsQT.every(m => m.key && m.name && !m.loi), dsQT.filter(m => !m.name || m.loi));

  for (const [ten, ck] of [['cô', co], ['gia đình', ph], ['quản trị', qt]]) {
    const m = await req('GET', '/api/modules', { cookie: ck });
    check(`lưới ô của ${ten} không có Đón trả bé`,
      m.status === 200 && m.data.length > 5 && !m.data.some(x => x.key === 'dontra' || x.view === 'dontra'),
      Array.isArray(m.data) ? m.data.map(x => x.key) : m.status);
  }

  const bat = await req('PUT', '/api/admin/modules/dontra', { cookie: qt, body: { enabled: true } });
  check('bật lại một phân hệ không còn mã thì bị từ chối tử tế (400), không lỗi máy chủ', bat.status === 400, bat.status);
  const viSao = await req('GET', '/api/modules/vi-sao/dontra', { cookie: ph });
  check('địa chỉ cũ #/dontra: máy chủ trả lời "không có phần nào ở địa chỉ này"',
    viSao.status === 200 && viSao.data.ly === 'khong-co', viSao.data);
}

// ===========================================================================
console.log('\n[6] Không còn đường /api/dontra nào, không còn tệp giao diện của phân hệ');
{
  const DUONG = ['/api/dontra', '/api/dontra?studentId=s1', `/api/dontra/nhom?classId=c1&ngay=${NGAY}`,
    '/api/dontra/so?classId=c1', `/api/dontra/anh/${ANH_NGUOI_DON}`, `/api/dontra/anh/${ANH_TRA_BE}`];
  for (const [ten, ck] of [['cô', co], ['gia đình', ph], ['quản trị', qt]]) {
    const ma = [];
    for (const d of DUONG) ma.push((await req('GET', d, { cookie: ck })).status);
    check(`${ten}: mọi đường đọc /api/dontra/* trả 404`, ma.every(x => x === 404), ma);
  }
  const ghi = await req('POST', '/api/dontra/ghi',
    { cookie: co, body: { studentId: 's3', ngay: NGAY, nguonLoai: 'khac', nguoiDon: 'Ai đó' } });
  check('đường ghi sổ trả bé cũng 404', ghi.status === 404, ghi.status);
  const them = await req('POST', '/api/dontra/nguoi',
    { cookie: ph, body: { studentId: 's1', hoTen: 'Ai đó', quanHe: 'Bác' } });
  check('đường khai người đón cũng 404', them.status === 404, them.status);
  // Không đòi một mã trạng thái: địa chỉ không có tệp rơi về lớp đỡ của trang
  // đơn. Điều phải đúng là máy chủ không còn phát mã giao diện của phân hệ.
  const view = await fetch(`${sv.BASE}/modules/dontra/view.js`);
  const thanView = await view.text();
  check('/modules/dontra/view.js không còn phát mã giao diện của phân hệ',
    !/App\.views\.dontra/.test(thanView) && !/javascript/.test(view.headers.get('content-type') || ''),
    [view.status, view.headers.get('content-type'), thanView.slice(0, 80)]);
}

// ===========================================================================
console.log('\n[7] Dữ liệu của máy cũ CÒN NGUYÊN sau khi máy chủ chạy');
const conNguyen = (luc) => {
  const sau = chupBonBang();
  check(`${luc}: bốn bảng dontra_* còn đủ số dòng`, JSON.stringify(soDong(sau)) === JSON.stringify(SO_DONG), soDong(sau));
  check(`${luc}: từng ô của bốn bảng y như trước`, JSON.stringify(sau) === CHUOI_BAN_DAU);
  check(`${luc}: ba tệp ảnh trong uploads/ còn nguyên byte`, BA_ANH.every(anhConNguyen), BA_ANH.filter(a => !anhConNguyen(a)));
  check(`${luc}: dòng cài đặt của máy cũ không bị xoá hay ghi đè`, (dongCaiDat() || {}).enabled === 1, dongCaiDat());
};
conNguyen('sau khi chạy');

// ===========================================================================
console.log('\n[8] Khởi động lại: vẫn lên, vẫn đăng nhập, dữ liệu vẫn nguyên');
{
  await sv.khoiDongLai();
  const hz = await req('GET', '/healthz');
  check('/healthz trả 200 sau khi khởi động lại', hz.status === 200, hz.status);
  const co2 = (await login('giaovien', '123456')).cookie;
  const lop = await req('GET', `/api/attendance/class?date=${NGAY}`, { cookie: co2 });
  check('cô đăng nhập lại và mở được sổ điểm danh',
    !!co2 && lop.status === 200 && (lop.data.students || []).length === MAU.soBeNhomChoi2, lop.status);
  const ds = await req('GET', '/api/admin/modules', { cookie: (await login('mc_qt', mkQT)).cookie });
  check('Quản trị → Tính năng vẫn mở được, vẫn không có dòng ma',
    ds.status === 200 && Array.isArray(ds.data) && !ds.data.some(m => m.key === 'dontra'), ds.status);
  conNguyen('sau khi khởi động lại');
}

// ===========================================================================
console.log('\n[9] Sao lưu rồi khôi phục: bốn bảng mồ côi đi theo nguyên vẹn');
{
  sv.dung();
  await new Promise(r => setTimeout(r, 800));
  const chay = (script, ...a) => spawnSync('node', [path.join(GOC, 'scripts', script), ...a],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
  const sl = chay('backup.js');
  check('sao lưu chạy xong không lỗi', sl.status === 0, (sl.stdout + sl.stderr).slice(-300));
  const kt = chay('restore.js', '--kiem-tra');
  check('kiểm tra bản sao: dùng được', kt.status === 0, (kt.stdout + kt.stderr).slice(-300));

  // Làm mất dữ liệu đang chạy để lần khôi phục phải lấy THẬT từ bản sao.
  {
    const c = new Database(CSDL);
    for (const b of BON_BANG) c.exec(`DROP TABLE ${b}`);
    c.pragma('wal_checkpoint(TRUNCATE)');
    c.close();
  }
  check('đối chứng — trước khi khôi phục, bốn bảng đã mất khỏi tệp đang chạy',
    Object.values(soDong(chupBonBang())).every(n => n === null), soDong(chupBonBang()));
  const kp = chay('restore.js');
  check('khôi phục chạy xong không lỗi', kp.status === 0, (kp.stdout + kp.stderr).slice(-400));
  const sau = chupBonBang();
  check('sau khôi phục: bốn bảng dontra_* đủ số dòng', JSON.stringify(soDong(sau)) === JSON.stringify(SO_DONG), soDong(sau));
  check('sau khôi phục: từng ô y như máy cũ', JSON.stringify(sau) === CHUOI_BAN_DAU);
  check('sau khôi phục: ba tệp ảnh còn nguyên', BA_ANH.every(anhConNguyen), BA_ANH.filter(a => !anhConNguyen(a)));
}

// ===========================================================================
console.log('\n[10] Kho mã: thư mục phân hệ đã hết, phần lõi không còn biết tên nó');
{
  check('không còn thư mục modules/dontra', !fs.existsSync(path.join(GOC, 'modules', 'dontra')));
  check('không còn bài test riêng của phân hệ', !fs.existsSync(path.join(GOC, 'test', 'don-tra.test.mjs')));

  // Quét phần mã CHẠY ĐƯỢC của lõi và của các phân hệ còn lại. Một ngoại lệ có
  // tên: tám nhãn tiếng Việt của nhật ký thao tác — máy cũ còn dòng nhật ký
  // mang mã `dontra-…`, bỏ nhãn là màn Nhật ký hiện mã thô cho ban giám hiệu.
  const NHAN_NHAT_KY = /^\s*'dontra-[a-z-]+': '[^']+',\s*$/;
  const tep = [];
  const quet = (thuMuc) => {
    for (const e of fs.readdirSync(path.join(GOC, thuMuc), { withFileTypes: true })) {
      const p = path.join(thuMuc, e.name);
      if (e.isDirectory()) quet(p);
      else if (/\.(js|json|html|css|sql)$/.test(e.name)) tep.push(p);
    }
  };
  ['routes', 'public', 'modules'].forEach(quet);
  tep.push('server.js', 'data/seed.js', 'scripts/ban-thu.js');
  const conNhac = [];
  for (const p of tep) {
    fs.readFileSync(path.join(GOC, p), 'utf8').split('\n').forEach((dong, i) => {
      if (!/dontra/i.test(dong)) return;
      if (p === path.join('public', 'js', 'views', 'admin-nhat-ky.js') && NHAN_NHAT_KY.test(dong)) return;
      conNhac.push(`${p}:${i + 1}`);
    });
  }
  check(`đã quét đủ rộng (${tep.length} tệp)`, tep.length > 80, tep.length);
  check('routes/, public/, modules/, server.js, data/seed.js, scripts/ban-thu.js không còn chữ "dontra"',
    conNhac.length === 0, conNhac.slice(0, 12));
  const nhan = fs.readFileSync(path.join(GOC, 'public/js/views/admin-nhat-ky.js'), 'utf8')
    .split('\n').filter(d => NHAN_NHAT_KY.test(d)).length;
  check('tám nhãn nhật ký thao tác của phân hệ cũ vẫn còn (dòng nhật ký cũ đọc được bằng tiếng Việt)', nhan === 8, nhan);
}

donThuMucTam(DIR);
tongKet();
