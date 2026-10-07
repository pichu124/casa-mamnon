// Bài canh KHỐI KẾ HOẠCH CHUNG TUẦN (Đ201 — việc 44).
//
// Chạy bằng:  npm run test:ke-hoach-chung-tuan
//
// Nhà trường: ở đầu Lịch sinh hoạt có một khối "kế hoạch chung tuần này" gồm
// chủ đề, bài hát, Casa talkshow, lời nhắc gia đình, đường dẫn video và tệp
// PDF/Word. Chủ đề đã có từ Đ141; đợt này thêm năm phần còn lại.
//
// BA CHỖ NGUY HIỂM, VÀ KHÔNG CHỖ NÀO LÀ "THIẾU TÍNH NĂNG":
//
// [1] MÀN LÕI ĐI HỎI MỘT PHÂN HỆ CẮM THÊM. Lịch sinh hoạt thuộc phần lõi,
//     dữ liệu khối này thuộc phân hệ Hành trình — thứ trường tắt được bất cứ
//     lúc nào ở Quản trị → Tính năng. Làm ẩu thì tắt Hành trình là gia đình
//     mất luôn Lịch sinh hoạt. Đúng thứ Nguyên tắc số 1 cấm.
//
// [2] MỘT Ô CHỮ TỰ DO DỰNG THÀNH THẺ BẤM ĐƯỢC. Đường dẫn video do cô gõ, rồi
//     màn hình của GIA ĐÌNH dựng thành `href`. Một chuỗi `javascript:...` lọt
//     vào đó là mã chạy trong phiên của người bấm. Lọc phải ở MÁY CHỦ, vì màn
//     hình là thứ người ta bỏ qua được.
//
// [3] TỆP CỦA MỘT NHÓM LỚP. Tệp kế hoạch tuần là tài liệu của một nhóm cụ
//     thể. Đường tải phải qua `db.canAccessClass` — gia đình nhóm khác không
//     mở được kể cả khi đoán trúng mã tệp.
//
// Và một vế thứ tư, mục [6] canh: THÊM BÊN CẠNH, KHÔNG SỬA CÁI ĐANG CHẠY —
// tuần cô đã soạn trước đợt này (chỉ có chủ đề) phải hiện y như hôm qua.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-chung-tuan');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng T', 't_qt');
batPhanHe(DIR, ['hanhtrinh']);

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4817), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

// Một tệp PDF bé xíu nhưng ĐÚNG chữ ký %PDF- ở đầu — kho tài liệu nhận theo
// byte đầu tệp chứ không theo lời khai của trình duyệt (nếp Đ160).
const PDF_THAT = 'data:application/pdf;base64,'
  + Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n').toString('base64');
// Cùng một lời khai "là PDF" nhưng ruột là chữ thường.
const PDF_DOI = 'data:application/pdf;base64,'
  + Buffer.from('day khong phai pdf, chi la chu').toString('base64');

function themCsdl(classId, tuan) {
  const conn = new Database(CSDL);
  try {
    return conn.prepare('SELECT * FROM hanhtrinh_chude_them WHERE classId = ? AND tuan = ?')
      .get(classId, tuan) || null;
  } finally { conn.close(); }
}
function tepCsdl(classId) {
  const conn = new Database(CSDL);
  try { return conn.prepare('SELECT * FROM hanhtrinh_chude_tep WHERE classId = ?').all(classId); }
  finally { conn.close(); }
}
// Ghi thẳng một tuần KIỂU CŨ — chỉ có chủ đề, không có dòng phần thêm. Đúng
// hình dạng của mọi tuần cô đã soạn trước đợt này; đi qua API thì đường mới
// luôn ghi kèm, nên không dựng lại được cảnh "dữ liệu cũ".
function tuanKieuCu(classId, tuan, chuDe) {
  const conn = new Database(CSDL);
  try {
    conn.prepare(`INSERT INTO hanhtrinh_chude (id, classId, tuan, chuDe, moTa, cungConONha, coGhi, taoLuc, capNhatLuc)
      VALUES (?, ?, ?, ?, 'Mô tả cũ', 'Việc cũ ở nhà', 't1', ?, ?)`)
      .run(`htc_cu_${tuan}`, classId, tuan, chuDe, new Date().toISOString(), new Date().toISOString());
  } finally { conn.close(); }
}

const TUAN = '2026-09-07';       // một thứ Hai
const TUAN_SAU = '2026-09-14';

try {
  const d0 = await login('t_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('t_qt', 'quantri2026')).cookie;
  const CO = (await login('giaovien', '123456')).cookie;          // cô của c1
  const CO4 = (await login('giaovien4', '123456')).cookie;        // cô của c4
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1: con ở c1 và c2
  const PH7 = (await login('ph.trang', '123456')).cookie;   // p7: con s9 ở c4

  // =========================================================================
  console.log('\n[1] KHÔNG ĐỤNG MỘT CỘT NÀO CỦA BẢNG ĐANG CHẠY');
  {
    // `CREATE TABLE IF NOT EXISTS` KHÔNG thêm được cột vào bảng đã tồn tại.
    // Khai thêm cột vào câu lệnh cũ là một dòng SQL không bao giờ chạy trên cơ
    // sở dữ liệu của trường — im lặng trên máy người viết, hỏng trên máy trường.
    const sql = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/schema.sql'), 'utf8');
    const khoiCu = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS hanhtrinh_chude ('),
      sql.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS hanhtrinh_chude_mot_nhom_mot_tuan'));
    check('đối chứng — cắt đúng khối khai bảng chủ đề', khoiCu.includes('cungConONha'), khoiCu.length);
    for (const cot of ['baiHat', 'talkshow', 'nhacGiaDinh', 'linkBaiHat', 'linkTalkshow']) {
      check(`bảng chủ đề KHÔNG bị nhét thêm cột ${cot}`, !khoiCu.includes(cot));
    }
    check('phần thêm nằm ở BẢNG PHỤ', /CREATE TABLE IF NOT EXISTS hanhtrinh_chude_them/.test(sql));
    check('tệp cũng ở bảng riêng', /CREATE TABLE IF NOT EXISTS hanhtrinh_chude_tep/.test(sql));
    check('và không có câu ALTER nào', !/ALTER\s+TABLE/i.test(sql), (sql.match(/ALTER[^\n]*/i) || [])[0]);

    const conn = new Database(CSDL);
    try {
      const cot = conn.prepare('PRAGMA table_info(hanhtrinh_chude)').all().map(x => x.name);
      check('cơ sở dữ liệu thật cũng vậy — bảng chủ đề còn đúng 9 cột cũ',
        cot.length === 9 && !cot.includes('baiHat'), cot.join(', '));
    } finally { conn.close(); }
  }

  // =========================================================================
  console.log('\n[2] CÔ SOẠN ĐƯỢC NĂM PHẦN MỚI, và soạn cùng một lượt với chủ đề');
  {
    const luu = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO,
      body: {
        classId: 'c1', tuan: TUAN,
        chuDe: 'Nước và những thứ nổi',
        moTa: 'Cả tuần lớp chơi với nước',
        cungConONha: 'Cho con thả thìa vào chậu nước',
        baiHat: 'Cả nhà thương nhau',
        linkBaiHat: 'https://vi.wikipedia.org/wiki/video-bai-hat',
        talkshow: 'Dạy con tự xúc ăn',
        linkTalkshow: 'https://vi.wikipedia.org/wiki/talkshow',
        nhacGiaDinh: 'Thứ Tư lớp ra sân, nhà chuẩn bị giúp cô một mũ rộng vành.',
      },
    });
    check('cô lưu được cả chủ đề lẫn phần thêm trong MỘT lượt', luu.status === 200,
      `${luu.status} ${JSON.stringify(luu.data).slice(0, 160)}`);
    const t = themCsdl('c1', TUAN);
    check('phần thêm vào đủ năm ô',
      t && t.baiHat === 'Cả nhà thương nhau' && t.talkshow === 'Dạy con tự xúc ăn'
      && /mũ rộng vành/.test(t.nhacGiaDinh) && t.linkBaiHat && t.linkTalkshow,
      JSON.stringify(t || {}).slice(0, 220));

    const doc = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: CO });
    check('đọc lại thấy đủ', doc.status === 200 && doc.data.them.baiHat === 'Cả nhà thương nhau',
      JSON.stringify(doc.data.them || {}).slice(0, 200));
    check('máy chủ nói ra "tuần này CÓ khối chung" để màn hình khỏi tự đoán',
      doc.data.coKhoiChung === true, doc.data.coKhoiChung);

    // SỬA MỘT Ô KHÔNG ĐƯỢC XOÁ BỐN Ô KIA. Một bản giao diện đời cũ chỉ gửi
    // `chuDe` thì phần thêm cô đã soạn phải còn nguyên.
    const cuOi = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO, body: { classId: 'c1', tuan: TUAN, chuDe: 'Nước và những thứ nổi (sửa tên)' },
    });
    check('màn hình đời cũ chỉ gửi chủ đề thì vẫn lưu được', cuOi.status === 200, cuOi.status);
    check('VÀ PHẦN THÊM KHÔNG BỊ XOÁ THEO',
      (themCsdl('c1', TUAN) || {}).baiHat === 'Cả nhà thương nhau',
      JSON.stringify(themCsdl('c1', TUAN) || {}).slice(0, 160));
  }

  // =========================================================================
  console.log('\n[3] ĐƯỜNG DẪN — MÁY CHỦ LỌC, không để màn hình lọc hộ');
  {
    // Ô này do cô gõ, rồi màn hình của gia đình dựng thành thẻ `href`. Một
    // chuỗi `javascript:...` lọt vào là mã chạy trong phiên của người bấm.
    const xau = [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ];
    for (const u of xau) {
      await req('PUT', '/api/hanhtrinh/chu-de', {
        cookie: CO, body: { classId: 'c1', tuan: TUAN, chuDe: 'x', linkBaiHat: u },
      });
      check(`máy chủ KHÔNG nhận đường dẫn "${u.slice(0, 22)}…"`,
        (themCsdl('c1', TUAN) || {}).linkBaiHat === '', (themCsdl('c1', TUAN) || {}).linkBaiHat);
    }
    // Và nó không từ chối CẢ LƯỢT GHI — cô gõ nhầm một đường dẫn không được
    // làm mất luôn bài hát và lời nhắc vừa soạn cùng lượt.
    const van = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO,
      body: { classId: 'c1', tuan: TUAN, chuDe: 'x', baiHat: 'Bài hát vẫn còn', linkBaiHat: 'javascript:alert(1)' },
    });
    check('gõ nhầm đường dẫn thì bỏ riêng ô ấy, KHÔNG từ chối cả lượt ghi',
      van.status === 200 && (themCsdl('c1', TUAN) || {}).baiHat === 'Bài hát vẫn còn',
      `${van.status} / ${(themCsdl('c1', TUAN) || {}).baiHat}`);

    const tot = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO, body: { classId: 'c1', tuan: TUAN, chuDe: 'x', linkBaiHat: 'https://example.org/v' },
    });
    check('đối chứng — đường dẫn https thì nhận bình thường',
      tot.status === 200 && (themCsdl('c1', TUAN) || {}).linkBaiHat === 'https://example.org/v',
      (themCsdl('c1', TUAN) || {}).linkBaiHat);

    // MÀN HÌNH LỌC LẦN NỮA — hai lớp cho cùng một thứ là cố ý: bản ghi cũ
    // trong cơ sở dữ liệu của trường có thể đã vào từ trước ngày máy chủ biết lọc.
    const man = fs.readFileSync(path.join(GOC, 'public/js/views/timetable.js'), 'utf8');
    const khoi = man.slice(man.indexOf('async khoiChungTuan('), man.indexOf('nhomVanPhong()'));
    check('đối chứng — cắt đúng khối trên màn', khoi.includes('coKhoiChung'), khoi.length);
    check('màn hình cũng chỉ dựng thẻ bấm từ đường dẫn http/https',
      /\^https\?:/.test(khoi), (khoi.match(/.*https\?.*/) || [])[0]);
    check('và mọi chữ động đều đi qua UI.esc', !/\$\{(c|t|x)\.[A-Za-z]+\}/.test(khoi),
      (khoi.match(/\$\{(c|t|x)\.[A-Za-z]+\}/g) || []));
  }

  // =========================================================================
  console.log('\n[4] TỆP KẾ HOẠCH TUẦN — của MỘT NHÓM, không phải của cả trường');
  {
    const hong = await req('POST', '/api/hanhtrinh/chu-de/tep', {
      cookie: CO, body: { classId: 'c1', tuan: TUAN, ten: 'Giả danh.pdf', dataUrl: PDF_DOI },
    });
    check('tệp khai là PDF mà ruột không phải PDF thì bị từ chối', hong.status === 400, hong.status);
    check('và không có dòng nào được ghi', tepCsdl('c1').length === 0, tepCsdl('c1').length);

    const treo = await req('POST', '/api/hanhtrinh/chu-de/tep', {
      cookie: CO, body: { classId: 'c1', tuan: TUAN, ten: 'Kế hoạch tuần 07-09.pdf', dataUrl: PDF_THAT },
    });
    check('PDF thật thì treo được', treo.status === 201, `${treo.status} ${JSON.stringify(treo.data).slice(0, 140)}`);
    const tep = tepCsdl('c1')[0];
    check('dòng tệp còn vết ai treo, cho nhóm nào, tuần nào',
      tep && tep.nguoiTai && tep.classId === 'c1' && tep.tuan === TUAN,
      JSON.stringify(tep || {}).slice(0, 180));
    check('DANH SÁCH TRẢ RA KHÔNG LỘ TÊN TỆP THẬT trong kho',
      !JSON.stringify(treo.data).includes(tep.file), tep.file);

    const ds = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: PH });
    check('gia đình có con trong nhóm THẤY tệp',
      ds.status === 200 && (ds.data.tep || []).length === 1, ds.status);

    // ĐÂY LÀ CHỖ RÒ DỄ NHẤT: đoán trúng mã tệp của nhóm khác.
    const trom = await req('GET', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: PH7 });
    check('GIA ĐÌNH NHÓM KHÁC KHÔNG MỞ ĐƯỢC dù biết đúng mã tệp', trom.status === 403, trom.status);
    const tromCo = await req('GET', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: CO4 });
    check('cô nhóm khác cũng không mở được', tromCo.status === 403, tromCo.status);
    const mo = await req('GET', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: PH });
    check('đối chứng — gia đình đúng nhóm thì mở được', mo.status === 200, mo.status);

    const xoaTrom = await req('DELETE', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: CO4 });
    check('cô nhóm khác KHÔNG gỡ được tệp', xoaTrom.status === 403, xoaTrom.status);
    check('và tệp vẫn còn', tepCsdl('c1').length === 1, tepCsdl('c1').length);
    const xoaPh = await req('DELETE', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: PH });
    check('gia đình KHÔNG gỡ được tệp', xoaPh.status === 403, xoaPh.status);

    // Trần số tệp: chặn ở máy chủ, không chỉ ẩn ô chọn tệp trên màn.
    for (let i = 0; i < 6; i += 1) {
      await req('POST', '/api/hanhtrinh/chu-de/tep', {
        cookie: CO, body: { classId: 'c1', tuan: TUAN, ten: `Thêm ${i}.pdf`, dataUrl: PDF_THAT },
      });
    }
    check('TRẦN SỐ TỆP MỖI TUẦN CHẶN Ở MÁY CHỦ', tepCsdl('c1').length === 5, tepCsdl('c1').length);

    const go = await req('DELETE', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: CO });
    check('cô của nhóm gỡ được tệp của mình', go.status === 200, go.status);
    check('gỡ xong còn bốn', tepCsdl('c1').length === 4, tepCsdl('c1').length);
  }

  // =========================================================================
  console.log('\n[5] CHÉP TUẦN TRƯỚC — chép cả phần thêm, nhưng KHÔNG chép tệp');
  {
    const chep = await req('POST', '/api/hanhtrinh/chu-de/chep-tuan-truoc', {
      cookie: CO, body: { classId: 'c1', tuan: TUAN_SAU },
    });
    check('chép được sang tuần sau', chep.status === 200, `${chep.status} ${JSON.stringify(chep.data).slice(0, 140)}`);
    const t = themCsdl('c1', TUAN_SAU);
    check('PHẦN THÊM ĐƯỢC CHÉP THEO — không để cô gõ lại năm ô',
      t && t.baiHat === 'Bài hát vẫn còn' && /mũ rộng vành/.test(t.nhacGiaDinh),
      JSON.stringify(t || {}).slice(0, 200));
    // Một tệp là bản kế hoạch của ĐÚNG tuần đó. Chép sang tuần mới là gia đình
    // mở ra thấy lịch của tuần trước mà không có gì báo.
    const sau = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN_SAU}`, { cookie: CO });
    check('TỆP KHÔNG ĐƯỢC CHÉP — thà để trống còn hơn để sai',
      (sau.data.tep || []).length === 0, (sau.data.tep || []).length);
  }

  // =========================================================================
  console.log('\n[6] TUẦN SOẠN TRƯỚC ĐỢT NÀY HIỆN Y NHƯ HÔM QUA');
  {
    tuanKieuCu('c2', '2026-08-31', 'Chủ đề của tuần cũ');
    const d = await req('GET', '/api/hanhtrinh/chu-de?classId=c2&tuan=2026-08-31', { cookie: QT });
    check('đọc được tuần kiểu cũ', d.status === 200 && d.data.chuDe
      && d.data.chuDe.chuDe === 'Chủ đề của tuần cũ', JSON.stringify(d.data.chuDe || {}).slice(0, 140));
    check('KHÔNG CÓ DÒNG PHẦN THÊM thì mọi ô là chuỗi RỖNG, không phải null',
      d.data.them && Object.values(d.data.them).every(v => v === ''),
      JSON.stringify(d.data.them));
    check('và tuần ấy vẫn được coi là CÓ khối chung — vì nó có chủ đề',
      d.data.coKhoiChung === true, d.data.coKhoiChung);

    const trong = await req('GET', '/api/hanhtrinh/chu-de?classId=c2&tuan=2026-08-24', { cookie: QT });
    check('tuần chưa soạn gì thì KHÔNG có khối chung — màn khỏi hiện khung trống',
      trong.data.coKhoiChung === false, trong.data.coKhoiChung);
  }

  // =========================================================================
  console.log('\n[7] PHÂN QUYỀN — gia đình đọc, không ghi');
  {
    const ghi = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: PH, body: { classId: 'c1', tuan: TUAN, chuDe: 'Phụ huynh sửa', baiHat: 'x' },
    });
    check('gia đình KHÔNG soạn được khối chung', ghi.status === 403, ghi.status);
    const treo = await req('POST', '/api/hanhtrinh/chu-de/tep', {
      cookie: PH, body: { classId: 'c1', tuan: TUAN, ten: 'a.pdf', dataUrl: PDF_THAT },
    });
    check('gia đình KHÔNG treo được tệp', treo.status === 403, treo.status);

    const cheo = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO4, body: { classId: 'c1', tuan: TUAN, chuDe: 'Cô nhóm khác sửa' },
    });
    check('cô nhóm khác KHÔNG soạn được cho nhóm này', cheo.status === 403, cheo.status);

    // VĂN PHÒNG SOẠN ĐƯỢC — nhà trường xin thêm quyền này, và nó là THÊM chứ
    // không phải lấy của cô: cô vừa soạn thành công ở mục [2].
    const vp = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: QT, body: { classId: 'c1', tuan: TUAN, chuDe: 'Văn phòng soạn giúp cô', talkshow: 'Talkshow do văn phòng đặt' },
    });
    check('VĂN PHÒNG / BAN GIÁM HIỆU soạn được khối chung', vp.status === 200, vp.status);
    check('và ô văn phòng vừa gõ vào đúng chỗ',
      (themCsdl('c1', TUAN) || {}).talkshow === 'Talkshow do văn phòng đặt',
      (themCsdl('c1', TUAN) || {}).talkshow);
  }

  // =========================================================================
  console.log('\n[8] MÀN LÕI HỎI PHÂN HỆ CẮM THÊM — tắt phân hệ KHÔNG được sập Lịch sinh hoạt');
  {
    const man = fs.readFileSync(path.join(GOC, 'public/js/views/timetable.js'), 'utf8');
    const khoi = man.slice(man.indexOf('async khoiChungTuan('), man.indexOf('nhomVanPhong()'));
    check('phân hệ đang tắt thì KHÔNG gọi gì cả',
      /App\.moduleEnabled\('hanhtrinh'\)/.test(khoi));
    check('lượt gọi hỏng thì trả về RỖNG, không ném lỗi ra ngoài',
      /catch \(_\) \{ return ''; \}/.test(khoi), (khoi.match(/catch[^\n]*/g) || []));
    check('và chỗ gọi nó nằm trong màn Lịch sinh hoạt',
      /\$\{khoiChung\}/.test(man));

    // Đo bằng HÀNH VI, không chỉ bằng chữ: tắt phân hệ rồi hỏi lại.
    const tat = await req('PUT', '/api/admin/modules/hanhtrinh', { cookie: QT, body: { enabled: false } });
    check('tắt được phân hệ Hành trình', tat.status === 200, tat.data);
    const khiTat = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: PH });
    check('tắt rồi thì đường API đóng lại', khiTat.status === 404, khiTat.status);
    const lich = await req('GET', '/api/timetable?classId=c1', { cookie: PH });
    check('LỊCH SINH HOẠT VẪN CHẠY khi Hành trình đang tắt',
      lich.status === 200 || lich.status === 404, lich.status);
    check('và đó không phải lỗi máy chủ', lich.status < 500, lich.status);

    const bat = await req('PUT', '/api/admin/modules/hanhtrinh', { cookie: QT, body: { enabled: true } });
    check('bật lại được', bat.status === 200, bat.data);
    const sau = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: PH });
    check('BẬT LẠI THÌ KHỐI CHUNG CÒN NGUYÊN — không mất ô nào',
      sau.status === 200 && sau.data.them.talkshow === 'Talkshow do văn phòng đặt',
      JSON.stringify(sau.data.them || {}).slice(0, 180));
    check('và tệp cũng còn', (sau.data.tep || []).length === 4, (sau.data.tep || []).length);
  }

  // =========================================================================
  console.log('\n[9] THỨ TỰ ĐĂNG KÝ ĐƯỜNG — "chu-de" không rơi vào "/:id"');
  {
    const ma = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
    const viTriTep = ma.indexOf("app.post('/api/hanhtrinh/chu-de/tep'");
    const viTriCoId = ma.search(/app\.(get|post|put|delete)\('\/api\/hanhtrinh\/:id/);
    check('đối chứng — tìm thấy cả hai khối', viTriTep > 0 && viTriCoId > 0, `${viTriTep} / ${viTriCoId}`);
    check('KHỐI TỆP ĐĂNG KÝ TRƯỚC MỌI ĐƯỜNG CÓ /:id', viTriTep < viTriCoId,
      `tep ${viTriTep} < :id ${viTriCoId}`);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
