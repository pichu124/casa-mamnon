// Bài canh THÔNG BÁO RIÊNG TỪNG BÉ và ĐƯỜNG ĐẨY (Đ137).
//
// Chạy bằng:  npm run test:thong-bao-be
//
// Nhà trường 07/09: "mọi update của nhà trường như cân đo, ăn uống, ảnh
// check-in… cần có thông báo tới phụ huynh; ảnh điểm danh gửi thẳng về thông
// báo chứ không phải vào mục điểm danh mới nhìn được".
//
// BA CHỖ ĐÁNG CANH
//   1. Tin về bé A CHỈ tới bố mẹ của A — không tới nhà khác, không tới cô,
//      không tới văn phòng. Đây là ranh giới dữ liệu, mục [1], [2].
//   2. Đường ghi của cô KHÔNG được hỏng vì đường đẩy hỏng: gui() nuốt lỗi,
//      mục [4].
//   3. Xin quyền Notification chỉ hợp lệ khi sw.js có bộ nghe `push` thật —
//      test/khong-hua-suong.test.mjs canh; ở đây canh mảnh máy chủ: khoá
//      công khai, đăng ký, huỷ, gửi thử tới địa chỉ giả không làm sập.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, GOC, HOM_NAY } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('thong-bao-be');
sinhDuLieu(DIR);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'tbb_qt');

const { BASE, dung } = await dungMayChu({ port: 4623, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const NGAY = HOM_NAY();

try {
  const qt = await login('tbb_qt', mkQt);
  const co = await login('giaovien', '123456');
  const ph = await login('phuhuynh', '123456');       // mẹ s1 (Chồi 2) và s2 (Lá 1)
  const ph2 = await login('phuhuynh2', '123456');     // mẹ s3 (Chồi 2)

  // =========================================================================
  console.log('\n[1] Ảnh con tới lớp → gia đình có tin riêng, nhà khác không');
  {
    const truoc = await req('GET', '/api/notifications', { cookie: ph.cookie });
    const soRiengTruoc = (truoc.data || []).filter(n => n.laRiengBe).length;
    const hs = await req('GET', '/api/dashboard/badges', { cookie: ph.cookie });
    const huyHieuTruoc = hs.status === 200 ? Number(hs.data.thongbao || 0) : null;

    const r = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's1', date: NGAY, anh: ANH } });
    check('đối chứng — cô gắn được ảnh tới lớp cho s1', r.status === 201, `${r.status}`);

    const sau = await req('GET', '/api/notifications', { cookie: ph.cookie });
    const rieng = (sau.data || []).filter(n => n.laRiengBe);
    check('mẹ s1 thấy thêm một tin riêng về con', rieng.length === soRiengTruoc + 1, `${soRiengTruoc} → ${rieng.length}`);
    const tin = rieng[0] || {};
    check('tin nói đúng tên bé và giờ tới lớp', /Nguyễn Bảo An đã tới lớp lúc \d{2}:\d{2}/.test(tin.title || ''), tin.title);
    check('tin mang tên bé, loại và chỗ mở', tin.tenBe === 'Nguyễn Bảo An' && tin.loai === 'toi-lop' && tin.hash === '#/attendance', JSON.stringify({ tenBe: tin.tenBe, loai: tin.loai, hash: tin.hash }));
    check('tin chưa đọc', tin.read === false, tin.read);
    check('tin riêng xếp lẫn theo thời gian, không đứng dưới thông báo cũ của trường',
      (sau.data || []).findIndex(n => n.id === tin.id) < 3, (sau.data || []).findIndex(n => n.id === tin.id));

    const nhaKhac = await req('GET', '/api/notifications', { cookie: ph2.cookie });
    check('NHÀ KHÁC không thấy tin về s1', !(nhaKhac.data || []).some(n => n.id === tin.id));
    const cuaCo = await req('GET', '/api/notifications', { cookie: co.cookie });
    check('cô không thấy tin riêng của gia đình', !(cuaCo.data || []).some(n => n.laRiengBe));
    const cuaVp = await req('GET', '/api/notifications', { cookie: qt.cookie });
    check('văn phòng cũng không', !(cuaVp.data || []).some(n => n.laRiengBe));

    if (huyHieuTruoc !== null) {
      const hs2 = await req('GET', '/api/dashboard/badges', { cookie: ph.cookie });
      check('huy hiệu chuông của mẹ tăng đúng một', Number(hs2.data.thongbao) === huyHieuTruoc + 1, `${huyHieuTruoc} → ${hs2.data.thongbao}`);
    } else {
      const hs2 = await req('GET', '/api/dashboard/badges', { cookie: ph.cookie });
      check('đường huy hiệu tồn tại (để phép đếm trên có nghĩa)', hs2.status === 200, `${hs2.status}`);
    }

    // Chụp lại tấm thứ hai trong ngày: KHÔNG báo lần nữa.
    await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: { studentId: 's1', date: NGAY, anh: ANH } });
    const sau2 = await req('GET', '/api/notifications', { cookie: ph.cookie });
    check('chụp lại không sinh tin thứ hai', (sau2.data || []).filter(n => n.laRiengBe).length === soRiengTruoc + 1);

    // Đánh dấu đã đọc: nhà khác không đánh dấu hộ được.
    const docNham = await req('POST', `/api/notifications/${tin.id}/read`, { cookie: ph2.cookie });
    check('nhà khác KHÔNG đánh dấu đã đọc hộ được', docNham.status === 403, `${docNham.status}`);
    const doc = await req('POST', `/api/notifications/${tin.id}/read`, { cookie: ph.cookie });
    check('mẹ đánh dấu đã đọc được', doc.status === 200, `${doc.status}`);
    const sau3 = await req('GET', '/api/notifications', { cookie: ph.cookie });
    check('đọc rồi thì tin hiện là đã đọc', ((sau3.data || []).find(n => n.id === tin.id) || {}).read === true);
    const bia = await req('POST', '/api/notifications/tbb_khongco/read', { cookie: ph.cookie });
    check('mã bịa → 404', bia.status === 404, `${bia.status}`);
  }

  // =========================================================================
  console.log('\n[2] Đọc tất cả gom cả tin riêng; nhà hai con thấy tin của cả hai');
  {
    const co2 = await login('giaovien2', '123456');   // cô nhóm Lá 1 — có s2
    await req('POST', '/api/attendance/anh', { cookie: co2.cookie, body: { studentId: 's2', date: NGAY, anh: ANH } });
    const ds = await req('GET', '/api/notifications', { cookie: ph.cookie });
    const ten = new Set((ds.data || []).filter(n => n.laRiengBe).map(n => n.tenBe));
    check('mẹ hai con thấy tin của cả An lẫn Nam', ten.has('Nguyễn Bảo An') && ten.has('Nguyễn Bảo Nam'), [...ten]);
    const r = await req('POST', '/api/notifications/read-all', { cookie: ph.cookie });
    check('đọc tất cả chạy được', r.status === 200, `${r.status}`);
    const sau = await req('GET', '/api/notifications', { cookie: ph.cookie });
    check('không còn tin riêng nào chưa đọc', !(sau.data || []).some(n => n.laRiengBe && !n.read));
    const hs = await req('GET', '/api/dashboard/badges', { cookie: ph.cookie });
    check('huy hiệu chuông về 0', hs.status !== 200 || Number(hs.data.thongbao) === 0, hs.data && hs.data.thongbao);
  }

  // =========================================================================
  console.log('\n[3] Đường đẩy: khoá công khai, đăng ký, huỷ, gửi thử không sập');
  {
    const tt = await req('GET', '/api/push/trang-thai', { cookie: ph.cookie });
    check('có đường hỏi trạng thái đẩy', tt.status === 200 && typeof tt.data.coGoiDay === 'boolean', JSON.stringify(tt.data));
    const khoa = await req('GET', '/api/push/khoa-cong-khai', { cookie: ph.cookie });
    if (tt.data.coGoiDay) {
      check('gói web-push có mặt → có khoá VAPID công khai', khoa.status === 200 && /^[A-Za-z0-9_-]{80,}$/.test(khoa.data.khoa || ''), `${khoa.status} ${(khoa.data.khoa || '').slice(0, 12)}`);
      const khoa2 = await req('GET', '/api/push/khoa-cong-khai', { cookie: co.cookie });
      check('khoá là của trường, hỏi hai lần ra cùng một khoá', khoa2.data.khoa === khoa.data.khoa);
    } else {
      check('không có gói web-push → nói rõ 503, không đổ lỗi vô cớ', khoa.status === 503, `${khoa.status}`);
    }
    const sub = { endpoint: 'https://push.example.test/dang-ky/abc123', keys: { p256dh: 'BPx_thu', auth: 'auth_thu' } };
    const dk = await req('POST', '/api/push/dang-ky', { cookie: ph.cookie, body: { subscription: sub } });
    check('đăng ký máy được', dk.status === 200 && dk.data.soMay === 1, `${dk.status} ${JSON.stringify(dk.data)}`);
    const dk2 = await req('POST', '/api/push/dang-ky', { cookie: ph.cookie, body: { subscription: sub } });
    check('đăng ký lại cùng máy không nhân đôi', dk2.status === 200 && dk2.data.soMay === 1, JSON.stringify(dk2.data));
    const xau = await req('POST', '/api/push/dang-ky', { cookie: ph.cookie, body: { subscription: { endpoint: 'http://khong-bao-mat' } } });
    check('đăng ký sai dạng bị từ chối 400', xau.status === 400, `${xau.status}`);
    const chuaDn = await req('GET', '/api/push/trang-thai');
    check('chưa đăng nhập thì không hỏi được', chuaDn.status === 401 || chuaDn.status === 403, `${chuaDn.status}`);

    // Gửi thử tới địa chỉ giả: đường mạng ra ngoài không có → phải trả về
    // gọn, không 500, và máy chủ vẫn sống.
    const thu = await req('POST', '/api/push/thu', { cookie: ph.cookie, body: {} });
    check('gửi thử tới địa chỉ giả không làm sập máy chủ', thu.status === 200 || thu.status === 503, `${thu.status} ${JSON.stringify(thu.data).slice(0, 100)}`);
    const song = await req('GET', '/api/notifications', { cookie: ph.cookie });
    check('máy chủ vẫn trả lời sau khi đẩy hỏng', song.status === 200, `${song.status}`);

    const huy = await req('DELETE', `/api/push/dang-ky?endpoint=${encodeURIComponent(sub.endpoint)}`, { cookie: ph.cookie });
    check('huỷ đăng ký được', huy.status === 200 && huy.data.soMay === 0, JSON.stringify(huy.data));
    const huyNham = await req('DELETE', `/api/push/dang-ky?endpoint=${encodeURIComponent(sub.endpoint)}`, { cookie: ph2.cookie });
    check('người khác không xoá được đăng ký của mình (không có gì để xoá)', huyNham.status === 200 && huyNham.data.soMay === 0);
  }

  // =========================================================================
  console.log('\n[4] Mã tĩnh: đường ghi không hỏng vì đường đẩy; sw.js có bộ nghe push');
  {
    const lib = fs.readFileSync(path.join(GOC, 'lib/thong-bao-be.js'), 'utf8');
    check('gui() bọc try/catch và trả null khi hỏng — không ném ra chỗ gọi', /function gui\([\s\S]*?try \{[\s\S]*?\} catch \(_\) \{\s*return null;/.test(lib));
    check('đẩy là việc phụ: gọi lib/day.js trong try riêng', /require\('\.\/day'\)\.guiChoGiaDinhCuaBe/.test(lib) && /catch \(_\) \{ \/\* đẩy là việc phụ \*\/ \}/.test(lib));
    const day = fs.readFileSync(path.join(GOC, 'lib/day.js'), 'utf8');
    check('lib/day.js không đứng chờ máy chủ Google/Apple: gửi không await ở đường của cô', /guiChoNguoi\(p\.parentId, goi\)\.catch\(\(\) => \{\}\)/.test(day));
    check('đăng ký chết (404/410) bị xoá để không đẩy vào khoảng không', /ma === 404 \|\| ma === 410/.test(day));
    const sw = fs.readFileSync(path.join(GOC, 'public/sw.js'), 'utf8');
    check('sw.js có bộ nghe push và hiện thông báo', /addEventListener\(\s*'push'/.test(sw) && /showNotification\(/.test(sw));
    check('bấm vào thông báo thì mở đúng chỗ (#/…)', /notificationclick/.test(sw) && /hash\.startsWith\('#\/'\)/.test(sw));
    const st = fs.readFileSync(path.join(GOC, 'public/js/views/settings.js'), 'utf8');
    check('màn Cài đặt nói rõ iPhone cần thêm vào màn hình chính', /iPhone/.test(st) && /màn hình chính/.test(st));
    check('màn Cài đặt có Bật / Tắt / Gửi thử', /st-push-bat/.test(st) && /st-push-tat/.test(st) && /st-push-thu/.test(st));
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Thông báo riêng từng bé và đường đẩy');
