// Bài canh góp ý 18/11 (Đ260b) — Thông báo và khảo sát, phía máy chủ.
//
// Chạy bằng:  node test/phan-hoi-1811-thong-bao.test.mjs
//
// Ba góp ý của trường:
//   (1) Quản lý: thông báo có nút GHIM và BỎ GHIM. Chỉ quản trị ghim được;
//       cô gửi ô `pinned` thì 403.
//   (2) Phụ huynh: thông báo nào bấm vào cũng phải mở được — "Album mới: …"
//       và "Thực đơn … đã có" trước đây chỉ ra hộp chữ. `guiChoNhom` nay ghi
//       liên kết; tin cũ đã có trong máy thì suy liên kết lúc đọc.
//   (3) Cô: chỉ gửi thông báo / tạo khảo sát cho nhóm mình — cả nhóm hoặc vài
//       gia đình tích chọn. Toàn trường chỉ quản trị gửi. Có danh sách người
//       nhận thì CHỈ phụ huynh của các bé ấy thấy: danh sách, chi tiết, huy
//       hiệu, tin đẩy, trả lời khảo sát.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, khoaVaoCoSo, dungMayChu,
  taoBoDem, taoReq, taoLogin, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-1811-thong-bao');
sinhDuLieu(DIR);
const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng Thử', 'b_bgh');
const mkCS2 = taoQuanTri(DIR, 'Quản Lý Cơ Sở 2', 'b_cs2');
khoaVaoCoSo(DIR, 'b_cs2', 'cs2');
const CSDL = path.join(DIR, 'school.db');
process.env.DATA_DIR = DIR;

function doc(sql, ...ts) {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
}
function ghi(sql, ...ts) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5220), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function quanTri(ten, mk) {
  const d = await login(ten, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(ten, 'quantri2026')).cookie;
}
const ds = async (cookie) => (await req('GET', '/api/notifications?bo=0&soLuong=100', { cookie })).data || [];
const huyHieu = async (cookie) => (await req('GET', '/api/dashboard/badges', { cookie })).data || {};
const dsKs = async (cookie) => (await req('GET', '/api/surveys', { cookie })).data || [];
const CAU_HOI = [{ text: 'Nhà mình đi được không ạ?', type: 'choice', options: ['Có', 'Không'] }];

try {
  const BGH = await quanTri('b_bgh', mkBGH);
  const CS2 = await quanTri('b_cs2', mkCS2);
  const CO = (await login('giaovien', '123456')).cookie;     // t1 — nhóm Chồi 2 (c1)
  // Nhóm c1: s1 (p1 phuhuynh), s3 (p2 phuhuynh2), s4 (p3), s5 (p4 ph.lan), s6 (p5 ph.minh).
  const P2 = (await login('phuhuynh2', '123456')).cookie;    // mẹ/bố bé s3 — ĐƯỢC chọn
  const P4 = (await login('ph.lan', '123456')).cookie;       // bé s5 — ĐƯỢC chọn
  const P5 = (await login('ph.minh', '123456')).cookie;      // bé s6 — cùng nhóm, KHÔNG được chọn
  const P1 = (await login('phuhuynh', '123456')).cookie;     // bé s1 — cùng nhóm, KHÔNG được chọn
  const P7 = (await login('ph.trang', '123456')).cookie;     // bé s9 — nhóm c4
  check('đối chứng — đăng nhập đủ tài khoản', [BGH, CS2, CO, P2, P4, P5, P1, P7].every(Boolean));

  // =========================================================================
  console.log('\n[1] Ghim / bỏ ghim — chỉ quản trị');
  {
    const ghimSan = doc("SELECT id, pinned FROM notifications WHERE pinned = 1").map(r => r.id);
    const tao = await req('POST', '/api/notifications', {
      cookie: BGH, body: { title: 'Lịch nghỉ Tết Đ260b', body: 'Trường nghỉ từ 25/01.', category: 'Nhà trường', audience: 'all', pinned: true },
    });
    check('quản trị tạo thông báo kèm "Ghim lên đầu" → 201, đã ghim', tao.status === 201 && tao.data?.pinned === true, tao.data);
    const dauP7 = (await ds(P7))[0];
    check('…phụ huynh thấy tin ghim đứng đầu danh sách', dauP7 && dauP7.pinned, dauP7 && dauP7.title);

    const coGhim = await req('POST', '/api/notifications', {
      cookie: CO, body: { title: 'Cô muốn ghim', body: 'x', audience: 'class', pinned: true },
    });
    check('cô tạo thông báo kèm pinned → 403', coGhim.status === 403, coGhim.status);
    check('…và không có bản ghi nào được tạo', doc("SELECT COUNT(*) AS n FROM notifications WHERE title = 'Cô muốn ghim'")[0].n === 0);

    const cuaCo = await req('POST', '/api/notifications', {
      cookie: CO, body: { title: 'Họp phụ huynh nhóm Chồi 2', body: 'Thứ Sáu 16h30.', audience: 'class' },
    });
    check('đối chứng — cô gửi được thông báo cho nhóm', cuaCo.status === 201 && cuaCo.data?.pinned === false, cuaCo.data);
    const coSuaGhim = await req('PUT', `/api/notifications/${cuaCo.data.id}`, { cookie: CO, body: { pinned: true } });
    check('cô gửi pinned khi sửa tin của chính mình → 403', coSuaGhim.status === 403, coSuaGhim.status);
    check('…tin vẫn chưa ghim', doc('SELECT pinned FROM notifications WHERE id = ?', cuaCo.data.id)[0].pinned === 0);

    const qtGhim = await req('PUT', `/api/notifications/${cuaCo.data.id}`, { cookie: BGH, body: { pinned: true } });
    check('quản trị ghim tin của cô → 200', qtGhim.status === 200 && qtGhim.data?.pinned === true, qtGhim.data);
    const tinP2 = (await ds(P2)).find(n => n.id === cuaCo.data.id);
    check('…phụ huynh trong nhóm thấy tin đã ghim', tinP2 && tinP2.pinned === true, tinP2);
    check('…ghim không phải sửa nội dung: KHÔNG có dấu "đã chỉnh sửa"', tinP2 && !tinP2.daSua, tinP2);
    check('…nhật ký thao tác ghi "notification-pin"',
      doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notification-pin' AND target = ?", cuaCo.data.id)[0]?.n === 1);

    const cs2 = await req('PUT', `/api/notifications/${cuaCo.data.id}`, { cookie: CS2, body: { pinned: false } });
    check('quản lý cơ sở 2 bỏ ghim tin nhóm của cơ sở 1 → 403', cs2.status === 403, cs2.status);

    // Tin TOÀN TRƯỜNG đứng đầu danh sách của mọi gia đình ba cơ sở: chỉ ban giám
    // hiệu (quản trị không khoá cơ sở) ghim / bỏ ghim được.
    const cs2BoGhimAll = await req('PUT', `/api/notifications/${tao.data.id}`, { cookie: CS2, body: { pinned: false } });
    check('quản lý cơ sở 2 bỏ ghim tin toàn trường → 403', cs2BoGhimAll.status === 403, cs2BoGhimAll.status);
    check('…tin toàn trường vẫn ghim', doc('SELECT pinned FROM notifications WHERE id = ?', tao.data.id)[0].pinned === 1);
    const cs2TaoGhimAll = await req('POST', '/api/notifications', {
      cookie: CS2, body: { title: 'Cơ sở 2 ghim toàn trường', body: 'x', category: 'Nhà trường', audience: 'all', pinned: true },
    });
    check('quản lý cơ sở 2 tạo tin toàn trường kèm ghim → 403', cs2TaoGhimAll.status === 403, cs2TaoGhimAll.status);
    check('…và không có bản ghi nào được tạo', doc("SELECT COUNT(*) AS n FROM notifications WHERE title = 'Cơ sở 2 ghim toàn trường'")[0].n === 0);
    const cs2TaoGhimNhom = await req('POST', '/api/notifications', {
      cookie: CS2, body: { title: 'Nhóm Mầm 1 họp phụ huynh', body: 'x', audience: 'class', classId: 'c3', pinned: true },
    });
    check('đối chứng — quản lý cơ sở 2 ghim được tin của nhóm trong cơ sở mình', cs2TaoGhimNhom.status === 201 && cs2TaoGhimNhom.data?.pinned === true, cs2TaoGhimNhom.data);
    const cs2BoGhimNhom = await req('PUT', `/api/notifications/${cs2TaoGhimNhom.data?.id}`, { cookie: CS2, body: { pinned: false } });
    check('…và bỏ ghim được tin đó', cs2BoGhimNhom.status === 200 && cs2BoGhimNhom.data?.pinned === false, cs2BoGhimNhom.data);

    const boGhim = await req('PUT', `/api/notifications/${cuaCo.data.id}`, { cookie: BGH, body: { pinned: false } });
    check('quản trị bỏ ghim → 200, hết ghim', boGhim.status === 200 && boGhim.data?.pinned === false, boGhim.data);
    check('…nhật ký ghi "notification-unpin"',
      doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notification-unpin' AND target = ?", cuaCo.data.id)[0]?.n === 1);
    const hong = await req('PUT', `/api/notifications/${cuaCo.data.id}`, { cookie: BGH, body: { pinned: 'có' } });
    check('giá trị ghim lạ → 400', hong.status === 400, hong.status);

    const sau = doc('SELECT id FROM notifications WHERE pinned = 1 AND id != ?', tao.data.id).map(r => r.id);
    check('tin cũ không bị đổi gì: đúng các tin ghim sẵn vẫn ghim', JSON.stringify(sau.sort()) === JSON.stringify(ghimSan.sort()), { sau, ghimSan });
  }

  // =========================================================================
  console.log('\n[2] Bấm vào thông báo nào cũng mở được đúng màn');
  {
    // Tin MỚI: đường gửi tự động thật — văn phòng lưu lịch sinh hoạt.
    const tt = await req('GET', '/api/timetable?classId=c1', { cookie: BGH });
    check('đối chứng — đọc được lịch sinh hoạt nhóm c1', tt.status === 200, tt.status);
    const luu = await req('PUT', '/api/timetable/c1', { cookie: BGH, body: { periodTimes: tt.data.periodTimes, days: tt.data.days } });
    check('đối chứng — văn phòng lưu lịch sinh hoạt', luu.status === 200, luu.data);
    const tinLich = (await ds(P2)).find(n => /^Lịch sinh hoạt nhóm .+ vừa được cập nhật$/.test(n.title));
    check('tin "Lịch sinh hoạt… vừa được cập nhật" mở thẳng #/timetable/lich', tinLich && tinLich.lienKet === '#/timetable/lich', tinLich);
    check('…và liên kết được GHI ở bảng phụ (không phải suy)',
      tinLich && doc('SELECT lienKet FROM notification_lien_ket WHERE notificationId = ?', tinLich.id)[0]?.lienKet === '#/timetable/lich');

    // Gọi thẳng `guiChoNhom` như routes/albums.js gọi khi đăng album công khai.
    const tb = await import(pathToFileURL(path.join(GOC, 'lib/thong-bao.js')).href);
    ghi("INSERT INTO albums (id, classId, title, date, description, createdBy) VALUES ('al-d260b', 'c1', 'Trung thu nhóm Chồi', '2026-10-01', '', 't1')");
    const maAlbum = tb.guiChoNhom(['c1'], { title: 'Album mới: Trung thu nhóm Chồi', body: 'Cô vừa đăng ảnh.', category: 'Nhóm lớp', createdBy: 't1', hash: '#/albums/al-d260b' });
    check('guiChoNhom ghi liên kết cho tin album', maAlbum.length === 1
      && doc('SELECT lienKet FROM notification_lien_ket WHERE notificationId = ?', maAlbum[0])[0]?.lienKet === '#/albums/al-d260b');
    check('…phụ huynh nhận lienKet = #/albums/<mã album>', (await ds(P2)).find(n => n.id === maAlbum[0])?.lienKet === '#/albums/al-d260b');

    // Tin CŨ đã nằm trong máy của trường: không có dòng liên kết.
    const cu = (id, title, aud) => ghi(`INSERT INTO notifications (id, title, body, category, audience, createdBy, createdAt, pinned)
      VALUES (?, ?, 'x', 'Khác', ?, 't1', ?, 0)`, id, title, aud, new Date().toISOString());
    cu('nt-cu-album', 'Album mới: Trung thu nhóm Chồi', 'c1');
    cu('nt-cu-them', 'Album "Trung thu nhóm Chồi" có thêm ảnh', 'c1');
    cu('nt-cu-mat', 'Album mới: Album đã gỡ', 'c1');
    cu('nt-cu-menu', 'Thực đơn từ 23/11 đến 27/11 đã có', 'c1');
    cu('nt-cu-menu2', 'Thực đơn tuần từ 30/11 đã có', 'c1');
    cu('nt-cu-tay', 'Mai nhóm mình chơi với nước', 'c1');
    const dsP2 = await ds(P2);
    const lk = (id) => (dsP2.find(n => n.id === id) || {}).lienKet;
    check('tin cũ "Album mới: …" suy ra đúng album của nhóm', lk('nt-cu-album') === '#/albums/al-d260b', lk('nt-cu-album'));
    check('tin cũ "Album … có thêm ảnh" cũng vậy', lk('nt-cu-them') === '#/albums/al-d260b', lk('nt-cu-them'));
    check('album không còn thì mở danh sách Album', lk('nt-cu-mat') === '#/albums', lk('nt-cu-mat'));
    check('tin cũ "Thực đơn từ 23/11 đến 27/11 đã có" mở #/menu', lk('nt-cu-menu') === '#/menu', lk('nt-cu-menu'));
    check('tin cũ "Thực đơn tuần từ … đã có" mở #/menu', lk('nt-cu-menu2') === '#/menu', lk('nt-cu-menu2'));
    check('tin gõ tay vẫn KHÔNG có liên kết (mở hộp chi tiết)', lk('nt-cu-tay') === undefined, lk('nt-cu-tay'));
    check('suy lúc đọc, KHÔNG ghi gì vào bảng', doc("SELECT COUNT(*) AS n FROM notification_lien_ket WHERE notificationId LIKE 'nt-cu-%'")[0].n === 0);

    // Khảo sát: liên kết chỉ ghi MỘT lần (trước đây chính route khảo sát chèn).
    const ks = await req('POST', '/api/surveys', { cookie: CO, body: { title: 'Giờ đón bé Đ260b', deadline: '2030-01-01', audience: 'class', questions: CAU_HOI } });
    check('đối chứng — cô tạo khảo sát nhóm', ks.status === 201, ks.data);
    const tinKs = (await ds(P2)).find(n => n.title === 'Khảo sát mới: Giờ đón bé Đ260b');
    check('thông báo khảo sát vẫn mở thẳng khảo sát', tinKs && tinKs.lienKet === `#/surveys/${ks.data.id}`, tinKs);
  }

  // =========================================================================
  console.log('\n[3] Phạm vi gửi của cô — không còn toàn trường');
  {
    const tb = await req('POST', '/api/notifications', { cookie: CO, body: { title: 'Cô gửi cả trường', body: 'x', audience: 'all' } });
    check('cô gửi thông báo "toàn trường" → 403', tb.status === 403, tb.status);
    const ks = await req('POST', '/api/surveys', { cookie: CO, body: { title: 'Cô hỏi cả trường', deadline: '2030-01-01', audience: 'all', questions: CAU_HOI } });
    check('cô tạo khảo sát "toàn trường" → 403', ks.status === 403, ks.status);
    check('…không bản ghi nào được tạo', doc("SELECT COUNT(*) AS n FROM notifications WHERE title = 'Cô gửi cả trường'")[0].n === 0
      && doc("SELECT COUNT(*) AS n FROM surveys WHERE title = 'Cô hỏi cả trường'")[0].n === 0);
    const qtTb = await req('POST', '/api/notifications', { cookie: BGH, body: { title: 'Cả trường Đ260b', body: 'x', audience: 'all' } });
    check('quản trị vẫn gửi thông báo toàn trường', qtTb.status === 201 && qtTb.data?.audience === 'all', qtTb.data);
    const qtKs = await req('POST', '/api/surveys', { cookie: BGH, body: { title: 'Cả trường hỏi Đ260b', deadline: '2030-01-01', audience: 'all', questions: CAU_HOI } });
    check('quản trị vẫn tạo khảo sát toàn trường', qtKs.status === 201 && qtKs.data?.audience === 'all', qtKs.data);
    check('…nhà nhóm c4 thấy cả hai', (await ds(P7)).some(n => n.id === qtTb.data.id) && (await dsKs(P7)).some(s => s.id === qtKs.data.id));
  }

  // =========================================================================
  console.log('\n[4] Cô chọn 2 gia đình — chỉ 2 nhà ấy thấy thông báo');
  let maTb;
  {
    const truoc = { p2: (await huyHieu(P2)).thongbao || 0, p5: (await huyHieu(P5)).thongbao || 0 };
    const r = await req('POST', '/api/notifications', {
      cookie: CO, body: { title: 'Nhắc riêng: mang giày thể thao', body: 'Mai bé tập thể dục.', audience: 'class', nguoiNhan: ['s3', 's5'] },
    });
    check('cô gửi cho 2 gia đình tích chọn → 201', r.status === 201, r.data);
    maTb = r.data?.id;
    check('…lưu đúng 2 bé nhận', JSON.stringify(doc('SELECT studentId FROM notification_nguoi_nhan WHERE notificationId = ? ORDER BY studentId', maTb).map(x => x.studentId)) === '["s3","s5"]');
    check('gia đình bé s3 thấy trong danh sách', (await ds(P2)).some(n => n.id === maTb));
    check('gia đình bé s5 thấy trong danh sách', (await ds(P4)).some(n => n.id === maTb));
    check('gia đình bé s6 (cùng nhóm, không chọn) KHÔNG thấy', !(await ds(P5)).some(n => n.id === maTb));
    check('gia đình bé s1 (cùng nhóm, không chọn) KHÔNG thấy', !(await ds(P1)).some(n => n.id === maTb));
    const tinCo = (await ds(CO)).find(n => n.id === maTb);
    check('cô vẫn thấy tin, kèm "2 gia đình"', tinCo && tinCo.soBeNhan === 2, tinCo);
    check('quản trị vẫn thấy tin', (await ds(BGH)).some(n => n.id === maTb));
    check('phụ huynh không nhận danh sách người nhận', !('soBeNhan' in ((await ds(P2)).find(n => n.id === maTb) || {})));

    const sau = { p2: (await huyHieu(P2)).thongbao || 0, p5: (await huyHieu(P5)).thongbao || 0 };
    check('huy hiệu chuông: nhà được chọn tăng 1', sau.p2 === truoc.p2 + 1, { truoc, sau });
    check('huy hiệu chuông: nhà không được chọn KHÔNG đổi', sau.p5 === truoc.p5, { truoc, sau });

    const docLen = await req('POST', `/api/notifications/${maTb}/read`, { cookie: P5 });
    check('nhà không được chọn mở tin bằng mã → 403', docLen.status === 403, docLen.status);
    await req('POST', '/api/notifications/read-all', { cookie: P5 });
    const p5Id = doc("SELECT id FROM users WHERE username = 'ph.minh'")[0].id;
    check('"Đọc tất cả" của nhà không được chọn KHÔNG chạm tới tin này',
      doc('SELECT COUNT(*) AS n FROM notification_reads WHERE notificationId = ? AND userId = ?', maTb, p5Id)[0].n === 0);
    check('đối chứng — nhà được chọn đánh dấu đọc được', (await req('POST', `/api/notifications/${maTb}/read`, { cookie: P2 })).status === 200);

    // Tin đẩy: cùng luật. Bật đẩy giả cho bốn tài khoản rồi hỏi danh sách nhận.
    const id = (u) => doc('SELECT id FROM users WHERE username = ?', u)[0].id;
    for (const u of ['phuhuynh2', 'ph.lan', 'ph.minh', 'giaovien']) {
      ghi(`INSERT OR REPLACE INTO push_dang_ky (endpoint, userId, p256dh, auth, taoLuc, loiCuoi)
           VALUES (?, ?, 'p', 'a', ?, '')`, `https://day.invalid/${u}`, id(u), new Date().toISOString());
    }
    const tbLib = await import(pathToFileURL(path.join(GOC, 'lib/thong-bao.js')).href);
    const nhanRieng = tbLib.nguoiNhanCua('c1', tbLib.beNhanRieng('notifications', maTb));
    check('tin đẩy của tin gửi riêng: tới 2 nhà được chọn và cô của nhóm',
      nhanRieng.includes(id('phuhuynh2')) && nhanRieng.includes(id('ph.lan')) && nhanRieng.includes(id('giaovien')), nhanRieng);
    check('…KHÔNG tới nhà không được chọn', !nhanRieng.includes(id('ph.minh')), nhanRieng);
    check('đối chứng — tin cả nhóm vẫn tới nhà ấy', tbLib.nguoiNhanCua('c1').includes(id('ph.minh')));
    ghi("DELETE FROM push_dang_ky WHERE endpoint LIKE 'https://day.invalid/%'");
  }

  // =========================================================================
  console.log('\n[5] Danh sách gia đình không hợp lệ');
  {
    const gui = (nguoiNhan, cookie = CO, them = {}) => req('POST', '/api/notifications', {
      cookie, body: { title: 'Thử người nhận', body: 'x', audience: 'class', nguoiNhan, ...them },
    });
    const khac = await gui(['s7']);
    check('cô chọn bé nhóm khác → 400/403', khac.status === 400 || khac.status === 403, khac.status);
    const tron = await gui(['s3', 's7']);
    check('lẫn một bé nhóm khác → 400/403, không gửi nửa chừng', (tron.status === 400 || tron.status === 403)
      && doc("SELECT COUNT(*) AS n FROM notifications WHERE title = 'Thử người nhận'")[0].n === 0, tron.status);
    check('danh sách rỗng → 400 (không hiểu thành cả nhóm)', (await gui([])).status === 400);
    check('không phải danh sách → 400', (await gui('s3')).status === 400);
    check('bé không tồn tại → 400', (await gui(['s-khong-co'])).status === 400);
    const qtAll = await gui(['s3'], BGH, { audience: 'all' });
    check('chọn gia đình mà gửi toàn trường → 400', qtAll.status === 400, qtAll.status);
    const qtNhom = await gui(['s3'], BGH, { classId: 'c1', title: 'Quản trị gửi riêng s3' });
    check('quản trị chọn gia đình trong một nhóm → 201', qtNhom.status === 201, qtNhom.data);
    check('…chỉ nhà bé s3 thấy', (await ds(P2)).some(n => n.id === qtNhom.data?.id) && !(await ds(P4)).some(n => n.id === qtNhom.data?.id));
    const cs2 = await gui(['s3'], CS2, { classId: 'c1' });
    check('quản lý cơ sở 2 chọn gia đình nhóm cơ sở 1 → 403', cs2.status === 403, cs2.status);
  }

  // =========================================================================
  console.log('\n[6] Khảo sát gửi riêng 2 gia đình');
  {
    const truoc = { p2: (await huyHieu(P2)).khaosat || 0, p5: (await huyHieu(P5)).khaosat || 0 };
    const r = await req('POST', '/api/surveys', {
      cookie: CO, body: { title: 'Riêng: đón muộn thứ Sáu', deadline: '2030-01-01', audience: 'class', questions: CAU_HOI, nguoiNhan: ['s3', 's5'] },
    });
    check('cô tạo khảo sát cho 2 gia đình → 201', r.status === 201, r.data);
    const ma = r.data?.id;
    check('…trả về "gửi riêng 2 gia đình" cho cô', r.data?.soBeNhan === 2, r.data);
    check('nhà bé s3 thấy trong danh sách khảo sát', (await dsKs(P2)).some(s => s.id === ma));
    check('nhà bé s6 KHÔNG thấy trong danh sách khảo sát', !(await dsKs(P5)).some(s => s.id === ma));
    const ct = await req('GET', `/api/surveys/${ma}`, { cookie: P5 });
    check('nhà bé s6 mở khảo sát bằng mã → 404', ct.status === 404, ct.status);
    const tl = await req('POST', `/api/surveys/${ma}/respond`, { cookie: P5, body: { answers: { q1: 'Có' } } });
    check('nhà bé s6 trả lời khảo sát → 403', tl.status === 403, tl.status);
    check('…không phiếu nào được ghi', doc('SELECT COUNT(*) AS n FROM survey_responses WHERE surveyId = ?', ma)[0].n === 0);
    const tl7 = await req('POST', `/api/surveys/${ma}/respond`, { cookie: P7, body: { answers: { q1: 'Có' } } });
    check('nhà nhóm khác trả lời → 404 như cũ', tl7.status === 404, tl7.status);

    const sau = { p2: (await huyHieu(P2)).khaosat || 0, p5: (await huyHieu(P5)).khaosat || 0 };
    check('huy hiệu khảo sát: nhà được chọn tăng 1, nhà không được chọn không đổi',
      sau.p2 === truoc.p2 + 1 && sau.p5 === truoc.p5, { truoc, sau });

    const tinKs = (await ds(P2)).find(n => n.title === 'Khảo sát mới: Riêng: đón muộn thứ Sáu');
    check('thông báo "Khảo sát mới" tới nhà được chọn, kèm liên kết', tinKs && tinKs.lienKet === `#/surveys/${ma}`, tinKs);
    check('…và KHÔNG tới nhà không được chọn', !(await ds(P5)).some(n => n.title === 'Khảo sát mới: Riêng: đón muộn thứ Sáu'));

    const kq = await req('GET', `/api/surveys/${ma}`, { cookie: CO });
    const chua = (kq.data?.chuaTraLoi || []).map(b => b.studentId).sort();
    check('cô xem: "chưa trả lời" chỉ gồm 2 bé được gửi', JSON.stringify(chua) === '["s3","s5"]', chua);
    check('…mẫu số là số gia đình được gửi', kq.data?.soBeNhan === 2, kq.data?.soBeNhan);
    const p2Tl = await req('POST', `/api/surveys/${ma}/respond`, { cookie: P2, body: { answers: { q1: 'Có' } } });
    check('nhà được chọn trả lời được', p2Tl.status === 201, p2Tl.data);
    check('…phiếu ghi kèm đúng bé được gửi', doc('SELECT studentId FROM survey_responses WHERE surveyId = ?', ma)[0]?.studentId === 's3');
    const kq2 = await req('GET', `/api/surveys/${ma}`, { cookie: CO });
    check('…"chưa trả lời" còn đúng bé s5', JSON.stringify((kq2.data?.chuaTraLoi || []).map(b => b.studentId)) === '["s5"]', kq2.data?.chuaTraLoi);

    const sai = await req('POST', '/api/surveys', {
      cookie: CO, body: { title: 'Riêng sai', deadline: '2030-01-01', audience: 'class', questions: CAU_HOI, nguoiNhan: ['s7'] },
    });
    check('khảo sát chọn bé nhóm khác → 400/403', sai.status === 400 || sai.status === 403, sai.status);

    const caNhom = await req('POST', '/api/surveys', { cookie: CO, body: { title: 'Cả nhóm Đ260b', deadline: '2030-01-01', audience: 'class', questions: CAU_HOI } });
    check('đối chứng — khảo sát cả nhóm (không chọn ai) vẫn tới nhà bé s6', caNhom.status === 201 && (await dsKs(P5)).some(s => s.id === caNhom.data.id));

    // Cùng ngày, cô gửi khảo sát CÙNG TÊN cho cả nhóm: tin gửi riêng 2 nhà lúc nãy
    // không được tính là "đã báo cả nhóm hôm nay".
    const caNhomCungTen = await req('POST', '/api/surveys', {
      cookie: CO, body: { title: 'Riêng: đón muộn thứ Sáu', deadline: '2030-01-01', audience: 'class', questions: CAU_HOI },
    });
    check('khảo sát cùng tên cho cả nhóm → 201', caNhomCungTen.status === 201, caNhomCungTen.data);
    const tinCaNhom = (await ds(P5)).find(n => n.title === 'Khảo sát mới: Riêng: đón muộn thứ Sáu');
    check('…nhà KHÔNG được chọn lần trước nay nhận thông báo "Khảo sát mới", mở đúng khảo sát cả nhóm',
      tinCaNhom && tinCaNhom.lienKet === `#/surveys/${caNhomCungTen.data?.id}`, tinCaNhom);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
