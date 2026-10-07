// Bài canh QUẢN TRỊ ĐƯỜNG ĐẨY (Đ157).
//
// Chạy bằng:  npm run test:day-quan-tri
//
// BA CHỖ HỞ CỦA CÙNG MỘT TÍNH NĂNG
//
// (1) Màn Cài đặt tự kể tên chức vụ ra ở phía TRÌNH DUYỆT để quyết có hiện thẻ
//     "Thông báo trên điện thoại" hay không, trong khi danh sách API thật nằm ở
//     `lib/db.js`. Hai chỗ cùng nói một chuyện thì sẽ trôi khỏi nhau — và Đ145
//     đã phải gỡ một lời hứa suông sinh ra đúng theo kiểu ấy.
//
// (2) Khoá VAPID sinh MỘT LẦN rồi nằm mãi trong bảng `settings`; `khoa()` chỉ
//     sinh mới khi CHƯA có. Khoá lộ ra ngoài thì không có đường nào trong app
//     đổi được, chỉ còn cách sửa thẳng cơ sở dữ liệu của trường.
//
// (3) Bảng `push_dang_ky` không có màn quản trị nào: nhà trường không biết ai
//     đang bật, và không gỡ được máy của người vừa nghỉ việc.
//
// ĐIỀU CỐ Ý, canh ở mục [2] và [5]: chức vụ nào KHÔNG có loại tin nào thì
// `batDuoc: false` — và họ vẫn HỎI được câu ấy. Mở cả tiền tố `/api/push` cho
// họ thì họ đăng ký máy được và bấm "Gửi thử" được, nhận đúng một tiếng chuông
// thử rồi thôi. Đó là lời hứa suông, không phải một quyền được cấp thêm.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('day-quan-tri');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng D', 'd_qt');
const mkVP = taoQuanTri(DIR, 'Văn Phòng D', 'd_vp');
const mkKT = taoQuanTri(DIR, 'Kế Toán D', 'd_kt');
const mkBV = taoQuanTri(DIR, 'Bảo Vệ D', 'd_bv');
khoaVaoCoSo(DIR, 'd_vp', 'cs1');
datChucVu(DIR, 'd_vp', 'vanphong-coso');
datChucVu(DIR, 'd_kt', 'ketoan');
khoaVaoCoSo(DIR, 'd_bv', 'cs1');
datChucVu(DIR, 'd_bv', 'baove');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4751), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Dựng vài đăng ký giả, ghi thẳng vào bảng: không có trình duyệt thật thì
// không có PushSubscription thật, mà thứ đang canh là màn quản trị chứ không
// phải đường đăng ký.
function themDangKy(userId, endpoint, loiCuoi = '') {
  const conn = new Database(CSDL);
  try {
    conn.prepare(`INSERT OR REPLACE INTO push_dang_ky (endpoint, userId, p256dh, auth, taoLuc, loiCuoi)
                  VALUES (?, ?, 'p256dh-gia', 'auth-gia', ?, ?)`)
      .run(endpoint, userId, new Date().toISOString(), loiCuoi);
  } finally { conn.close(); }
}
function demDangKy() {
  const conn = new Database(CSDL);
  try { return conn.prepare('SELECT COUNT(*) AS n FROM push_dang_ky').get().n; }
  finally { conn.close(); }
}
function khoaHienTai() {
  const conn = new Database(CSDL);
  try {
    const r = conn.prepare("SELECT value FROM settings WHERE key = 'push-vapid'").get();
    return r ? JSON.parse(r.value) : null;
  } finally { conn.close(); }
}

try {
  const QT = await vao('d_qt', mkQT);
  const VP = await vao('d_vp', mkVP);
  const KT = await vao('d_kt', mkKT);
  const BV = await vao('d_bv', mkBV);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Máy chủ nói ra ai nhận được gì — màn hình không phải tự đoán');
  {
    const ph = (await req('GET', '/api/push/trang-thai', { cookie: PH })).data;
    check('GIA ĐÌNH bật được, và máy chủ liệt kê đúng những gì sẽ tới',
      ph.batDuoc === true && ph.loaiTin.length >= 4, ph);
    check('trong đó có ảnh con tới lớp — thứ trường xin đầu tiên',
      ph.loaiTin.some(t => /ảnh con tới lớp/.test(t)), ph.loaiTin);

    const qt = (await req('GET', '/api/push/trang-thai', { cookie: QT })).data;
    check('BAN GIÁM HIỆU bật được, và chỉ được hứa đúng việc chờ duyệt',
      qt.batDuoc === true && qt.loaiTin.every(t => /chờ duyệt/.test(t)), qt);

    const gv = (await req('GET', '/api/push/trang-thai', { cookie: GV })).data;
    check('CÔ: chưa có loại tin nào nên batDuoc = false (Đ145 giữ nguyên)',
      gv.batDuoc === false && gv.loaiTin.length === 0, gv);
  }

  // =========================================================================
  console.log('\n[2] Chức vụ HỎI được, nhưng KHÔNG đăng ký được');
  {
    for (const [ten, cookie] of [['văn phòng cơ sở', VP], ['kế toán', KT], ['bảo vệ cổng', BV]]) {
      const tt = await req('GET', '/api/push/trang-thai', { cookie });
      check(`${ten}: hỏi được (không còn nhận 403 rồi bị đọc nhầm thành "máy chủ chưa cài")`,
        tt.status === 200, tt.status);
      check(`${ten}: và câu trả lời là KHÔNG có loại tin nào`,
        tt.data.batDuoc === false && (tt.data.loaiTin || []).length === 0, tt.data);
      const dk = await req('POST', '/api/push/dang-ky', { cookie, body: { subscription: {
        endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } } } });
      check(`${ten}: KHÔNG đăng ký máy được — mở ra là hứa một tiếng chuông rồi thôi`,
        dk.status === 403, dk.status);
      const thu = await req('POST', '/api/push/thu', { cookie });
      check(`${ten}: và không bấm được "Gửi thử"`, thu.status === 403, thu.status);
    }
  }

  // =========================================================================
  console.log('\n[3] Màn Cài đặt nghe theo máy chủ, không tự kể tên chức vụ');
  {
    const st = fs.readFileSync(path.join(GOC, 'public/js/views/settings.js'), 'utf8');
    check('không còn danh sách chức vụ viết tay trong màn Cài đặt',
      !/\['hieu-truong', 'quanly-coso'\]/.test(st), 'settings.js');
    check('mà gỡ thẻ theo đúng câu trả lời của máy chủ',
      /tt\.batDuoc === false/.test(st) && /the\.remove\(\)/.test(st), 'settings.js');
    check('so bằng === false, để máy chủ đời cũ không làm thẻ biến mất oan',
      !/!tt\.batDuoc/.test(st), 'settings.js');
    check('và lời hứa trên thẻ lấy từ danh sách máy chủ trả về',
      /tt\.loaiTin/.test(st), 'settings.js');
  }

  // =========================================================================
  console.log('\n[4] Màn quản trị: ai đang bật, và gỡ được máy của một người');
  {
    themDangKy('p1', 'https://fcm.googleapis.com/fcm/send/aaa');
    themDangKy('p1', 'https://web.push.apple.com/bbb');
    themDangKy('t1', 'https://updates.push.services.mozilla.com/ccc', '404');

    const q = await req('GET', '/api/push/quan-tri', { cookie: QT });
    check('ban giám hiệu mở được danh sách máy', q.status === 200, q.status);
    check('đếm đủ ba máy vừa dựng', (q.data.danhSach || []).length === 3, (q.data.danhSach || []).length);

    const mot = (q.data.danhSach || []).find(x => x.userId === 't1');
    check('có tên người và tên dịch vụ đẩy',
      !!mot && mot.hoTen && /mozilla/.test(mot.dichVu || ''), mot);
    check('và nói luôn lần gửi cuối hỏng vì gì', !!mot && mot.loiCuoi === '404', mot && mot.loiCuoi);

    // KHÔNG ĐƯỢC TRẢ VỀ ENDPOINT ĐẦY ĐỦ — đó là địa chỉ đẩy riêng của đúng một
    // trình duyệt. In nguyên ra màn quản trị là để nó nằm trong ảnh chụp màn
    // hình và trong bản sao lưu của máy văn phòng.
    const tho = JSON.stringify(q.data);
    check('KHÔNG lộ endpoint đầy đủ của bất kỳ máy nào',
      !/fcm\/send\/aaa/.test(tho) && !/apple\.com\/bbb/.test(tho) && !/mozilla\.com\/ccc/.test(tho),
      tho.slice(0, 200));

    const go = await req('POST', '/api/push/quan-tri/go', { cookie: QT, body: { userId: 'p1' } });
    check('gỡ được mọi máy của một người', go.status === 200 && go.data.daXoa === 2, go.data);
    check('và chỉ của người ấy — máy của người khác còn nguyên', demDangKy() === 1, demDangKy());
    const lac = await req('POST', '/api/push/quan-tri/go', { cookie: QT, body: { userId: 'khong-co-that' } });
    check('gỡ một tài khoản không có thật thì báo không tìm thấy', lac.status === 404, lac.status);
  }

  // =========================================================================
  console.log('\n[5] Khoá VAPID: đổi được, nhưng phải gõ đúng chữ xác nhận');
  {
    // Gọi một đường có dùng khoá để nó sinh ra lần đầu.
    await req('GET', '/api/push/khoa-cong-khai', { cookie: QT });
    const cu = khoaHienTai();
    themDangKy('p1', 'https://fcm.googleapis.com/fcm/send/ddd');

    const thieu = await req('POST', '/api/push/doi-khoa', { cookie: QT, body: {} });
    check('không gõ xác nhận thì từ chối', thieu.status === 400, thieu.status);
    check('và nói rõ cái giá: mọi máy phải bật lại, kể cả của gia đình',
      /gia đình/.test(thieu.data?.error || ''), thieu.data?.error);
    check('khoá chưa đổi', JSON.stringify(khoaHienTai()) === JSON.stringify(cu));

    const sai = await req('POST', '/api/push/doi-khoa', { cookie: QT, body: { xacNhan: 'doi khoa' } });
    check('gõ sai chữ (thường/hoa) thì cũng từ chối', sai.status === 400, sai.status);

    const soTruoc = demDangKy();
    const ok = await req('POST', '/api/push/doi-khoa', { cookie: QT, body: { xacNhan: 'DOI KHOA' } });
    if (ok.status === 200) {
      check('gõ đúng thì đổi được', ok.data.ok === true, ok.data);
      check('và nói đúng số máy phải đăng ký lại',
        ok.data.soMayPhaiDangKyLai === soTruoc, { noi: ok.data.soMayPhaiDangKyLai, that: soTruoc });
      const moi = khoaHienTai();
      check('khoá RIÊNG đã khác hẳn khoá cũ', !!moi && moi.privateKey !== cu.privateKey);
      check('mọi đăng ký cũ bị dọn — không đẩy vào địa chỉ chắc chắn hỏng nữa',
        demDangKy() === 0, demDangKy());
    } else {
      // Máy chưa cài gói `web-push` thì không sinh được khoá — nói thẳng ra,
      // không lặng lẽ báo xanh.
      check('máy chưa cài gói web-push thì từ chối 503 và nói rõ vì sao',
        ok.status === 503 && /gửi thông báo đẩy/.test(ok.data?.error || ''), ok.data);
    }
  }

  // =========================================================================
  console.log('\n[6] Ai giữ khoá — hẹp hơn "đặt nếp làm việc" của Đ156');
  {
    for (const [ten, cookie] of [['văn phòng cơ sở', VP], ['kế toán', KT], ['bảo vệ cổng', BV]]) {
      check(`${ten} KHÔNG xem được danh sách máy`,
        (await req('GET', '/api/push/quan-tri', { cookie })).status === 403);
      check(`${ten} KHÔNG đổi được khoá`,
        (await req('POST', '/api/push/doi-khoa', { cookie, body: { xacNhan: 'DOI KHOA' } })).status === 403);
    }
    check('CÔ cũng không', (await req('GET', '/api/push/quan-tri', { cookie: GV })).status === 403);
    check('gia đình càng không', (await req('GET', '/api/push/quan-tri', { cookie: PH })).status === 403);

    // Đối chứng: văn phòng VẪN đặt được mốc giờ rà soát (Đ156) — hai chốt khác
    // nhau, và bài này không được vô tình siết luôn cái kia.
    check('nhưng văn phòng VẪN đặt được mốc giờ rà soát — hai chốt khác nhau',
      (await req('PUT', '/api/attendance/cai-dat', { cookie: VP, body: { gioRaSoat: '08:30' } })).status === 200);
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Quản trị đường đẩy (Đ157)');
