// Bài canh ẢNH ĐIỂM DANH và BẢNG RÀ SOÁT SAU 9 GIỜ.
//
// Chạy bằng:  npm run test:diem-danh-anh
//
// Nhà trường yêu cầu ở điểm 4 (30/08):
//   "Điểm danh muốn chụp được ảnh và sẽ gửi thẳng ảnh đó về cho PH để xác nhận
//    học sinh đã đến trường, có thể bổ sung thêm cảnh báo nếu sau 9h bé nào đó
//    chưa được điểm danh mà k xin nghỉ trước đó -> báo đỏ để admin kiểm tra
//    lại sơ sót hay con nghỉ để liên lạc với PH xác nhận."
//
// BA CHỖ ĐÁNG CANH NHẤT
//
//   1. ẢNH LÀ ẢNH MẶT MỘT ĐỨA TRẺ DƯỚI 6 TUỔI. Nó chỉ được đi tới gia đình
//      CỦA CHÍNH BÉ ĐÓ. Mục [3] thử đúng đường mà một gia đình khác sẽ đi.
//
//   2. BẢNG RÀ SOÁT PHẢI TRỪ BÉ ĐÃ CÓ ĐƠN NGHỈ ĐƯỢC DUYỆT. Nếu không thì mỗi
//      sáng văn phòng lại gọi một gia đình đã báo nghỉ từ hôm trước, và vài
//      lần như thế là cả bảng bị bỏ qua — đúng bài học Đ84. Mục [4], kèm đối
//      chứng rằng bé ấy CÓ nằm trong danh sách khi chưa có đơn.
//
//   3. MÀU ĐỎ Ở ĐÂY NÓI VỀ VIỆC CỦA NGƯỜI LỚN, KHÔNG NÓI GÌ VỀ ĐỨA TRẺ. Mục
//      [5] soi chữ trên màn hình: không câu nào quy việc chưa điểm danh về
//      phía bé.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, MAU, GOC, HOM_NAY } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('diem-danh-anh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'dda_qt');

const { BASE, dung } = await dungMayChu({ port: 4599, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

// Một ảnh PNG 1×1 thật, đủ để đi qua phép kiểm chữ ký định dạng của kho ảnh.
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const NGAY = HOM_NAY();

// TẢI BYTE THẬT, KHÔNG CHỈ ĐỌC JSON.
//
// `taoReq` của `test/_chung.mjs` chỉ đọc JSON — dùng nó thì một đường trả về
// `index.html` kèm `Content-Type: text/html` vẫn hiện ra là "status 200" và
// bài canh vẫn xanh. Đó ĐÚNG là cách lỗi Đ95 lọt qua 37 bài canh của đợt Đ89.
// Hàm nhỏ này nằm ngay đây, không sửa tệp dùng chung.
async function taiByte(duongDan, cookie) {
  const res = await fetch(BASE + duongDan, { headers: cookie ? { Cookie: cookie } : {} });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    ctype: res.headers.get('content-type') || '',
    byte: buf.length,
    laPNG: buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
    laHTML: /text\/html/.test(res.headers.get('content-type') || ''),
  };
}

try {
  const qt = await login('dda_qt', mkQt);
  const co = await login('giaovien', '123456');
  const co4 = await login('giaovien4', '123456');
  const ph = await login('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Cô gắn được ảnh "con đã tới lớp"');
  {
    const r = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: {
      studentId: 's1', date: NGAY, anh: ANH } });
    check('cô gắn được ảnh cho bé của nhóm mình',
      r.status === 201 && r.data.file, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
    globalThis.FILE1 = r.data.file;

    const so = await req('GET', `/api/attendance/class?date=${NGAY}&classId=c1`, { cookie: co.cookie });
    const be = (so.data.students || []).find(x => x.student.id === 's1');
    check('sổ điểm danh của cô hiện ảnh vừa gắn',
      !!(be && be.anhDenLop && be.anhDenLop.file === globalThis.FILE1),
      JSON.stringify(be && be.anhDenLop));
    check('sổ điểm danh nói cho màn hình biết giờ rà soát của trường',
      so.data.gioRaSoat === 9, so.data.gioRaSoat);

    // Bé khác chưa có ảnh thì trường đó là null, KHÔNG phải một ô rỗng chờ lấp.
    const chua = (so.data.students || []).find(x => x.student.id !== 's1');
    check('bé chưa có ảnh thì trả về null, không phải khung ảnh trống',
      !!chua && chua.anhDenLop === null, JSON.stringify(chua && chua.anhDenLop));
  }

  // =========================================================================
  // BYTE CỦA TẤM ẢNH PHẢI THẬT SỰ TẢI VỀ ĐƯỢC — VÀ CHỈ ĐÚNG NGƯỜI TẢI ĐƯỢC.
  //
  // Đợt Đ89 dựng đủ đường tải lên, đủ JSON, đủ 37 bài canh — mà QUÊN đường trả
  // byte. Hai màn hình trỏ thẳng vào `/uploads/<tên tệp>`, còn máy chủ không hề
  // gắn đường tĩnh nào tên đó, nên mọi yêu cầu ảnh rơi vào lớp đỡ của trang đơn
  // và nhận về `index.html`. Ô ảnh vỡ ở cả hai màn, mà không bài canh nào đỏ:
  // tất cả đều chỉ đọc JSON và đọc đĩa, không bài nào tải byte qua HTTP.
  //
  // Mục này đóng đúng khoảng trống đó, và đóng cả hai đầu:
  //   - byte tải về phải LÀ ẢNH (chữ ký PNG), không phải trang HTML;
  //   - đường tĩnh `/uploads/...` phải VẪN KHÔNG phục vụ ảnh — vì cách vá sai
  //     là thêm một dòng `express.static` trỏ vào `DATA_DIR/uploads`, mà thư mục
  //     đó dùng chung cho ảnh album, ảnh người được đón và ảnh quan sát của cô.
  console.log('\n[1b] Tải BYTE của ảnh qua HTTP — và chỉ đúng người tải được');
  {
    const file = globalThis.FILE1;

    const coTai = await taiByte(`/api/attendance/anh/${file}`, co.cookie);
    check('cô tải về được ĐÚNG BYTE của ảnh, không phải trang HTML',
      coTai.status === 200 && coTai.laPNG && !coTai.laHTML, JSON.stringify(coTai));
    check('và máy chủ khai đúng loại nội dung là ảnh',
      /^image\//.test(coTai.ctype), coTai.ctype);

    const nhaTai = await taiByte(`/api/attendance/anh/${file}`, ph.cookie);
    check('gia đình CỦA BÉ tải về được ảnh con mình',
      nhaTai.status === 200 && nhaTai.laPNG, JSON.stringify(nhaTai));

    const coKhacTai = await taiByte(`/api/attendance/anh/${file}`, co4.cookie);
    check('cô nhóm khác KHÔNG tải được ảnh bé không thuộc nhóm mình',
      coKhacTai.status === 403, `${coKhacTai.status} ${coKhacTai.ctype}`);

    const nhaKhac = await login('phuhuynh2', '123456');
    const nhaKhacTai = await taiByte(`/api/attendance/anh/${file}`, nhaKhac.cookie);
    check('gia đình nhà khác KHÔNG tải được ảnh con nhà này',
      nhaKhacTai.status === 403, `${nhaKhacTai.status}`);

    const laTai = await taiByte(`/api/attendance/anh/${file}`, null);
    check('người chưa đăng nhập KHÔNG tải được', laTai.status === 401 || laTai.status === 403,
      `${laTai.status}`);

    const bia = await taiByte('/api/attendance/anh/ffffffffffffffffffffffffffffffff.jpg', co.cookie);
    check('tên tệp bịa ra thì trả 404, không lộ thư mục ảnh', bia.status === 404, `${bia.status}`);

    // CHỐT NGƯỢC: thư mục ảnh KHÔNG được mở tĩnh. Ai đó thêm một dòng
    // `app.use('/uploads', express.static(...))` cho tiện là dòng này đỏ.
    const tinh = await taiByte(`/uploads/${file}`, null);
    check('đường tĩnh /uploads KHÔNG phục vụ ảnh cho người lạ',
      !(tinh.status === 200 && tinh.laPNG), JSON.stringify(tinh));

    // BÁNH CÓC TRÊN MÃ MÀN HÌNH: không màn nào được trỏ ảnh vào đường tĩnh nữa.
    const manHinh = fs.readFileSync(path.join(GOC, 'public/js/views/attendance.js'), 'utf8');
    check('màn Điểm danh không còn trỏ thẻ ảnh vào /uploads',
      !/src="\/uploads/.test(manHinh),
      (manHinh.match(/src="\/uploads[^"]*/g) || []).join(', '));
    check('đối chứng — màn Điểm danh CÓ trỏ vào đường có canh quyền',
      /src="\/api\/attendance\/anh\//.test(manHinh), 'không thấy đường /api/attendance/anh/');
  }

  // =========================================================================
  console.log('\n[2] Chụp lại thì ảnh cũ được DỌN, không để rác trong kho');
  {
    const r2 = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: {
      studentId: 's1', date: NGAY, anh: ANH } });
    check('gắn ảnh lần hai vẫn được', r2.status === 201, `${r2.status}`);

    const kho = path.join(DIR, 'uploads');
    const con = fs.existsSync(path.join(kho, globalThis.FILE1));
    check('tệp ảnh CŨ đã bị xoá khỏi kho',
      globalThis.FILE1 === r2.data.file || !con,
      `${globalThis.FILE1} còn trong kho: ${con}`);
    check('tệp ảnh MỚI có thật trong kho',
      fs.existsSync(path.join(kho, r2.data.file)), r2.data.file);
    globalThis.FILE1 = r2.data.file;
  }

  // =========================================================================
  console.log('\n[3] Ảnh chỉ đi tới gia đình CỦA CHÍNH BÉ ĐÓ');
  {
    const nha = await req('GET', `/api/attendance/anh?studentId=s1&month=${NGAY.slice(0, 7)}`,
      { cookie: ph.cookie });
    check('gia đình của bé đọc được ảnh con mình',
      nha.status === 200 && (nha.data.anh || []).some(a => a.file === globalThis.FILE1),
      `${nha.status} ${JSON.stringify(nha.data).slice(0, 140)}`);

    // s7 là bé của nhóm khác — tài khoản `phuhuynh` không phải cha mẹ bé này.
    const nhaKhac = await req('GET', `/api/attendance/anh?studentId=s7&month=${NGAY.slice(0, 7)}`,
      { cookie: ph.cookie });
    check('gia đình KHÔNG đọc được ảnh điểm danh của bé nhà khác',
      nhaKhac.status === 403, `${nhaKhac.status}`);

    const coKhac = await req('POST', '/api/attendance/anh', { cookie: co4.cookie, body: {
      studentId: 's1', date: NGAY, anh: ANH } });
    check('cô nhóm khác KHÔNG gắn được ảnh cho bé không thuộc nhóm mình',
      coKhac.status === 403, `${coKhac.status}`);

    const phGan = await req('POST', '/api/attendance/anh', { cookie: ph.cookie, body: {
      studentId: 's1', date: NGAY, anh: ANH } });
    check('gia đình KHÔNG tự gắn được ảnh điểm danh', phGan.status === 403, `${phGan.status}`);

    const xau = await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: {
      studentId: 's1', date: NGAY, anh: 'data:text/html;base64,PHNjcmlwdD4=' } });
    check('tệp không phải ảnh bị từ chối', xau.status === 400, `${xau.status}`);
  }

  // =========================================================================
  console.log('\n[3b] Chụp nhầm bé thì gỡ được ngay');
  {
    const go = await req('DELETE', `/api/attendance/anh?studentId=s1&date=${NGAY}`, { cookie: co.cookie });
    check('cô gỡ được ảnh', go.status === 200, `${go.status}`);
    check('tệp ảnh cũng bị xoá khỏi kho',
      !fs.existsSync(path.join(DIR, 'uploads', globalThis.FILE1)), globalThis.FILE1);

    const nha = await req('GET', `/api/attendance/anh?studentId=s1&month=${NGAY.slice(0, 7)}`,
      { cookie: ph.cookie });
    check('gia đình cũng không còn thấy ảnh đó nữa',
      (nha.data.anh || []).length === 0, JSON.stringify(nha.data.anh));

    // Gắn lại một ảnh để các mục sau còn có gì mà nhìn.
    await req('POST', '/api/attendance/anh', { cookie: co.cookie, body: {
      studentId: 's1', date: NGAY, anh: ANH } });
  }

  // =========================================================================
  console.log('\n[4] Bảng rà soát sau 9 giờ — trừ bé đã có đơn nghỉ được duyệt');
  {
    // Dùng một ngày ĐÃ QUA để bảng luôn "đã qua giờ": nếu lấy hôm nay thì bài
    // này xanh hay đỏ tuỳ giờ chạy — kiểu đỏ ngẫu nhiên tệ nhất, vì người ta
    // sẽ chạy lại cho tới khi xanh.
    const homQua = new Date(Date.parse(`${NGAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

    const r = await req('GET', `/api/attendance/ra-soat?date=${homQua}&classId=c1`, { cookie: co.cookie });
    check('ngày đã qua thì bảng rà soát luôn có nghĩa',
      r.status === 200 && r.data.quaGio === true, `${r.status} quaGio=${r.data && r.data.quaGio}`);
    check('bảng nói rõ giờ nhà trường chốt là 9 giờ', r.data.gioRaSoat === 9, r.data.gioRaSoat);

    const truoc = (r.data.danhSach || []).map(x => x.studentId);
    check('đối chứng — có ít nhất một bé cần gọi xác nhận, nên phép so dưới có nghĩa',
      truoc.length > 0, truoc);

    // ĐƠN NGHỈ CHỈ GIA ĐÌNH TẠO ĐƯỢC (`requireRole('parent')`), nên phải chọn
    // đúng con của tài khoản `phuhuynh` — không lấy bừa bé đầu danh sách.
    const beThu = 's1';
    check('đối chứng — bé thử đang nằm trong danh sách cần gọi trước khi có đơn',
      truoc.includes(beThu), truoc);

    const donn = await req('POST', '/api/leave', { cookie: ph.cookie, body: {
      studentId: beThu, fromDate: homQua, toDate: homQua, reason: 'Gia đình cho con nghỉ một hôm' } });
    const donId = donn.data && (donn.data.id || (donn.data.don || {}).id);
    check('đối chứng — dựng được một đơn nghỉ cho bé đó',
      !!donId, `${donn.status} ${JSON.stringify(donn.data).slice(0, 160)}`);

    // Duyệt là phải chốt luôn tiền ăn (Y2) — bỏ trống thì máy chủ từ chối.
    const duyet = await req('POST', `/api/leave/${donId}/review`, { cookie: qt.cookie, body: {
      status: 'approved', hoanTienAn: 'khong' } });
    check('đối chứng — văn phòng duyệt được đơn', duyet.status === 200, `${duyet.status}`);

    const sau = await req('GET', `/api/attendance/ra-soat?date=${homQua}&classId=c1`, { cookie: co.cookie });
    const conTrongDs = (sau.data.danhSach || []).map(x => x.studentId).includes(beThu);
    check('BÉ ĐÃ CÓ ĐƠN NGHỈ ĐƯỢC DUYỆT thì KHÔNG còn trong danh sách cần gọi',
      !conTrongDs, `${beThu} vẫn nằm trong: ${JSON.stringify(sau.data.danhSach)}`);
    check('và bảng nói rõ có bao nhiêu bé đang nghỉ có đơn, để khỏi đi tìm nhầm',
      sau.data.soDaCoDonNghi >= 1, sau.data.soDaCoDonNghi);
    check('số cần gọi giảm đúng một bé',
      sau.data.soCanRaSoat === r.data.soCanRaSoat - 1,
      `${r.data.soCanRaSoat} → ${sau.data.soCanRaSoat}`);
  }

  // =========================================================================
  console.log('\n[4b] Chưa tới giờ rà soát thì KHÔNG kêu gì cả');
  {
    // Ngày mai: chắc chắn chưa tới giờ, ở bất kỳ múi giờ nào.
    const mai = new Date(Date.parse(`${NGAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const r = await req('GET', `/api/attendance/ra-soat?date=${mai}&classId=c1`, { cookie: co.cookie });
    check('ngày chưa tới thì quaGio = false', r.status === 200 && r.data.quaGio === false,
      `${r.status} quaGio=${r.data && r.data.quaGio}`);
    check('và danh sách rỗng, số cần gọi bằng 0',
      (r.data.danhSach || []).length === 0 && r.data.soCanRaSoat === 0,
      JSON.stringify(r.data.danhSach));
  }

  // =========================================================================
  console.log('\n[4c] Cô không mở được bảng rà soát của nhóm không phải của mình');
  {
    const lac = await req('GET', `/api/attendance/ra-soat?date=${NGAY}&classId=c4`, { cookie: co.cookie });
    check('nhóm Nhà trẻ nằm ngoài phạm vi của cô nhóm Chồi 2', lac.status === 403, `${lac.status}`);

    const phRs = await req('GET', `/api/attendance/ra-soat?date=${NGAY}&classId=c1`, { cookie: ph.cookie });
    check('gia đình KHÔNG mở được bảng rà soát của cả nhóm', phRs.status === 403, `${phRs.status}`);
  }

  // =========================================================================
  console.log('\n[5] Chữ trên màn hình nói về việc của người lớn, không nói về bé');
  {
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/attendance.js'), 'utf8');
    const khoi = (v.match(/theRaSoat\(\)\s*\{[\s\S]*?\n  \},/) || [''])[0];
    check('đối chứng — tìm được đúng khối chữ của bảng rà soát', khoi.length > 200, khoi.length);

    // Mấy cách quy việc chưa điểm danh về phía đứa trẻ.
    const CAM = [/bé.{0,12}(vắng mặt|trốn học|bỏ học)/i, /lười/i, /vi phạm/i, /không đi học/i];
    const dinh = CAM.filter(re => re.test(khoi)).map(String);
    check('không câu nào quy chuyện chưa điểm danh về phía đứa trẻ', dinh.length === 0, dinh.join(', '));

    check('câu chữ nói rõ đây là việc gọi xác nhận, không phải một lời phán',
      /gọi/i.test(khoi) && /(cô chưa kịp|gia đình quên|cho chắc)/i.test(khoi),
      khoi.slice(0, 200));

    // Màu đỏ chỉ được dùng cho KHỐI NÀY (việc của người lớn), không lan xuống
    // từng bé trong danh sách.
    const hangBe = (khoi.match(/r\.danhSach\.map[\s\S]*?join\(''\)/) || [''])[0];
    check('từng dòng bé trong danh sách KHÔNG bị tô đỏ',
      hangBe.length > 0 && !/danger|--danger|red/.test(hangBe), hangBe.slice(0, 160));
  }

  // =========================================================================
  console.log('\n[6] Tắt phân hệ Điểm danh thì cả hai đường mới bị chặn theo');
  {
    const tat = await req('PUT', '/api/admin/modules/diemdanh', { cookie: qt.cookie, body: { enabled: false } });
    check('quản trị tắt được phân hệ Điểm danh', tat.status === 200, `${tat.status}`);

    const anh = await req('GET', `/api/attendance/anh?studentId=s1&month=${NGAY.slice(0, 7)}`, { cookie: ph.cookie });
    check('đường ảnh điểm danh trả 404 khi phân hệ đã tắt', anh.status === 404, `${anh.status}`);
    const rs = await req('GET', `/api/attendance/ra-soat?date=${NGAY}&classId=c1`, { cookie: co.cookie });
    check('đường rà soát cũng trả 404', rs.status === 404, `${rs.status}`);

    const hs = await req('GET', '/api/students', { cookie: co.cookie });
    check('phần còn lại của app vẫn chạy y như cũ', hs.status === 200, `${hs.status}`);

    await req('PUT', '/api/admin/modules/diemdanh', { cookie: qt.cookie, body: { enabled: true } });
    const lai = await req('GET', `/api/attendance/anh?studentId=s1&month=${NGAY.slice(0, 7)}`, { cookie: ph.cookie });
    check('bật lại thì ảnh cũ CÒN NGUYÊN, không mất tấm nào',
      lai.status === 200 && (lai.data.anh || []).length === 1,
      `${lai.status} ${(lai.data.anh || []).length} ảnh`);
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Ảnh điểm danh và bảng rà soát');
