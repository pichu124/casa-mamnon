// Bài canh: KẾ TOÁN BẬT ĐƯỢC THÔNG BÁO TRÊN MÁY, và tin nhắc hạn nộp tới nơi.
//
// Chạy bằng:  node test/ke-toan-bat-thong-bao.test.mjs
//
// VÌ SAO CÓ BÀI NÀY (Đ257, chủ dự án duyệt 14/11/2026)
//
// Đ199 dựng bộ quét hạn nộp và gửi tin đẩy "Có khoản thu sắp tới hạn" cho
// người lo tiền: ban giám hiệu, quản lý cơ sở, kế toán
// (`CHUC_VU_LO_TIEN` ở lib/bao-nha-truong.js). Nhưng chức vụ Kế toán không có
// đường `/api/push/dang-ky` trong danh sách của mình, và `/api/push/trang-thai`
// trả `batDuoc: false` nên thẻ "Thông báo trên điện thoại" không hiện. Tin
// nhắc hạn — thứ nhà trường xin cho chính kế toán — không tới máy nào của họ.
//
//   [1] Máy chủ hứa với kế toán đúng một thứ, và thứ đó có tên.
//   [2] Kế toán gọi được đúng các đường bật/tắt thông báo của máy mình.
//   [3] Đường quản trị đẩy của cả trường vẫn đóng với kế toán.
//   [4] Lượt quét hạn nộp gửi tin tới máy kế toán; khoá cơ sở vẫn giữ.
//   [5] Ban giám hiệu và quản lý cơ sở được nói thêm đúng dòng ấy.
//   [6] Kế toán không mở thêm gì khác; các chức vụ khác không đổi.
//   [7] Tắt phân hệ Học phí thì thôi hứa — không còn bộ quét nào gửi.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-toan-bat-thong-bao');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi']);

// Hai kế toán ở hai cơ sở: bé `s1` thuộc nhóm c1 của cơ sở 1.
const mk = {};
for (const [ten, hoTen, chucVu, coSo] of [
  ['b_qt', 'Quản Trị B', null, null],
  ['b_ht', 'Hiệu Trưởng B', 'hieu-truong', null],
  ['b_ql', 'Quản Lý B', 'quanly-coso', 'cs1'],
  ['b_kt1', 'Kế Toán Cơ Sở Một', 'ketoan', 'cs1'],
  ['b_kt2', 'Kế Toán Cơ Sở Hai', 'ketoan', 'cs2'],
  ['b_ns', 'Nhân Sự B', 'nhansu', null],
  ['b_mk', 'Marketing B', 'marketing', null],
  ['b_vp', 'Văn Phòng B', 'vanphong-coso', 'cs1'],
  ['b_bv', 'Bảo Vệ B', 'baove', 'cs1'],
]) {
  mk[ten] = taoQuanTri(DIR, hoTen, ten);
  if (chucVu) datChucVu(DIR, ten, chucVu);
  if (coSo) khoaVaoCoSo(DIR, ten, coSo);
}

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4829), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u) {
  const d = await login(u, mk[u]);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const ngayCach = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
function ghi(sql, ...ts) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
}
const khoanToiHan = (id, studentId) => ghi(`INSERT INTO hocphi_khoan
  (id, studentId, kyThu, noiDung, soTien, hanNop, daNop, ghiChu, taoBoi, taoLuc)
  VALUES (?, ?, 'Tháng 11/2026', 'Học phí tháng 11', 3000000, ?, 0, '', 'b_kt1', ?)`,
  id, studentId, ngayCach(3), new Date().toISOString());

const may = (ten) => `https://day-gia.example.test/may/${ten}`;
const dangKyMay = (cookie, ten) => req('POST', '/api/push/dang-ky', {
  cookie, body: { subscription: { endpoint: may(ten), keys: { p256dh: 'khoa-thu', auth: 'khoa-thu' } } },
});
const trangThai = async (cookie) => (await req('GET', '/api/push/trang-thai', { cookie }));

// MỘT LƯỢT CỦA ĐỒNG HỒ, với dịch vụ đẩy giả.
//
// Chạy ngoài tiến trình này, trên cùng cơ sở dữ liệu với máy chủ thử: gói
// `web-push` bị thay bằng bản ghi lại lời gọi (cùng cách với
// `test/het-phien-thoi-day.test.mjs`) nên không có gì đi ra mạng. Nạp phân hệ
// như `server.js` nạp rồi gọi `henGio.chay()` — đúng thứ đồng hồ của máy chủ
// gọi mỗi 15 phút — chứ không gọi thẳng hàm gửi: thứ đang canh là "bộ quét
// hạn nộp có tới được máy kế toán không".
function motLuotDongHo() {
  const ra = execFileSync('node', ['-e', `
    const webpush = require('web-push');
    const thay = [];
    webpush.sendNotification = (sub, than) => {
      thay.push({ endpoint: sub.endpoint, than: JSON.parse(than) });
      return Promise.resolve({ statusCode: 201 });
    };
    const db = require('./lib/db');
    const day = require('./lib/day');
    const modules = require('./lib/modules');
    const henGio = require('./lib/hen-gio');
    modules.napMoRong();
    modules.napApiMoRong(require('express')());
    (async () => {
      const viec = henGio.danhSach().map(v => v.ten);
      henGio.chay();
      for (let i = 0; i < 300; i++) {
        await new Promise(r => setTimeout(r, 10));
        const t = day.trangThaiHangDoi();
        if (!t.dangChay && !t.dangCho) break;
      }
      require('fs').writeSync(1, '\\n@@KET-QUA@@' + JSON.stringify({ viec, thay }));
      process.exit(0);
    })();
  `], { cwd: GOC, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DATA_DIR: DIR } });
  return JSON.parse(ra.split('@@KET-QUA@@').pop());
}

const DONG_HAN_NOP = 'khoản thu sắp tới hạn nộp';
const DONG_CHO_DUYET = ['báo cáo học tập cô gửi chờ duyệt', 'đề xuất sửa kế hoạch cô gửi chờ duyệt'];
const DUONG_BAT_TAT = ['/api/push/trang-thai', '/api/push/khoa-cong-khai', '/api/push/dang-ky', '/api/push/dong-bo', '/api/push/thu'];

try {
  const QT = await vao('b_qt');
  const HT = await vao('b_ht');
  const QL = await vao('b_ql');
  const KT1 = await vao('b_kt1');
  const KT2 = await vao('b_kt2');
  const NS = await vao('b_ns');
  const MK = await vao('b_mk');
  const VP = await vao('b_vp');
  const BV = await vao('b_bv');
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Máy chủ hứa với KẾ TOÁN đúng một thứ, và thứ đó có tên');
  {
    const tt = await trangThai(KT1);
    check('kế toán hỏi được trạng thái thông báo', tt.status === 200, tt.status);
    check('KẾ TOÁN BẬT ĐƯỢC THÔNG BÁO — thẻ ở Cài đặt hiện ra', tt.data.batDuoc === true, tt.data);
    check('và lời hứa là ĐÚNG MỘT dòng: khoản thu sắp tới hạn nộp',
      JSON.stringify(tt.data.loaiTin) === JSON.stringify([DONG_HAN_NOP]), tt.data.loaiTin);
    check('KHÔNG hứa việc chờ duyệt — kế toán không nằm trong danh sách nhận tin ấy',
      !(tt.data.loaiTin || []).some(t => /chờ duyệt/.test(t)), tt.data.loaiTin);
  }

  // =========================================================================
  console.log('\n[2] Kế toán gọi được đúng các đường bật/tắt thông báo của máy mình');
  {
    // Đối chiếu từng đường với quản lý cơ sở — chức vụ đang bật được thông báo.
    const khoaQL = await req('GET', '/api/push/khoa-cong-khai', { cookie: QL });
    const khoaKT = await req('GET', '/api/push/khoa-cong-khai', { cookie: KT1 });
    check('đối chứng — quản lý cơ sở lấy được khoá công khai', khoaQL.status === 200 && !!khoaQL.data.khoa, khoaQL.status);
    check('kế toán lấy được khoá công khai, cùng một khoá của trường',
      khoaKT.status === 200 && khoaKT.data.khoa === khoaQL.data.khoa, khoaKT.status);

    // Gửi thử khi CHƯA có máy nào: không có gì đi ra mạng, chỉ đo cánh cửa.
    const thu = await req('POST', '/api/push/thu', { cookie: KT1, body: {} });
    check('kế toán bấm được "Gửi thử"', thu.status === 200 && thu.data.ok === true, `${thu.status} ${JSON.stringify(thu.data)}`);

    const dk = await dangKyMay(KT1, 'kt1-tam');
    check('KẾ TOÁN ĐĂNG KÝ ĐƯỢC MÁY', dk.status === 200 && dk.data.soMay === 1, `${dk.status} ${JSON.stringify(dk.data)}`);
    const db1 = await req('POST', '/api/push/dong-bo', { cookie: KT1, body: { endpoint: may('kt1-tam') } });
    check('app nối lại được đăng ký của máy kế toán sau khi đăng nhập',
      db1.status === 200 && db1.data.conDangKy === true, `${db1.status} ${JSON.stringify(db1.data)}`);
    check('trạng thái đếm đúng một máy', (await trangThai(KT1)).data.soMay === 1);
    // Đúng dạng màn Cài đặt gọi: địa chỉ máy nằm trên dòng địa chỉ.
    const huy = await req('DELETE', `/api/push/dang-ky?endpoint=${encodeURIComponent(may('kt1-tam'))}`, { cookie: KT1 });
    check('kế toán tắt được thông báo trên máy mình', huy.status === 200 && huy.data.soMay === 0, `${huy.status} ${JSON.stringify(huy.data)}`);
  }

  // =========================================================================
  console.log('\n[3] Đường quản trị đẩy của CẢ TRƯỜNG vẫn đóng với kế toán');
  {
    const ds = await req('GET', '/api/push/quan-tri', { cookie: KT1 });
    check('kế toán KHÔNG xem được danh sách máy của cả trường', ds.status === 403, ds.status);
    const go = await req('POST', '/api/push/quan-tri/go', { cookie: KT1, body: { userId: 'p1' } });
    check('kế toán KHÔNG gỡ được máy của người khác', go.status === 403, go.status);
    const doi = await req('POST', '/api/push/doi-khoa', { cookie: KT1, body: { xacNhan: 'DOI KHOA' } });
    check('kế toán KHÔNG đổi được khoá của trường', doi.status === 403, doi.status);
    const hoa = await req('GET', '/API/PUSH/QUAN-TRI', { cookie: KT1 });
    check('viết hoa địa chỉ cũng không lọt', hoa.status === 403, hoa.status);
    check('đối chứng — ban giám hiệu thì xem được danh sách máy',
      (await req('GET', '/api/push/quan-tri', { cookie: HT })).status === 200);
  }

  // =========================================================================
  console.log('\n[4] LƯỢT QUÉT HẠN NỘP gửi tin tới máy kế toán — khoá cơ sở vẫn giữ');
  {
    for (const [ten, cookie] of [['kt1', KT1], ['kt2', KT2], ['ht', HT], ['ql', QL]]) {
      const dk = await dangKyMay(cookie, ten);
      check(`${ten} bật thông báo trên máy mình`, dk.status === 200 && dk.data.soMay === 1, `${dk.status} ${JSON.stringify(dk.data)}`);
    }
    khoanToiHan('hp_b_1', 's1');

    const kq = motLuotDongHo();
    check('đối chứng — đồng hồ có việc quét hạn nộp', kq.viec.includes('hocphi:han-nop'), kq.viec);
    const nhac = kq.thay.filter(g => g.than.tieuDe === 'Có khoản thu sắp tới hạn');
    const toi = (ten) => nhac.filter(g => g.endpoint === may(ten));
    check('TIN NHẮC HẠN TỚI MÁY CỦA KẾ TOÁN CƠ SỞ 1 — đúng một tin', toi('kt1').length === 1, nhac.map(g => g.endpoint));
    check('tin mở đúng mục Học phí và nói về đúng bé',
      toi('kt1')[0]?.than.hash === '#/hocphi' && /Nguyễn Bảo An/.test(toi('kt1')[0]?.than.noiDung || ''), toi('kt1')[0]?.than);
    check('KẾ TOÁN KHOÁ VÀO CƠ SỞ 2 KHÔNG NHẬN tin của bé cơ sở 1', toi('kt2').length === 0, toi('kt2'));
    check('và máy kế toán cơ sở 2 không nhận tin nào khác trong lượt này',
      kq.thay.filter(g => g.endpoint === may('kt2')).length === 0, kq.thay.filter(g => g.endpoint === may('kt2')));
    check('ban giám hiệu nhận như trước', toi('ht').length === 1, toi('ht'));
    check('quản lý cơ sở 1 nhận như trước', toi('ql').length === 1, toi('ql'));

    const lan2 = motLuotDongHo();
    check('lượt quét sau không nhắc lại khoản đã nhắc',
      lan2.thay.filter(g => g.than.tieuDe === 'Có khoản thu sắp tới hạn').length === 0, lan2.thay.map(g => g.than.tieuDe));
  }

  // =========================================================================
  console.log('\n[5] Ban giám hiệu và quản lý cơ sở được nói thêm ĐÚNG dòng ấy');
  {
    const mong = JSON.stringify([...DONG_CHO_DUYET, DONG_HAN_NOP]);
    for (const [ten, cookie] of [['ban giám hiệu', HT], ['quản lý cơ sở', QL], ['quản trị chưa khai chức vụ', QT]]) {
      const tt = (await trangThai(cookie)).data;
      check(`${ten}: hai việc chờ duyệt như cũ, thêm khoản thu sắp tới hạn nộp`,
        tt.batDuoc === true && JSON.stringify(tt.loaiTin) === mong, tt.loaiTin);
    }
  }

  // =========================================================================
  console.log('\n[6] Kế toán KHÔNG mở thêm gì khác; các chức vụ khác KHÔNG đổi');
  {
    const ma = async (cookie, duong) => (await req('GET', duong, { cookie })).status;
    check('đối chứng — kế toán vẫn mở được học phí', (await ma(KT1, '/api/hocphi?studentId=s1')) === 200);
    for (const duong of ['/api/students', '/api/students/s1', '/api/notifications', '/api/notifications/rieng-be',
      '/api/messages', '/api/albums', '/api/health/s1', '/api/admin/teachers', '/api/push', '/api/push/khac']) {
      check(`kế toán KHÔNG mở được ${duong}`, (await ma(KT1, duong)) === 403, await ma(KT1, duong));
    }

    // Canh thẳng vào BẢNG: từng đường đẩy được kể tên, không có tiền tố rộng.
    const bang = require(path.join(GOC, 'lib', 'db.js')).CHUC_VU;
    const dayCua = (m) => ((bang.find(c => c.ma === m) || {}).api || []).filter(x => x === '/api/push' || x.startsWith('/api/push/')).sort();
    check('danh sách của kế toán kể ĐÚNG năm đường đẩy, không mở cả tiền tố /api/push',
      JSON.stringify(dayCua('ketoan')) === JSON.stringify([...DUONG_BAT_TAT].sort()), dayCua('ketoan'));
    for (const m of ['nhansu', 'marketing', 'vanphong-coso', 'baove']) {
      check(`${m}: vẫn chỉ có đường hỏi trạng thái`,
        JSON.stringify(dayCua(m)) === JSON.stringify(['/api/push/trang-thai']), dayCua(m));
    }

    for (const [ten, cookie] of [['nhân sự', NS], ['marketing', MK], ['văn phòng cơ sở', VP], ['bảo vệ cổng', BV]]) {
      const tt = await trangThai(cookie);
      check(`${ten}: vẫn không có loại tin nào`, tt.status === 200 && tt.data.batDuoc === false && tt.data.loaiTin.length === 0, tt.data);
      check(`${ten}: vẫn KHÔNG đăng ký máy được`, (await dangKyMay(cookie, `khong-${ten}`)).status === 403);
      check(`${ten}: vẫn KHÔNG bấm được "Gửi thử"`, (await req('POST', '/api/push/thu', { cookie, body: {} })).status === 403);
    }
    const gv = (await trangThai(GV)).data;
    check('cô: vẫn chưa có loại tin nào', gv.batDuoc === false && gv.loaiTin.length === 0, gv);
    const ph = (await trangThai(PH)).data;
    check('gia đình: sáu loại tin như cũ, không có dòng về khoản thu của trường',
      ph.batDuoc === true && ph.loaiTin.length === 6 && !ph.loaiTin.includes(DONG_HAN_NOP), ph.loaiTin);
  }

  // =========================================================================
  console.log('\n[7] Tắt phân hệ Học phí thì THÔI HỨA — không còn bộ quét nào gửi');
  {
    const tat = await req('PUT', '/api/admin/modules/hocphi', { cookie: QT, body: { enabled: false } });
    check('đối chứng — tắt được phân hệ Học phí', tat.status === 200, tat.status);
    const kt = (await trangThai(KT1)).data;
    check('kế toán: không còn loại tin nào, thẻ tự ẩn', kt.batDuoc === false && kt.loaiTin.length === 0, kt);
    const ht = (await trangThai(HT)).data;
    check('ban giám hiệu: về lại đúng hai việc chờ duyệt',
      JSON.stringify(ht.loaiTin) === JSON.stringify(DONG_CHO_DUYET), ht.loaiTin);

    khoanToiHan('hp_b_2', 's1');
    const kq = motLuotDongHo();
    check('và đúng là không tin nhắc hạn nào được gửi khi phân hệ tắt',
      kq.thay.filter(g => g.than.tieuDe === 'Có khoản thu sắp tới hạn').length === 0, kq.thay.map(g => g.than.tieuDe));

    await req('PUT', '/api/admin/modules/hocphi', { cookie: QT, body: { enabled: true } });
    const lai = (await trangThai(KT1)).data;
    check('bật lại là hứa lại, và máy đã đăng ký còn nguyên',
      lai.batDuoc === true && lai.soMay === 1 && JSON.stringify(lai.loaiTin) === JSON.stringify([DONG_HAN_NOP]), lai);
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
  tongKet();
}
