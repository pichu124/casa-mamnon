// Bài canh: PHIÊN ĐĂNG NHẬP ĐÃ HẾT THÌ MÁY ĐÓ THÔI NHẬN TIN VỀ BÉ.
//
// Chạy bằng:  node test/het-phien-thoi-day.test.mjs
//
// VÌ SAO CÓ BÀI NÀY (Đ255, chủ dự án duyệt 13/11/2026)
//
// Phiên đăng nhập hết hạn cố định sau 30 ngày. Bấm Đăng xuất thì máy chủ xoá
// đăng ký đẩy của máy đó (Đ252), nhưng phiên TỰ hết hạn — hay bị đá vì đổi
// mật khẩu ở máy khác — thì dòng `push_dang_ky` còn nguyên, và máy chủ vẫn gửi
// tiêu đề cùng nội dung tin về bé tới một máy không còn ai đăng nhập: điện
// thoại đã cho người khác, đã mất.
//
// Im hẳn cũng không được: phiên cố định 30 ngày nghĩa là MỌI gia đình cứ 30
// ngày hết phiên một lần, im thì họ không bao giờ biết phải mở app. Nên máy
// hết phiên nhận ĐÚNG MỘT tin nhắc chung, không tên bé, không nội dung, rồi
// mới im cho tới khi đăng nhập lại trên chính máy đó.
//
//   [1] Bật thông báo qua đường thật: đăng ký nhớ nó thuộc phiên nào.
//   [2] Mọi máy còn phiên: nhận tin đầy đủ như cũ.
//   [3] Phiên hết hạn: thôi tin về bé, đúng một tin nhắc; máy khác không đổi.
//   [4] Hai tin gửi sát nhau vẫn chỉ một tin nhắc.
//   [5] Đăng nhập lại trên máy đó: app nối lại, tin đầy đủ về lại.
//   [6] Bị đá vì đổi / đặt lại mật khẩu: xử như phiên hết hạn.
//   [7] Đăng ký có từ trước bản này (chưa nối phiên nào).
//   [8] Đăng xuất, khoá tài khoản, lỗi dịch vụ đẩy, hạn chờ, đổi khoá: như cũ.
//
// Phần giao diện (app có tự nối lại khi mở và khi đăng nhập hay không) nằm ở
// `test/dong-bo-day-giao-dien.test.mjs`.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('het-phien-thoi-day');
sinhDuLieu(DIR);
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4809), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const NGAY = 24 * 3600 * 1000;
const PHUT = 60 * 1000;

// Tin thật về một bé, và tin nhắc chung mà máy hết phiên được nhận thay vào.
const TIN = { tieuDe: 'Nhật ký của Nguyễn Bảo An', noiDung: 'Bảo An ăn hết suất, ngủ trưa 90 phút', hash: '#/nhatky/s1' };
const NHAC = {
  tieuDe: 'CASA Mầm non',
  noiDung: 'Có tin mới từ nhà trường. Mở app và đăng nhập lại để xem và tiếp tục nhận thông báo.',
  hash: '#/',
};
const laThat = (g) => g.than.tieuDe === TIN.tieuDe && g.than.noiDung === TIN.noiDung && g.than.hash === TIN.hash;
const laNhac = (g) => g.than.tieuDe === NHAC.tieuDe && g.than.noiDung === NHAC.noiDung && g.than.hash === NHAC.hash;
const toi = (ds, endpoint) => ds.filter(g => g.endpoint === endpoint);

// Đọc và sửa thẳng bảng: thứ đang canh là dòng nào CÒN, nối với phiên nào.
function doc(sql, ...ts) {
  const c = new Database(CSDL, { readonly: true });
  try { return c.prepare(sql).all(...ts); } finally { c.close(); }
}
function ghi(sql, ...ts) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).run(...ts); } finally { c.close(); }
}
const coBangNoi = () => doc("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'push_dang_ky_phien'").length === 1;
const noi = (endpoint) => (coBangNoi()
  ? doc('SELECT phienTaoLuc, daNhac FROM push_dang_ky_phien WHERE endpoint = ?', endpoint)[0] || null
  : null);
const soDong = (bang) => (bang === 'push_dang_ky_phien' && !coBangNoi() ? -1 : doc(`SELECT COUNT(*) AS n FROM ${bang}`)[0].n);
const chuCua = (endpoint) => (doc('SELECT userId FROM push_dang_ky WHERE endpoint = ?', endpoint)[0] || {}).userId || null;
const maPhien = (cookie) => cookie.split('=')[1];
const taoLucCua = (cookie) => (doc('SELECT createdAt FROM sessions WHERE token = ?', maPhien(cookie))[0] || {}).createdAt || null;

// Lùi tuổi của một phiên, như thể người ấy đăng nhập (và bật thông báo) từ
// `tuoi` mili giây trước. Dòng nối của máy lùi theo cùng mốc: thứ đang thử là
// "phiên của máy này ĐÃ QUÁ HẠN", không phải "không tìm thấy phiên".
function luiPhien(cookie, endpoint, tuoi) {
  const moc = Date.now() - tuoi;
  ghi('UPDATE sessions SET createdAt = ? WHERE token = ?', moc, maPhien(cookie));
  if (endpoint && coBangNoi()) ghi('UPDATE push_dang_ky_phien SET phienTaoLuc = ? WHERE endpoint = ?', moc, endpoint);
}
// Đăng ký có từ TRƯỚC bản này: chỉ có dòng `push_dang_ky`, chưa nối phiên nào.
function dangKyDoiCu(userId, endpoint) {
  ghi(`INSERT INTO push_dang_ky (endpoint, userId, p256dh, auth, taoLuc, loiCuoi) VALUES (?, ?, 'k', 'k', ?, '')`,
    endpoint, userId, new Date().toISOString());
}

const dangKyMay = (cookie, endpoint) => req('POST', '/api/push/dang-ky', {
  cookie, body: { subscription: { endpoint, keys: { p256dh: 'khoa-thu', auth: 'khoa-thu' } } },
});
const dongBo = (cookie, body) => req('POST', '/api/push/dong-bo', { cookie, body });

// ĐƯỜNG GỬI. Chạy ngoài tiến trình này, trên cùng cơ sở dữ liệu với máy chủ
// thử: gói `web-push` bị thay bằng bản ghi lại lời gọi — cùng cách với
// `test/dang-xuat-huy-day.test.mjs` — nên không có gì đi ra mạng. `than` là
// đoạn mã chạy trong một hàm async, ghi kết quả vào `kq`; `D` là tham số.
function chay(than, D = {}) {
  const ra = execFileSync('node', ['-e', `
    const webpush = require('web-push');
    let thay = [];
    const D = JSON.parse(process.argv[1]);
    // endpoint → mã lỗi mà dịch vụ đẩy giả trả về cho máy đó.
    const HONG = D.hong || {};
    webpush.sendNotification = (sub, than, tuyChon) => {
      thay.push({ endpoint: sub.endpoint, than: JSON.parse(than), chuoi: than, timeout: tuyChon && tuyChon.timeout, TTL: tuyChon && tuyChon.TTL });
      const ma = HONG[sub.endpoint];
      if (ma) { const e = new Error('dịch vụ đẩy trả ' + ma); e.statusCode = ma; return Promise.reject(e); }
      return Promise.resolve({ statusCode: 201 });
    };
    const db = require('./lib/db');
    const day = require('./lib/day');
    const auth = require('./lib/auth');
    // Các đường gửi hàng loạt không chờ ai — đợi tới khi hàng đợi rỗng hẳn.
    const lang = async () => {
      for (let i = 0; i < 300; i++) {
        await new Promise(r => setTimeout(r, 10));
        const t = day.trangThaiHangDoi();
        if (!t.dangChay && !t.dangCho) return;
      }
    };
    const lay = () => { const r = thay; thay = []; return r; };
    (async () => {
      const kq = {};
      ${than}
      await lang();
      kq.hangDoi = day.trangThaiHangDoi();
      process.stdout.write(JSON.stringify(kq));
      db.close();
    })();
  `, JSON.stringify({ tin: TIN, ...D })], { cwd: GOC, encoding: 'utf8', env: { ...process.env, DATA_DIR: DIR } });
  return JSON.parse(ra);
}
// Gửi `soLan` tin thật liên tiếp cho một người, trả về mọi lượt gọi dịch vụ đẩy.
const guiCho = (userId, soLan = 1, them = {}) => chay(`
  kq.kq = [];
  for (let i = 0; i < D.soLan; i++) kq.kq.push(await day.guiChoNguoi(D.userId, D.tin));
  kq.goi = lay();
`, { userId, soLan, ...them });

const E1 = 'https://day.example.invalid/ha-may-1';
const E2 = 'https://day.example.invalid/ha-may-2';
const E3 = 'https://day.example.invalid/ha-may-3';
const EA = 'https://day.example.invalid/lan-may-a';
const EB = 'https://day.example.invalid/lan-may-b';
const EL = 'https://day.example.invalid/tuan-doi-cu';
const EM = 'https://day.example.invalid/huong-doi-cu';
const EN = 'https://day.example.invalid/minh-doi-cu';
const EK = 'https://day.example.invalid/minh-may-hong';

try {
  // =========================================================================
  console.log('\n[1] Bật thông báo qua đường đăng ký thật: máy chủ nhớ đăng ký thuộc phiên nào');
  const may1 = await login('phuhuynh', '123456');
  const may2 = await login('phuhuynh', '123456');
  {
    const a = await dangKyMay(may1.cookie, E1);
    const b = await dangKyMay(may2.cookie, E2);
    check('hai lượt đăng ký đều 200, câu trả lời giữ hình dạng { ok, soMay }',
      a.status === 200 && b.status === 200 && JSON.stringify(b.data) === '{"ok":true,"soMay":2}', [a.status, b.data]);
    check('có bảng nối đăng ký đẩy với phiên đăng nhập', coBangNoi());
    const t1 = taoLucCua(may1.cookie); const t2 = taoLucCua(may2.cookie);
    check('đối chứng — hai lần đăng nhập là hai phiên có mốc tạo khác nhau', !!t1 && !!t2 && t1 !== t2, [t1, t2]);
    check('đăng ký của máy 1 nối với ĐÚNG phiên của máy 1, chưa nhắc lần nào',
      JSON.stringify(noi(E1)) === JSON.stringify({ phienTaoLuc: t1, daNhac: 0 }), noi(E1));
    check('đăng ký của máy 2 nối với ĐÚNG phiên của máy 2',
      JSON.stringify(noi(E2)) === JSON.stringify({ phienTaoLuc: t2, daNhac: 0 }), noi(E2));
  }

  // =========================================================================
  console.log('\n[2] Cả hai máy còn phiên → cả hai nhận tin đầy đủ như cũ');
  {
    const r = guiCho('p1');
    check('mỗi máy đúng một lượt, đều là tin thật về bé',
      r.goi.length === 2 && toi(r.goi, E1).length === 1 && toi(r.goi, E2).length === 1 && r.goi.every(laThat), r.goi);
    check('và báo gửi được hai, hỏng không', r.kq[0].guiDuoc === 2 && r.kq[0].hong === 0, r.kq);
  }

  // =========================================================================
  console.log('\n[3] Phiên của máy 1 quá 30 ngày → máy 1 thôi nhận tin về bé, nhận đúng MỘT tin nhắc chung');
  {
    luiPhien(may1.cookie, E1, 30 * NGAY + PHUT);
    // Máy 2 còn mười phút nữa mới tới hạn: vẫn là phiên sống.
    luiPhien(may2.cookie, E2, 30 * NGAY - 10 * PHUT);
    const r = guiCho('p1', 3);
    const m1 = toi(r.goi, E1); const m2 = toi(r.goi, E2);
    check('ba tin thật liên tiếp: máy hết phiên KHÔNG nhận tin nào về bé', m1.filter(laThat).length === 0, m1);
    check('mà nhận đúng MỘT tin nhắc chung', m1.length === 1 && laNhac(m1[0]), m1);
    check('tin nhắc mang đúng tiêu đề, đúng câu chữ, mở app ở trang chủ',
      !!m1[0] && m1[0].than.tieuDe === 'CASA Mầm non' && m1[0].than.hash === '#/'
        && m1[0].than.noiDung === 'Có tin mới từ nhà trường. Mở app và đăng nhập lại để xem và tiếp tục nhận thông báo.', m1[0]);
    check('thân tin nhắc không có tên bé, không có nội dung, không có đường dẫn của tin thật',
      !!m1[0] && !/Bảo An|ngủ trưa|ăn hết suất|Nhật ký|nhatky/.test(m1[0].chuoi), m1[0] && m1[0].chuoi);
    check('máy 2 (còn phiên) vẫn nhận đủ cả ba tin thật', m2.length === 3 && m2.every(laThat), m2);
    // Tin nhắc KHÔNG tính vào `guiDuoc`: con số ấy là số máy nhận được TIN THẬT.
    check('mỗi lượt báo gửi được đúng một máy — tin nhắc không tính là đã gửi tin',
      r.kq.every(k => k.guiDuoc === 1 && k.hong === 0), r.kq);
    check('máy chủ ghi nhớ đã nhắc máy 1', (noi(E1) || {}).daNhac === 1, noi(E1));
    check('không đăng ký nào bị xoá', JSON.stringify(doc('SELECT endpoint FROM push_dang_ky WHERE userId = ? ORDER BY endpoint', 'p1').map(x => x.endpoint)) === JSON.stringify([E1, E2]));

    // Cùng một định nghĩa "hết hạn" với cửa đăng nhập.
    const me2 = await req('GET', '/api/auth/me', { cookie: may2.cookie });
    const me1 = await req('GET', '/api/auth/me', { cookie: may1.cookie });
    check('cửa đăng nhập cũng nói thế: máy 2 còn phiên, máy 1 đã hết', me2.status === 200 && me1.status === 401, [me2.status, me1.status]);
    // Lượt hỏi vừa rồi làm máy chủ xoá hẳn dòng phiên của máy 1.
    check('đối chứng — dòng phiên của máy 1 đã bị dọn khỏi bảng', taoLucCua(may1.cookie) === null);
    const sau = guiCho('p1', 2);
    check('phiên đã bị dọn hẳn: máy 1 vẫn im, không nhắc lần hai', toi(sau.goi, E1).length === 0, toi(sau.goi, E1));
    check('máy 2 vẫn nhận tin thật', toi(sau.goi, E2).length === 2 && sau.goi.every(laThat), sau.goi);
  }

  // =========================================================================
  console.log('\n[4] Hai tin gửi SÁT NHAU, qua mọi đường gửi → máy hết phiên vẫn chỉ một tin nhắc');
  const may3 = await login('phuhuynh', '123456');
  {
    await dangKyMay(may3.cookie, E3);
    luiPhien(may3.cookie, E3, 31 * NGAY);
    const r = chay(`
      const hai = Promise.all([day.guiChoNguoi('p1', D.tin), day.guiChoNguoi('p1', D.tin)]);
      day.guiChoGiaDinhCuaBe('s1', D.tin);
      day.guiChoNhieuNguoi(['p1'], D.tin);
      kq.kq = await hai;
      await lang();
      kq.goi = lay();
    `);
    const m3 = toi(r.goi, E3);
    check('bốn lượt gửi cùng một nhịp: máy 3 nhận đúng MỘT lượt, là tin nhắc', m3.length === 1 && laNhac(m3[0]), m3);
    check('máy 2 nhận đủ bốn tin thật', toi(r.goi, E2).length === 4 && toi(r.goi, E2).every(laThat), toi(r.goi, E2));
    check('máy 1 (đã nhắc từ trước) không nhận gì', toi(r.goi, E1).length === 0, toi(r.goi, E1));
    check('gửi xong hàng đợi rỗng', r.hangDoi.dangChay === 0 && r.hangDoi.dangCho === 0, r.hangDoi);
  }

  // =========================================================================
  console.log('\n[5] Đăng nhập lại trên chính máy đó → app nối đăng ký với phiên mới, tin đầy đủ về lại');
  const may1b = await login('phuhuynh', '123456');
  const khac = await login('phuhuynh2', '123456');
  {
    const soPush = soDong('push_dang_ky'); const soNoi = soDong('push_dang_ky_phien');
    const r = await dongBo(may1b.cookie, { endpoint: E1 });
    check('nối lại → 200 { ok: true, conDangKy: true }', r.status === 200 && JSON.stringify(r.data) === '{"ok":true,"conDangKy":true}', r);
    check('đăng ký của máy 1 nay nối với phiên MỚI, cờ đã nhắc trở về 0',
      JSON.stringify(noi(E1)) === JSON.stringify({ phienTaoLuc: taoLucCua(may1b.cookie), daNhac: 0 }), noi(E1));
    check('không dòng nào được tạo thêm', soDong('push_dang_ky') === soPush && soDong('push_dang_ky_phien') === soNoi,
      [soDong('push_dang_ky'), soDong('push_dang_ky_phien')]);
    const g = guiCho('p1');
    check('máy 1 nhận lại tin thật về bé', toi(g.goi, E1).length === 1 && laThat(toi(g.goi, E1)[0]), toi(g.goi, E1));
    check('máy 3 (chưa ai đăng nhập lại) vẫn im', toi(g.goi, E3).length === 0, toi(g.goi, E3));

    // NGƯỜI KHÁC đăng nhập trên máy 3: dòng ấy thuộc người cũ, không tự nối.
    const noiTruoc = JSON.stringify(noi(E3));
    const k = await dongBo(khac.cookie, { endpoint: E3 });
    check('người khác nối bằng địa chỉ đẩy của máy người cũ → { ok: true, conDangKy: false }',
      k.status === 200 && JSON.stringify(k.data) === '{"ok":true,"conDangKy":false}', k);
    check('đăng ký ấy vẫn thuộc người cũ, dòng nối không đổi', chuCua(E3) === 'p1' && JSON.stringify(noi(E3)) === noiTruoc, [chuCua(E3), noi(E3)]);
    const gk = guiCho('p2');
    check('và người mới không tự nhận gì trên máy đó', gk.goi.length === 0 && gk.kq[0].guiDuoc === 0, gk);

    const la = await dongBo(may1b.cookie, { endpoint: 'https://day.example.invalid/khong-co' });
    check('địa chỉ đẩy không có trong bảng → conDangKy: false', la.status === 200 && la.data.ok === true && la.data.conDangKy === false, la);
    const thieu = await dongBo(may1b.cookie, {});
    const saiKieu = await dongBo(may1b.cookie, { endpoint: { $ne: '' } });
    check('thiếu địa chỉ hoặc sai kiểu → vẫn 200, conDangKy: false',
      thieu.status === 200 && thieu.data.conDangKy === false && saiKieu.status === 200 && saiKieu.data.conDangKy === false, [thieu, saiKieu]);
    check('ba lượt ấy KHÔNG tạo dòng nào', soDong('push_dang_ky') === soPush && soDong('push_dang_ky_phien') === soNoi,
      [soDong('push_dang_ky'), soDong('push_dang_ky_phien')]);
    const chuaDn = await dongBo(null, { endpoint: E1 });
    check('chưa đăng nhập → 401', chuaDn.status === 401, chuaDn.status);

    // Người mới TỰ bấm "Bật trên máy này" thì máy ấy mới là của họ.
    const bat = await dangKyMay(khac.cookie, E3);
    check('người mới bấm Bật trên máy đó → đăng ký chuyển sang họ, nối với phiên của họ',
      bat.status === 200 && chuCua(E3) === 'p2'
        && JSON.stringify(noi(E3)) === JSON.stringify({ phienTaoLuc: taoLucCua(khac.cookie), daNhac: 0 }), [chuCua(E3), noi(E3)]);
    const gm = guiCho('p2'); const gc = guiCho('p1');
    check('tin của người mới tới máy đó; tin của người cũ thì không còn tới',
      toi(gm.goi, E3).length === 1 && laThat(toi(gm.goi, E3)[0]) && toi(gc.goi, E3).length === 0, [gm.goi, gc.goi]);
  }

  // =========================================================================
  console.log('\n[6] Bị đá vì đổi mật khẩu ở máy khác → máy bị đá xử như phiên hết hạn');
  {
    const a = await login('ph.lan', '123456');
    const b = await login('ph.lan', '123456');
    await dangKyMay(a.cookie, EA); await dangKyMay(b.cookie, EB);
    const doi = await req('POST', '/api/auth/change-password', { cookie: a.cookie, body: { currentPassword: '123456', newPassword: 'matkhau2026' } });
    const meB = await req('GET', '/api/auth/me', { cookie: b.cookie });
    check('đối chứng — đổi mật khẩu ở máy A đá máy B ra', doi.status === 200 && meB.status === 401, [doi.status, meB.status]);
    const r = guiCho('p4', 2);
    check('máy A (vừa đổi mật khẩu) nhận đủ hai tin thật', toi(r.goi, EA).length === 2 && toi(r.goi, EA).every(laThat), toi(r.goi, EA));
    check('máy B (bị đá) không nhận tin về bé, chỉ một tin nhắc', toi(r.goi, EB).length === 1 && laNhac(toi(r.goi, EB)[0]), toi(r.goi, EB));

    const b2 = await login('ph.lan', 'matkhau2026');
    const n = await dongBo(b2.cookie, { endpoint: EB });
    const r2 = guiCho('p4');
    check('đăng nhập lại ở máy B bằng mật khẩu mới rồi nối lại → tin thật về lại',
      n.data && n.data.conDangKy === true && toi(r2.goi, EB).length === 1 && laThat(toi(r2.goi, EB)[0]), [n.data, r2.goi]);

    // Nhà trường đặt lại mật khẩu: MỌI phiên của người ấy bị huỷ.
    const r3 = chay(`
      kq.daHuy = auth.destroyUserSessions('p4', null);
      kq.kq = [await day.guiChoNguoi('p4', D.tin), await day.guiChoNguoi('p4', D.tin)];
      kq.goi = lay();
    `);
    check('mọi phiên bị huỷ (đặt lại mật khẩu): không máy nào nhận tin về bé', r3.daHuy >= 2 && r3.goi.filter(laThat).length === 0, r3);
    check('mỗi máy đúng một tin nhắc',
      r3.goi.length === 2 && toi(r3.goi, EA).length === 1 && toi(r3.goi, EB).length === 1 && r3.goi.every(laNhac), r3.goi);
    check('và báo 0 máy nhận tin thật', r3.kq.every(k => k.guiDuoc === 0 && k.hong === 0), r3.kq);
  }

  // =========================================================================
  console.log('\n[7] Đăng ký có từ TRƯỚC bản này (chưa nối với phiên nào)');
  {
    // (i) Người ấy không còn phiên nào: xử như máy hết phiên.
    dangKyDoiCu('p3', EL);
    const r = guiCho('p3', 3);
    check('không còn phiên nào → không tin về bé, đúng một tin nhắc', r.goi.length === 1 && r.goi[0].endpoint === EL && laNhac(r.goi[0]), r.goi);
    check('máy chủ ghi nhớ đã nhắc (dòng nối mốc 0)', JSON.stringify(noi(EL)) === JSON.stringify({ phienTaoLuc: 0, daNhac: 1 }), noi(EL));

    // (ii) Còn ít nhất một phiên chưa hết hạn: gửi đầy đủ như cũ.
    dangKyDoiCu('p6', EM);
    const h = await login('ph.huong', '123456');
    const r2 = guiCho('p6', 2);
    check('còn một phiên sống → nhận tin thật như cũ, không tin nhắc nào', r2.goi.length === 2 && r2.goi.every(laThat) && r2.kq.every(k => k.guiDuoc === 1), r2);
    check('và đăng ký đời cũ không bị gắn dòng nối nào', noi(EM) === null, noi(EM));

    // (iii) Phiên duy nhất ấy quá hạn: hết gửi đầy đủ.
    luiPhien(h.cookie, null, 30 * NGAY + PHUT);
    const r3 = guiCho('p6', 2);
    check('phiên duy nhất quá hạn → thôi tin về bé, đúng một tin nhắc', r3.goi.length === 1 && laNhac(r3.goi[0]), r3.goi);

    // (iv) Đã nhắc rồi thì im cho tới khi CHÍNH MÁY ĐÓ được nối lại.
    const h2 = await login('ph.huong', '123456');
    const r4 = guiCho('p6');
    check('đăng nhập ở MÁY KHÁC không làm máy đã nhắc nhận lại tin', r4.goi.length === 0, r4.goi);
    const n = await dongBo(h2.cookie, { endpoint: EM });
    const r5 = guiCho('p6');
    check('nối lại từ chính máy đó → tin thật về lại',
      n.data && n.data.conDangKy === true && r5.goi.length === 1 && laThat(r5.goi[0]) && (noi(EM) || {}).daNhac === 0, [n.data, r5.goi, noi(EM)]);
  }

  // =========================================================================
  console.log('\n[8] Đăng xuất, tài khoản khoá, lỗi dịch vụ đẩy, hạn chờ, đổi khoá: giữ nguyên hành vi');
  {
    // ĐĂNG XUẤT kèm địa chỉ đẩy: xoá hẳn, không tin thật, không tin nhắc.
    const out = await req('POST', '/api/auth/logout', { cookie: may2.cookie, body: { endpoint: E2 } });
    check('đăng xuất kèm địa chỉ đẩy → đăng ký và dòng nối của máy đó đều mất',
      out.status === 200 && chuCua(E2) === null && noi(E2) === null, [out.status, chuCua(E2), noi(E2)]);
    const g = guiCho('p1');
    check('máy đã đăng xuất không nhận gì, kể cả tin nhắc; máy 1 vẫn nhận tin thật',
      toi(g.goi, E2).length === 0 && toi(g.goi, E1).length === 1 && laThat(toi(g.goi, E1)[0]), g.goi);

    // TÀI KHOẢN ĐÃ KHOÁ: không gửi gì, kể cả tin nhắc — và không tiêu mất lượt nhắc.
    dangKyDoiCu('p5', EN);
    const kh = chay(`
      db.update('users', 'p5', { active: false });
      kq.khoa = await day.guiChoNguoi('p5', D.tin); kq.khoaGoi = lay();
      db.update('users', 'p5', { active: true });
      kq.mo = await day.guiChoNguoi('p5', D.tin); kq.moGoi = lay();
    `);
    check('tài khoản khoá + máy hết phiên → KHÔNG lượt nào đi, kể cả tin nhắc', kh.khoaGoi.length === 0 && kh.khoa.guiDuoc === 0 && kh.khoa.hong === 0, kh);
    check('mở lại tài khoản thì tin nhắc mới đi, đúng một lần', kh.moGoi.length === 1 && laNhac(kh.moGoi[0]), kh.moGoi);

    // DỊCH VỤ ĐẨY TRẢ LỖI CHO TIN NHẮC.
    const m = await login('ph.minh', '123456');
    await dangKyMay(m.cookie, EK);
    luiPhien(m.cookie, EK, 31 * NGAY);
    ghi('UPDATE push_dang_ky_phien SET daNhac = 0 WHERE endpoint = ?', EN);
    const loi = guiCho('p5', 1, { hong: { [EK]: 500, [EN]: 410 } });
    check('tin nhắc hỏng thì tính là hỏng, không tính là gửi được', loi.kq[0].guiDuoc === 0 && loi.kq[0].hong === 2, loi.kq);
    check('lỗi 410: đăng ký bị xoá như cũ, dòng nối xoá theo', chuCua(EN) === null && noi(EN) === null, [chuCua(EN), noi(EN)]);
    const dongLoi = doc('SELECT loiCuoi FROM push_dang_ky WHERE endpoint = ?', EK)[0];
    check('lỗi 500: đăng ký còn nguyên, ghi mã lỗi như cũ', !!dongLoi && dongLoi.loiCuoi === '500', dongLoi);
    const lai = guiCho('p5', 2);
    check('tin nhắc chưa tới nơi thì lượt sau gửi lại, và tới nơi rồi thì thôi',
      lai.goi.length === 1 && lai.goi[0].endpoint === EK && laNhac(lai.goi[0]) && (noi(EK) || {}).daNhac === 1, [lai.goi, noi(EK)]);

    // HẠN CHỜ và thời gian sống của tin: tin nhắc đi cùng tham số với tin thật.
    const moi = [...guiCho('p1').goi, ...loi.goi];
    check('đối chứng — có cả tin thật lẫn tin nhắc để soi', moi.some(laThat) && moi.some(laNhac), moi.map(x => x.than.tieuDe));
    check('mọi lượt gửi đều có hạn chờ 5–60 giây và TTL 6 giờ',
      moi.every(x => typeof x.timeout === 'number' && x.timeout >= 5000 && x.timeout <= 60000 && x.TTL === 6 * 3600), moi.map(x => [x.timeout, x.TTL]));

    // ĐỔI KHOÁ: mọi máy phải TỰ bật lại — nối lại không được tạo lại dòng đã xoá.
    const dk = chay('kq.dk = day.doiKhoa();');
    check('đổi khoá → mọi đăng ký và mọi dòng nối đều bị xoá',
      dk.dk.ok === true && soDong('push_dang_ky') === 0 && soDong('push_dang_ky_phien') === 0, [dk.dk, soDong('push_dang_ky'), soDong('push_dang_ky_phien')]);
    const n = await dongBo(may1b.cookie, { endpoint: E1 });
    check('sau đổi khoá, nối lại bằng địa chỉ cũ → conDangKy: false, không tạo lại dòng nào',
      n.status === 200 && n.data.conDangKy === false && soDong('push_dang_ky') === 0 && soDong('push_dang_ky_phien') === 0,
      [n.data, soDong('push_dang_ky'), soDong('push_dang_ky_phien')]);
    const sauDoi = guiCho('p1');
    check('và không còn lượt nào đi cho tới khi máy tự bật lại', sauDoi.goi.length === 0, sauDoi.goi);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
