// Bài canh ĐẨY TIN CẢ NHÓM VỀ ĐIỆN THOẠI (Đ194 — việc 16, 17, 18).
//
// Chạy bằng:  npm run test:day-tin-nhom
//
// BA VIỆC NÀY PHẢI ĐI CÙNG MỘT ĐỢT, VÀ ĐÓ LÀ TOÀN BỘ LÝ DO BÀI NÀY GỘP CẢ BA.
//
// Tới trước đợt này, đẩy chỉ đi cho tin RIÊNG của một bé — mỗi lượt vài máy
// của bố mẹ bé đó. Việc 16 mở đẩy cho tin CẢ NHÓM và CẢ TRƯỜNG. Mở nó ra
// trước hai việc kia là app chạy thật một thời gian ở trạng thái:
//
//   • không ai chặn được số kết nối bật lên cùng lúc (việc 17); và
//   • tin mới ăn mất tin cũ trên màn hình chờ (việc 18).
//
// Cái thứ hai đáng sợ hơn vì nó IM LẶNG: trong app cả ba tin vẫn nằm đó, chỉ
// màn hình chờ của điện thoại là mất hai tin đầu, nên không ai đối chiếu ra.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('day-tin-nhom');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng E', 'e_qt');

const CSDL = path.join(DIR, 'school.db');

// MỤC [3] NẠP `lib/day.js` NGAY TRONG TIẾN TRÌNH BÀI CANH, không qua máy chủ
// thử — trần số tin gửi đồng thời là một con số nằm trong bộ nhớ của tiến
// trình đang gửi, nhìn từ ngoài qua HTTP thì không đo được.
//
// `lib/db.js` đọc DATA_DIR MỘT LẦN lúc nạp, nên phải đặt trước dòng import.
// Thiếu dòng này thì `lib/day.js` mở nhầm cơ sở dữ liệu thật của máy đang
// chạy: nó không tìm thấy đăng ký nào, `guiChoNguoi` về sớm, và phép đo đỉnh
// cao thành ra đo một hàng đợi chưa bao giờ chạy — xanh mà rỗng. Đúng loại
// "bài kiểm thử luôn đúng" mà CLAUDE.md dặn phải nêu ra.
process.env.DATA_DIR = DIR;

// Đăng ký giả, ghi thẳng vào bảng — không có trình duyệt thật thì không có
// PushSubscription thật, mà thứ đang canh là LUẬT AI NHẬN chứ không phải
// đường đăng ký (đường đó đã có bài canh riêng ở test:day-quan-tri).
function themDangKy(userId, endpoint) {
  const conn = new Database(CSDL);
  try {
    conn.prepare(`INSERT OR REPLACE INTO push_dang_ky (endpoint, userId, p256dh, auth, taoLuc, loiCuoi)
                  VALUES (?, ?, 'p256dh-gia', 'auth-gia', ?, '')`)
      .run(endpoint, userId, new Date().toISOString());
  } finally { conn.close(); }
}

function idCua(tenDangNhap) {
  const conn = new Database(CSDL);
  try {
    const r = conn.prepare('SELECT id FROM users WHERE username = ?').get(tenDangNhap);
    return r ? r.id : null;
  } finally { conn.close(); }
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4771), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d = await login('e_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('e_qt', 'quantri2026')).cookie;

  // =========================================================================
  console.log('\n[1] AI NHẬN được một tin — hai chiều của MỘT luật, không phải hai luật');
  {
    // `audienceFilter` trả lời "cho một người, những tin nào họ xem được".
    // `nguoiNhanCua` trả lời chiều ngược lại. Hai chiều của cùng một luật nên
    // phải nằm cùng một tệp; tách ra hai nơi là hai bản sẽ trôi khỏi nhau.
    const ma = fs.readFileSync(path.join(GOC, 'lib/thong-bao.js'), 'utf8');
    check('luật "ai nhận" nằm CÙNG TỆP với luật "ai xem được"',
      /function audienceFilter/.test(ma) && /function nguoiNhanCua/.test(ma));

    const p1 = idCua('phuhuynh');      // có con ở c1 và c2
    const p4 = idCua('ph.lan');        // có con s5
    const gv = idCua('giaovien');      // cô của c1
    check('đối chứng — tìm được đủ bốn tài khoản của dữ liệu mẫu',
      !!p1 && !!p4 && !!gv, `${p1} / ${p4} / ${gv}`);

    // CHƯA AI BẬT ĐẨY THÌ KHÔNG AI NHẬN — và đó là câu trả lời đúng, không
    // phải một lỗi. Hỏi cả trường rồi mới biết ai có máy là mỗi tin toàn
    // trường một lượt quét vô ích qua từng tài khoản.
    const { nguoiNhanCua } = await import(path.join(GOC, 'lib/thong-bao.js'));
    // Không nạp được kiểu ESM thì bỏ mục đo trực tiếp, các mục sau vẫn chạy.
    check('nạp được hàm để đo thẳng', typeof nguoiNhanCua === 'function');
  }

  // =========================================================================
  console.log('\n[2] KHOÁ GỘP — tin mới KHÔNG được ăn mất tin cũ trên màn hình chờ (việc 18)');
  {
    const sw = fs.readFileSync(path.join(GOC, 'public/sw.js'), 'utf8');
    const ma = sw.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

    check('màn hình chờ KHÔNG còn lấy thẳng hash làm khoá gộp',
      !/tag:\s*hash\s*,/.test(ma), (ma.match(/tag:.*/) || [])[0]);
    check('mà đọc khoá gộp do MÁY CHỦ khai',
      /goi\.gop/.test(ma) && /tag:\s*gop/.test(ma));
    // Điện thoại đã cài app đời cũ vẫn phải chạy y như trước: gói không có
    // `gop` thì lùi về `hash`, không phải rơi vào `undefined`.
    check('gói đời cũ không có khoá gộp thì LÙI VỀ hash, không thành undefined',
      /:\s*hash\s*;/.test(ma), (ma.match(/const gop = .*/) || [])[0]);

    const day = fs.readFileSync(path.join(GOC, 'lib/day.js'), 'utf8');
    const maDay = day.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    check('máy chủ gắn khoá gộp vào thân gói đẩy', /gop:\s*khoaGop\(goi\)/.test(maDay));
    check('KHÔNG KHAI THÌ MỖI TIN MỘT KHOÁ RIÊNG — gộp là thứ phải xin',
      /function khoaGop/.test(maDay) && /rieng-/.test(maDay));
  }

  // =========================================================================
  console.log('\n[3] TRẦN SỐ TIN GỬI ĐỒNG THỜI — đo bằng HÀNH VI, không bằng chữ (việc 17)');
  {
    const day = await import(path.join(GOC, 'lib/day.js'));
    check('máy chủ nói ra được trần của mình', typeof day.trangThaiHangDoi === 'function');
    const t0 = day.trangThaiHangDoi();
    check('trần là một con số dương', t0.tran >= 1, t0.tran);
    check('lúc không có việc gì thì hàng đợi rỗng',
      t0.dangChay === 0 && t0.dangCho === 0, JSON.stringify(t0));

    // Đo thật: bắn 30 lượt qua đúng cái hàng đợi ấy rồi hỏi nó đỉnh là bao
    // nhiêu. Không đo bằng cách đọc hằng số — một hằng số đúng mà hàng đợi
    // không dùng tới thì vẫn là trần giả.
    //
    // ĐỈNH PHẢI DO CHÍNH HÀNG ĐỢI GHI, không phải do bài canh đứng ngoài ngó
    // vào. Bản đầu đo bằng một đồng hồ `setInterval` 1ms và nó KHÔNG BAO GIỜ
    // thấy đỉnh: ba mươi lượt hỏng cùng một nhịp thì lời hứa của chúng là
    // microtask, chạy hết trước khi bộ hẹn giờ kịp tích một cái. Thử ngược
    // chứng minh chỗ này: gỡ hẳn trần ra mà bài vẫn xanh.
    const duong = day;
    const tran = t0.tran;

    // Đăng ký giả trỏ vào một cổng chắc chắn không ai nghe: lỗi trả về NGAY,
    // không phải chờ hết giờ mạng. Bài canh không được phụ thuộc vào Internet.
    const ai = idCua('phuhuynh');
    for (let i = 0; i < 30; i += 1) themDangKy(ai, `https://127.0.0.1:1/gia-${i}`);
    await duong.guiChoNguoi(ai, { tieuDe: 'Đo trần', noiDung: 'x', hash: '#/notifications' });

    const dinhCao = duong.trangThaiHangDoi().dinhCao;
    check('đối chứng — đã có lúc chạy nhiều lượt cùng nhau, không phải từng lượt một',
      dinhCao > 1, dinhCao);
    check('ĐỈNH CAO SỐ LƯỢT CHẠY CÙNG LÚC KHÔNG VƯỢT TRẦN',
      dinhCao <= tran, `đỉnh ${dinhCao} / trần ${tran}`);
    const t1 = duong.trangThaiHangDoi();
    check('gửi xong thì hàng đợi trả về rỗng — không rò một lượt nào',
      t1.dangChay === 0 && t1.dangCho === 0, JSON.stringify(t1));
    check('và đã có lượt phải XẾP HÀNG thật — phép đo trên không phải đo suông',
      t1.daPhaiCho > 0, t1.daPhaiCho);

    // TRẦN KHÔNG BỎ BỚT TIN NÀO. Nó xếp hàng, không vứt. Bỏ tin là mất thông
    // báo, thứ Nguyên tắc số 1 cấm.
    const day2 = fs.readFileSync(path.join(GOC, 'lib/day.js'), 'utf8');
    const ma2 = day2.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    // Soi ĐÚNG chiều vứt việc, không soi dòng khai báo: `const hangDoi = []`
    // ở đầu tệp là khai báo, không phải một lượt dọn sạch hàng đợi.
    const khong = [
      [/hangDoi\.length\s*=\s*0/, 'dọn sạch hàng đợi'],
      [/(?<!const\s)hangDoi\s*=\s*\[\]/, 'gán lại hàng đợi thành rỗng'],
      [/hangDoi\.length\s*>[^\n]*\)\s*return/, 'bỏ việc khi hàng đợi dài'],
      [/hangDoi\.splice/, 'cắt bớt giữa hàng đợi'],
    ];
    const pham = khong.filter(([re]) => re.test(ma2)).map(([, ten]) => ten);
    check('HÀNG ĐỢI CHỈ XẾP HÀNG, KHÔNG VỨT BỚT TIN NÀO', pham.length === 0, pham.join(', '));
  }

  // =========================================================================
  console.log('\n[4] TIN CẢ NHÓM ĐI TỚI ĐIỆN THOẠI, và bấm vào MỞ ĐÚNG MÀN (việc 16)');
  {
    const tb = fs.readFileSync(path.join(GOC, 'lib/thong-bao.js'), 'utf8');
    const ma = tb.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    check('ghi chuông trong app xong là ĐẨY luôn, không dừng ở bảng notifications',
      /db\.insert\('notifications', rec\);[\s\S]{0,200}dayTin\(rec/.test(ma));
    check('và đường đẩy đi qua bộ gửi nhiều người, tức qua trần',
      /guiChoNhieuNguoi/.test(ma));

    // BẤM VÀO PHẢI MỞ ĐÚNG MÀN. Bốn chỗ gửi tin cả nhóm, bốn màn khác nhau —
    // chỗ nào quên khai thì gia đình rơi vào danh sách thông báo rồi phải tự
    // dò tiếp, và tiếng chuông ấy chỉ làm phiền.
    const chos = [
      ['routes/menu.js', "#/menu", 'thực đơn tuần'],
      ['routes/albums.js', '#/albums/', 'album công khai'],
      ['routes/surveys.js', "#/surveys", 'khảo sát'],
      ['routes/timetable.js', "#/timetable", 'lịch sinh hoạt'],
      ['routes/notifications.js', "#/notifications", 'thông báo nhà trường'],
    ];
    for (const [tep, man, ten] of chos) {
      const t = fs.readFileSync(path.join(GOC, tep), 'utf8');
      check(`${ten}: có khai màn cần mở (${man})`, t.includes(man), tep);
    }

    // Bé ĐÃ THÔI HỌC thì gia đình không nhận tin mới của nhóm cũ — thiếu vế
    // này là nhà đã chuyển trường vẫn kêu chuông theo lịch của nhóm cũ.
    check('lọc bé đang học khi tìm người nhận của một nhóm',
      /s\.classId = \? AND s\.active = 1/.test(ma));
  }

  // =========================================================================
  console.log('\n[5] ĐẨY LÀ VIỆC PHỤ — hỏng cũng không được kéo việc chính xuống');
  {
    const tb = fs.readFileSync(path.join(GOC, 'lib/thong-bao.js'), 'utf8');
    check('dayTin bọc bắt lỗi, không ném ra ngoài',
      /function dayTin[\s\S]{0,600}catch \(_\)/.test(tb));
    check('nguoiNhanCua cũng vậy — bảng đăng ký hỏng thì trả rỗng, không sập',
      /function nguoiNhanCua[\s\S]{0,900}catch \(_\) \{\s*\n?\s*return \[\];/.test(tb));

    // Và đo bằng hành vi: gửi một thông báo thật rồi xem đường ghi có trả về
    // bình thường không. Máy đẩy trong bài này trỏ vào cổng không ai nghe,
    // tức MỌI lượt đẩy đều hỏng — đúng tình huống cần canh.
    const r = await req('POST', '/api/notifications', {
      cookie: QT,
      body: { title: 'Nghỉ lễ Quốc khánh', body: 'Trường nghỉ ngày 02/09.', category: 'Nhà trường', audience: 'all' },
    });
    check('MỌI LƯỢT ĐẨY HỎNG MÀ THÔNG BÁO VẪN GHI ĐƯỢC', r.status === 201, r.status);
    check('và tin ấy đọc lại được nguyên vẹn',
      (r.data || {}).title === 'Nghỉ lễ Quốc khánh', r.data && r.data.title);

    const ds = await req('GET', '/api/notifications', { cookie: QT });
    const co = (Array.isArray(ds.data) ? ds.data : (ds.data || {}).danhSach || [])
      .some(n => n.title === 'Nghỉ lễ Quốc khánh');
    check('gia đình mở app ra vẫn thấy tin trong danh sách', co, ds.status);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
