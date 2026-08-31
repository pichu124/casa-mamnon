// Bài canh: APP PHẢI CÒN DÙNG ĐƯỢC KHI TRƯỜNG ĐÔNG LÊN.
//
// Chạy bằng:  npm run test:quy-mo
//
// VÌ SAO CÓ BÀI NÀY
//
// Ba màn hình của app hỏi cơ sở dữ liệu theo kiểu "một câu cho mỗi dòng". Với
// dữ liệu mẫu 11 bé thì không ai thấy gì; với trường thật 600 bé và ba năm
// lịch sử thì đó là hàng nghìn câu cho MỘT lượt mở màn.
//
// Và đây không phải cái chậm của riêng người đang bấm: better-sqlite3 chạy
// ĐỒNG BỘ, mỗi câu chặn thẳng vòng lặp sự kiện của máy chủ. Một cô mở màn
// Nhắn tin lúc 7 giờ sáng làm chậm mọi yêu cầu của mọi người trong đúng khoảnh
// khắc cả trường cùng mở app.
//
// BỐN CHỖ, VÀ CẢ BỐN ĐỀU CÓ CÙNG MỘT HÌNH DẠNG
//
//   1. `/api/messages` — danh sách hội thoại KHÔNG có trần nào, cộng 4–5 câu
//      cho mỗi hội thoại. Hội thoại cô ↔ gia đình chỉ sinh ra chứ không bao
//      giờ đóng, nên nó dài thêm mỗi năm học và không có gì chặn.
//   2. `/api/auth/me` và `/api/students` — hỏi lại thông tin nhóm cho TỪNG bé,
//      dù cả trường chỉ có hai chục nhóm. Đây là đường chạy MỖI LẦN mở app.
//   3. Màn cổng đón trả — nạp toàn bộ lịch sử uỷ quyền rồi vứt gần hết bằng
//      JavaScript. Canh riêng ở test/don-tra.test.mjs mục [14].
//   4. Xin phép nghỉ và Dặn thuốc — máy chủ CÓ cắt ở 60 đơn, mà màn hình không
//      gửi giới hạn và cũng không nói một chữ nào là đã cắt.
//
// BÀI NÀY KHÔNG ĐO TỐC ĐỘ. Đo tốc độ trên máy chạy kiểm thử là đỏ ngẫu nhiên.
// Nó canh thứ chắc chắn hơn: KẾT QUẢ KHÔNG ĐƯỢC ĐỔI khi dữ liệu phình ra, và
// phần bị cắt phải có đường lấy lại.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, MAU,
} from './_chung.mjs';

const require2 = createRequire(import.meta.url);

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('quy-mo');
sinhDuLieu(DIR);
const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4090), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vaoQuanTri(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vaoQuanTri('hieutruong', mk);
const CO = (await login('giaovien', '123456')).cookie;      // cô t1, nhóm c1
const PH = (await login('phuhuynh', '123456')).cookie;      // mẹ bé s1

const doc = (p) => fs.readFileSync(path.join(GOC, p), 'utf8');

// Viết thẳng vào cơ sở dữ liệu — ngoài tiến trình, đúng nếp `chayTrenCsdl`
// của test/_chung.mjs. Máy chủ giữ kết nối riêng của nó ở tiến trình khác.
function tren(ma, doiSo = []) {
  const { execFileSync } = require2('child_process');
  execFileSync('node', ['-e', `const D = require('better-sqlite3');
    const db = new D(process.argv[1]);
    ${ma}
    db.close();`, path.join(DIR, 'school.db'), ...doiSo], { cwd: GOC, stdio: 'inherit' });
}

try {
  // =========================================================================
  console.log('\n[0] Bối cảnh — không dựng được thì mọi mục dưới xanh giả');
  {
    check('quản trị vào được', !!QT);
    check('cô vào được', !!CO);
    check('gia đình vào được', !!PH);
  }

  // =========================================================================
  console.log('\n[1] DANH SÁCH HỘI THOẠI CÓ TRẦN, và ghép các trang lại thì ĐÚNG BẰNG danh sách cũ');
  {
    const truoc = await req('GET', '/api/messages', { cookie: CO });
    check('màn Nhắn tin của cô mở được', truoc.status === 200, truoc.status);
    const soBanDau = (truoc.data?.conversations || []).length;
    check('cô đang có ít nhất một hội thoại để mà soi', soBanDau > 0, soBanDau);

    // Dựng 60 hội thoại riêng nữa cho cô — quá con số một trang (40).
    tren(`
      const taoHT = db.prepare("INSERT INTO conversations (id, type, name, classId) VALUES (?, 'direct', NULL, NULL)");
      const taoTV = db.prepare('INSERT INTO conversation_members (conversationId, userId, lastRead) VALUES (?, ?, NULL)');
      const taoTin = db.prepare('INSERT INTO messages (id, conversationId, senderId, text, createdAt) VALUES (?, ?, ?, ?, ?)');
      const goc = Date.parse('2026-01-01T00:00:00.000Z');
      db.transaction(() => {
        for (let i = 0; i < 60; i++) {
          const ht = 'cvtest_' + String(i).padStart(3, '0');
          taoHT.run(ht);
          taoTV.run(ht, 't1');
          taoTV.run(ht, 'p2');
          taoTin.run('mtest_' + i, ht, 'p2', 'tin thử ' + i, new Date(goc + i * 60000).toISOString());
        }
      })();
    `);

    const t1 = await req('GET', '/api/messages', { cookie: CO });
    const ds1 = t1.data?.conversations || [];
    check('LƯỢT HỎI KHÔNG KÈM THAM SỐ VẪN CHẠY — bản app cũ không hỏng',
      t1.status === 200 && Array.isArray(ds1), t1.status);
    check('và hình dạng câu trả lời không đổi: có conversations và contacts',
      Array.isArray(t1.data?.conversations) && Array.isArray(t1.data?.contacts),
      Object.keys(t1.data || {}));
    check('DANH SÁCH BỊ CẮT — không kéo về cả sổ liên lạc của mọi lứa cũ',
      ds1.length === 40, ds1.length);

    // Ghép các trang lại: không thiếu một hội thoại nào (mất lịch sử), và
    // không thừa một hội thoại nào (rò quyền hoặc lặp).
    const gop = [];
    for (let bo = 0; bo < 400; bo += 40) {
      const r = await req('GET', `/api/messages?bo=${bo}&soLuong=40`, { cookie: CO });
      const l = r.data?.conversations || [];
      gop.push(...l);
      if (l.length < 40) break;
    }
    const ma = gop.map(c => c.id);
    check('GHÉP CÁC TRANG LẠI KHÔNG LẶP MỘT HỘI THOẠI NÀO',
      new Set(ma).size === ma.length, { tong: ma.length, khac: new Set(ma).size });
    check('và ra đủ 60 hội thoại vừa dựng, không sót cái nào',
      Array.from({ length: 60 }, (_, i) => `cvtest_${String(i).padStart(3, '0')}`)
        .every(id => ma.includes(id)), ma.length);
    check('cộng với hội thoại đã có từ trước',
      ma.length === soBanDau + 60, { ma: ma.length, soBanDau });

    // HỘI THOẠI CHƯA CÓ TIN NÀO — chỗ thứ tự dễ lung lay nhất.
    //
    // "Trò chuyện mới" tạo phòng TRƯỚC khi ai gửi tin, nên phòng rỗng là
    // chuyện thường ngày. Mọi phòng rỗng có cùng mốc tin cuối (NULL), tức
    // chúng bằng nhau ở tiêu chí sắp xếp chính. Cắt thành trang trên một tập
    // bằng nhau mà không có tiêu chí phụ là chỗ sinh ra "có hội thoại lặp ở
    // trang sau, có hội thoại không bao giờ hiện" — nên câu truy vấn có thêm
    // `c.id DESC`.
    //
    // NÓI THẲNG GIỚI HẠN CỦA PHÉP KIỂM NÀY: gỡ `c.id DESC` ra thì SQLite trên
    // máy này vẫn trả về đúng thứ tự cũ, nên mục dưới KHÔNG chuyển sang đỏ.
    // Nó canh được điều quan trọng hơn và canh được thật: ghép các trang lại
    // phải ra ĐỦ và KHÔNG LẶP, kể cả khi cả tập đều bằng nhau ở tiêu chí chính.
    tren(`
      const taoHT = db.prepare("INSERT INTO conversations (id, type, name, classId) VALUES (?, 'direct', NULL, NULL)");
      const taoTV = db.prepare('INSERT INTO conversation_members (conversationId, userId, lastRead) VALUES (?, ?, NULL)');
      db.transaction(() => {
        for (let i = 0; i < 50; i++) {
          const ht = 'cvrong_' + String(i).padStart(3, '0');
          taoHT.run(ht);
          taoTV.run(ht, 't1');
          taoTV.run(ht, 'p3');
        }
      })();
    `);

    const gopRong = [];
    for (let bo = 0; bo < 600; bo += 40) {
      const r = await req('GET', `/api/messages?bo=${bo}&soLuong=40`, { cookie: CO });
      const l = r.data?.conversations || [];
      gopRong.push(...l);
      if (l.length < 40) break;
    }
    const maRong = gopRong.map(c => c.id);
    check('CÓ 50 HỘI THOẠI CHƯA CÓ TIN NÀO: ghép các trang lại vẫn không lặp',
      new Set(maRong).size === maRong.length,
      { tong: maRong.length, khac: new Set(maRong).size });
    check('và không sót phòng rỗng nào',
      Array.from({ length: 50 }, (_, i) => `cvrong_${String(i).padStart(3, '0')}`)
        .every(id => maRong.includes(id)),
      maRong.filter(x => String(x).startsWith('cvrong_')).length);
    check('phòng chưa có tin vẫn hiện ra được, kèm lastMessage rỗng',
      gopRong.some(c => String(c.id).startsWith('cvrong_') && c.lastMessage === null),
      gopRong.find(c => String(c.id).startsWith('cvrong_')));

    // TRẦN CỦA THAM SỐ: một lượt hỏi bịa số khổng lồ không được kéo cả bảng.
    const thamLam = await req('GET', '/api/messages?soLuong=99999', { cookie: CO });
    check('xin một vạn dòng thì máy chủ vẫn chặn ở trần của nó',
      (thamLam.data?.conversations || []).length <= 200,
      (thamLam.data?.conversations || []).length);

    // RANH GIỚI KHÔNG ĐƯỢC NỚI THEO: cô khác không thấy hội thoại của cô này.
    const co2 = (await login('giaovien2', '123456')).cookie;
    const cua2 = await req('GET', '/api/messages?bo=0&soLuong=200', { cookie: co2 });
    check('cô khác KHÔNG thấy hội thoại mình không tham gia',
      !(cua2.data?.conversations || []).some(c => String(c.id).startsWith('cvtest_')),
      (cua2.data?.conversations || []).length);

    // Phụ đề vẫn đúng — đây là phần bản vá gom lại thành bảng tra.
    const rieng = ds1.find(c => c.type === 'direct');
    check('hội thoại riêng vẫn có tiêu đề và phụ đề, không rỗng',
      !!rieng && !!rieng.title && typeof rieng.subtitle === 'string',
      rieng && { title: rieng.title, subtitle: rieng.subtitle });

    // Màn hình phải có đường đi tiếp — cắt mà không có nút là GIẤU.
    const v = doc('public/js/views/messages.js');
    check('MÀN NHẮN TIN GỬI THAM SỐ TRANG', /\/api\/messages\?bo=/.test(v));
    check('và có nút xem hội thoại cũ hơn', /Xem hội thoại cũ hơn/.test(v));
  }

  // =========================================================================
  console.log('\n[2] MỞ APP: thông tin nhóm hỏi một lần cho mỗi NHÓM, không phải mỗi BÉ');
  {
    const me = await req('GET', '/api/auth/me', { cookie: QT });
    check('hiệu trưởng mở app được', me.status === 200, me.status);
    const ds = me.data?.students || [];
    check('và nhận đủ danh sách bé của trường', ds.length === MAU.soBe, ds.length);

    // HÌNH DẠNG KHÔNG ĐƯỢC ĐỔI MỘT CHỮ. Đây là đường mà mọi màn hình dựa vào.
    const be = ds.find(s => s.classId === 'c1');
    check('mỗi bé vẫn kèm tên nhóm', !!be && !!be.className, be && be.className);
    check('vẫn kèm cô phụ trách chính (hình dạng cũ)',
      !!be && typeof be.teacherName === 'string' && be.teacherName.length > 0, be && be.teacherName);
    check('và vẫn kèm danh sách đủ các cô của nhóm',
      !!be && Array.isArray(be.teachers) && be.teachers.length > 0, be && be.teachers);
    check('cùng teacherId như trước', !!be && !!be.teacherId, be && be.teacherId);

    const st = await req('GET', '/api/students', { cookie: QT });
    check('/api/students cũng trả đủ và đúng hình dạng',
      st.status === 200 && (st.data || []).length === MAU.soBe
      && (st.data || []).every(s => typeof s.className === 'string'
        && typeof s.teacherName === 'string' && Array.isArray(s.teachers)),
      st.status);

    // BẢNG NHỚ PHẢI SỐNG ĐÚNG MỘT LƯỢT GỌI.
    //
    // Đây là phép kiểm quan trọng nhất của mục này. Nếu ai đó "tối ưu thêm"
    // bằng cách nâng bảng nhớ ra ngoài thân hàm thành đệm dùng chung cho cả
    // tiến trình thì văn phòng đổi phân công xong mà mọi màn hình vẫn nói tên
    // cô cũ tới lần khởi động lại — và vì đường này cũng là chỗ giao diện lấy
    // `classIds` của cô, một bảng nhớ cũ ở đây là QUYỀN cũ ở đây.
    const truocKhiDoi = (await req('GET', '/api/auth/me', { cookie: QT }))
      .data.students.find(s => s.classId === 'c1').teacherNames;
    const doi = await req('PUT', '/api/admin/classes/c1/teachers', {
      cookie: QT, body: { teacherIds: ['t2'], chinhId: 't2' },
    });
    check('đổi được phân công cô của nhóm c1', doi.status === 200, { status: doi.status, data: doi.data });
    const sauKhiDoi = (await req('GET', '/api/auth/me', { cookie: QT }))
      .data.students.find(s => s.classId === 'c1').teacherNames;
    check('ĐỔI PHÂN CÔNG XONG LÀ THẤY NGAY — bảng nhớ không sống quá một lượt gọi',
      sauKhiDoi !== truocKhiDoi && /Hương/.test(sauKhiDoi || ''), { truocKhiDoi, sauKhiDoi });
  }

  // =========================================================================
  console.log('\n[3] XIN PHÉP NGHỈ và DẶN THUỐC: cắt thì phải NÓI RA và có đường xem tiếp');
  {
    // Máy chủ đã có `?gioiHan=` từ đầu; phần thiếu nằm ở màn hình.
    const it = await req('GET', '/api/leave?gioiHan=1', { cookie: QT });
    check('/api/leave nhận tham số giới hạn', it.status === 200, it.status);
    const nhieu = await req('GET', '/api/leave?gioiHan=200', { cookie: QT });
    check('và xin nhiều hơn thì trả về nhiều hơn hoặc bằng',
      (nhieu.data || []).length >= (it.data || []).length,
      [(it.data || []).length, (nhieu.data || []).length]);

    const th = await req('GET', '/api/medicine?gioiHan=1', { cookie: QT });
    check('/api/medicine cũng nhận tham số giới hạn', th.status === 200, th.status);

    // ĐƠN CHỜ DUYỆT KHÔNG BAO GIỜ BỊ CẮT — con số "Chờ duyệt (N)" phải đúng.
    // Đây là vế chống-siết-quá-tay của mục này.
    const choDuyet = (it.data || []).filter(l => l.status === 'pending').length;
    const choDuyet2 = (nhieu.data || []).filter(l => l.status === 'pending').length;
    check('đơn CHỜ DUYỆT không bị cắt theo — hai lượt hỏi đếm ra cùng một số',
      choDuyet === choDuyet2, [choDuyet, choDuyet2]);

    for (const [ten, tep, duong, nut] of [
      ['Xin phép nghỉ', 'public/js/views/leave.js', '/api/leave?gioiHan=', 'Xem đơn cũ hơn'],
      ['Dặn thuốc', 'public/js/views/medicine.js', '/api/medicine?gioiHan=', 'Xem đơn cũ hơn'],
    ]) {
      const s = doc(tep);
      check(`${ten}: màn hình GỬI giới hạn lên máy chủ`, s.includes(duong), tep);
      check(`${ten}: và có nút xem tiếp`, s.includes(nut), tep);
      check(`${ten}: nói ra là đang hiện bao nhiêu đơn`, /Đang hiện \$\{/.test(s), tep);
      check(`${ten}: KHÔNG đổi hình dạng câu trả lời của máy chủ (vẫn là mảng)`,
        /this\._list\.filter\(/.test(s), tep);
    }
  }

  // =========================================================================
  console.log('\n[4] PHÉP THỬ NGƯỢC — mấy mục dò theo mã nguồn có bắt được thật không');
  {
    const doTrang = (ma) => /\/api\/messages\?bo=/.test(ma);
    check('BẮT ĐƯỢC màn hình quên gửi tham số trang',
      !doTrang("const data = await API.get('/api/messages');"));
    check('nhận đúng màn hình đã gửi',
      doTrang('await API.get(`/api/messages?bo=${this._daTai.length}&soLuong=40`)'));

    const doGioiHan = (ma) => ma.includes('/api/leave?gioiHan=');
    check('BẮT ĐƯỢC màn Xin phép quên gửi giới hạn',
      !doGioiHan("this._list = await API.get('/api/leave');"));
    check('nhận đúng màn đã gửi',
      doGioiHan('await API.get(`/api/leave?gioiHan=${this._gioiHan}`)'));
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
